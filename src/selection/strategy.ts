// src/selection/strategy.ts — Strategy enum, shared types, and selector factory
import type { ModelDef, ProviderDef, ModelResolution, Strategy, HealthScore } from '../providers/types.js';
import { selectBestQuality } from './best-quality.js';
import { selectLowestLatency } from './lowest-latency.js';
import { selectLeastUsed } from './least-used.js';
import { createRoundRobinSelector } from './round-robin.js';
import { selectSmart } from './smart.js';

/** A pre-filtered candidate passed to selection functions */
export interface ModelCandidate {
    /** Model definition */
    model: ModelDef;
    /** Provider definition */
    provider: ProviderDef;
    /** Composite health score for this provider */
    health: HealthScore;
}

/**
 * Selection function signature.
 * Receives filtered candidates (circuit OK, quota OK, tier OK).
 * Returns ModelResolution with primary pick + fallbacks, or null if empty.
 */
export type SelectionFn = (candidates: ModelCandidate[]) => ModelResolution | null;

/**
 * Build a ModelResolution from a sorted candidate array.
 * First element = primary pick, rest = fallbacks.
 * @param sorted - Candidates sorted by strategy preference (best-first)
 * @param reason - Human-readable selection reason
 * @returns ModelResolution or null if no candidates
 */
export function buildResolution(
    sorted: ModelCandidate[],
    reason: string,
): ModelResolution | null {
    if (sorted.length === 0) return null;

    const primary = sorted[0]!;
    return {
        model: primary.model,
        provider: primary.provider,
        reason,
        fallbacks: sorted.slice(1).map((c) => ({
            model: c.model,
            provider: c.provider,
        })),
    };
}

/**
 * Create a selection function for the given strategy.
 *
 * @param strategy - Selection strategy type
 * @returns A SelectionFn that implements the strategy
 * @throws Error if strategy is unknown
 */
export function createSelector(strategy: Strategy): SelectionFn {
    switch (strategy) {
        case 'best':
            return selectBestQuality;
        case 'fastest':
            return selectLowestLatency;
        case 'least-used':
            return selectLeastUsed;
        case 'round-robin':
            return createRoundRobinSelector();
        case 'smart':
            return selectSmart;
        default: {
            const _exhaustive: never = strategy;
            throw new Error(`Unknown selection strategy: ${String(_exhaustive)}`);
        }
    }
}
