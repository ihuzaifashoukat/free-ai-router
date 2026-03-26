// src/config/defaults.ts — Default configuration values
import type { RouterConfig } from './schema.js';

/** Sensible defaults for all RouterConfig options */
export const DEFAULT_CONFIG: RouterConfig = {
    strategy: 'smart',
    minTier: 'B',
    timeout: 30_000,
    maxRetries: 3,
    retryDelay: 1000,
    quotaThreshold: 10,
    rotateOnRateLimit: true,
    circuitBreakerThreshold: 5,
    circuitBreakerReset: 60_000,
    discoverOpenRouterModels: true,
    debug: false,
} as const;
