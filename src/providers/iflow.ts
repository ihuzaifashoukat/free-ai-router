// src/providers/iflow.ts — iFlow provider definition
import type { ProviderDef } from './types.js';

/**
 * iFlow API
 * - Free for individual users with no request limits (key expires 7 days)
 * - OpenAI-compatible endpoint
 */
export const IFLOW: ProviderDef = {
    id: 'iflow',
    name: 'iFlow',
    baseUrl: 'https://apis.iflow.cn/v1/chat/completions',
    apiKeyEnvVars: ['IFLOW_API_KEY'],
    rateLimits: { rpm: 60 },
} as const;
