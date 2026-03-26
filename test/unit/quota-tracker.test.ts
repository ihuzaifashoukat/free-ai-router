import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QuotaTracker } from '../../src/quota/quota-tracker.js';

describe('QuotaTracker', () => {
    let quotaTracker: QuotaTracker;

    beforeEach(() => {
        quotaTracker = new QuotaTracker();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns null when headers are absent', () => {
        const info = quotaTracker.update('groq', 'hash123', new Headers());
        expect(info).toBeNull();
        expect(quotaTracker.getQuotaPercent('groq')).toBeNull();
    });

    it('extracts quotaPercent from x-ratelimit-remaining headers', () => {
        const headers = new Headers({
            'x-ratelimit-remaining': '45',
            'x-ratelimit-limit': '100'
        });

        const info = quotaTracker.update('groq', 'hash123', headers);

        expect(info).not.toBeNull();
        expect(info?.remaining).toBe(45);
        expect(info?.limit).toBe(100);
        expect(info?.quotaPercent).toBe(45);
        expect(quotaTracker.getQuotaPercent('groq')).toBe(45);
    });

    it('clamps to 0-100', () => {
        const headers1 = new Headers({
            'x-ratelimit-remaining': '120',
            'x-ratelimit-limit': '100'
        });
        const info1 = quotaTracker.update('groq', 'hash123', headers1);
        expect(info1?.quotaPercent).toBe(100);

        const headers2 = new Headers({
            'x-ratelimit-remaining': '-5',
            'x-ratelimit-limit': '100'
        });
        const info2 = quotaTracker.update('cerebras', 'hash456', headers2);
        expect(info2?.quotaPercent).toBe(0);
    });

    it('handles all 4 header name variants', () => {
        const variants = [
            { req: 'x-ratelimit-remaining-requests', lim: 'x-ratelimit-limit-requests' },
            { req: 'x-ratelimit-remaining', lim: 'x-ratelimit-limit' },
            { req: 'ratelimit-remaining-requests', lim: 'ratelimit-limit-requests' },
            { req: 'ratelimit-remaining', lim: 'ratelimit-limit' }
        ];

        variants.forEach(({ req, lim }, idx) => {
            const headers = new Headers();
            headers.set(req, '20');
            headers.set(lim, '100');

            const provider = `provider-${idx}`;
            const info = quotaTracker.update(provider, 'hash', headers);

            expect(info).not.toBeNull();
            expect(info?.quotaPercent).toBe(20);
        });
    });

    it('expires data after TTL', () => {
        const headers = new Headers({
            'x-ratelimit-remaining': '10',
            'x-ratelimit-limit': '100'
        });
        quotaTracker.update('groq', 'hash123', headers);

        expect(quotaTracker.getQuotaPercent('groq')).toBe(10);

        // Default TTL is 5 minutes (300,000 ms)
        vi.advanceTimersByTime(300_001);

        expect(quotaTracker.getQuotaPercent('groq')).toBeNull();
    });

    it('check isBelowThreshold', () => {
        const headers = new Headers({
            'x-ratelimit-remaining': '5',
            'x-ratelimit-limit': '100'
        });
        quotaTracker.update('groq', 'hash123', headers);

        expect(quotaTracker.isBelowThreshold('groq', 10)).toBe(true);
        expect(quotaTracker.isBelowThreshold('groq', 2)).toBe(false);

        // Unknown provider should not be below threshold
        expect(quotaTracker.isBelowThreshold('unknown', 10)).toBe(false);
    });

    it('can manually set quota and retrieve full info', () => {
        const info = { remaining: 50, limit: 100, quotaPercent: 50 };
        quotaTracker.set('customId', info);
        expect(quotaTracker.getQuota('customId')).toEqual(info);
        expect(quotaTracker.getQuotaPercent('customId')).toBe(50);

        // TTL expires full info object
        vi.advanceTimersByTime(300_001);
        expect(quotaTracker.getQuota('customId')).toBeNull();
    });

    it('tracks quota per key instance and evaluates TTL', () => {
        const headers = new Headers({
            'x-ratelimit-remaining': '90',
            'x-ratelimit-limit': '100'
        });
        quotaTracker.update('provX', 'keyHashX', headers);

        expect(quotaTracker.getKeyQuotaPercent('provX', 'keyHashX')).toBe(90);

        vi.advanceTimersByTime(300_001);
        expect(quotaTracker.getKeyQuotaPercent('provX', 'keyHashX')).toBeNull();
    });

    it('evicts expired entries', () => {
        quotaTracker.set('p1', { remaining: 1, limit: 10, quotaPercent: 10 });
        quotaTracker.set('p2', { remaining: 8, limit: 10, quotaPercent: 80 });

        vi.advanceTimersByTime(200_000); // 200s
        quotaTracker.set('p3', { remaining: 5, limit: 10, quotaPercent: 50 });

        vi.advanceTimersByTime(110_000); // 310s total for p1, p2 (expired), 110s for p3 (alive)

        quotaTracker.evictExpired();

        expect(quotaTracker.getQuotaPercent('p1')).toBeNull();
        expect(quotaTracker.getQuotaPercent('p2')).toBeNull();
        expect(quotaTracker.getQuotaPercent('p3')).toBe(50);
    });

    it('can clear all entries', () => {
        quotaTracker.set('test1', { remaining: 10, limit: 10, quotaPercent: 100 });
        quotaTracker.clear();
        expect(quotaTracker.getQuota('test1')).toBeNull();
    });

    it('getAll returns only unexpired provider-level quotas', () => {
        const headers = new Headers({
            'x-ratelimit-remaining': '40',
            'x-ratelimit-limit': '100'
        });
        // update adds both provider-level and key-level
        quotaTracker.update('provY', 'hashY', headers);

        const all = quotaTracker.getAll();
        // Should only contain 'provY', not 'provY:hashY'
        expect(Object.keys(all).length).toBe(1);
        expect(all['provY']?.quotaPercent).toBe(40);
        expect(all['provY']?.ageMs).toBe(0);

        // Advance a bit, test expiration omission
        vi.advanceTimersByTime(300_001);
        const allExpired = quotaTracker.getAll();
        expect(Object.keys(allExpired).length).toBe(0);
    });
});
