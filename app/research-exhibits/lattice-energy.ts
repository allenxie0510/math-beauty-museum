/** Density-one Gaussian lattice sums; each nonzero vector is counted once (no 1/2). */
export type Vector = readonly [number, number];
export type LatticeBasis = readonly [Vector, Vector];
export const LATTICE_DOMAIN = {
  angle: { min: 45, max: 135, step: 1 },
  ratio: { min: 0.6, max: 1.8, step: 0.02 },
  alpha: { min: 0.5, max: 4, step: 0.25 },
} as const;
export const ENERGY_RADIUS = 8;

export function cellArea([u, v]: LatticeBasis): number {
  return Math.abs(u[0] * v[1] - u[1] * v[0]);
}

export function unitDensityBasis(angle: number, ratio: number): LatticeBasis {
  if (!Number.isFinite(angle) || angle < 45 || angle > 135 || !Number.isFinite(ratio) || ratio < 0.6 || ratio > 1.8) {
    throw new RangeError("Lattice parameters outside the exhibit domain");
  }
  const theta = angle * Math.PI / 180;
  const a = Math.sqrt(ratio / Math.sin(theta));
  const b = Math.sqrt(1 / (ratio * Math.sin(theta)));
  return [[a, 0], [b * Math.cos(theta), b * Math.sin(theta)]];
}

/** Inverse-basis bounds include every vector in a physical disk, independent of basis orientation. */
export function latticePoints(basis: LatticeBasis, radius: number): Vector[] {
  const [u, v] = basis;
  const area = cellArea(basis);
  if (![...u, ...v, radius, area].every(Number.isFinite) || radius <= 0 || radius > 32 || area < 1e-8) {
    throw new RangeError("Invalid lattice or radius");
  }
  const mMax = Math.ceil(radius * Math.hypot(...v) / area);
  const nMax = Math.ceil(radius * Math.hypot(...u) / area);
  if ((2 * mMax + 1) * (2 * nMax + 1) > 200_000) throw new RangeError("Lattice enumeration budget exceeded");
  const points: Vector[] = [];
  for (let m = -mMax; m <= mMax; m++) {
    for (let n = -nMax; n <= nMax; n++) {
      if (m === 0 && n === 0) continue;
      const x = m * u[0] + n * v[0];
      const y = m * u[1] + n * v[1];
      if (x * x + y * y <= radius * radius + 1e-10) points.push([x, y]);
    }
  }
  return points;
}

export function gaussianEnergy(basis: LatticeBasis, alpha: number, radius = ENERGY_RADIUS): number {
  if (!Number.isFinite(alpha) || alpha < 0.5 || alpha > 4) throw new RangeError("Gaussian scale outside the exhibit domain");
  let sum = 0;
  let correction = 0;
  for (const [x, y] of latticePoints(basis, radius)) {
    const term = Math.exp(-alpha * (x * x + y * y)) - correction;
    const next = sum + term;
    correction = (next - sum) - term;
    sum = next;
  }
  return sum;
}
