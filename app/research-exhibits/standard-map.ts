export type MapPoint = readonly [number, number];
export function mod1(value: number) { return ((value % 1) + 1) % 1; }
export function standardMapStep([x, y]: MapPoint, k: number): MapPoint {
  const nextY = mod1(y + k * Math.sin(2 * Math.PI * x));
  return [mod1(x + nextY), nextY];
}
export function mapOrbit(start: MapPoint, k: number, steps: number): MapPoint[] {
  if (![...start, k].every(Number.isFinite) || k < 0 || k > 3 || !Number.isInteger(steps) || steps < 1 || steps > 2400) throw new RangeError("Orbit outside experiment domain");
  const result: MapPoint[] = [[mod1(start[0]), mod1(start[1])]];
  for (let i = 0; i < steps; i++) result.push(standardMapStep(result[result.length - 1], k));
  return result;
}
export function seededStarts(seed: number, count = 12): MapPoint[] {
  if (!Number.isInteger(seed) || seed < 1 || seed > 999 || !Number.isInteger(count) || count < 1 || count > 24) throw new RangeError("Invalid seed or count");
  let state = seed;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({ length: count }, () => [random(), random()] as const);
}
export function torusDistance(a: MapPoint, b: MapPoint) {
  const dx = Math.abs(mod1(a[0]) - mod1(b[0])), dy = Math.abs(mod1(a[1]) - mod1(b[1]));
  return Math.hypot(Math.min(dx, 1 - dx), Math.min(dy, 1 - dy));
}
