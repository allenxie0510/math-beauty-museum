export const MATH_OBSERVER_EVENT = "math-observer-cue";
export const MATH_OBSERVER_ACTION_EVENT = "math-observer-action";

export type MathObserverParticipation = "quiet" | "balanced" | "active";
export type MathObserverOutcome = "exploring" | "discovery" | "success" | "stuck" | "idle" | "error" | "neutral";
export type MathObserverContextValue = string | number | boolean | null;

export type MathObserverCue = {
  id: string;
  message: string;
  priority?: 1 | 2 | 3;
  once?: boolean;
  cooldownMs?: number;
};

export type MathObserverAction = {
  id: string;
  scene: string;
  action: string;
  outcome?: MathObserverOutcome;
  importance?: number;
  attempt?: number;
  idleMs?: number;
  suggestedCue?: string;
  once?: boolean;
  context?: Record<string, MathObserverContextValue>;
  occurredAt?: number;
};

export function cueMathObserver(cue: MathObserverCue) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MathObserverCue>(MATH_OBSERVER_EVENT, { detail: cue }));
}

export function observeMathAction(action: MathObserverAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MathObserverAction>(MATH_OBSERVER_ACTION_EVENT, {
    detail: { ...action, occurredAt: action.occurredAt ?? Date.now() },
  }));
}
