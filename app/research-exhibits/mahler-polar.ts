export type Point2 = readonly [number, number];

export function polarExponent(p: number) {
  if (!Number.isFinite(p) || p < 1 || p > 8) throw new RangeError("p must be in [1, 8]");
  return p === 1 ? Infinity : p / (p - 1);
}

export function lpBoundary(p: number, samples = 2048): Point2[] {
  if ((p !== Infinity && (!Number.isFinite(p) || p < 1)) || !Number.isInteger(samples) || samples < 16 || samples > 8192 || samples % 4 !== 0) throw new RangeError("Invalid boundary sampling");
  if (p === 1) return [[1, 0], [0, 1], [-1, 0], [0, -1]];
  if (p === Infinity) return [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  return Array.from({ length: samples }, (_, i) => {
    const angle = i * 2 * Math.PI / samples;
    const c = Math.cos(angle), s = Math.sin(angle);
    const radius = (Math.abs(c) ** p + Math.abs(s) ** p) ** (-1 / p);
    return [radius * c, radius * s] as const;
  });
}

export function shearPoint([x, y]: Point2, shear: number, polar = false): Point2 {
  if (!Number.isFinite(shear) || Math.abs(shear) > .8) throw new RangeError("Invalid shear");
  return polar ? [x, y - shear * x] : [x + shear * y, y];
}

export function polygonArea(points: readonly Point2[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i], [u, v] = points[(i + 1) % points.length];
    area += x * v - y * u;
  }
  return Math.abs(area) / 2;
}

export function mahlerPair(p: number, shear: number, samples = 2048) {
  const q = polarExponent(p);
  const body = lpBoundary(p, samples).map((point) => shearPoint(point, shear));
  const polar = lpBoundary(q, samples).map((point) => shearPoint(point, shear, true));
  const bodyArea = polygonArea(body), polarArea = polygonArea(polar);
  return { q, body, polar, bodyArea, polarArea, product: bodyArea * polarArea };
}
