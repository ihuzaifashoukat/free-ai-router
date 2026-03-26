// src/providers/types.ts — Core type definitions for free-ai-router

/** Model quality tier based on SWE-bench scores */
export type ModelTier = 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C';

/** Numeric ranking for tier comparison (higher = better) */
export const TIER_RANK: Record<ModelTier, number> = {
    'S+': 8, 'S': 7, 'A+': 6, 'A': 5, 'A-': 4, 'B+': 3, 'B': 2, 'C': 1,
} as const;

/** Circuit breaker states */
export type CircuitStateType = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Key health states */
export type KeyState = 'healthy' | 'invalid' | 'rate-limited';

/** Selection strategy types */
export type Strategy = 'best' | 'fastest' | 'least-used' | 'round-robin' | 'smart';

// ─── Provider Definition ────────────────────────────────────────────────────

/** Defines a provider's endpoint, auth, and capabilities */
export interface ProviderDef {
    /** Unique provider identifier (e.g. 'groq') */
    id: string;
    /** Human-readable name (e.g. 'Groq') */
    name: string;
    /** Chat completions endpoint URL */
    baseUrl: string;
    /** Env var names for API keys, in priority order */
    apiKeyEnvVars: string[];
    /** Override default rate-limit header pairs if needed */
    quotaHeaderVariants?: string[][];
    /** Whether provider has a dedicated quota endpoint */
    hasQuotaEndpoint?: boolean;
    /** Rate limit information */
    rateLimits: RateLimitInfo;
    /** Extra headers required by this provider (e.g. OpenRouter HTTP-Referer) */
    specialHeaders?: Record<string, string>;
    /** Whether provider needs an account ID (Cloudflare) */
    requiresAccountId?: boolean;
    /** Account ID env var name */
    accountIdEnvVar?: string;
}

/** Rate limit configuration for a provider */
export interface RateLimitInfo {
    /** Requests per minute */
    rpm?: number;
    /** Requests per day */
    rpd?: number;
    /** Tokens per minute */
    tpm?: number;
}

// ─── Model Definition ───────────────────────────────────────────────────────

/** Defines a free AI model and its capabilities */
export interface ModelDef {
    /** Exact API model ID string */
    modelId: string;
    /** Human-readable label */
    label: string;
    /** Quality tier based on SWE-bench */
    tier: ModelTier;
    /** SWE-bench score (0–100) */
    sweScore: number;
    /** Context window in K tokens */
    contextK: number;
    /** Provider IDs that serve this model */
    providerIds: string[];
    /** Always true for this library */
    isFree: boolean;
    /** Maximum output tokens */
    maxOutputTokens?: number;
    /** Server-sent events streaming support */
    supportsStreaming?: boolean;
    /** Vision/image input support */
    supportsVision?: boolean;
    /** Function/tool calling support */
    supportsTools?: boolean;
}

// ─── Key Entry ──────────────────────────────────────────────────────────────

/** Tracks state of a single API key */
export interface KeyEntry {
    /** Raw API key (kept in memory only, never logged) */
    key: string;
    /** SHA-256 hash prefix for logging/cache keys */
    hash: string;
    /** Current health state */
    state: KeyState;
    /** Timestamp of last use */
    lastUsed: number;
    /** Timestamp until which this key is rate-limited */
    rateLimitedUntil?: number;
    /** Total requests made with this key */
    requestCount: number;
}

// ─── Circuit Breaker State ──────────────────────────────────────────────────

/** Internal circuit breaker state per provider */
export interface CircuitState {
    /** Current state */
    state: CircuitStateType;
    /** Consecutive failure count */
    failures: number;
    /** Timestamp of last failure */
    lastFailureTime: number;
    /** Timestamp when circuit was opened */
    openedAt?: number;
    /** Timestamp when circuit transitioned to half-open */
    halfOpenAt?: number;
}

/** Public circuit state info */
export interface CircuitStateInfo {
    state: CircuitStateType;
    failures: number;
    lastFailureTime: number;
    openedAt?: number;
}

// ─── Quota ──────────────────────────────────────────────────────────────────

/** Extracted rate limit data from HTTP headers */
export interface QuotaInfo {
    /** Remaining requests/tokens */
    remaining: number;
    /** Total limit */
    limit: number;
    /** Percentage remaining (0–100) */
    quotaPercent: number;
}

