export type TorusShape = "ball" | "tube" | "slab";
export type Vec3 = readonly [number, number, number];
export const TORUS_TRANSITIONS = [4 * Math.PI / 81, 1 / Math.PI] as const;
export const TORUS_SHAPES: TorusShape[] = ["ball", "tube", "slab"];

export function torusCandidates(volume: number) {
  if (!Number.isFinite(volume) || volume <= 0 || volume >= 1) throw new RangeError("Volume must lie in (0,1)");
  const v = Math.min(volume, 1 - volume);
  const areas = { ball: Math.cbrt(36 * Math.PI) * v ** (2 / 3), tube: 2 * Math.sqrt(Math.PI * v), slab: 2 };
  const minimum = Math.min(...Object.values(areas));
  const winners = TORUS_SHAPES.filter((shape) => Math.abs(areas[shape] - minimum) < 1e-10);
  return { v, complement: volume > .5, areas, minimum, winners, ballRadius: Math.cbrt(3 * v / (4 * Math.PI)), tubeRadius: Math.sqrt(v / Math.PI), slabWidth: v };
}

/** Membership of the periodic solid; faces of the display cell are never walls. */
export function torusContains(point: Vec3, volume: number, shape: TorusShape) {
  const data = torusCandidates(volume);
  const [x, y, z] = point.map((v) => v - Math.floor(v + .5));
  const inside = shape === "ball" ? x * x + y * y + z * z <= data.ballRadius ** 2 : shape === "tube" ? x * x + z * z <= data.tubeRadius ** 2 : Math.abs(x) <= data.slabWidth / 2;
  return data.complement ? !inside : inside;
}

/** Only actual interfaces: the periodic tube has no end caps, the slab exactly two faces. */
export function torusBoundary(volume: number, shape: TorusShape): Vec3[][] {
  const { ballRadius: r, tubeRadius: t, slabWidth: w } = torusCandidates(volume);
  if (shape === "slab") return [-w / 2, w / 2].map((x) => [[x, -.5, -.5], [x, .5, -.5], [x, .5, .5], [x, -.5, .5]]);
  const faces: Vec3[][] = [];
  if (shape === "tube") {
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24, b = (i + 1) * Math.PI / 24;
      faces.push([[t * Math.cos(a), -.5, t * Math.sin(a)], [t * Math.cos(b), -.5, t * Math.sin(b)], [t * Math.cos(b), .5, t * Math.sin(b)], [t * Math.cos(a), .5, t * Math.sin(a)]]);
    }
  } else {
    const point = (row: number, col: number): Vec3 => { const phi = Math.PI * row / 16, theta = Math.PI * col / 16; return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)]; };
    for (let row = 0; row < 16; row++) for (let col = 0; col < 32; col++) {
      if (row > 0) faces.push([point(row, col), point(row, col + 1), point(row + 1, col)]);
      if (row < 15) faces.push([point(row, col + 1), point(row + 1, col + 1), point(row + 1, col)]);
    }
  }
  return faces;
}
