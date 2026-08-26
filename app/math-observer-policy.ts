import type { MathObserverAction, MathObserverParticipation } from "./math-observer-events";

export type MathObserverProfile = {
  threshold: number;
  multiplier: number;
  cooldownMs: number;
  maxSessionCues: number;
  idleMs: number;
};

export const MATH_OBSERVER_PROFILES: Record<MathObserverParticipation, MathObserverProfile> = {
  quiet: { threshold: .84, multiplier: .76, cooldownMs: 30000, maxSessionCues: 5, idleMs: 46000 },
  balanced: { threshold: .68, multiplier: 1, cooldownMs: 15000, maxSessionCues: 12, idleMs: 30000 },
  active: { threshold: .53, multiplier: 1.22, cooldownMs: 8000, maxSessionCues: 24, idleMs: 22000 },
};

const OUTCOME_WEIGHT: Record<NonNullable<MathObserverAction["outcome"]>, number> = {
  exploring: -.08,
  discovery: .14,
  success: .2,
  stuck: .18,
  idle: .12,
  error: .2,
  neutral: 0,
};

export function observerActionScore(action: MathObserverAction, participation: MathObserverParticipation) {
  const profile = MATH_OBSERVER_PROFILES[participation];
  const base = Math.max(0, Math.min(1, action.importance ?? .45));
  const attempts = action.attempt && action.attempt >= 3 ? Math.min(.14, (action.attempt - 2) * .05) : 0;
  const idle = action.idleMs && action.idleMs >= profile.idleMs ? .08 : 0;
  return Math.max(0, Math.min(1, (base + OUTCOME_WEIGHT[action.outcome ?? "neutral"] + attempts + idle) * profile.multiplier));
}

export function observerShouldConsider(action: MathObserverAction, participation: MathObserverParticipation) {
  return observerActionScore(action, participation) >= MATH_OBSERVER_PROFILES[participation].threshold;
}
