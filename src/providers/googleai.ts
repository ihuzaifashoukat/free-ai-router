// src/providers/googleai.ts — Google AI provider definition
import type { ProviderDef } from './types.js';

/** Google AI (Gemini) — Free: 14.4K req/day, 30 RPM */
export const GOOGLEAI: ProviderDef = {
    id: 'googleai',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKeyEnvVars: ['GOOGLE_API_KEY'],
    rateLimits: { rpm: 30, rpd: 14400 },
} as const;
