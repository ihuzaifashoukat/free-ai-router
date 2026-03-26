import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FreeAIRouterCore } from '../../src/router.js';
import type { ProviderDef, ModelDef } from '../../src/providers/types.js';

describe('FreeAIRouterCore', () => {
    let router: FreeAIRouterCore;

    // Mock provider A
    const provA: ProviderDef = {
        id: 'provA', name: 'Provider A', baseUrl: 'http://a', apiKeyEnvVars: [], rateLimits: { rpm: 60 }
    };

    // Mock provider B
    const provB: ProviderDef = {
        id: 'provB', name: 'Provider B', baseUrl: 'http://b', apiKeyEnvVars: [], rateLimits: { rpm: 60 }
    };

    const modelMain: ModelDef = {
        modelId: 'model-main', label: 'Main', tier: 'S', sweScore: 80, contextK: 128, providerIds: ['provA', 'provB'], isFree: true
    };

    // global.fetch mock
    let fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);

        router = new FreeAIRouterCore({
            apiKeys: { provA: ['keyA1', 'keyA2'], provB: ['keyB1'] },
            providers: ['provA', 'provB'],
            discoverOpenRouterModels: false,
            timeout: 1000,
            maxRetries: 2,
            retryDelay: 100
        });

        (router as any).modelCatalog = [];
        (router as any).providerRegistry.clear();

        router.addProvider(provA, [modelMain]);
        router.addProvider(provB, [modelMain]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('basic chat completion succeeds', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            headers: new Headers(),
            json: () => Promise.resolve({ id: 'resp-1', choices: [{ message: { content: 'success' } }] })
        });

        const result = await router.executeChat({ model: 'model-main', messages: [] });
        expect(result.id).toBeDefined();
        expect(result.choices[0].message.content).toBe('success');
        expect(result._router.provider).toBe('provA'); // Picks provA randomly/first
    });

    it('retries on 500 error', async () => {
        // Fails with 500 first, then succeeds
        fetchMock
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                headers: new Headers(),
                text: () => Promise.resolve('Error 500')
            })
            .mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                json: () => Promise.resolve({ id: 'resp-2', choices: [{ message: { content: 'recovered' } }] })
            });

        const result = await router.executeChat({ model: 'model-main', messages: [] });
        expect(result.choices[0].message.content).toBe('recovered');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rotates key on 429', async () => {
        // ProvA has 2 keys: keyA1, keyA2. First request 429s, rotating key
        fetchMock
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                headers: new Headers({ 'retry-after': '60' }),
                text: () => Promise.resolve('Rate limited')
            })
            .mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                json: () => Promise.resolve({ id: 'resp-3', choices: [{ message: { content: 'key2 works' } }] }) // success with keyA2
            });

        const result = await router.executeChat({ model: 'model-main', messages: [] });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.choices[0].message.content).toBe('key2 works');
        expect(result._router.provider).toBe('provA'); // Still on provA because we had a second key
    });

    it('falls back to next provider on repeated failure', async () => {
        // ProvA 500s constantly, should fallback to ProvB
        fetchMock
            .mockResolvedValueOnce({
                ok: false, status: 500, headers: new Headers(), text: () => Promise.resolve('Error 1')
            })
            .mockResolvedValueOnce({
                ok: false, status: 500, headers: new Headers(), text: () => Promise.resolve('Error 2')
            })
            .mockResolvedValueOnce({
                ok: false, status: 500, headers: new Headers(), text: () => Promise.resolve('Error 3')
            })
            // Fallback request to ProvB succeeds
            .mockResolvedValueOnce({
                ok: true, headers: new Headers(), json: () => Promise.resolve({ id: 'resp-4', choices: [{ message: { content: 'fallback success' } }] })
            });

        const fallbackSpy = vi.fn();
        router.on('fallback', fallbackSpy);

        const result = await router.executeChat({ model: 'model-main', messages: [] });

        // Ensure successful fallback
        expect(result.choices[0].message.content).toBe('fallback success');
        expect(fallbackSpy).toHaveBeenCalled();
        expect(result._router.provider).toBe('provB'); // Now we're on provB
    });

    it('throws NoAvailableModelError when all providers fail', async () => {
        // All attempts fail 500, eventually running out of providers
        fetchMock.mockResolvedValue({
            ok: false, status: 500, headers: new Headers(), text: () => Promise.resolve('Error permanently')
        });

        await expect(router.executeChat({ model: 'model-main', messages: [] })).rejects.toThrow();
    });

    it('streaming returns ReadableStream', async () => {
        // Setup a dummy browser-like readable stream response
        const dummyStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('data: {"choices": [{"delta": {"content": "stream"}}]}\n\n'));
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
            }
        });

        fetchMock.mockResolvedValueOnce({
            ok: true,
            headers: new Headers(),
            body: dummyStream
        });

        const result = await router.executeChat({ model: 'model-main', messages: [], stream: true });
        // Since executeChat stream handling yields an async iterator
        let firstChunk;
        for await (const chunk of result) {
            if (!firstChunk) firstChunk = chunk;
        }

        expect(firstChunk).toBeDefined();
        expect(firstChunk.choices[0].delta.content).toBe('stream');
    });

    it('magic model keywords resolve correctly', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            headers: new Headers(),
            json: () => Promise.resolve({ id: 'resp-1', choices: [{ message: { content: 'magic' } }] })
        });

        const result = await router.executeChat({ model: 'free:best', messages: [] });
        // Under the hood resolveModel ('free:best') mapped it to modelMain
        expect(result._router.model).toBe('model-main');
    });

    it('env vars are loaded automatically', () => {
        process.env.GROQ_API_KEY = 'test_groq_key_from_env';
        const freshRouter = new FreeAIRouterCore({});
        const keyHealth = (freshRouter as any).keyManager.getKeyHealth('groq');
        expect(keyHealth.total).toBeGreaterThanOrEqual(1);
        delete process.env.GROQ_API_KEY;
    });
});
