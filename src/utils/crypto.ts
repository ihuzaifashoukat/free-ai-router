// src/utils/crypto.ts — Key hashing for safe logging and cache keys
import { createHash } from 'node:crypto';

/**
 * Hash an API key to a safe, non-reversible prefix for use in logs and maps.
 * Uses SHA-256, returns first 12 hex characters.
 * @param key - Raw API key
 * @returns 12-char hex hash prefix (e.g. "a1b2c3d4e5f6")
 */
export function hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex').slice(0, 12);
}

/**
 * Mask a key for display — shows first 4 and last 4 chars only.
 * @param key - Raw API key
 * @returns Masked key (e.g. "gsk_***abc1")
 */
export function maskKey(key: string): string {
    if (key.length <= 8) return '***';
    return `${key.slice(0, 4)}***${key.slice(-4)}`;
}
