// src/providers/index.ts — Barrel re-exports for the providers module
export type {
    ProviderDef, ModelDef, ModelTier, RateLimitInfo,
    CircuitStateType, KeyState, Strategy, KeyEntry,
    CircuitState, CircuitStateInfo, QuotaInfo,
    LatencyStats, LatencyColor, HealthScore,
    RouterStats, ModelResolution, PingResult, KeyHealthReport,
    RequestEvent, ResponseEvent, FallbackEvent,
    RateLimitEvent, CircuitEvent, ErrorEvent, RouterEventMap,
} from './types.js';

export { TIER_RANK } from './types.js';

export {
    PROVIDER_REGISTRY, MODEL_CATALOG,
    getProvider, getProviderIds,
    getModelsForProvider, getModelsByTier,
    findModel, inferTier, OPENROUTER_TIER_MAP,
} from './registry.js';

// Re-export individual provider defs for advanced usage
export { NVIDIA } from './nvidia.js';
export { GROQ } from './groq.js';
export { CEREBRAS } from './cerebras.js';
export { SAMBANOVA } from './sambanova.js';
export { OPENROUTER } from './openrouter.js';
export { HUGGINGFACE } from './huggingface.js';
export { DEEPINFRA } from './deepinfra.js';
export { FIREWORKS } from './fireworks.js';
export { CODESTRAL } from './codestral.js';
export { TOGETHER } from './together.js';
export { GOOGLEAI } from './googleai.js';
export { SILICONFLOW } from './siliconflow.js';
export { SCALEWAY } from './scaleway.js';
export { HYPERBOLIC } from './hyperbolic.js';
export { CLOUDFLARE } from './cloudflare.js';
export { PERPLEXITY } from './perplexity.js';
export { ZAI } from './zai.js';
export { QWEN } from './qwen.js';
export { IFLOW } from './iflow.js';
export { REPLICATE } from './replicate.js';
