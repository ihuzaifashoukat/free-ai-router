// src/providers/perplexity.ts — Perplexity provider definition
import type { ProviderDef } from './types.js';

/** Perplexity API */
export const PERPLEXITY: ProviderDef = {
    id: 'perplexity',
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai/chat/completions',
    apiKeyEnvVars: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
    rateLimits: { rpm: 20 },
} as const;