// ─── Latency ────────────────────────────────────────────────────────────────

/** Latency statistics for a provider/model */
export interface LatencyStats {
    /** Average latency in ms */
    avg: number;
    /** 95th percentile latency in ms */
    p95: number;
    /** Standard deviation (jitter) in ms */
    jitter: number;
    /** Uptime percentage (0–100) */
    uptimePercent: number;
    /** Composite stability score (0–100) */
    stabilityScore: number;
    /** Number of samples */
    sampleCount: number;
}

/** Latency color rating */
export type LatencyColor = 'green' | 'yellow' | 'red';

// ─── Health ─────────────────────────────────────────────────────────────────

/** Composite health score for a provider */
export interface HealthScore {
    /** Provider ID */
    providerId: string;
    /** Circuit breaker state */
    circuitState: CircuitStateType;
    /** Current quota percentage (null if unknown) */
    quotaPercent: number | null;
    /** Latency stats (null if no data) */
    latency: LatencyStats | null;
    /** Overall composite score (0–100, higher = healthier) */
    score: number;
    /** Whether this provider is available for requests */
    available: boolean;
}

// ─── Router Stats ───────────────────────────────────────────────────────────

/** Aggregate statistics for the router */
export interface RouterStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    retriedRequests: number;
    providerStats: Record<string, {
        requests: number;
        successes: number;
        failures: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        currentQuotaPercent: number | null;
        circuitState: CircuitStateType;
    }>;
    modelStats: Record<string, {
        requests: number;
        provider: string;
        avgLatencyMs: number;
    }>;
}

// ─── Model Resolution ───────────────────────────────────────────────────────

/** Result of resolving which model/provider to use */
export interface ModelResolution {
    /** Selected model definition */
    model: ModelDef;
    /** Selected provider definition */
    provider: ProviderDef;
    /** Reason for selection */
    reason: string;
    /** Fallback candidates in priority order */
    fallbacks: Array<{ model: ModelDef; provider: ProviderDef }>;
}

// ─── Ping Result ────────────────────────────────────────────────────────────

/** Result of a health ping to a provider */
export interface PingResult {
    /** Provider ID */
    providerId: string;
    /** Whether the ping was successful */
    ok: boolean;
    /** Latency in ms (null if failed) */
    latencyMs: number | null;
    /** Error message if failed */
    error?: string;
    /** HTTP status code */
    statusCode?: number;
}

// ─── Key Health Report ──────────────────────────────────────────────────────

/** Health report for all keys of a provider */
export interface KeyHealthReport {
    /** Provider ID */
    providerId: string;
    /** Total key count */
    total: number;
    /** Healthy key count */
    healthy: number;
    /** Rate-limited key count */
    rateLimited: number;
    /** Invalid key count */
    invalid: number;
    /** Per-key info (uses hash, never raw key) */
    keys: Array<{
        hash: string;
        state: KeyState;
        requestCount: number;
        rateLimitedUntil?: number;
    }>;
}

// ─── Events ─────────────────────────────────────────────────────────────────

/** Emitted when a request is about to be sent */
export interface RequestEvent {
    provider: string;
    model: string;
    attempt: number;
    timestamp: number;
}

/** Emitted when a response is received */
export interface ResponseEvent {
    provider: string;
    model: string;
    latencyMs: number;
    statusCode: number;
    timestamp: number;
}

/** Emitted when falling back to another provider */
export interface FallbackEvent {
    from: string;
    to: string;
    reason: string;
    timestamp: number;
}

/** Emitted when a rate limit is hit */
export interface RateLimitEvent {
    provider: string;
    model: string;
    keyHash: string;
    attempt: number;
    retryAfterMs?: number;
    timestamp: number;
}

/** Emitted when a circuit breaker opens */
export interface CircuitEvent {
    provider: string;
    state: CircuitStateType;
    failures: number;
    timestamp: number;
}

/** Emitted on errors */
export interface ErrorEvent {
    provider: string;
    model?: string;
    error: Error;
    timestamp: number;
}

/** Map of event names to their handler types */
export interface RouterEventMap {
    'request': RequestEvent;
    'response': ResponseEvent;
    'fallback': FallbackEvent;
    'rate-limit': RateLimitEvent;
    'circuit-open': CircuitEvent;
    'error': ErrorEvent;
}
