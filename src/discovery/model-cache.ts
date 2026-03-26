// src/discovery/model-cache.ts
import { type ModelDef } from '../providers/types.js'

export class ModelCache {
    private cache: Map<string, ModelDef> = new Map()
    private expiresAt: number = 0

    /**
     * Sets the models in the cache and configures the expiration time.
     * @param models The mapped ModelDefs from discovery.
     * @param ttlMs Time to live in milliseconds (default: 10 minutes).
     */
    set(models: ModelDef[], ttlMs: number = 10 * 60 * 1000): void {
        this.cache.clear()
        for (const model of models) {
            this.cache.set(model.modelId, model)
        }
        this.expiresAt = Date.now() + ttlMs
    }

    /**
     * Gets the cached models as an array.
     */
    get(): ModelDef[] {
        return Array.from(this.cache.values())
    }

    /**
     * Clears the cache completely.
     */
    clear(): void {
        this.cache.clear()
        this.expiresAt = 0
    }

    /**
     * Returns true if the cache has expired or is empty.
     */
    isExpired(): boolean {
        return this.cache.size === 0 || Date.now() >= this.expiresAt
    }

    /**
     * Returns true if there are any models currently cached and valid.
     */
    hasValidCache(): boolean {
        return !this.isExpired()
    }
}
