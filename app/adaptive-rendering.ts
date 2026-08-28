export type AutoRenderProfile = {
  initialPixelRatio: number;
  minPixelRatio: number;
  maxPixelRatio: number;
  lowDetail: boolean;
  targetFps: 30 | 60;
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundRatio = (value: number) => Math.round(value * 20) / 20;

export function getAutoRenderProfile(): AutoRenderProfile {
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const cores = navigator.hardwareConcurrency ?? 6;
  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const mobileViewport = window.innerWidth < 900 || window.matchMedia("(pointer: coarse)").matches;
  const constrained = cores <= 4 || (memory !== undefined && memory <= 4);
  const highPerformance = cores >= 8 && (memory === undefined || memory >= 6);

  const minPixelRatio = Math.min(devicePixelRatio, mobileViewport ? 1.1 : 1.25);
  const initialTarget = mobileViewport ? (highPerformance ? 1.65 : constrained ? 1.25 : 1.45) : 1.65;
  const maxTarget = mobileViewport ? (highPerformance ? 1.9 : constrained ? 1.5 : 1.7) : 2;

  return {
    initialPixelRatio: roundRatio(clamp(initialTarget, minPixelRatio, Math.min(devicePixelRatio, maxTarget))),
    minPixelRatio: roundRatio(minPixelRatio),
    maxPixelRatio: roundRatio(Math.max(minPixelRatio, Math.min(devicePixelRatio, maxTarget))),
    lowDetail: constrained,
    targetFps: constrained ? 30 : 60,
  };
}

export function createAdaptiveResolutionController(
  profile: AutoRenderProfile,
  onPixelRatioChange: (pixelRatio: number) => void,
  onFpsSample?: (fps: number) => void,
) {
  let pixelRatio = profile.initialPixelRatio;
  let windowStartedAt = 0;
  let renderedFrames = 0;
  let lastChangeAt = 0;
  let fastWindows = 0;

  const resetWindow = (now = 0) => {
    windowStartedAt = now;
    renderedFrames = 0;
  };

  const changePixelRatio = (next: number, now: number) => {
    const normalized = roundRatio(clamp(next, profile.minPixelRatio, profile.maxPixelRatio));
    if (normalized === pixelRatio) return;
    pixelRatio = normalized;
    lastChangeAt = now;
    fastWindows = 0;
    onPixelRatioChange(pixelRatio);
  };

  return {
    get pixelRatio() { return pixelRatio; },
    pause() { resetWindow(); fastWindows = 0; },
    sample(now: number) {
      if (!windowStartedAt) { resetWindow(now); return; }
      renderedFrames += 1;
      const elapsed = now - windowStartedAt;
      if (elapsed < 2400) return;

      if (elapsed > 5000) { resetWindow(now); return; }
      const fps = renderedFrames * 1000 / elapsed;
      onFpsSample?.(fps);
      const canChange = !lastChangeAt || now - lastChangeAt >= 4000;
      if (canChange && fps < profile.targetFps * .58) changePixelRatio(pixelRatio - .25, now);
      else if (canChange && fps < profile.targetFps * .72) changePixelRatio(pixelRatio - .15, now);
      else if (fps > profile.targetFps * .92) {
        fastWindows += 1;
        if (canChange && fastWindows >= 2) changePixelRatio(pixelRatio + .15, now);
      } else fastWindows = 0;
      resetWindow(now);
    },
  };
}

export function startAdaptiveResolutionMonitor(
  controller: ReturnType<typeof createAdaptiveResolutionController>,
  isActive: () => boolean,
) {
  let frame = 0;
  const monitor = (now: number) => {
    if (isActive()) controller.sample(now);
    else controller.pause();
    frame = window.requestAnimationFrame(monitor);
  };
  frame = window.requestAnimationFrame(monitor);
  return () => window.cancelAnimationFrame(frame);
}
