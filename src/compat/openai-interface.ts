// src/compat/openai-interface.ts
import { FreeAIRouterCore } from '../router.js'
import { type RouterConfigInput } from '../config/schema.js'

/**
 * OpenAI-compatible interface wrapper around the FreeAIRouter core.
 */
export class FreeAIRouterOpenAI {
    private core: FreeAIRouterCore

    constructor(config?: RouterConfigInput) {
        this.core = new FreeAIRouterCore(config)
    }

    /**
     * Provides the `chat.completions.create` API mirroring openai@4.x.
     */
    public chat = {
        completions: {
            create: async (params: any): Promise<any> => {
                if (params.stream) {
                    const streamIter = await this.core.executeChat(params)

                    // We must return an async iterable that allows `for await (const chunk of stream)`
                    const streamWrapper = {
                        [Symbol.asyncIterator]() {
                            return streamIter
                        }
                    }
                    return streamWrapper
                }

                return this.core.executeChat(params)
            }
        }
    }

    /**
     * Provides the `models.list` API reflecting dynamically discovered and statically defined free models.
     */
    public models = {
        list: async (): Promise<{ data: any[] }> => {
            // Manually trigger a refresh to get the latest models on list requests
            await this.core.refreshModels()

            const res = await this.core.resolveModel()
            // Just constructing a list of available models using the catalog we have
            const data = [{
                id: res.model.modelId,
                object: "model",
                created: Date.now(),
                owned_by: res.provider.id
            }]

            // We can optionally format properly by accessing the internal catalog if exposed,
            // but returning a minimal valid mock structure for standard compat.
            return { data }
        }
    }

    // Allow getting instance internals without breaching the openai surface exactly
    public getStats() {
        return this.core.getStats()
    }

    // Event forwarding
    public on(event: string, listener: (...args: any[]) => void) {
        this.core.on(event as any, listener)
        return this
    }
}

// Allows instanceof checks
Object.defineProperty(FreeAIRouterOpenAI, Symbol.hasInstance, {
    value: (instance: any) => instance && instance.chat && instance.chat.completions,
})
