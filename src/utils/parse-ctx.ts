// src/utils/parse-ctx.ts — Context window string parser

/**
 * Parse a context window size into numeric K tokens.
 * Accepts numbers (already K), or strings like '128k', '1m', '200K', '2M'.
 * @param input - Context window size (number or string)
 * @returns Size in K tokens
 * @throws Error if input format is unrecognized
 */
export function parseContextWindow(input: string | number): number {
    if (typeof input === 'number') return input;

    const trimmed = input.trim().toLowerCase();
    if (!trimmed) throw new Error(`Invalid context window: empty string`);

    // Match number with optional suffix: 128k, 1m, 200, 1.5m
    const match = /^(\d+(?:\.\d+)?)\s*([km]?)$/.exec(trimmed);
    if (!match) {
        throw new Error(`Invalid context window format: "${input}". Use number, "128k", or "1m".`);
    }

    const value = parseFloat(match[1]!);
    const suffix = match[2];

    switch (suffix) {
        case 'm': return Math.round(value * 1000); // 1m → 1000k
        case 'k': return Math.round(value);        // 128k → 128
        case '': return Math.round(value);        // plain number = K tokens
        default: return Math.round(value);
    }
}
