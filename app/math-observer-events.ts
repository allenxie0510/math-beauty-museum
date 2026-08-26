export const MATH_OBSERVER_EVENT = "math-observer-cue";

export type MathObserverCue = {
  id: string;
  message: string;
  priority?: 1 | 2 | 3;
  once?: boolean;
  cooldownMs?: number;
};

export function cueMathObserver(cue: MathObserverCue) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MathObserverCue>(MATH_OBSERVER_EVENT, { detail: cue }));
}
