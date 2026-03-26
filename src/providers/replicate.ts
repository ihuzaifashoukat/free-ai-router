// src/providers/replicate.ts — Replicate provider definition
import type { ProviderDef } from './types.js';

/**
 * Replicate API
 * - Note: Uses predictions endpoint, not standard OpenAI chat-completions
 */
export const REPLICATE: ProviderDef = {
    id: 'replicate',
    name: 'Replicate',
    baseUrl: 'https://api.replicate.com/v1/predictions',
    apiKeyEnvVars: ['REPLICATE_API_TOKEN'],
    rateLimits: { rpm: 60 },
} as const;
