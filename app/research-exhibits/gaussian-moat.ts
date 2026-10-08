export type GaussianPoint = readonly [number, number];
export const gaussianKey = ([a, b]: GaussianPoint) => `${a},${b}`;
export function isOrdinaryPrime(n: number) {
  if (!Number.isSafeInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return false;
  return true;
}
export function isGaussianPrime(a: number, b: number) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || Math.abs(a) > 10000 || Math.abs(b) > 10000) return false;
  if (a === 0 || b === 0) { const n = Math.abs(a || b); return n % 4 === 3 && isOrdinaryPrime(n); }
  return isOrdinaryPrime(a * a + b * b);
}
export function gaussianWindow(radius: number): GaussianPoint[] {
  if (!Number.isInteger(radius) || radius < 2 || radius > 60) throw new RangeError("Window radius must be 2…60");
  const points: GaussianPoint[] = [];
  for (let a = -radius; a <= radius; a++) for (let b = -radius; b <= radius; b++) if (isGaussianPrime(a, b)) points.push([a, b]);
  return points;
}
export function gaussianComponent(points: GaussianPoint[], radius: number, stepSquared: number, start: GaussianPoint) {
  if (!Number.isInteger(radius) || radius < 2 || radius > 60 || !Number.isInteger(stepSquared) || stepSquared < 0 || stepSquared > 36) throw new RangeError("Invalid graph domain");
  const lookup = new Map(points.map((p) => [gaussianKey(p), p]));
  const seed = gaussianKey(start);
  if (!lookup.has(seed)) throw new RangeError("Start must be a prime in this window");
  const offsets: GaussianPoint[] = [], reach = Math.floor(Math.sqrt(stepSquared));
  for (let x = -reach; x <= reach; x++) for (let y = -reach; y <= reach; y++) if (x * x + y * y > 0 && x * x + y * y <= stepSquared) offsets.push([x, y]);
  const visited = new Set([seed]), queue: GaussianPoint[] = [lookup.get(seed)!], tree: [GaussianPoint, GaussianPoint][] = [];
  let escapingEdge: [GaussianPoint, GaussianPoint] | null = null;
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    for (const [dx, dy] of offsets) {
      const next: GaussianPoint = [point[0] + dx, point[1] + dy], key = gaussianKey(next);
      if (Math.abs(next[0]) > radius || Math.abs(next[1]) > radius) {
        if (!escapingEdge && isGaussianPrime(...next)) escapingEdge = [point, next];
      } else if (lookup.has(key) && !visited.has(key)) { visited.add(key); queue.push(lookup.get(key)!); tree.push([point, next]); }
    }
  }
  return { visited, reachable: queue, tree, escapingEdge };
}
