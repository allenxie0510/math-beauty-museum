export type NodalParameters = { m: number; n: number; mix: number; phase: number };
export type Segment = readonly [readonly [number, number], readonly [number, number]];
export function validateNodal({ m, n, mix, phase }: NodalParameters) {
  if (!Number.isInteger(m) || m < 1 || m > 5 || !Number.isInteger(n) || n < 0 || n > 5 || !Number.isFinite(mix) || mix < 0 || mix > 90 || !Number.isFinite(phase) || phase < 0 || phase > 360) throw new RangeError("Invalid torus mode");
}
export function torusEigenvalue(m: number, n: number) { return 4 * Math.PI ** 2 * (m * m + n * n); }
/** Two distinct orthogonal frequency vectors, hence the same positive eigenvalue and L2 norm²=1/2. */
export function torusEigenfunction(x: number, y: number, { m, n, mix, phase }: NodalParameters) {
  const beta = mix * Math.PI / 180;
  return Math.cos(beta) * Math.cos(2 * Math.PI * (m * x + n * y)) + Math.sin(beta) * Math.cos(2 * Math.PI * (n * x - m * y) + phase * Math.PI / 180);
}
export type NodalPoint = readonly [number, number];
export type NodalPath = NodalPoint[];
// Unit-square tolerance: about 0.04 px for a 4,000 px-wide displayed tile.
const CURVE_TOLERANCE = 1e-5;

/** Clip a chord to the closed unit square, retaining exact boundary coordinates. */
function clipChord(a: NodalPoint, b: NodalPoint): Segment | null {
  let start = 0, end = 1;
  for (let axis = 0; axis < 2; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-14) {
      if (a[axis] < -1e-12 || a[axis] > 1 + 1e-12) return null;
    } else {
      const t0 = -a[axis] / delta, t1 = (1 - a[axis]) / delta;
      start = Math.max(start, Math.min(t0, t1));
      end = Math.min(end, Math.max(t0, t1));
    }
  }
  if (end - start < 1e-12) return null;
  const at = (t: number): NodalPoint => [0, 1].map((axis) => {
    const value = a[axis] + t * (b[axis] - a[axis]);
    return value < 1e-12 ? 0 : value > 1 - 1e-12 ? 1 : value;
  }) as [number, number];
  return [at(start), at(end)];
}

function clipPath(points: NodalPath, output: NodalPath[]) {
  let current: NodalPath | undefined;
  for (let i = 1; i < points.length; i++) {
    const chord = clipChord(points[i - 1], points[i]);
    if (!chord) { current = undefined; continue; }
    const [a, b] = chord, last = current?.[current.length - 1];
    if (last && Math.hypot(last[0] - a[0], last[1] - a[1]) < 1e-10) current!.push(b);
    else { current = [a, b]; output.push(current); }
  }
}

/** Trace the analytic zero branches; only the SVG chord approximation is numerical.
 * Solve for the stronger cosine so acos stays well-conditioned away from beta=45°.
 * At 45°, the exact cosine factorization preserves both crossing line families.
 */
export function nodalPaths(parameters: NodalParameters): NodalPath[] {
  validateNodal(parameters);
  const { m, n, mix, phase } = parameters;
  const output: NodalPath[] = [], shift = (phase % 360) / 360;
  if (mix === 45) {
    for (const [a, b, offset] of [[m + n, n - m, .5 - shift], [m - n, n + m, .5 + shift]]) {
      const low = Math.min(0, a) + Math.min(0, b), high = Math.max(0, a) + Math.max(0, b);
      for (let k = Math.ceil(low - offset); k <= Math.floor(high - offset); k++) {
        const level = k + offset;
        const points: NodalPath = Math.abs(a) >= Math.abs(b)
          ? [[level / a, 0], [(level - b) / a, 1]]
          : [[0, level / b], [1, (level - a) / b]];
        clipPath(points, output);
      }
    }
    return output;
  }
  const beta = mix * Math.PI / 180, solveS = mix < 45;
  const ratio = mix === 0 || mix === 90 ? 0 : solveS ? Math.tan(beta) : 1 / Math.tan(beta);
  const sRange = [0, m + n], tRange = [-m + shift, n + shift];
  const [freeMin, freeMax] = solveS ? tRange : sRange;
  const [dependentMin, dependentMax] = solveS ? sRange : tRange;
  const denominator = m * m + n * n;
  const distance = (p: NodalPoint, a: NodalPoint, b: NodalPoint) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / Math.hypot(dx, dy);
  };
  for (let k = Math.floor(dependentMin) - 1; k <= Math.ceil(dependentMax) + 1; k++) for (const sign of [-1, 1]) {
    const at = (q: number): NodalPoint => {
      const dependent = k + sign * Math.acos(-ratio * Math.cos(2 * Math.PI * q)) / (2 * Math.PI);
      const s = solveS ? dependent : q, t = (solveS ? q : dependent) - shift;
      return [(m * s + n * t) / denominator, (n * s - m * t) / denominator];
    };
    const points: NodalPath = [at(freeMin)];
    const subdivide = (lo: number, hi: number, a: NodalPoint, b: NodalPoint, depth: number) => {
      const mid = (lo + hi) / 2, middle = at(mid);
      // Quarter samples also catch inflections whose midpoint lies on the chord.
      const error = Math.max(distance(middle, a, b), distance(at((lo + mid) / 2), a, b), distance(at((mid + hi) / 2), a, b));
      if (error > CURVE_TOLERANCE && depth < 14) {
        subdivide(lo, mid, a, middle, depth + 1);
        subdivide(mid, hi, middle, b, depth + 1);
      } else points.push(b);
    };
    const steps = Math.ceil((freeMax - freeMin) * 16);
    for (let i = 0; i < steps; i++) {
      const lo = freeMin + (freeMax - freeMin) * i / steps;
      const hi = freeMin + (freeMax - freeMin) * (i + 1) / steps;
      subdivide(lo, hi, points[points.length - 1], at(hi), 0);
    }
    clipPath(points, output);
  }
  return output;
}

export function nodalSegments(parameters: NodalParameters): Segment[] {
  return nodalPaths(parameters).flatMap((path) => path.slice(1).map((point, i): Segment => [path[i], point]));
}
