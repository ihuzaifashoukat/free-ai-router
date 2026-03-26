// src/keys/env-resolver.ts — Read API keys from environment variables

/** Provider → env var name(s) mapping */
const PROVIDER_ENV_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['nvidia', ['NVIDIA_API_KEY']],
    ['groq', ['GROQ_API_KEY']],
    ['cerebras', ['CEREBRAS_API_KEY']],
    ['sambanova', ['SAMBANOVA_API_KEY']],
    ['openrouter', ['OPENROUTER_API_KEY']],
    ['huggingface', ['HUGGINGFACE_API_KEY', 'HF_TOKEN']],
    ['deepinfra', ['DEEPINFRA_API_KEY', 'DEEPINFRA_TOKEN']],
    ['fireworks', ['FIREWORKS_API_KEY']],
    ['codestral', ['CODESTRAL_API_KEY']],
    ['together', ['TOGETHER_API_KEY']],
    ['googleai', ['GOOGLE_API_KEY']],
    ['siliconflow', ['SILICONFLOW_API_KEY']],
    ['scaleway', ['SCALEWAY_API_KEY']],
    ['hyperbolic', ['HYPERBOLIC_API_KEY']],
    ['cloudflare', ['CLOUDFLARE_API_TOKEN']],
    ['perplexity', ['PERPLEXITY_API_KEY', 'PPLX_API_KEY']],
    ['zai', ['ZAI_API_KEY']],
] as const;

/** Catch-all env var name */
const CATCH_ALL_ENV = 'FREE_AI_ROUTER_KEYS';

/**
 * Safely read an env var, handling edge runtimes where process.env may not exist.
 * @param name - Environment variable name
 * @returns Value or undefined
 */
function getEnv(name: string): string | undefined {
    try {
        return globalThis.process?.env?.[name];
    } catch {
        return undefined;
    }
}

/**
 * Resolve API keys from environment variables for all known providers.
 * Also parses the catch-all FREE_AI_ROUTER_KEYS format.
 *
 * @returns Record of providerId → array of API keys
 */
export function resolveKeysFromEnv(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    // 1. Read provider-specific env vars
    for (const [providerId, envVars] of PROVIDER_ENV_MAP) {
        for (const varName of envVars) {
            const val = getEnv(varName)?.trim();
            if (val) {
                if (!result[providerId]) result[providerId] = [];
                // Support comma-separated keys in a single env var
                const keys = val.split(',').map((k) => k.trim()).filter(Boolean);
                for (const key of keys) {
                    if (!result[providerId]!.includes(key)) {
                        result[providerId]!.push(key);
                    }
                }
            }
        }
    }

    // 2. Parse catch-all: FREE_AI_ROUTER_KEYS=groq:key1,groq:key2,nvidia:key3
    const catchAll = getEnv(CATCH_ALL_ENV)?.trim();
    if (catchAll) {
        const entries = catchAll.split(',').map((s) => s.trim()).filter(Boolean);
        for (const entry of entries) {
            const colonIdx = entry.indexOf(':');
            if (colonIdx <= 0) continue; // Skip malformed entries
            const provider = entry.slice(0, colonIdx).trim().toLowerCase();
            const key = entry.slice(colonIdx + 1).trim();
            if (!provider || !key) continue;

            if (!result[provider]) result[provider] = [];
            if (!result[provider]!.includes(key)) {
                result[provider]!.push(key);
            }
        }
    }

    return result;
}

/**
 * Merge explicitly provided API keys with env-resolved keys.
 * Explicit keys take priority (added first).
 *
 * @param explicit - Keys from RouterConfig.apiKeys
 * @param fromEnv - Keys from environment variables
 * @returns Merged record of providerId → key arrays
 */
export function mergeKeys(
    explicit?: Record<string, string | string[]>,
    fromEnv?: Record<string, string[]>,
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    // Add explicit keys first
    if (explicit) {
        for (const [provider, keys] of Object.entries(explicit)) {
            const arr = Array.isArray(keys) ? keys : [keys];
            const filtered = arr.map((k) => k.trim()).filter(Boolean);
            if (filtered.length > 0) {
                result[provider] = filtered;
            }
        }
    }

    // Merge env keys (only add if not already present)
    if (fromEnv) {
        for (const [provider, keys] of Object.entries(fromEnv)) {
            if (!result[provider]) {
                result[provider] = [...keys];
            } else {
                for (const key of keys) {
                    if (!result[provider]!.includes(key)) {
                        result[provider]!.push(key);
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Get the Cloudflare account ID from env (special case — not an API key).
 * @returns Account ID or undefined
 */
export function getCloudflareAccountId(): string | undefined {
    return getEnv('CLOUDFLARE_ACCOUNT_ID')?.trim() || undefined;
}
