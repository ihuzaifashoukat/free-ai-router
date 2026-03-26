// src/providers/scaleway.ts — Scaleway provider definition
import type { ProviderDef } from './types.js';

/** Scaleway AI — Free: 1M tokens */
export const SCALEWAY: ProviderDef = {
    id: 'scaleway',
    name: 'Scaleway',
    baseUrl: 'https://api.scaleway.ai/v1/chat/completions',
    apiKeyEnvVars: ['SCALEWAY_API_KEY'],
    rateLimits: { tpm: 50000 },
} as const;
