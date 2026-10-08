export type Point = readonly [number, number];
export type Cell = { site: Point; polygon: Point[]; neighbors: number[]; left: boolean; right: boolean };
const EPS = 1e-9;

/** Deterministic PRNG; separate seeds for geometry and independent color marks. */
export function randomStream(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("Seed must be an unsigned 32-bit integer");
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0;let t = state;t = Math.imul(t ^ (t >>> 15), t | 1);t ^= t + Math.imul(t ^ (t >>> 7), t | 61);return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function sampleSites(count: number, seed: number): Point[] {
  if (!Number.isInteger(count) || count < 2 || count > 160) throw new RangeError("Point count must be 2…160");
  const random = randomStream(seed);
  return Array.from({ length: count }, () => [random(), random()] as Point);
}
export function colorMarks(count: number, seed: number) {
  if (!Number.isInteger(count) || count < 1 || count > 160) throw new RangeError("Invalid mark count");
  const random = randomStream(seed);
  // Strictly between 0 and 1, so both endpoint experiments are exact.
  return Array.from({ length: count }, () => (Math.floor(random() * 4294967296) + .5) / 4294967296);
}
function clip(polygon: Point[], a: number, b: number, c: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) result.push(p);
    if ((dp <= 0) !== (dq <= 0)) { const t = dp / (dp - dq);result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return result;
}
/** Convex clipping against every perpendicular bisector, restricted to [0,1]². */
export function voronoiCells(sites: Point[]): Cell[] {
  if (sites.length < 1 || sites.length > 160 || sites.some(p => p.length !== 2 || p.some(x => !Number.isFinite(x) || x < 0 || x > 1))) throw new RangeError("Invalid sites");
  for (let i = 0; i < sites.length; i++) for (let j = 0; j < i; j++) if (Math.hypot(sites[i][0] - sites[j][0], sites[i][1] - sites[j][1]) < 1e-10) throw new RangeError("Sites must be distinct");
  const cells: Cell[] = sites.map((site, index) => {
    let polygon: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let j = 0; j < sites.length; j++) if (j !== index) {
      const other = sites[j];
      polygon = clip(polygon, other[0] - site[0], other[1] - site[1], (other[0] ** 2 + other[1] ** 2 - site[0] ** 2 - site[1] ** 2) / 2);
    }
    const onSide = (x: number) => polygon.some((p, i) => { const q = polygon[(i + 1) % polygon.length];return Math.abs(p[0] - x) < EPS && Math.abs(q[0] - x) < EPS && Math.abs(p[1] - q[1]) > EPS; });
    return { site, polygon, neighbors: [], left: onSide(0), right: onSide(1) };
  });
  // An edge must have positive length: touching only at a Voronoi vertex is not adjacency.
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = sites[j][0] - sites[i][0], b = sites[j][1] - sites[i][1], norm = Math.hypot(a, b);
    const c = (sites[j][0] ** 2 + sites[j][1] ** 2 - sites[i][0] ** 2 - sites[i][1] ** 2) / 2;
    const sharesEdge = (polygon: Point[]) => polygon.some((p, k) => { const q = polygon[(k + 1) % polygon.length];return Math.abs(a * p[0] + b * p[1] - c) / norm < EPS && Math.abs(a * q[0] + b * q[1] - c) / norm < EPS && Math.hypot(p[0] - q[0], p[1] - q[1]) > EPS; });
    if (sharesEdge(cells[i].polygon) && sharesEdge(cells[j].polygon)) { cells[i].neighbors.push(j);cells[j].neighbors.push(i); }
  }
  return cells;
}
export function crossing(cells: Cell[], open: boolean[]) {
  if (open.length !== cells.length) throw new RangeError("One color per cell is required");
  const reached = new Set<number>(), parent = new Map<number, number>(), queue: number[] = [];
  cells.forEach((cell, i) => { if (cell.left && open[i]) { reached.add(i);queue.push(i); } });
  let end = -1;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];if (cells[current].right && end === -1) end = current;
    for (const next of cells[current].neighbors) if (open[next] && !reached.has(next)) { reached.add(next);parent.set(next, current);queue.push(next); }
  }
  const path: number[] = [];
  while (end !== -1) { path.unshift(end);end = parent.get(end) ?? -1; }
  return { crosses: path.length > 0, reached, path };
}
export function percolationState(cells: Cell[], marks: number[], probability: number) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1 || marks.length !== cells.length || marks.some(m => !Number.isFinite(m) || m <= 0 || m >= 1)) throw new RangeError("Invalid coloring");
  const open = marks.map(mark => mark <= probability), result = crossing(cells, open), pivotal: number[] = [];
  for (let i = 0; i < cells.length; i++) { open[i] = !open[i];if (crossing(cells, open).crosses !== result.crosses) pivotal.push(i);open[i] = !open[i]; }
  return { ...result, open, pivotal };
}
