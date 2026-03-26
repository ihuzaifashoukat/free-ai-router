// src/providers/together.ts — Together AI provider definition
import type { ProviderDef } from './types.js';

/** Together AI API */
export const TOGETHER: ProviderDef = {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    apiKeyEnvVars: ['TOGETHER_API_KEY'],
    rateLimits: { rpm: 60 },
} as const;
