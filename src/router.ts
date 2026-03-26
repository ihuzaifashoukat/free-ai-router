// src/router.ts
import { EventEmitter } from 'node:events'
import { parseConfig, type RouterConfig, type RouterConfigInput } from './config/schema.js'
import { KeyManager } from './keys/key-manager.js'
import { resolveKeysFromEnv } from './keys/env-resolver.js'
import { QuotaTracker } from './quota/quota-tracker.js'
import { CircuitBreaker } from './health/circuit-breaker.js'
import { LatencyTracker } from './health/latency-tracker.js'
import { HealthAggregator } from './health/health-aggregator.js'
import { ModelCache } from './discovery/model-cache.js'
import { fetchOpenRouterFreeModels } from './discovery/openrouter-discovery.js'
import { createSelector } from './selection/strategy.js'
import { PROVIDER_REGISTRY, MODEL_CATALOG } from './providers/registry.js'
import {
    type ModelDef,
    type ProviderDef,
    type RouterStats,
    type ModelResolution,
    type PingResult,
    type RouterEventMap,
} from './providers/types.js'
import { executeFetch } from './request/executor.js'
import { withRetry } from './request/retry.js'
import { buildRequest } from './request/builder.js'
import { parseSSEStream } from './request/streaming.js'
import { normalizeResponse, normalizeStreamChunk } from './compat/response-normalizer.js'
import { FreeRouterError, NoAvailableModelError, AllKeysExhaustedError, ProviderError, mapHttpError } from './compat/error-mapper.js'
import { createLogger, type Logger } from './utils/logger.js'
import { extractRetryAfter } from './quota/header-extractor.js'

export class FreeAIRouterCore extends EventEmitter {
    public config: RouterConfig
    private logger: Logger

    private keyManager: KeyManager
    private quotaTracker: QuotaTracker
    private circuitBreaker: CircuitBreaker
    private latencyTracker: LatencyTracker
    private healthAggregator: HealthAggregator
    private modelCache: ModelCache

    private providerRegistry: Map<string, ProviderDef>
    private modelCatalog: ModelDef[]

    constructor(configInput?: RouterConfigInput) {
        super()
        this.config = parseConfig(configInput)
        this.logger = createLogger(this.config.debug, this.config.logger)

        this.keyManager = new KeyManager()
        this.quotaTracker = new QuotaTracker()
        this.circuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerThreshold,
            this.config.circuitBreakerReset
        )
        this.latencyTracker = new LatencyTracker()
        this.healthAggregator = new HealthAggregator(
            this.circuitBreaker,
            this.quotaTracker,
            this.latencyTracker
        )
        this.modelCache = new ModelCache()

        // Initialize provider and model registries
        this.providerRegistry = new Map(PROVIDER_REGISTRY)
        this.modelCatalog = [...MODEL_CATALOG]

