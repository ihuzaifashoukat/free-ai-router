// src/providers/qwen.ts — Alibaba Cloud DashScope provider definition
import type { ProviderDef } from './types.js';

/**
 * Alibaba Cloud (DashScope) API
 * - Free tier: 1M tokens per model (Singapore region only, valid for 90 days)
 * - Uses OpenAI-compatible endpoint
 */
export const QWEN: ProviderDef = {
    id: 'qwen',
    name: 'Alibaba Cloud (DashScope)',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyEnvVars: ['DASHSCOPE_API_KEY'],
    rateLimits: { rpm: 60 }, // Default safe guess if not provided
} as const;
