// src/providers/cloudflare.ts — Cloudflare Workers AI provider definition
import type { ProviderDef } from './types.js';

/** Cloudflare Workers AI — Free: 10k neurons/day, 300 RPM. Requires account ID. */
export const CLOUDFLARE: ProviderDef = {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/v1/chat/completions',
    apiKeyEnvVars: ['CLOUDFLARE_API_TOKEN'],
    requiresAccountId: true,
    accountIdEnvVar: 'CLOUDFLARE_ACCOUNT_ID',
    rateLimits: { rpm: 300 },
} as const;
