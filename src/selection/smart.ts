// src/selection/smart.ts — Composite weighted strategy: tier + latency + quota + health
import { TIER_RANK } from '../providers/types.js';
import type { ModelResolution } from '../providers/types.js';
import type { ModelCandidate } from './strategy.js';
import { buildResolution } from './strategy.js';

/** Weight distribution for composite smart score */
const W = {
    tier: 0.35,  // Model quality is primary differentiator
    latency: 0.30,  // Speed matters for UX
    quota: 0.25,  // Quota availability prevents failures
    health: 0.10,  // Circuit + overall health as tiebreaker
} as const;

/** Max tier rank value (S+ = 8) for normalization */
const MAX_TIER_RANK = 8;

/** Assumed quota % when no data is available */
const UNKNOWN_QUOTA = 70;

/**
 * Normalize tier rank to a 0–100 scale.
 * S+ (8) → 100, C (1) → 12.5
 */
function tierScore(candidate: ModelCandidate): number {
    return (TIER_RANK[candidate.model.tier] / MAX_TIER_RANK) * 100;
}

/**
 * Normalize latency to a 0–100 score (lower latency = higher score).
 * Uses avg latency. 0ms → 100, ≥3000ms → 0.
 * No-data candidates get a neutral 50.
 */
function latencyScore(candidate: ModelCandidate): number {
    const lat = candidate.health.latency;
    if (!lat || lat.sampleCount === 0) return 50;
    return Math.max(0, Math.min(100, 100 - (lat.avg / 30)));
}

/**
 * Normalize quota to a 0–100 score.
 * Direct mapping — unknown quota defaults to 70.
 */
function quotaScore(candidate: ModelCandidate): number {
    const q = candidate.health.quotaPercent ?? UNKNOWN_QUOTA;
    return Math.max(0, Math.min(100, q));
}

/**
 * Compute a weighted composite score for a candidate.
 * Higher = better.
 */
function compositeScore(candidate: ModelCandidate): number {
    return (
        tierScore(candidate) * W.tier +
        latencyScore(candidate) * W.latency +
        quotaScore(candidate) * W.quota +
        candidate.health.score * W.health
    );
}

/**
 * Smart composite selection strategy.
 * Combines model quality tier, response latency, quota availability,
 * and overall health into a single weighted score.
 *
 * @param candidates - Pre-filtered available model candidates
 * @returns ModelResolution with best composite pick, or null if empty
 */
export function selectSmart(candidates: ModelCandidate[]): ModelResolution | null {
    if (candidates.length === 0) return null;

    // Score all candidates in a single pass, then sort
    const scored = candidates.map((c) => ({
        candidate: c,
        score: compositeScore(c),
    }));

    scored.sort((a, b) => b.score - a.score);

    const top = scored[0]!;
    const topScore = Math.round(top.score);

    return buildResolution(
        scored.map((s) => s.candidate),
        `Smart: ${top.candidate.model.label} (composite score ${topScore}/100)`,
    );
}
