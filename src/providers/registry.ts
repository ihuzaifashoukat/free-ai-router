// src/providers/registry.ts — Static model catalog + provider registry
import type { ProviderDef, ModelDef, ModelTier } from './types.js';
import { TIER_RANK } from './types.js';
import { NVIDIA } from './nvidia.js';
import { GROQ } from './groq.js';
import { CEREBRAS } from './cerebras.js';
import { SAMBANOVA } from './sambanova.js';
import { OPENROUTER } from './openrouter.js';
import { HUGGINGFACE } from './huggingface.js';
import { DEEPINFRA } from './deepinfra.js';
import { FIREWORKS } from './fireworks.js';
import { CODESTRAL } from './codestral.js';
import { TOGETHER } from './together.js';
import { GOOGLEAI } from './googleai.js';
import { SILICONFLOW } from './siliconflow.js';
import { SCALEWAY } from './scaleway.js';
import { HYPERBOLIC } from './hyperbolic.js';
import { CLOUDFLARE } from './cloudflare.js';
import { PERPLEXITY } from './perplexity.js';
import { ZAI } from './zai.js';
import { QWEN } from './qwen.js';
import { IFLOW } from './iflow.js';
import { REPLICATE } from './replicate.js';

// ─── Provider Registry ─────────────────────────────────────────────────────

/** All provider definitions as an array (insertion-order preserved) */
const ALL_PROVIDERS: readonly ProviderDef[] = [
    NVIDIA, GROQ, CEREBRAS, SAMBANOVA, OPENROUTER,
    HUGGINGFACE, DEEPINFRA, FIREWORKS, CODESTRAL, TOGETHER,
    GOOGLEAI, SILICONFLOW, SCALEWAY, HYPERBOLIC, CLOUDFLARE,
    PERPLEXITY, ZAI, QWEN, IFLOW, REPLICATE,
] as const;

/** Map of provider IDs → ProviderDef for O(1) lookups */
export const PROVIDER_REGISTRY: ReadonlyMap<string, ProviderDef> = new Map(
    ALL_PROVIDERS.map((p) => [p.id, p]),
);

/**
 * Get a provider definition by ID.
 * @param id - Provider identifier (e.g. 'groq')
 * @returns ProviderDef or undefined
 */
export function getProvider(id: string): ProviderDef | undefined {
    return PROVIDER_REGISTRY.get(id);
}

/**
 * Get all registered provider IDs.
 * @returns Array of provider ID strings
 */
export function getProviderIds(): string[] {
    return [...PROVIDER_REGISTRY.keys()];
}

// ─── Model Catalog ──────────────────────────────────────────────────────────

/** Helper to create a ModelDef with isFree=true and streaming=true defaults */
function m(
    modelId: string,
    label: string,
    tier: ModelTier,
    sweScore: number,
    contextK: number,
    providerIds: string[],
    supportsTools: boolean,
    supportsVision = false,
): ModelDef {
    return {
        modelId, label, tier, sweScore, contextK,
        providerIds, isFree: true,
        supportsStreaming: true, supportsTools, supportsVision,
    };
}

/**
 * Static catalog of all known free models with SWE-bench tiers.
 * Ordered by tier (best first) for efficient iteration.
 */
