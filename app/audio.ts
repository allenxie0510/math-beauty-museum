type AudioContextConstructor = new (contextOptions?: AudioContextOptions) => AudioContext;

type LegacyAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: AudioContextConstructor;
};

export function createCompatibleAudioContext() {
  const AudioContextClass = window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API is unavailable");
  return new AudioContextClass();
}

export async function resumeAudioContext(context: AudioContext) {
  if (context.state !== "running" && context.state !== "closed") await context.resume();
  return context;
}