        this.initKeys()
    }

    // Typed event emitter methods
    on<K extends keyof RouterEventMap>(event: K, listener: (e: RouterEventMap[K]) => void): this {
        return super.on(event, listener)
    }
    emit<K extends keyof RouterEventMap>(event: K, arg: RouterEventMap[K]): boolean {
        return super.emit(event, arg)
    }

    private initKeys(): void {
        if (this.config.apiKeys) {
            const normalizedKeys: Record<string, string[]> = {}
            for (const [provider, keyOrKeys] of Object.entries(this.config.apiKeys)) {
                normalizedKeys[provider] = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]
            }
            this.keyManager.load(normalizedKeys)
        }
        // 2. Load from environment
        const envKeys = resolveKeysFromEnv()
        this.keyManager.load(envKeys)
    }

    public setApiKey(provider: string, key: string | string[]): void {
        if (Array.isArray(key)) {
            for (const k of key) {
                this.keyManager.addKey(provider, k)
            }
        } else {
            this.keyManager.addKey(provider, key)
        }
    }

    public addProvider(providerDef: ProviderDef, models: ModelDef[]): void {
        this.providerRegistry.set(providerDef.id, providerDef)
        this.modelCatalog.push(...models)
    }

    public getStats(): RouterStats {
        let totalReq = 0
        let totalSucc = 0
        let totalFail = 0
        let totalRetries = 0

        const providerStats: Record<string, any> = {}
        for (const [id] of this.providerRegistry) {
            const latInfo = this.latencyTracker.getStats(id)
            const qPercent = this.quotaTracker.getQuotaPercent(id)

            totalReq += (latInfo?.sampleCount || 0)
            totalSucc += (latInfo?.sampleCount || 0) // Approximation if we don't track globals perfectly yet
            totalFail += (this.circuitBreaker.getStates()[id]?.failures || 0)

            providerStats[id] = {
                requests: latInfo?.sampleCount || 0,
                successes: latInfo?.sampleCount || 0,
                failures: this.circuitBreaker.getStates()[id]?.failures || 0,
                avgLatencyMs: latInfo?.avg || 0,
                p95LatencyMs: latInfo?.p95 || 0,
                currentQuotaPercent: qPercent ?? null,
                circuitState: this.circuitBreaker.getState(id)
            }
        }

        return {
            totalRequests: totalReq,
            successfulRequests: totalSucc,
            failedRequests: totalFail,
            retriedRequests: totalRetries,
            providerStats,
            modelStats: {} // Stub for future expansion if needed
        }
    }

    public resetCircuitBreakers(): void {
        this.circuitBreaker.resetAll()
    }

    public async refreshModels(): Promise<void> {
        if (!this.config.discoverOpenRouterModels) return

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000)
            const freeModels = await fetchOpenRouterFreeModels(controller.signal)
            clearTimeout(timeoutId)

            if (freeModels.length > 0) {
                this.modelCache.set(freeModels)
                this.logger.log(`Discovered ${freeModels.length} free models from OpenRouter`)
            }
        } catch (err: any) {
            this.logger.error('Failed to refresh OpenRouter models', { error: err.message })
        }
    }

    public async ping(): Promise<Record<string, PingResult>> {
        // Implement background probe optionally
        return {}
    }

    private async getAvailableModels(): Promise<ModelDef[]> {
        let models = [...this.modelCatalog]

        if (this.config.discoverOpenRouterModels) {
            if (this.modelCache.isExpired()) {
                await this.refreshModels()
            }
            const cached = this.modelCache.get()
            // Merge cached dynamic models with static ones (prefer dynamic)
            const dynamicIds = new Set(cached.map((m) => m.modelId))
            models = models.filter((m) => !dynamicIds.has(m.modelId)).concat(cached)
        }

        // Filter by configured providers
        if (this.config.providers && this.config.providers.length > 0) {
            const allowedProviders = new Set(this.config.providers)
            models = models.filter((m) => m.providerIds.some((p) => allowedProviders.has(p)))
            // Adjust provider lists
            models = models.map(m => ({
                ...m,
                providerIds: m.providerIds.filter(p => allowedProviders.has(p))
            })).filter(m => m.providerIds.length > 0)
        }

        // Explicit model include/exclude lists
        if (this.config.models && this.config.models.length > 0) {
            const allowed = new Set(this.config.models)
            models = models.filter((m) => allowed.has(m.modelId))
        }
        if (this.config.excludeModels && this.config.excludeModels.length > 0) {
            const blocked = new Set(this.config.excludeModels)
            models = models.filter((m) => !blocked.has(m.modelId))
        }

        return models
    }

    public async resolveModel(params: any = {}): Promise<ModelResolution> {
        const requestedModel = typeof params.model === 'string' ? params.model : this.config.defaultModel

        const availableModels = await this.getAvailableModels()

        // Map ALL candidate permutations (model + provider pair)
        const candidates = []
        outer: for (const m of availableModels) {
            // Direct hard match bypassing some restrictions if explicitly requested exact model ID
            const explicitlyRequested = requestedModel === m.modelId

            if (!explicitlyRequested) {
                // Apply tiered and capability filters if not explicitly requested
                if (params.tools && !m.supportsTools) continue outer
                if (params.stream && !m.supportsStreaming && typeof m.supportsStreaming !== 'undefined') continue outer

                if (this.config.minTier) {
                    const TIER_RANK: Record<string, number> = { 'S+': 70, 'S': 60, 'A+': 50, 'A': 40, 'A-': 35, 'B+': 28, 'B': 18, 'C': 0 };
                    const minRank = TIER_RANK[this.config.minTier] ?? 0;
                    const modelRank = TIER_RANK[m.tier] ?? 0;
                    if (modelRank < minRank) continue outer;
                }
            }

            for (const pId of m.providerIds) {
                // Fallback chain exclusion early
                if (this.config.fallbackChain && !this.config.fallbackChain.includes(pId)) continue
                const provider = this.providerRegistry.get(pId)
                if (!provider) continue

                const health = this.healthAggregator.getScore(pId)
                if (!explicitlyRequested && !health.available) continue // Skip unavailable for magic keywords

                candidates.push({
                    model: m,
                    provider: provider,
                    health: health
                })
            }
        }

        // If a specific real model ID was requested, isolate candidates to just that model
        let filteredCandidates = candidates
        if (requestedModel && !requestedModel.startsWith('free')) {
            filteredCandidates = candidates.filter((c) => c.model.modelId === requestedModel)
        }

        if (filteredCandidates.length === 0) {
            throw new NoAvailableModelError(
                `No candidates available for resolution: requested ${requestedModel || 'default'}. Diagnostics: Available providers may be exhausted or excluded.`
            )
        }

        // Dynamic resolution based on Magic Keywords
        let stratName = this.config.strategy || 'smart'
        if (requestedModel === 'free:fast') stratName = 'fastest'
        if (requestedModel === 'free:best') stratName = 'best'
        if (requestedModel === 'free:cheap') stratName = 'least-used'
        if (requestedModel === 'free:smart') stratName = 'smart'

        const selector = createSelector(stratName)
        const resolution = selector(filteredCandidates)

        if (!resolution) {
            throw new NoAvailableModelError(`Strategy ${stratName} failed to resolve a viable candidate. All might have open circuits or empty quotas.`)
        }

        return resolution
    }

    public async executeChat(params: any): Promise<any> {
        const startTime = Date.now()

        // 1. Resolve Model
        const resolution = await this.resolveModel(params)
        let currentResolution = resolution

        let executionAttempt = 0
        let lastError: Error | null = null

        // Execution Loop with fallback chain
        while (executionAttempt < (this.config.maxRetries || 3) * 2) {
            const { model: selectedModel, provider: selectedProvider, fallbacks: fallbackQueue } = currentResolution
            const pId = selectedProvider.id
            const provider = this.providerRegistry.get(pId)
            if (!provider) throw new ProviderError(`Provider ${pId} not defined`, 500, pId)

            // 2. Resolve Key
            let keyEntry = this.keyManager.getKey(pId)
            if (!keyEntry) {
                // Advance fallback since this provider has no keys
                if (fallbackQueue.length > 0) {
                    currentResolution = this.shiftFallback(currentResolution)
                    continue
                } else {
                    throw new AllKeysExhaustedError(`All keys for provider ${pId} exhausted and no fallback available.`)
                }
            }

            this.emit('request', {
                provider: pId,
                model: selectedModel.modelId,
                attempt: executionAttempt,
                timestamp: Date.now()
            })

            try {
                const result = await withRetry(
                    async () => {
                        const req = buildRequest(provider, {
                            model: selectedModel.modelId,
                            messages: params.messages || [],
                            tools: params.tools,
                            tool_choice: params.tool_choice,
                            stream: params.stream,
                            max_tokens: params.max_tokens,
                            temperature: params.temperature,
                        }, keyEntry!.key)

                        // Override baseUrl if config says so
                        if (this.config.baseURL) req.url = this.config.baseURL

                        // 3. Execution Action
                        return this.doNetworkRequest(req, params.stream)
                    },
                    (err: any) => err.status >= 500 || err.name === 'RateLimitError' || err.name === 'TimeoutError' || err.name === 'FetchError',
                    {
                        maxRetries: this.config.maxRetries || 3,
                        retryDelay: this.config.retryDelay || 1000,
                        logger: (msg: string) => this.logger.warn(`Retry on ${pId}: ${msg}`)
                    }
                )

                // Mark success
                this.circuitBreaker.recordSuccess(pId)
                const latencyMs = Date.now() - startTime
                this.latencyTracker.record(pId, selectedModel.modelId, latencyMs)

                // 4. Return Normalized Data
                return this.formatSuccessfulOutput(result, provider, selectedModel.modelId, latencyMs, executionAttempt)
            } catch (err: any) {
                lastError = err

                // Handle errors specific to our workflow
                if (err.name === 'RateLimitError') {
                    const retryAfter = err.retryAfter ?? 60000
                    this.emit('rate-limit', {
                        provider: pId,
                        model: selectedModel.modelId,
                        keyHash: this.keyManager.getKeyHealth(pId).keys.find((k) => k.hash === (keyEntry as any).hash)?.hash ?? 'unknown',
                        attempt: executionAttempt,
                        timestamp: Date.now()
                    })

                    this.logger.warn(`Rate limited on ${pId}, rotating key`)
                    this.keyManager.markKeyRateLimited(pId, keyEntry!.key, retryAfter * 1000)

                    if (this.config.rotateOnRateLimit) {
                        const nextKey = this.keyManager.rotateKey(pId)
                        if (nextKey) {
                            executionAttempt++
                            continue // Immediate retry with new key
                        }
                    }
                } else if (err.status === 401 || err.status === 403) {
                    this.keyManager.markKeyInvalid(pId, keyEntry!.key)
                    const nextKey = this.keyManager.rotateKey(pId)
                    if (nextKey) {
                        executionAttempt++
                        continue
                    }
                } else if (err.status >= 500 || err.name === 'TimeoutError' || err.name === 'FetchError') {
                    this.circuitBreaker.recordFailure(pId)
                }

                // Try Fallback
                if (fallbackQueue.length > 0) {
                    this.emit('fallback', {
                        from: pId,
                        to: fallbackQueue[0]!.provider.id,
                        reason: err.message,
                        timestamp: Date.now()
                    })
                    currentResolution = this.shiftFallback(currentResolution)
                    executionAttempt++
                    continue
                } else {
                    break // Exit loop, we throw below
                }
            }
        }

        throw lastError || new FreeRouterError('Execution failed unexpectedly')
    }

    private shiftFallback(res: ModelResolution): ModelResolution {
        const next = res.fallbacks[0]
        if (!next) throw new FreeRouterError('No fallback available to shift to')
        return {
            model: next.model,
            provider: next.provider,
            reason: 'fallback',
            fallbacks: res.fallbacks.slice(1)
        }
    }

    private async doNetworkRequest(req: any, stream?: boolean): Promise<any> {
        const options: RequestInit = {
            method: req.method,
            headers: req.headers,
        }
        if (req.body) {
            options.body = req.body
        }

        const response = await executeFetch(req.url, { ...options, timeoutMs: this.config.timeout })

        // Assume provider & model injection happens upstairs, update Quota Tracker there?
        // Wait, tracking needs pId and model. Let's do it in the wrapper above or just pass the response up.

        if (!response.ok) {
            const retryAfter = extractRetryAfter(response.headers)
            const err = mapHttpError(response, 'unknown', await response.text())
            if (err.name === 'RateLimitError') {
                (err as any).retryAfter = retryAfter
            }
            throw err
        }

        if (stream) {
            if (!response.body) throw new Error('Response body is null for stream')
            return response.body // Return the ReadableStream
        }

        return response.json()
    }

    private formatSuccessfulOutput(result: any, provider: ProviderDef, actualModelId: string, latencyMs: number, attempt: number) {
        if (result instanceof ReadableStream) {
            return this.formatStreamOutput(result, provider, actualModelId, latencyMs, attempt)
        }

        const normalized = normalizeResponse(result, provider, actualModelId)
        // Inject router metadata
        normalized._router = {
            provider: provider.id,
            model: actualModelId,
            latencyMs,
            attempt,
            keyIndex: 0
        }
        return normalized
    }

    private async *formatStreamOutput(rawStream: ReadableStream, provider: ProviderDef, actualModelId: string, latencyMs: number, attempt: number) {
        const generator = parseSSEStream(rawStream)
        for await (const chunk of generator) {
            if (chunk.data === '[DONE]') {
                // Construct a DONE chunk or just pass it to caller to handle
                continue
            }
            try {
                const obj = JSON.parse(chunk.data)
                const norm = normalizeStreamChunk(obj, provider, actualModelId)
                norm._router = { provider: provider.id, model: actualModelId, latencyMs, attempt, keyIndex: 0 }
                yield norm
            } catch (e) {
                // Skip malformed chunks seamlessly
            }
        }
    }
}
