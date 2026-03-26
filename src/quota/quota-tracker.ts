// src/quota/quota-tracker.ts — In-memory quota state with TTL-based expiration
import type { QuotaInfo } from '../providers/types.js';
import { extractQuota } from './header-extractor.js';

/** Default TTL for quota entries: 5 minutes */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Internal quota entry with timestamp for TTL */
interface QuotaEntry {
    /** Extracted quota info */
    info: QuotaInfo;
    /** Timestamp when this entry was recorded */
    recordedAt: number;
}

/**
 * Tracks per-provider quota state in memory.
 * Entries auto-expire after TTL to prevent stale data from blocking providers.
 */
export class QuotaTracker {
    /** Keyed by `providerId` or `providerId:keyHash` for granular tracking */
    private readonly entries = new Map<string, QuotaEntry>();
    private readonly ttlMs: number;

    /**
     * @param ttlMs - Time-to-live for entries in milliseconds (default: 5 minutes)
     */
    constructor(ttlMs = DEFAULT_TTL_MS) {
        this.ttlMs = ttlMs;
    }

    /**
     * Update quota from HTTP response headers.
     * Extracts rate-limit headers and stores the quota info.
     *
     * @param providerId - Provider identifier
     * @param keyHash - Hashed API key (for per-key tracking)
     * @param headers - Response headers to extract quota from
     * @returns Extracted QuotaInfo or null if no headers found
     */
    update(
        providerId: string,
        keyHash: string,
        headers: Headers | Record<string, string> | null,
    ): QuotaInfo | null {
        if (!headers) return null;

        const info = extractQuota(headers);
        if (!info) return null;

        const now = Date.now();

        // Store at provider level (used for provider-wide scoring)
        this.entries.set(providerId, { info, recordedAt: now });

        // Also store at key level (for key-specific tracking)
        const keyKey = `${providerId}:${keyHash}`;
        this.entries.set(keyKey, { info, recordedAt: now });

        return info;
    }

    /**
     * Manually set quota for a provider (e.g. from a quota endpoint response).
     *
     * @param providerId - Provider identifier
     * @param info - Quota info to store
     */
    set(providerId: string, info: QuotaInfo): void {
        this.entries.set(providerId, { info, recordedAt: Date.now() });
    }

    /**
     * Get the current quota percentage for a provider.
     * Returns null if no data or data has expired.
     *
     * @param providerId - Provider identifier
     * @returns Quota percentage (0–100) or null
     */
    getQuotaPercent(providerId: string): number | null {
        const entry = this.entries.get(providerId);
        if (!entry) return null;

        // Check TTL
        if (Date.now() - entry.recordedAt > this.ttlMs) {
            this.entries.delete(providerId);
            return null;
        }

        return entry.info.quotaPercent;
    }

    /**
     * Get full quota info for a provider.
     *
     * @param providerId - Provider identifier
     * @returns QuotaInfo or null
     */
    getQuota(providerId: string): QuotaInfo | null {
        const entry = this.entries.get(providerId);
        if (!entry) return null;

        if (Date.now() - entry.recordedAt > this.ttlMs) {
            this.entries.delete(providerId);
            return null;
        }

        return entry.info;
    }

    /**
     * Get quota percentage for a specific key.
     *
     * @param providerId - Provider identifier
     * @param keyHash - Hashed API key
     * @returns Quota percentage or null
     */
    getKeyQuotaPercent(providerId: string, keyHash: string): number | null {
        const key = `${providerId}:${keyHash}`;
        const entry = this.entries.get(key);
        if (!entry) return null;

        if (Date.now() - entry.recordedAt > this.ttlMs) {
            this.entries.delete(key);
            return null;
        }

        return entry.info.quotaPercent;
    }

    /**
     * Check if a provider is below the given quota threshold.
     *
     * @param providerId - Provider identifier
     * @param threshold - Minimum quota % (default: 10)
     * @returns true if quota is known AND below threshold
     */
    isBelowThreshold(providerId: string, threshold = 10): boolean {
        const percent = this.getQuotaPercent(providerId);
        if (percent === null) return false; // Unknown = assume OK
        return percent <= threshold;
    }

    /**
     * Remove all expired entries (housekeeping).
     * Called periodically or before scoring.
     */
    evictExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.entries) {
            if (now - entry.recordedAt > this.ttlMs) {
                this.entries.delete(key);
            }
        }
    }

    /** Clear all quota data */
    clear(): void {
        this.entries.clear();
    }

    /** Get all tracked provider quotas (for stats/diagnostics) */
    getAll(): Record<string, { quotaPercent: number; ageMs: number }> {
        const result: Record<string, { quotaPercent: number; ageMs: number }> = {};
        const now = Date.now();

        for (const [key, entry] of this.entries) {
            // Only include provider-level keys (no colons)
            if (!key.includes(':')) {
                const ageMs = now - entry.recordedAt;
                if (ageMs <= this.ttlMs) {
                    result[key] = { quotaPercent: entry.info.quotaPercent, ageMs };
                }
            }
        }

        return result;
    }
}
