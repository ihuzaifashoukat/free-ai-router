// src/providers/cerebras.ts — Cerebras provider definition
import type { ProviderDef } from './types.js';

/** Cerebras API — Free generous developer tier */
export const CEREBRAS: ProviderDef = {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKeyEnvVars: ['CEREBRAS_API_KEY'],
    rateLimits: { rpm: 30 },
} as const;
