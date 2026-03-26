// src/health/latency-tracker.ts — Rolling window latency statistics per provider/model
import type { LatencyStats, LatencyColor } from '../providers/types.js';

/** Default rolling window size */
const WINDOW_SIZE = 20;

/** Internal sample entry */
interface Sample {
    latencyMs: number;
    success: boolean;
    timestamp: number;
}

/**
 * Tracks rolling latency statistics for provider/model pairs.
 * Pure in-memory data structure — no I/O.
 */
export class LatencyTracker {
    private readonly windows = new Map<string, Sample[]>();
    private readonly windowSize: number;

    constructor(windowSize = WINDOW_SIZE) {
        this.windowSize = windowSize;
    }

    /**
     * Record a latency sample.
     * @param providerId - Provider identifier
     * @param modelId - Model identifier
     * @param latencyMs - Request latency in milliseconds
     * @param success - Whether the request succeeded
     */
    record(providerId: string, modelId: string, latencyMs: number, success = true): void {
        const key = this.makeKey(providerId, modelId);
        let samples = this.windows.get(key);
        if (!samples) {
            samples = [];
            this.windows.set(key, samples);
        }
        samples.push({ latencyMs, success, timestamp: Date.now() });
        // Evict oldest if beyond window
        if (samples.length > this.windowSize) {
            samples.splice(0, samples.length - this.windowSize);
        }
    }

    /**
     * Get latency statistics for a provider/model pair.
     * @param providerId - Provider identifier
     * @param modelId - Model identifier (optional — if omitted, aggregates all models for provider)
     * @returns LatencyStats or null if no data
     */
    getStats(providerId: string, modelId?: string): LatencyStats | null {
        const key = modelId ? this.makeKey(providerId, modelId) : null;

        let samples: Sample[];
        if (key) {
            samples = this.windows.get(key) ?? [];
        } else {
            // Aggregate all models for this provider
            samples = [];
            for (const [k, v] of this.windows) {
                if (k.startsWith(`${providerId}:`)) {
                    samples.push(...v);
                }
            }
        }

        if (samples.length === 0) return null;

        return computeStats(samples);
    }

    /**
     * Get the latency color rating.
     * @param avgMs - Average latency in ms
     * @returns green (<500ms), yellow (<1500ms), or red
     */
    static colorize(avgMs: number): LatencyColor {
        if (avgMs < 500) return 'green';
        if (avgMs < 1500) return 'yellow';
        return 'red';
    }

    /** Clear all data */
    clear(): void {
        this.windows.clear();
    }

    /** Clear data for a specific provider */
    clearProvider(providerId: string): void {
        for (const key of this.windows.keys()) {
            if (key.startsWith(`${providerId}:`)) {
                this.windows.delete(key);
            }
        }
    }

    private makeKey(providerId: string, modelId: string): string {
        return `${providerId}:${modelId}`;
    }
}

/** Compute stats from a sample array */
function computeStats(samples: Sample[]): LatencyStats {
    const latencies = samples
        .filter((s) => s.success)
        .map((s) => s.latencyMs);

    if (latencies.length === 0) {
        return {
            avg: 0,
            p95: 0,
            jitter: 0,
            uptimePercent: 0,
            stabilityScore: 0,
            sampleCount: samples.length,
        };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;

    // P95: index at 95th percentile
    const p95Idx = Math.min(
        Math.ceil(sorted.length * 0.95) - 1,
        sorted.length - 1,
    );
    const p95 = sorted[p95Idx] ?? avg;

    // Jitter = standard deviation
    const variance =
        sorted.reduce((acc, v) => acc + (v - avg) ** 2, 0) / sorted.length;
    const jitter = Math.sqrt(variance);

    // Uptime = % of successful samples
    const successCount = samples.filter((s) => s.success).length;
    const uptimePercent = Math.round((successCount / samples.length) * 100);

    // Stability score: composite of latency, jitter, and uptime
    // Lower latency, lower jitter, higher uptime → higher score
    const latencyScore = Math.max(0, 100 - avg / 20);       // 0ms=100, 2000ms=0
    const jitterScore = Math.max(0, 100 - jitter / 10);      // 0ms=100, 1000ms=0
    const stabilityScore = Math.round(
        latencyScore * 0.4 + jitterScore * 0.2 + uptimePercent * 0.4,
    );

    return {
        avg: Math.round(avg),
        p95: Math.round(p95),
        jitter: Math.round(jitter),
        uptimePercent,
        stabilityScore: Math.max(0, Math.min(100, stabilityScore)),
        sampleCount: samples.length,
    };
}
