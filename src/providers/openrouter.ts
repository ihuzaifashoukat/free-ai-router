// src/providers/openrouter.ts — OpenRouter provider definition
import type { ProviderDef } from './types.js';

/** OpenRouter API — Free :free suffix models, 50 req/day (<$10) */
export const OPENROUTER: ProviderDef = {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKeyEnvVars: ['OPENROUTER_API_KEY'],
    hasQuotaEndpoint: true,
    rateLimits: { rpd: 50 },
    specialHeaders: {
        'HTTP-Referer': 'https://github.com/ihuzaifashoukat/free-ai-router',
        'X-Title': 'free-ai-router',
    },
} as const;
