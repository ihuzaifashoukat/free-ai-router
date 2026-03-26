// src/providers/nvidia.ts — NVIDIA NIM provider definition
import type { ProviderDef } from './types.js';

/** NVIDIA NIM API — Free tier: 40 RPM, no credit card needed */
export const NVIDIA: ProviderDef = {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    apiKeyEnvVars: ['NVIDIA_API_KEY'],
    rateLimits: { rpm: 40 },
} as const;
