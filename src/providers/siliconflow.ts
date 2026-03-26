// src/providers/siliconflow.ts — SiliconFlow provider definition
import type { ProviderDef } from './types.js';

/** SiliconFlow API — Has quota endpoint */
export const SILICONFLOW: ProviderDef = {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.com/v1/chat/completions',
    apiKeyEnvVars: ['SILICONFLOW_API_KEY'],
    hasQuotaEndpoint: true,
    rateLimits: { rpm: 30 },
} as const;