export const MODEL_CATALOG: readonly ModelDef[] = [
    // ── TIER S+ ──────────────────────────────────────────────
    m('deepseek-ai/deepseek-v3.2', 'DeepSeek V3.2', 'S+', 73.1, 128, ['nvidia'], true),
    m('moonshotai/kimi-k2.5', 'Kimi K2.5', 'S+', 76.8, 128, ['nvidia'], true),
    m('z-ai/glm5', 'GLM 5', 'S+', 77.8, 128, ['nvidia'], true),
    m('z-ai/glm4.7', 'GLM 4.7', 'S+', 73.8, 200, ['nvidia'], true),
    m('moonshotai/kimi-k2-thinking', 'Kimi K2 Thinking', 'S+', 71.3, 256, ['nvidia'], true),
    m('minimaxai/minimax-m2.1', 'MiniMax M2.1', 'S+', 74, 200, ['nvidia'], true),
    m('minimaxai/minimax-m2.5', 'MiniMax M2.5', 'S+', 80.2, 200, ['nvidia'], true),
    m('stepfun-ai/step-3.5-flash', 'Step 3.5 Flash', 'S+', 74.4, 256, ['nvidia'], true),
    m('qwen/qwen3-coder-480b-a35b-instruct', 'Qwen3 Coder 480B', 'S+', 70.6, 256, ['nvidia','hyperbolic'], true),
    m('qwen/qwen3-235b-a22b', 'Qwen3 235B', 'S+', 70, 128, ['nvidia'], true),
    m('mistralai/devstral-2-123b-instruct-2512', 'Devstral 2 123B', 'S+', 72.2, 256, ['nvidia'], true),
    m('qwen-3-235b-a22b-instruct-2507', 'Qwen3 235B', 'S+', 70, 128, ['cerebras'], true),
    m('zai-glm-4.7', 'GLM 4.7', 'S+', 73.8, 200, ['cerebras'], true),
    m('MiniMax-M2.5', 'MiniMax M2.5', 'S+', 74, 160, ['sambanova'], true),
    m('DeepSeek-V3.2', 'DeepSeek V3.2', 'S+', 73.1, 8, ['sambanova'], true),
    m('qwen/qwen3-coder:free', 'Qwen3 Coder 480B', 'S+', 70.6, 262, ['openrouter'], true),
    m('z-ai/glm-4.5-air:free', 'GLM 4.5 Air', 'S+', 72, 128, ['openrouter'], true),
    m('stepfun/step-3.5-flash:free', 'Step 3.5 Flash', 'S+', 74.4, 256, ['openrouter'], true),
    m('Qwen/Qwen3-235B-A22B', 'Qwen3 235B', 'S+', 70, 128, ['hyperbolic','siliconflow'], true),
    m('devstral-2-123b-instruct-2512', 'Devstral 2 123B', 'S+', 72.2, 256, ['scaleway'], true),
    m('qwen3-235b-a22b-instruct-2507', 'Qwen3 235B', 'S+', 70, 128, ['scaleway'], true),
    m('zai/glm-5', 'GLM-5', 'S+', 77.8, 128, ['zai'], true),
    m('zai/glm-4.7', 'GLM-4.7', 'S+', 73.8, 200, ['zai'], true),
    m('zai/glm-4.5', 'GLM-4.5', 'S+', 75, 128, ['zai'], true),
    m('zai/glm-4.5-air', 'GLM-4.5-Air', 'S+', 72, 128, ['zai'], true),
    m('zai/glm-4.6', 'GLM-4.6', 'S+', 70, 128, ['zai'], true),
    m('Qwen/Qwen3-Coder-480B-A35B-Instruct', 'Qwen3 Coder 480B', 'S+', 70.6, 256, ['siliconflow'], true),
    m('deepseek-ai/DeepSeek-V3.2', 'DeepSeek V3.2', 'S+', 73.1, 128, ['siliconflow'], true),
    m('moonshotai/Kimi-K2.5', 'Kimi K2.5', 'S+', 76.8, 128, ['together'], true),
    m('Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8', 'Qwen3 Coder 480B', 'S+', 70.6, 256, ['together'], true),
    m('qwen3-coder-plus', 'Qwen3 Coder Plus', 'S+', 69.6, 256, ['qwen','iflow'], true),
    m('qwen3-coder-480b-a35b-instruct', 'Qwen3 Coder 480B', 'S+', 70.6, 256, ['qwen'], true),
    m('TBStars2-200B-A13B', 'TBStars2 200B', 'S+', 77.8, 128, ['iflow'], true),
    m('deepseek-v3.2', 'DeepSeek V3.2', 'S+', 73.1, 128, ['iflow'], true),
    m('deepseek-r1', 'DeepSeek R1', 'S+', 70.6, 128, ['iflow'], true),

    // ── TIER S ──────────────────────────────────────────────
    m('deepseek-ai/deepseek-v3.1-terminus', 'DeepSeek V3.1 Term', 'S', 68.4, 128, ['nvidia'], true),
    m('moonshotai/kimi-k2-instruct', 'Kimi K2 Instruct', 'S', 65.8, 128, ['nvidia','groq'], true),
    m('minimaxai/minimax-m2', 'MiniMax M2', 'S', 69.4, 128, ['nvidia'], true),
    m('qwen/qwen3-next-80b-a3b-thinking', 'Qwen3 80B Thinking', 'S', 68, 128, ['nvidia'], true),
    m('qwen/qwen3-next-80b-a3b-instruct', 'Qwen3 80B Instruct', 'S', 65, 128, ['nvidia','hyperbolic'], true),
    m('qwen/qwen3.5-397b-a17b', 'Qwen3.5 400B VLM', 'S', 68, 128, ['nvidia'], true),
    m('openai/gpt-oss-120b', 'GPT OSS 120B', 'S', 60, 128, ['nvidia','groq','hyperbolic','together'], true),
    m('meta/llama-4-maverick-17b-128e-instruct', 'Llama 4 Maverick', 'S', 62, 1000, ['nvidia'], true),
    m('deepseek-ai/deepseek-v3.1', 'DeepSeek V3.1', 'S', 62, 128, ['nvidia'], true),
    m('meta-llama/llama-4-maverick-17b-128e-preview', 'Llama 4 Maverick', 'S', 62, 1000, ['groq'], true),
    m('gpt-oss-120b', 'GPT OSS 120B', 'S', 60, 128, ['cerebras','sambanova','scaleway'], true),
    m('DeepSeek-R1-0528', 'DeepSeek R1 0528', 'S', 61, 128, ['sambanova'], true),
    m('DeepSeek-V3.1', 'DeepSeek V3.1', 'S', 62, 128, ['sambanova'], true),
    m('DeepSeek-V3-0324', 'DeepSeek V3 0324', 'S', 62, 128, ['sambanova'], true),
    m('Llama-4-Maverick-17B-128E-Instruct', 'Llama 4 Maverick', 'S', 62, 1000, ['sambanova'], true),
    m('DeepSeek-V3.1-Terminus', 'DeepSeek V3.1 Term', 'S', 68.4, 128, ['sambanova'], true),
    m('qwen/qwen3-next-80b-a3b-instruct:free', 'Qwen3 80B Instruct', 'S', 65, 128, ['openrouter'], true),
    m('openai/gpt-oss-120b:free', 'GPT OSS 120B', 'S', 60, 128, ['openrouter'], true),
    m('deepseek-ai/DeepSeek-V3-Coder', 'DeepSeek V3 Coder', 'S', 62, 128, ['huggingface'], true),
    m('accounts/fireworks/models/deepseek-v3', 'DeepSeek V3', 'S', 62, 128, ['fireworks'], true),
    m('accounts/fireworks/models/deepseek-r1', 'DeepSeek R1', 'S', 61, 128, ['fireworks'], true),
    m('deepseek-ai/DeepSeek-R1-0528', 'DeepSeek R1 0528', 'S', 61, 128, ['hyperbolic'], true),
    m('moonshotai/Kimi-K2-Instruct', 'Kimi K2 Instruct', 'S', 65.8, 131, ['hyperbolic'], true),
    m('deepseek-ai/DeepSeek-V3-0324', 'DeepSeek V3 0324', 'S', 62, 128, ['hyperbolic'], true),
    m('zai/glm-4.7-flash', 'GLM-4.7-Flash', 'S', 59.2, 200, ['zai'], true),
    m('zai/glm-4.5-flash', 'GLM-4.5-Flash', 'S', 59.2, 128, ['zai'], true),
    m('deepseek-ai/DeepSeek-R1', 'DeepSeek R1', 'S', 61, 128, ['siliconflow','together'], true),
    m('deepseek-ai/DeepSeek-V3.1', 'DeepSeek V3.1', 'S', 62, 128, ['together'], true),
    m('@cf/openai/gpt-oss-120b', 'GPT OSS 120B', 'S', 60, 128, ['cloudflare'], true),
    m('qwen3-coder-max', 'Qwen3 Coder Max', 'S', 67, 256, ['qwen'], true),
    m('qwen3-coder-next', 'Qwen3 Coder Next', 'S', 65, 256, ['qwen'], true),
    m('qwen3-235b-a22b-instruct', 'Qwen3 235B', 'S', 70, 256, ['qwen','iflow'], true),
    m('qwen3-next-80b-a3b-instruct', 'Qwen3 80B Instruct', 'S', 65, 128, ['qwen'], true),
    m('kimi-k2', 'Kimi K2', 'S', 65.8, 128, ['iflow'], true),
    m('kimi-k2-0905', 'Kimi K2 0905', 'S', 68, 256, ['iflow'], true),
    m('glm-4.6', 'GLM 4.6', 'S', 62, 200, ['iflow'], true),
    m('deepseek-v3', 'DeepSeek V3', 'S', 62, 128, ['iflow'], true),

    // ── TIER A+ ──────────────────────────────────────────────
    m('nvidia/llama-3.1-nemotron-ultra-253b-v1', 'Nemotron Ultra 253B', 'A+', 56, 128, ['nvidia'], true),
    m('mistralai/mistral-large-3-675b-instruct-2512', 'Mistral Large 675B', 'A+', 58, 256, ['nvidia'], true),
    m('qwen/qwq-32b', 'QwQ 32B', 'A+', 50, 131, ['nvidia'], true),
    m('igenius/colosseum_355b_instruct_16k', 'Colosseum 355B', 'A+', 52, 16, ['nvidia'], true),
    m('qwen-qwq-32b', 'QwQ 32B', 'A+', 50, 131, ['groq'], true),
    m('qwen/qwen3-32b', 'Qwen3 32B', 'A+', 50, 131, ['groq'], true),
    m('qwen-3-32b', 'Qwen3 32B', 'A+', 50, 128, ['cerebras'], true),
    m('Qwen3-32B', 'Qwen3 32B', 'A+', 50, 128, ['sambanova'], true),
    m('qwen3-coder-30b-a3b-instruct', 'Qwen3 Coder 30B', 'A+', 55, 32, ['scaleway'], true),
    m('Qwen/Qwen3-Coder-30B-A3B-Instruct', 'Qwen3 Coder 30B', 'A+', 55, 32, ['siliconflow'], true),
    m('sonar-reasoning-pro', 'Sonar Reasoning Pro', 'A+', 50, 128, ['perplexity'], true),
    m('qwen3-32b', 'Qwen3 32B', 'A+', 50, 128, ['qwen','iflow'], true),
    m('qwen3-max', 'Qwen3 Max', 'A+', 55, 256, ['iflow'], true),

    // ── TIER A ──────────────────────────────────────────────
    m('mistralai/mistral-medium-3-instruct', 'Mistral Medium 3', 'A', 48, 128, ['nvidia'], true),
    m('mistralai/magistral-small-2506', 'Magistral Small', 'A', 45, 32, ['nvidia'], true),
    m('nvidia/llama-3.3-nemotron-super-49b-v1.5', 'Nemotron Super 49B', 'A', 49, 128, ['nvidia'], true),
    m('meta/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout', 'A', 44, 10000, ['nvidia'], true),
    m('nvidia/nemotron-3-nano-30b-a3b', 'Nemotron Nano 30B', 'A', 43, 128, ['nvidia'], true),
    m('deepseek-ai/deepseek-r1-distill-qwen-32b', 'R1 Distill 32B', 'A', 43.9, 128, ['nvidia'], true),
    m('openai/gpt-oss-20b', 'GPT OSS 20B', 'A', 42, 128, ['nvidia','groq','together'], true),
    m('qwen/qwen2.5-coder-32b-instruct', 'Qwen2.5 Coder 32B', 'A', 46, 32, ['nvidia'], true),
    m('meta/llama-3.1-405b-instruct', 'Llama 3.1 405B', 'A', 44, 128, ['nvidia'], true),
    m('meta-llama/llama-4-scout-17b-16e-preview', 'Llama 4 Scout', 'A', 44, 10000, ['groq'], true),
    m('deepseek-r1-distill-llama-70b', 'R1 Distill 70B', 'A', 43.9, 128, ['groq','scaleway'], true),
    m('llama-4-scout-17b-16e-instruct', 'Llama 4 Scout', 'A', 44, 10000, ['cerebras'], true),
    m('DeepSeek-R1-Distill-Llama-70B', 'R1 Distill 70B', 'A', 43.9, 128, ['sambanova'], true),
    m('openai/gpt-oss-20b:free', 'GPT OSS 20B', 'A', 42, 128, ['openrouter'], true),
    m('nvidia/nemotron-3-nano-30b-a3b:free', 'Nemotron Nano 30B', 'A', 43, 128, ['openrouter'], true),
    m('Qwen/Qwen2.5-Coder-32B-Instruct', 'Qwen2.5 Coder 32B', 'A', 46, 32, ['hyperbolic','siliconflow'], true),
    m('meta-llama/Meta-Llama-3.1-405B-Instruct', 'Llama 3.1 405B', 'A', 44, 128, ['hyperbolic'], true),
    m('@cf/qwen/qwen2.5-coder-32b-instruct', 'Qwen2.5 Coder 32B', 'A', 46, 32, ['cloudflare'], true),
    m('@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', 'R1 Distill 32B', 'A', 43.9, 128, ['cloudflare'], true),
    m('@cf/openai/gpt-oss-20b', 'GPT OSS 20B', 'A', 42, 128, ['cloudflare'], true),
    m('sonar-reasoning', 'Sonar Reasoning', 'A', 45, 128, ['perplexity'], true),
    m('qwen2.5-coder-32b-instruct', 'Qwen2.5 Coder 32B', 'A', 46, 32, ['qwen'], true),

    // ── TIER A- ──────────────────────────────────────────────
    m('meta/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'A-', 39.5, 128, ['nvidia'], true),
    m('deepseek-ai/deepseek-r1-distill-qwen-14b', 'R1 Distill 14B', 'A-', 37.7, 64, ['nvidia'], true),
    m('bytedance/seed-oss-36b-instruct', 'Seed OSS 36B', 'A-', 38, 32, ['nvidia'], true),
    m('stockmark/stockmark-2-100b-instruct', 'Stockmark 100B', 'A-', 36, 32, ['nvidia'], true),
    m('llama-3.3-70b-versatile', 'Llama 3.3 70B', 'A-', 39.5, 128, ['groq'], true),
    m('llama3.3-70b', 'Llama 3.3 70B', 'A-', 39.5, 128, ['cerebras'], true),
    m('Meta-Llama-3.3-70B-Instruct', 'Llama 3.3 70B', 'A-', 39.5, 128, ['sambanova'], true),
    m('meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B', 'A-', 39.5, 128, ['openrouter'], true),
    m('codellama/CodeLlama-70b-Instruct-hf', 'CodeLlama 70B', 'A-', 39, 16, ['replicate'], true),
    m('meta-llama/Meta-Llama-3.1-70B-Instruct', 'Llama 3.1 70B', 'A-', 39.5, 128, ['deepinfra'], true),
    m('meta-llama/Llama-3.3-70B-Instruct', 'Llama 3.3 70B', 'A-', 39.5, 128, ['hyperbolic'], true),
    m('llama-3.3-70b-instruct', 'Llama 3.3 70B', 'A-', 39.5, 128, ['scaleway'], true),
    m('meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Llama 3.3 70B', 'A-', 39.5, 128, ['together'], true),
    m('@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Llama 3.3 70B', 'A-', 39.5, 128, ['cloudflare'], true),

    // ── TIER B+ ──────────────────────────────────────────────
    m('mistralai/mixtral-8x22b-instruct-v0.1', 'Mixtral 8x22B', 'B+', 32, 64, ['nvidia'], true),
    m('mistralai/ministral-14b-instruct-2512', 'Ministral 14B', 'B+', 34, 32, ['nvidia'], true),
    m('ibm/granite-34b-code-instruct', 'Granite 34B Code', 'B+', 30, 32, ['nvidia'], true),
    m('mistralai/mistral-small-3.1-24b-instruct:free', 'Mistral Small 3.1', 'B+', 30, 128, ['openrouter'], true),
    m('mistralai/Mixtral-8x22B-Instruct-v0.1', 'Mixtral Code', 'B+', 32, 64, ['deepinfra'], true),
    m('codestral-latest', 'Codestral', 'B+', 34, 256, ['codestral'], true),
    m('mistral-small-3.2-24b-instruct-2506', 'Mistral Small 3.2', 'B+', 30, 128, ['scaleway'], true),
    m('sonar-pro', 'Sonar Pro', 'B+', 32, 128, ['perplexity'], true),

    // ── TIER B ──────────────────────────────────────────────
    m('deepseek-ai/deepseek-r1-distill-llama-8b', 'R1 Distill 8B', 'B', 28.2, 32, ['nvidia'], true),
    m('deepseek-ai/deepseek-r1-distill-qwen-7b', 'R1 Distill 7B', 'B', 22.6, 32, ['nvidia'], true),
    m('llama-3.1-8b-instant', 'Llama 3.1 8B', 'B', 28.8, 128, ['groq'], true),
    m('llama3.1-8b', 'Llama 3.1 8B', 'B', 28.8, 128, ['cerebras'], true),
    m('Meta-Llama-3.1-8B-Instruct', 'Llama 3.1 8B', 'B', 28.8, 128, ['sambanova'], true),
    m('google/gemma-3-27b-it:free', 'Gemma 3 27B', 'B', 22, 128, ['openrouter'], true),
    m('bigcode/starcoder2-15b', 'StarCoder2 15B', 'B', 25, 16, ['huggingface'], true),
    m('gemma-3-27b-it', 'Gemma 3 27B', 'B', 22, 128, ['googleai'], true),
    m('@cf/meta/llama-3.1-8b-instruct', 'Llama 3.1 8B', 'B', 28.8, 128, ['cloudflare'], true),
    m('sonar', 'Sonar', 'B', 25, 128, ['perplexity'], true),

    // ── TIER C ──────────────────────────────────────────────
    m('google/gemma-2-9b-it', 'Gemma 2 9B', 'C', 18, 8, ['nvidia'], true),
    m('microsoft/phi-3.5-mini-instruct', 'Phi 3.5 Mini', 'C', 12, 128, ['nvidia'], true),
    m('microsoft/phi-4-mini-instruct', 'Phi 4 Mini', 'C', 14, 128, ['nvidia'], true),
    m('google/gemma-3-12b-it:free', 'Gemma 3 12B', 'C', 15, 128, ['openrouter'], true),
    m('gemma-3-12b-it', 'Gemma 3 12B', 'C', 15, 128, ['googleai'], true),
    m('gemma-3-4b-it', 'Gemma 3 4B', 'C', 10, 128, ['googleai'], true),
] as const;

/**
 * Get all models served by a specific provider.
 * @param providerId - Provider identifier
 * @returns Array of ModelDef for that provider
 */
export function getModelsForProvider(providerId: string): ModelDef[] {
    return MODEL_CATALOG.filter((m) => m.providerIds.includes(providerId));
}

/**
 * Get all models at or above a minimum tier.
 * @param minTier - Minimum tier (e.g. 'A' returns A, A+, S, S+)
 * @returns Filtered models sorted by tier descending
 */
export function getModelsByTier(minTier: ModelTier): ModelDef[] {
    const minRank = TIER_RANK[minTier];
    return MODEL_CATALOG.filter((m) => TIER_RANK[m.tier] >= minRank);
}

/**
 * Find a model by its exact ID.
 * @param modelId - Exact model identifier string
 * @returns ModelDef or undefined
 */
export function findModel(modelId: string): ModelDef | undefined {
    return MODEL_CATALOG.find((m) => m.modelId === modelId);
}

/**
 * OpenRouter tier mapping for dynamically discovered models.
 * Used when a model is discovered via /api/v1/models but has no static entry.
 */
export const OPENROUTER_TIER_MAP: Readonly<Record<string, { tier: ModelTier; sweScore: number }>> = {
    'qwen': { tier: 'A', sweScore: 40 },
    'deepseek': { tier: 'S', sweScore: 60 },
    'llama': { tier: 'A', sweScore: 39 },
    'gemma': { tier: 'A-', sweScore: 35 },
    'mistral': { tier: 'A-', sweScore: 35 },
    'phi': { tier: 'B+', sweScore: 28 },
    'gemini': { tier: 'A', sweScore: 40 },
} as const;

/**
 * Infer a tier for an unknown model ID based on keyword matching.
 * @param modelId - Model identifier to classify
 * @returns Tier and estimated SWE score
 */
export function inferTier(modelId: string): { tier: ModelTier; sweScore: number } {
    const lower = modelId.toLowerCase();
    for (const [keyword, info] of Object.entries(OPENROUTER_TIER_MAP)) {
        if (lower.includes(keyword)) return info;
    }
    return { tier: 'B', sweScore: 25 }; // Fallback
}
