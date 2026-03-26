import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FreeAIRouter } from '../../src/index.js';

describe('OpenAI Compatibility Layer', () => {
    let router: FreeAIRouter;
    let fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
        // Minimal valid config to instantiate
        router = new FreeAIRouter({
            apiKeys: { groq: ['mock-key'] },
            providers: ['groq'], // Just one provider for mocked tests
            discoverOpenRouterModels: false
        });

        // Mock the groq provider in registry
        const registry = (router as any).core.providerRegistry;
        const groqProv = registry.get('groq');
        if (groqProv) {
            // Force rate limits for mock predictability
            groqProv.rateLimits = { rpm: 60 };
        }

        // Ensure catalog has at least one model mapped to groq
        (router as any).core.modelCatalog = [{
            modelId: 'mock-llama',
            label: 'Mock Llama',
            tier: 'S',
            sweScore: 50,
            contextK: 8,
            providerIds: ['groq'],
            isFree: true,
            supportsStreaming: true
        }];
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('chat.completions.create', () => {
        it('standard completion matches OpenAI SDK format', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                json: () => Promise.resolve({
                    id: 'mock-id-123',
                    object: 'chat.completion',
                    created: 123456,
                    model: 'mock-llama',
                    choices: [{
                        index: 0,
                        message: { role: 'assistant', content: 'hello world' },
                        finish_reason: 'stop'
                    }],
                    usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 }
                })
            });

            const response = await router.chat.completions.create({
                model: 'mock-llama',
                messages: [{ role: 'user', content: 'hi' }]
            });

            // Assert OpenAI format
            expect(response.id).toBeDefined();
            expect(response.object).toBe('chat.completion');
            expect(response.choices[0].message.content).toBe('hello world');
            expect(response.choices[0].message.role).toBe('assistant');
            expect(response.usage?.total_tokens).toBe(7);

            // Assert extension metadata
            expect((response as any)._router).toBeDefined();
            expect((response as any)._router?.provider).toBe('groq');
        });

        it('streaming completion yields string chunks (actually JSON deltas mapped to standard format)', async () => {
            const dummyStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('data: {"id": "chunk-1", "choices": [{"delta": {"content": "hello "}}]}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: {"id": "chunk-2", "choices": [{"delta": {"content": "world"}}]}\n\n'));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    controller.close();
                }
            });

            fetchMock.mockResolvedValueOnce({
                ok: true,
                headers: new Headers(),
                body: dummyStream
            });

            const stream = await router.chat.completions.create({
                model: 'mock-llama',
                messages: [{ role: 'user', content: 'hi' }],
                stream: true
            });

            let fullContent = '';
            for await (const chunk of stream) {
                if (chunk.choices[0]?.delta?.content) {
                    fullContent += chunk.choices[0].delta.content;
                }
            }

            expect(fullContent).toBe('hello world');
        });

        it('error responses match OpenAI APIError format', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                headers: new Headers(),
                text: () => Promise.resolve(JSON.stringify({ error: { message: 'Invalid request' } }))
            });

            try {
                await router.chat.completions.create({
                    model: 'mock-llama',
                    messages: [{ role: 'user', content: 'hi' }]
                });
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                // Assert it looks like an OpenAI error
                expect(error.name).toBe('APIError');
                expect(error.status).toBe(400);
                expect(error.message).toContain('Invalid request');
            }
        });
    });
});
