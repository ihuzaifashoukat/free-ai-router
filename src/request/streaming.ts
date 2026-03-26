// src/request/streaming.ts — Async iterable wrapper for Server-Sent Events (SSE)

/**
 * An un-parsed chunk representing a single data line from SSE
 */
export interface StreamChunk {
    data: string;
}

/**
 * Parses a standard Fetch ReadableStream into `StreamChunk` events.
 * It strictly adheres to checking lines starting with "data: ".
 *
 * @param body - Native fetch readable stream
 * @returns Async Generator yielding `StreamChunk` payloads
 */
export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamChunk, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Split by double newline (SSE chunk delimiter)
            const parts = buffer.split('\n\n');

            // The last part might be incomplete, keep it in the buffer
            buffer = parts.pop() || '';

            for (const part of parts) {
                // Split by lines within a single SSE chunk
                const lines = part.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') {
                            return; // Stop stream normally
                        }
                        if (data) {
                            yield { data };
                        }
                    }
                }
            }
        }

        // Flush remaining buffer if it looks like a complete data chunk
        if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                        return;
                    }
                    if (data) {
                        yield { data };
                    }
                }
            }
        }
    } finally {
        // Ensure reader is released when the loop finishes or throws
        reader.releaseLock();
    }
}
