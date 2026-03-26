// src/providers/deepinfra.ts — DeepInfra provider definition
import type { ProviderDef } from './types.js';

/** DeepInfra API — Free: 200 concurrent requests */
export const DEEPINFRA: ProviderDef = {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
    apiKeyEnvVars: ['DEEPINFRA_API_KEY', 'DEEPINFRA_TOKEN'],
    rateLimits: { rpm: 60 },
} as const;
