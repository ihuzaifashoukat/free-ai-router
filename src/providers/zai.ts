// src/providers/zai.ts — Z.AI provider definition
import type { ProviderDef } from './types.js';

/** Z.AI API — Non-standard path */
export const ZAI: ProviderDef = {
    id: 'zai',
    name: 'Z.AI',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
    apiKeyEnvVars: ['ZAI_API_KEY'],
    rateLimits: { rpm: 30 },
} as const;
