// src/providers/codestral.ts — Codestral (Mistral) provider definition
import type { ProviderDef } from './types.js';

/** Codestral/Mistral API — Free: 30 RPM, 2000/day */
export const CODESTRAL: ProviderDef = {
    id: 'codestral',
    name: 'Codestral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    apiKeyEnvVars: ['CODESTRAL_API_KEY'],
    rateLimits: { rpm: 30, rpd: 2000 },
} as const;
