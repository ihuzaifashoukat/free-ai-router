// src/keys/key-manager.ts — Multi-key rotation with health tracking per provider
import type { KeyEntry, KeyState, KeyHealthReport } from '../providers/types.js';
import { hashKey, maskKey } from '../utils/crypto.js';

/**
 * Manages API keys per provider with rotation, rate-limit tracking,
 * and permanent invalidation. Uses hashed keys internally for safety.
 */
export class KeyManager {
    private readonly keys = new Map<string, KeyEntry[]>();

    /**
     * Load keys from a merged key record (explicit + env).
     * @param keyMap - Record of providerId → raw key strings
     */
    load(keyMap: Record<string, string[]>): void {
        for (const [provider, rawKeys] of Object.entries(keyMap)) {
            const entries: KeyEntry[] = rawKeys.map((key) => ({
                key,
                hash: hashKey(key),
                state: 'healthy' as KeyState,
                lastUsed: 0,
                requestCount: 0,
            }));
            const existing = this.keys.get(provider);
            if (existing) {
                // Merge: add only keys not already tracked (by hash)
                const existingHashes = new Set(existing.map((e) => e.hash));
                for (const entry of entries) {
                    if (!existingHashes.has(entry.hash)) {
                        existing.push(entry);
                    }
                }
            } else {
                this.keys.set(provider, entries);
            }
        }
    }

    /**
     * Get the best available key for a provider.
     * Priority: healthy keys first, then round-robin by lastUsed.
     * Skips: invalid keys always, rate-limited keys until their cooldown expires.
     * @param provider - Provider identifier
     * @returns Best available KeyEntry or null if all exhausted
     */
    getKey(provider: string): KeyEntry | null {
        const entries = this.keys.get(provider);
        if (!entries || entries.length === 0) return null;

        const now = Date.now();
        let best: KeyEntry | null = null;

        for (const entry of entries) {
            // Skip permanently invalid keys
            if (entry.state === 'invalid') continue;

            // Check if rate-limited key has recovered
            if (entry.state === 'rate-limited') {
                if (entry.rateLimitedUntil && now < entry.rateLimitedUntil) {
                    continue; // Still rate-limited
                }
                // Cooldown expired → mark healthy again
                entry.state = 'healthy';
                entry.rateLimitedUntil = undefined;
            }

            // Pick least-recently-used healthy key
            if (!best || entry.lastUsed < best.lastUsed) {
                best = entry;
            }
        }

        if (best) {
            best.lastUsed = now;
            best.requestCount++;
        }

        return best;
    }

    /**
     * Rotate to the next healthy key for a provider.
     * Marks the current key as "just used" and returns the next available one.
     * @param provider - Provider identifier
     * @returns Next healthy KeyEntry or null
     */
    rotateKey(provider: string): KeyEntry | null {
        return this.getKey(provider);
    }

    /**
     * Mark a key as rate-limited with a cooldown period.
     * @param provider - Provider identifier
     * @param keyOrHash - Raw key or hash prefix
     * @param retryAfterMs - Cooldown in milliseconds (default: 60s)
     */
    markKeyRateLimited(provider: string, keyOrHash: string, retryAfterMs = 60_000): void {
        const entry = this.findEntry(provider, keyOrHash);
        if (!entry) return;
        entry.state = 'rate-limited';
        entry.rateLimitedUntil = Date.now() + retryAfterMs;
    }

    /**
     * Permanently mark a key as invalid (e.g. 401/403 response).
     * Key will be skipped for the entire session.
     * @param provider - Provider identifier
     * @param keyOrHash - Raw key or hash prefix
     */
    markKeyInvalid(provider: string, keyOrHash: string): void {
        const entry = this.findEntry(provider, keyOrHash);
        if (!entry) return;
        entry.state = 'invalid';
        entry.rateLimitedUntil = undefined;
    }

