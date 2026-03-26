// src/providers/groq.ts — Groq provider definition
import type { ProviderDef } from './types.js';

/** Groq API — Free tier: 30-50 RPM per model, daily quota reset */
export const GROQ: ProviderDef = {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnvVars: ['GROQ_API_KEY'],
    rateLimits: { rpm: 30 },
} as const;
