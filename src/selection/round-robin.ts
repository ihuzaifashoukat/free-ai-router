// src/selection/round-robin.ts — Stateful round-robin distribution across available models
import type { ModelResolution } from '../providers/types.js';
import type { ModelCandidate, SelectionFn } from './strategy.js';
import { buildResolution } from './strategy.js';

/**
 * Creates a stateful round-robin selection function.
 * Each call advances the internal counter to the next candidate.
 * The counter wraps around when it exceeds the candidate count.
 *
 * @returns A SelectionFn that distributes requests evenly across candidates
 */
export function createRoundRobinSelector(): SelectionFn {
    let counter = 0;

    return function selectRoundRobin(candidates: ModelCandidate[]): ModelResolution | null {
        if (candidates.length === 0) return null;

        // Wrap counter to current candidate count
        const idx = counter % candidates.length;
        counter = (counter + 1) & 0x7FFFFFFF; // Prevent overflow, stay positive

        // Reorder: start from idx, wrap around
        const reordered: ModelCandidate[] = [];
        for (let i = 0; i < candidates.length; i++) {
            reordered.push(candidates[(idx + i) % candidates.length]!);
        }

        const top = reordered[0]!;
        return buildResolution(
            reordered,
            `Round-robin #${idx}: ${top.model.label} on ${top.provider.name}`,
        );
    };
}
