// src/quota/header-extractor.ts — Parse rate-limit headers from HTTP responses
import type { QuotaInfo } from '../providers/types.js';

/**
 * Header name pairs to check, in priority order.
 * Each pair is [remaining, limit]. First match wins.
 */
const HEADER_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ['x-ratelimit-remaining-requests', 'x-ratelimit-limit-requests'],
    ['x-ratelimit-remaining', 'x-ratelimit-limit'],
    ['ratelimit-remaining-requests', 'ratelimit-limit-requests'],
    ['ratelimit-remaining', 'ratelimit-limit'],
] as const;

/**
 * Extract rate-limit quota information from HTTP response headers.
 * Checks multiple header name variants in a single pass.
 *
 * @param headers - Response headers (Headers object, plain object, or entries)
 * @returns QuotaInfo with remaining/limit/percent, or null if no headers found
 */
export function extractQuota(headers: HeadersLike): QuotaInfo | null {
    const get = normalizeHeaderGetter(headers);
    if (!get) return null;

    for (const [remainingKey, limitKey] of HEADER_PAIRS) {
        const remainingRaw = get(remainingKey);
        const limitRaw = get(limitKey);

        if (remainingRaw == null || limitRaw == null) continue;

        const remaining = parseInt(remainingRaw, 10);
        const limit = parseInt(limitRaw, 10);

        if (isNaN(remaining) || isNaN(limit) || limit <= 0) continue;

        const quotaPercent = clampPercent(Math.round((remaining / limit) * 100));
        return { remaining, limit, quotaPercent };
    }

    return null;
}

/**
 * Extract the Retry-After value from headers.
 * @param headers - Response headers
 * @returns Retry-after in milliseconds, or null
 */
export function extractRetryAfter(headers: HeadersLike): number | null {
    const get = normalizeHeaderGetter(headers);
    if (!get) return null;

    const raw = get('retry-after');
    if (raw == null) return null;

    // If it's a number, it's seconds
    const seconds = parseFloat(raw);
    if (!isNaN(seconds) && seconds > 0) {
        return Math.ceil(seconds * 1000);
    }

    // If it's a date string
    const date = Date.parse(raw);
    if (!isNaN(date)) {
        const ms = date - Date.now();
        return ms > 0 ? ms : 1000;
    }

    return null;
}

/** Clamp a value to [0, 100] */
function clampPercent(v: number): number {
    return Math.max(0, Math.min(100, v));
}

/** Flexible header input type */
type HeadersLike =
    | Headers
    | Record<string, string | string[] | undefined>
    | Iterable<[string, string]>
    | null
    | undefined;

/** Normalize different header types into a simple getter */
function normalizeHeaderGetter(
    headers: HeadersLike,
): ((name: string) => string | null) | null {
    if (headers == null) return null;

    // Web standard Headers object
    if (typeof (headers as Headers).get === 'function') {
        return (name: string) => (headers as Headers).get(name);
    }

    // Iterable of [key, value] entries
    if (Symbol.iterator in (headers as Iterable<[string, string]>)) {
        const map = new Map<string, string>();
        for (const [k, v] of headers as Iterable<[string, string]>) {
            map.set(k.toLowerCase(), v);
        }
        return (name: string) => map.get(name.toLowerCase()) ?? null;
    }

    // Plain object
    if (typeof headers === 'object') {
        return (name: string) => {
            const obj = headers as Record<string, string | string[] | undefined>;
            // Check exact and lowercase
            const val = obj[name] ?? obj[name.toLowerCase()];
            if (val == null) return null;
            return Array.isArray(val) ? val[0] ?? null : val;
        };
    }

    return null;
}
