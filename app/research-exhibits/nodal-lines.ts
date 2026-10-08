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
/** Linear interpolation on a square grid, with a center-sign saddle decision; no length estimate. */
export function nodalSegments(parameters: NodalParameters, size = 160): Segment[] {
  validateNodal(parameters);
  if (!Number.isInteger(size) || size < 32 || size > 256) throw new RangeError("Invalid contour resolution");
  const values = Array.from({ length: size + 1 }, (_, y) => Array.from({ length: size + 1 }, (_, x) => torusEigenfunction(x / size, y / size, parameters)));
  const segments: Segment[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]] as const;
    const samples = [values[y][x], values[y][x + 1], values[y + 1][x + 1], values[y + 1][x]];
    const intersections: [number, number][] = [];
    for (let edge = 0; edge < 4; edge++) {
      const next = (edge + 1) % 4;
      if ((samples[edge] >= 0) === (samples[next] >= 0)) continue;
      const t = samples[edge] / (samples[edge] - samples[next]);
      intersections.push([(corners[edge][0] + t * (corners[next][0] - corners[edge][0])) / size, (corners[edge][1] + t * (corners[next][1] - corners[edge][1])) / size]);
    }
    if (intersections.length === 2) segments.push([intersections[0], intersections[1]]);
    if (intersections.length === 4) {
      const center = torusEigenfunction((x + .5) / size, (y + .5) / size, parameters);
      if ((center >= 0) === (samples[0] >= 0)) segments.push([intersections[0], intersections[1]], [intersections[2], intersections[3]]);
      else segments.push([intersections[0], intersections[3]], [intersections[1], intersections[2]]);
    }
  }
  return segments;
}
