// src/providers/sambanova.ts — SambaNova provider definition
import type { ProviderDef } from './types.js';

/** SambaNova API — Free tier available */
export const SAMBANOVA: ProviderDef = {
    id: 'sambanova',
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1/chat/completions',
    apiKeyEnvVars: ['SAMBANOVA_API_KEY'],
    rateLimits: { rpm: 30 },
} as const;
