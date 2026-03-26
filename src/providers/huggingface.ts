// src/providers/huggingface.ts — HuggingFace Inference provider definition
import type { ProviderDef } from './types.js';

/** HuggingFace Inference — Free monthly credits ~$0.10 */
export const HUGGINGFACE: ProviderDef = {
    id: 'huggingface',
    name: 'HuggingFace',
    baseUrl: 'https://router.huggingface.co/v1/chat/completions',
    apiKeyEnvVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'],
    rateLimits: { rpm: 30 },
} as const;
