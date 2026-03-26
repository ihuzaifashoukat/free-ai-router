// src/providers/hyperbolic.ts — Hyperbolic provider definition
import type { ProviderDef } from './types.js';

/** Hyperbolic API — Free: $1 trial credits */
export const HYPERBOLIC: ProviderDef = {
    id: 'hyperbolic',
    name: 'Hyperbolic',
    baseUrl: 'https://api.hyperbolic.xyz/v1/chat/completions',
    apiKeyEnvVars: ['HYPERBOLIC_API_KEY'],
    rateLimits: { rpm: 30 },
} as const;
