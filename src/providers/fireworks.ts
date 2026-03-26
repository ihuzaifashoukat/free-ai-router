// src/providers/fireworks.ts — Fireworks AI provider definition
import type { ProviderDef } from './types.js';

/** Fireworks AI — Free: $1 initial credits, 10 RPM without payment */
export const FIREWORKS: ProviderDef = {
    id: 'fireworks',
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
    apiKeyEnvVars: ['FIREWORKS_API_KEY'],
    rateLimits: { rpm: 10 },
} as const;
