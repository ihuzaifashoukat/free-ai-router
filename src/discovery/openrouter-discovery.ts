// src/discovery/openrouter-discovery.ts
import { type ModelDef } from '../providers/types.js'

/**
 * OpenRouter maps specific models to some pricing tiers.
 * For free-ai-router, we map unknown free models to a default tier/score.
 * Note: Dynamic models are assigned a default 'B' tier since they are unknown,
 * though we might want to manually classify them later.
 */
function createDefaultFreeModelDef(orModel: any): ModelDef {
    return {
        modelId: orModel.id,
        label: orModel.name || orModel.id,
        tier: 'B',
        sweScore: 25, // default fallback score
        contextK: Math.floor((orModel.context_length || 4096) / 1000),
        providerIds: ['openrouter'],
        isFree: true,
        maxOutputTokens: orModel.top_provider?.max_completion_tokens,
        supportsStreaming: true,
        supportsVision: false, // unknown capabilities -> false
        supportsTools: false,  // unknown capabilities -> false
    }
}

/**
 * Fetches free models from OpenRouter dynamically, creating ModelDefs for any that end with ':free'.
 * @param controller AbortController signal for timeout.
 * @returns Array of ModelDef objects mapping to the OpenRouter free models.
 */
export async function fetchOpenRouterFreeModels(signal?: AbortSignal): Promise<ModelDef[]> {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'HTTP-Referer': 'https://github.com/ihuzaifashoukat/free-ai-router',
                'X-Title': 'free-ai-router',
            },
            signal,
        })

        if (!response.ok) {
            throw new Error(`OpenRouter API responded with status: ${response.status}`)
        }

        const json = await response.json() as { data?: any[] }
        if (!json.data || !Array.isArray(json.data)) {
            throw new Error('Invalid OpenRouter models response format')
        }

        const freeModels = json.data.filter((m: any) => typeof m.id === 'string' && m.id.endsWith(':free'))
        return freeModels.map(createDefaultFreeModelDef)
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error // Let caller handle abort
        }
        // Return empty array on fetch failure to gracefully fallback to static catalog
        return []
    }
}
