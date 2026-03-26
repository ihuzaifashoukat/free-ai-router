import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FreeAIRouterCore } from '../../../src/router.js';
import type { ProviderDef, ModelDef } from '../../../src/providers/types.js';

describe('Best Quality Selection Strategy', () => {
    let router: FreeAIRouterCore;

    // Mock providers
    const provA: ProviderDef = { id: 'provA', name: 'Provider A', baseUrl: 'http://a', apiKeyEnvVars: [], rateLimits: { rpm: 60 } };
    const provB: ProviderDef = { id: 'provB', name: 'Provider B', baseUrl: 'http://b', apiKeyEnvVars: [], rateLimits: { rpm: 60 } };
    const provC: ProviderDef = { id: 'provC', name: 'Provider C', baseUrl: 'http://c', apiKeyEnvVars: [], rateLimits: { rpm: 60 } };

    // Mock models
    const modelLow: ModelDef = { modelId: 'model-low', label: 'Low', tier: 'B', sweScore: 20, contextK: 128, providerIds: ['provA'], isFree: true };
    const modelHigh: ModelDef = { modelId: 'model-high', label: 'High', tier: 'S', sweScore: 60, contextK: 128, providerIds: ['provB'], isFree: true };
    const modelTop: ModelDef = { modelId: 'model-top', label: 'Top', tier: 'S+', sweScore: 75, contextK: 128, providerIds: ['provC'], isFree: true };
    const modelMid: ModelDef = { modelId: 'model-mid', label: 'Mid', tier: 'A', sweScore: 40, contextK: 128, providerIds: ['provA'], isFree: true };

    beforeEach(() => {
        router = new FreeAIRouterCore({ providers: ['provA', 'provB', 'provC'], discoverOpenRouterModels: false });
        (router as any).modelCatalog = [];
        (router as any).providerRegistry.clear();
        router.addProvider(provA, [modelLow, modelMid]);
        router.addProvider(provB, [modelHigh]);
        router.addProvider(provC, [modelTop]);
    });

    it('picks highest SWE-tier model', async () => {
        const resolution = await router.resolveModel({ model: 'free:best' });
        expect(resolution.model.modelId).toBe('model-top');
        expect(resolution.provider.id).toBe('provC');
    });

    it('skips providers with open circuit', async () => {
        vi.spyOn((router as any).healthAggregator, 'getScore').mockImplementation((pId: any) => {
            if (pId === 'provC') return { providerId: pId, score: 0, available: false, circuitState: 'OPEN' as const, quotaPercent: 100, latency: null };
            return { providerId: pId, score: 100, available: true, circuitState: 'CLOSED' as const, quotaPercent: 100, latency: null };
        });

        const resolution = await router.resolveModel({ model: 'free:best' });
        expect(resolution.model.modelId).toBe('model-high');
        expect(resolution.provider.id).toBe('provB');
    });

    it('skips providers below quota threshold', async () => {
        vi.spyOn((router as any).healthAggregator, 'getScore').mockImplementation((pId: any) => {
            if (pId === 'provC') return { providerId: pId, score: 0, available: false, circuitState: 'CLOSED' as const, quotaPercent: 5, latency: null };
            return { providerId: pId, score: 100, available: true, circuitState: 'CLOSED' as const, quotaPercent: 100, latency: null };
        });

        const resolution = await router.resolveModel({ model: 'free:best' });
        expect(resolution.model.modelId).toBe('model-high');
        expect(resolution.provider.id).toBe('provB');
    });

    it('respects minTier config', async () => {
        router = new FreeAIRouterCore({ providers: ['provA'], discoverOpenRouterModels: false, minTier: 'A' });
        (router as any).modelCatalog = [];
        (router as any).providerRegistry.clear();
        router.addProvider(provA, [modelLow, modelMid]);

        const resolution = await router.resolveModel({ model: 'free:best' });
        expect(resolution.model.modelId).toBe('model-mid');
    });
});
