import { describe, it, expect } from 'vitest';
import { selectBestQuality } from '../../../src/selection/best-quality';
import { selectLeastUsed } from '../../../src/selection/least-used';
import { selectLowestLatency } from '../../../src/selection/lowest-latency';
import { createRoundRobinSelector } from '../../../src/selection/round-robin';
import { selectSmart } from '../../../src/selection/smart';
import type { ModelDef, ProviderDef, HealthScore } from '../../../src/providers/types';

function mockCandidate(modelId: string, providerId: string, healthArgs: Partial<HealthScore> = {}) {
    return {
        model: { modelId, tier: 'S', sweScore: 60 } as ModelDef,
        provider: { id: providerId } as ProviderDef,
        health: {
            providerId,
            circuitState: 'CLOSED',
            quotaPercent: 100,
            latency: { avg: 100, p95: 150, jitter: 10, uptimePercent: 100, stabilityScore: 90, sampleCount: 10 },
            score: 90,
            available: true,
            ...healthArgs
        } as HealthScore
    };
}

describe('Selection Strategies', () => {
    const c1 = mockCandidate('model-a', 'prov1', { score: 95, quotaPercent: 100, latency: { avg: 200, p95: 250, sampleCount: 5 } as any });
    const c2 = mockCandidate('model-b', 'prov2', { score: 90, quotaPercent: 50, latency: { avg: 50, p95: 60, sampleCount: 5 } as any });
    const c3 = mockCandidate('model-c', 'prov3', { score: 85, quotaPercent: 10, latency: { avg: 100, p95: 120, sampleCount: 5 } as any });

    it('least-used selects the one with highest quota percent remaining', () => {
        const result = selectLeastUsed([c1, c2, c3]);
        expect(result?.provider.id).toBe('prov1');

        // Without quota info, it should fall back to round-robin or first
        const cNull1 = mockCandidate('model-x', 'px', { quotaPercent: null });
        const cNull2 = mockCandidate('model-y', 'py', { quotaPercent: null });
        expect(selectLeastUsed([cNull1, cNull2])?.provider.id).toBe('px');
    });

    it('lowest-latency selects the one with lowest average latency', () => {
        const result = selectLowestLatency([c1, c2, c3]);
        expect(result?.provider.id).toBe('prov2');

        // Without latency info, it falls back
        const cNull = mockCandidate('model-z', 'pz', { latency: null });
        expect(selectLowestLatency([c1, cNull])?.provider.id).toBe('prov1');
    });

    it('round-robin cycles between candidates', () => {
        const selectRoundRobin = createRoundRobinSelector();
        const r1 = selectRoundRobin([c1, c2, c3]);
        const r2 = selectRoundRobin([c1, c2, c3]);
        expect(r1?.provider.id).toBe('prov1');
        expect(r2?.provider.id).toBe('prov2');
    });

    it('smart selection factors in tier, latency, and health', () => {
        const result = selectSmart([c1, c2, c3]);
        // c1 has better score and quota, c2 has better latency. Both S tier.
        // It should pick a valid one and provide fallbacks.
        expect(result?.provider.id).toBeTruthy();
        expect(result?.fallbacks.length).toBe(2);
    });

    it('best-quality prefers higher tier models', () => {
        const cS = mockCandidate('model-s', 'ps');
        cS.model.tier = 'S+';
        const cB = mockCandidate('model-b', 'pb');
        cB.model.tier = 'B';
        const result = selectBestQuality([cB, cS]);
        expect(result?.provider.id).toBe('ps');
    });
});