    /**
     * Add a key at runtime.
     * @param provider - Provider identifier
     * @param key - Raw API key
     */
    addKey(provider: string, key: string): void {
        const hash = hashKey(key);
        let entries = this.keys.get(provider);
        if (!entries) {
            entries = [];
            this.keys.set(provider, entries);
        }
        // Prevent duplicates
        if (entries.some((e) => e.hash === hash)) return;
        entries.push({
            key,
            hash,
            state: 'healthy',
            lastUsed: 0,
            requestCount: 0,
        });
    }

    /**
     * Get health report for all keys of a provider.
     * @param provider - Provider identifier
     * @returns KeyHealthReport
     */
    getKeyHealth(provider: string): KeyHealthReport {
        const entries = this.keys.get(provider) ?? [];
        return {
            providerId: provider,
            total: entries.length,
            healthy: entries.filter((e) => e.state === 'healthy').length,
            rateLimited: entries.filter((e) => e.state === 'rate-limited').length,
            invalid: entries.filter((e) => e.state === 'invalid').length,
            keys: entries.map((e) => ({
                hash: e.hash,
                state: e.state,
                requestCount: e.requestCount,
                rateLimitedUntil: e.rateLimitedUntil,
            })),
        };
    }

    /**
     * Get all raw keys for a provider (use sparingly — prefer hashes).
     * @param provider - Provider identifier
     * @returns Array of raw key strings
     */
    getAllKeys(provider: string): string[] {
        return (this.keys.get(provider) ?? []).map((e) => e.key);
    }

    /**
     * Get masked key representation for error messages.
     * @param provider - Provider identifier
     * @param keyOrHash - Raw key or hash
     * @returns Masked key string
     */
    getMaskedKey(provider: string, keyOrHash: string): string {
        const entry = this.findEntry(provider, keyOrHash);
        if (!entry) return '***unknown***';
        return maskKey(entry.key);
    }

    /**
     * Check if a provider has any keys configured.
     * @param provider - Provider identifier
     * @returns true if at least one key exists
     */
    hasKeys(provider: string): boolean {
        const entries = this.keys.get(provider);
        return !!entries && entries.length > 0;
    }

    /**
     * Check if a provider has any healthy keys available.
     * @param provider - Provider identifier
     * @returns true if at least one healthy key exists
     */
    hasHealthyKeys(provider: string): boolean {
        const entries = this.keys.get(provider);
        if (!entries) return false;
        const now = Date.now();
        return entries.some((e) => {
            if (e.state === 'invalid') return false;
            if (e.state === 'rate-limited' && e.rateLimitedUntil && now < e.rateLimitedUntil) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get the soonest recovery time for rate-limited keys.
     * @param provider - Provider identifier
     * @returns Earliest recovery timestamp, or null
     */
    getEarliestRecovery(provider: string): { hash: string; recoversAt: number; inMs: number } | null {
        const entries = this.keys.get(provider);
        if (!entries) return null;

        let earliest: { hash: string; recoversAt: number; inMs: number } | null = null;
        const now = Date.now();

        for (const e of entries) {
            if (e.state === 'rate-limited' && e.rateLimitedUntil) {
                const inMs = Math.max(0, e.rateLimitedUntil - now);
                if (!earliest || e.rateLimitedUntil < earliest.recoversAt) {
                    earliest = { hash: e.hash, recoversAt: e.rateLimitedUntil, inMs };
                }
            }
        }

        return earliest;
    }

    /** Get all provider IDs that have keys configured */
    getConfiguredProviders(): string[] {
        return [...this.keys.keys()].filter((p) => {
            const entries = this.keys.get(p);
            return entries && entries.length > 0;
        });
    }

    /** Find a key entry by raw key or hash prefix */
    private findEntry(provider: string, keyOrHash: string): KeyEntry | null {
        const entries = this.keys.get(provider);
        if (!entries) return null;
        // Try matching by raw key first, then by hash
        return (
            entries.find((e) => e.key === keyOrHash) ??
            entries.find((e) => e.hash === keyOrHash) ??
            null
        );
    }
}
