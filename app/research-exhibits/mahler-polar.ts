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

export type Point3 = readonly [number, number, number];
export type SolidMesh = { vertices: Point3[]; faces: number[][] };

export function shearPoint3([x, y, z]: Point3, shear: number, polar = false): Point3 {
  const [u, v] = shearPoint([x, y], shear, polar);
  return [u, v, z];
}

// Shift to the well-conditioned Stirling range with Γ(x+1)=xΓ(x).
function logGamma(value: number) {
  let x = value, correction = 0;
  while (x < 16) { correction -= Math.log(x); x++; }
  const t = 1 / x, t2 = t * t;
  return correction + (x - .5) * Math.log(x) - x + .5 * Math.log(2 * Math.PI)
    + t * (1 / 12 + t2 * (-1 / 360 + t2 * (1 / 1260 + t2 * (-1 / 1680 + t2 / 1188))));
}

/** Analytic Lp volume, evaluated numerically; independent of the display mesh. */
export function lpVolume3(p: number) {
  if (p !== Infinity && (!Number.isFinite(p) || p < 1)) throw new RangeError("Invalid Lp exponent");
  if (p === Infinity) return 8;
  if (p === 1) return 4 / 3;
  if (p === 2) return 4 * Math.PI / 3;
  return 8 * Math.exp(3 * logGamma(1 + 1 / p) - logGamma(1 + 3 / p));
}

export function lpSurface3(p: number, subdivisions = 12): SolidMesh {
  if ((p !== Infinity && (!Number.isFinite(p) || p < 1)) || !Number.isInteger(subdivisions) || subdivisions < 2 || subdivisions > 48) throw new RangeError("Invalid surface sampling");
  const vertices: Point3[] = [], faces: number[][] = [];
  if (p === 1) {
    vertices.push([1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]);
    for (const x of [0, 1]) for (const y of [2, 3]) for (const z of [4, 5]) faces.push([x, y, z]);
  } else {
    // Radial projection of six cube patches avoids pole degeneracy and captures cube corners.
    const count = p === Infinity ? 1 : subdivisions;
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      const start = vertices.length;
      for (let row = 0; row <= count; row++) for (let col = 0; col <= count; col++) {
        const point = [0, 0, 0]; point[axis] = sign;
        point[(axis + 1) % 3] = 2 * col / count - 1; point[(axis + 2) % 3] = 2 * row / count - 1;
        const norm = p === Infinity ? 1 : point.reduce((sum, v) => sum + Math.abs(v) ** p, 0) ** (1 / p);
        vertices.push(point.map((v) => v / norm) as unknown as Point3);
      }
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        const a = start + row * (count + 1) + col, b = a + 1, c = b + count + 1, d = a + count + 1;
        if (p === Infinity) faces.push([a, b, c, d]);
        else faces.push([a, b, c], [a, c, d]);
      }
    }
  }
  // Consistent outward winding, including the exact octahedron and cube endpoints.
  for (const face of faces) {
    const [a, b, c] = face.map((index) => vertices[index]);
    const u = b.map((v, i) => v - a[i]), v = c.map((w, i) => w - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (normal.reduce((sum, n, i) => sum + n * a[i], 0) < 0) face.reverse();
  }
  return { vertices, faces };
}

export function mahlerPair3(p: number, shear: number) {
  const q = polarExponent(p);
  const transform = (mesh: SolidMesh, polar = false): SolidMesh => ({ ...mesh, vertices: mesh.vertices.map((point) => shearPoint3(point, shear, polar)) });
  const body = transform(lpSurface3(p)), polar = transform(lpSurface3(q), true);
  const bodyVolume = lpVolume3(p), polarVolume = lpVolume3(q);
  return { q, body, polar, bodyVolume, polarVolume, product: bodyVolume * polarVolume };
}
