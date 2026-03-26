import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KeyManager } from '../../src/keys/key-manager.js';

describe('KeyManager', () => {
    let keyManager: KeyManager;

    beforeEach(() => {
        keyManager = new KeyManager();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns null when no keys are configured', () => {
        expect(keyManager.getKey('groq')).toBeNull();
    });

    it('loads keys from config and returns the best key', () => {
        keyManager.load({ groq: ['key1', 'key2'] });
        const keyEntry = keyManager.getKey('groq');
        expect(keyEntry).not.toBeNull();
        expect(['key1', 'key2']).toContain(keyEntry?.key);
    });

    it('rotates keys on rate limit in round-robin fashion', () => {
        keyManager.load({ groq: ['key1', 'key2'] });

        // Use first key
        const key1 = keyManager.getKey('groq');
        expect(key1).not.toBeNull();
        expect(key1?.state).toBe('healthy');

        keyManager.markKeyRateLimited('groq', key1!.key, 60000);

        // Should return the other key
        const key2 = keyManager.getKey('groq');
        expect(key2).not.toBeNull();
        expect(key2?.key).not.toBe(key1?.key);
        expect(key2?.state).toBe('healthy');
    });

    it('skips invalid keys permanently', () => {
        keyManager.load({ groq: ['key1', 'key2'] });

        keyManager.markKeyInvalid('groq', 'key1');

        // Request key twice, should only return key2
        const k1 = keyManager.getKey('groq');
        const k2 = keyManager.getKey('groq');

        expect(k1?.key).toBe('key2');
        expect(k2?.key).toBe('key2');
    });

    it('respects rateLimitedUntil timestamp', () => {
        keyManager.load({ groq: ['key1'] });

        keyManager.markKeyRateLimited('groq', 'key1', 60000); // 60s cooldown

        expect(keyManager.getKey('groq')).toBeNull();

        // Advance time by 30s
        vi.advanceTimersByTime(30000);
        expect(keyManager.getKey('groq')).toBeNull(); // Still rate-limited

        // Advance time by another 31s
        vi.advanceTimersByTime(31000);

        const key = keyManager.getKey('groq');
        expect(key).not.toBeNull();
        expect(key?.key).toBe('key1');
        expect(key?.state).toBe('healthy'); // Recovers automatically
    });

    it('returns null when all keys are exhausted', () => {
        keyManager.load({ groq: ['key1', 'key2'] });

        keyManager.markKeyRateLimited('groq', 'key1');
        keyManager.markKeyRateLimited('groq', 'key2');

        expect(keyManager.getKey('groq')).toBeNull();
    });

    it('accepts array of keys and deduplicates them', () => {
        keyManager.addKey('groq', 'key1');
        keyManager.addKey('groq', 'key1');

        const health = keyManager.getKeyHealth('groq');
        expect(health.total).toBe(1);
    });

    it('hasHealthyKeys and hasKeys work properly', () => {
        expect(keyManager.hasKeys('groq')).toBe(false);
        expect(keyManager.hasHealthyKeys('groq')).toBe(false);

        keyManager.addKey('groq', 'key1');
        expect(keyManager.hasKeys('groq')).toBe(true);
        expect(keyManager.hasHealthyKeys('groq')).toBe(true);

        keyManager.markKeyInvalid('groq', 'key1');
        expect(keyManager.hasKeys('groq')).toBe(true);
        expect(keyManager.hasHealthyKeys('groq')).toBe(false);
    });
});
