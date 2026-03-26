// src/config/schema.ts — RouterConfig Zod schema with validation
import { z } from 'zod';
import type { Strategy, ModelTier } from '../providers/types.js';

/** Valid model tier values */
const TIER_VALUES: readonly [string, ...string[]] = [
    'S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C',
];

/** Valid strategy values */
const STRATEGY_VALUES: readonly [string, ...string[]] = [
    'best', 'fastest', 'least-used', 'round-robin', 'smart',
];

/** Zod schema for RouterConfig — validates and coerces user input */
export const RouterConfigSchema = z.object({
    /** API keys per provider — string or array of strings */
    apiKeys: z.record(
        z.string(),
        z.union([z.string(), z.array(z.string())])
    ).optional(),

    /** Which providers to use (default: all configured) */
    providers: z.array(z.string()).optional(),

    /** Model selection strategy */
    strategy: z.enum(STRATEGY_VALUES as readonly [Strategy, ...Strategy[]]).default('smart'),

    /** Minimum model quality tier */
    minTier: z.enum(TIER_VALUES as readonly [ModelTier, ...ModelTier[]]).default('B'),

    /** Fallback chain — provider IDs in priority order */
    fallbackChain: z.array(z.string()).optional(),

    /** Request timeout in ms */
    timeout: z.number().int().min(1000).max(300_000).default(30_000),

    /** Max retry attempts per request */
    maxRetries: z.number().int().min(0).max(10).default(3),

    /** Base delay for exponential backoff in ms */
    retryDelay: z.number().int().min(100).max(30_000).default(1000),

    /** Quota % below which to avoid a provider */
    quotaThreshold: z.number().min(0).max(100).default(10),

    /** Rotate to next key on rate limit */
    rotateOnRateLimit: z.boolean().default(true),

    /** Failures before circuit opens */
    circuitBreakerThreshold: z.number().int().min(1).max(50).default(5),

    /** Ms before circuit transitions to half-open */
    circuitBreakerReset: z.number().int().min(5000).max(600_000).default(60_000),

    /** Explicit model ID allowlist */
    models: z.array(z.string()).optional(),

    /** Model ID blocklist */
    excludeModels: z.array(z.string()).optional(),

    /** Fetch live :free models from OpenRouter */
    discoverOpenRouterModels: z.boolean().default(true),

    /** Enable debug logging */
    debug: z.boolean().default(false),

    /** Custom logger function */
    logger: z.function()
        .args(z.string(), z.unknown().optional())
        .returns(z.void())
        .optional(),

    /** Override base URL for self-hosted compatibility */
    baseURL: z.string().url().optional(),

    /** Default model when none specified in request */
    defaultModel: z.string().optional(),
}).strict();

/** Validated and defaulted RouterConfig type */
export type RouterConfig = z.infer<typeof RouterConfigSchema>;

/** Raw input type (all fields optional, pre-validation) */
export type RouterConfigInput = z.input<typeof RouterConfigSchema>;

/**
 * Parse and validate a raw config object into a fully-defaulted RouterConfig.
 * @param input - Raw configuration object (all fields optional)
 * @returns Validated config with defaults applied
 * @throws ZodError if validation fails
 */
export function parseConfig(input?: RouterConfigInput): RouterConfig {
    return RouterConfigSchema.parse(input ?? {});
}
