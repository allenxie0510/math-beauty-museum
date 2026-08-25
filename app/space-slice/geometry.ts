import * as THREE from "three";

export type SliceShapeId = "cube" | "sphere" | "cylinder" | "cone";

export type SectionContour = {
  points3D: THREE.Vector3[];
  points2D: THREE.Vector2[];
  closed: boolean;
};

export type SectionClassification = {
  type: string;
  label: string;
  insight: string;
  formula?: string;
  greatCircle?: boolean;
};

export type SectionResult = {
  contours: SectionContour[];
  classification: SectionClassification;
  normal: THREE.Vector3;
  offset: number;
};

const SECTION_EPS = 1e-5;
const WELD_EPS = 2e-4;
const SPHERE_RADIUS = 1.35;
const CYLINDER_RADIUS = 1.15;
const CYLINDER_HEIGHT = 2.8;
const CONE_RADIUS = 1.25;
const CONE_HEIGHT = 1.85;
const CONE_HALF_ANGLE = Math.atan(CONE_RADIUS / CONE_HEIGHT);

type Segment = [THREE.Vector3, THREE.Vector3];

function pointKey(point: THREE.Vector3) {
  return `${Math.round(point.x / WELD_EPS)}:${Math.round(point.y / WELD_EPS)}:${Math.round(point.z / WELD_EPS)}`;
}

function uniquePoints(points: THREE.Vector3[]) {
  const result: THREE.Vector3[] = [];
  points.forEach((point) => {
    if (!result.some((entry) => entry.distanceToSquared(point) < SECTION_EPS * SECTION_EPS * 4)) result.push(point);
  });
  return result;
}

function intersectTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, plane: THREE.Plane): Segment | null {
  const vertices = [a, b, c];
  const distances = vertices.map((point) => plane.distanceToPoint(point));
  if (distances.every((distance) => distance > SECTION_EPS) || distances.every((distance) => distance < -SECTION_EPS)) return null;
  if (distances.every((distance) => Math.abs(distance) <= SECTION_EPS)) return null;
  const hits: THREE.Vector3[] = [];
  for (let edge = 0; edge < 3; edge += 1) {
    const next = (edge + 1) % 3;
    const p1 = vertices[edge], p2 = vertices[next];
    const d1 = distances[edge], d2 = distances[next];
    if (Math.abs(d1) <= SECTION_EPS) hits.push(p1.clone());
    if (d1 * d2 < -SECTION_EPS * SECTION_EPS) {
      hits.push(p1.clone().lerp(p2, d1 / (d1 - d2)));
    }
  }
  const unique = uniquePoints(hits);
  if (unique.length < 2) return null;
  let pair: Segment = [unique[0], unique[1]];
  let longest = pair[0].distanceToSquared(pair[1]);
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const distance = unique[i].distanceToSquared(unique[j]);
      if (distance > longest) { longest = distance; pair = [unique[i], unique[j]]; }
    }
  }
  return longest > SECTION_EPS * SECTION_EPS ? pair : null;
}

function meshSegments(mesh: THREE.Mesh, plane: THREE.Plane) {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const segments: Segment[] = [];
  const vertex = (i: number) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
  const triangleCount = index ? index.count / 3 : position.count / 3;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const ia = index ? index.getX(triangle * 3) : triangle * 3;
    const ib = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const ic = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2;
    const segment = intersectTriangle(vertex(ia), vertex(ib), vertex(ic), plane);
    if (segment) segments.push(segment);
  }
  return segments;
}

function stitchSegments(segments: Segment[]) {
  const points = new Map<string, THREE.Vector3>();
  const adjacency = new Map<string, Set<string>>();
  const edges = new Map<string, [string, string]>();
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  segments.forEach(([start, end]) => {
    const a = pointKey(start), b = pointKey(end);
    if (a === b) return;
    points.set(a, points.get(a) ?? start.clone());
    points.set(b, points.get(b) ?? end.clone());
    connect(a, b); connect(b, a);
    const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.set(edgeKey, [a, b]);
  });

  const visited = new Set<string>();
  const paths: Array<{ points: THREE.Vector3[]; closed: boolean }> = [];
  const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
  edges.forEach(([a, b], initialEdge) => {
    if (visited.has(initialEdge)) return;
    const start = (adjacency.get(a)?.size ?? 0) === 1 ? a : (adjacency.get(b)?.size ?? 0) === 1 ? b : a;
    const keys = [start];
    let previous = "";
    let current = start;
    let closed = false;
    for (let guard = 0; guard < edges.size + 2; guard += 1) {
      const neighbors = [...(adjacency.get(current) ?? [])];
      const next = neighbors.find((candidate) => !visited.has(edgeKey(current, candidate)) && candidate !== previous)
        ?? neighbors.find((candidate) => !visited.has(edgeKey(current, candidate)));
      if (!next) break;
      visited.add(edgeKey(current, next));
      previous = current;
      current = next;
      if (current === start) { closed = true; break; }
      keys.push(current);
    }
    if (keys.length >= 2) paths.push({ points: keys.map((key) => points.get(key)!.clone()), closed });
  });
  return paths;
}

export function planeBasis(normal: THREE.Vector3, offset: number) {
  const n = normal.clone().normalize();
  const reference = Math.abs(n.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = reference.clone().cross(n).normalize();
  const v = n.clone().cross(u).normalize();
  const origin = n.clone().multiplyScalar(offset);
  return { n, u, v, origin };
}

function simplify(points: THREE.Vector2[], closed: boolean) {
  if (points.length <= 3) return points;
  let result = points.map((point) => point.clone());
  for (let pass = 0; pass < 4; pass += 1) {
    const next = result.filter((point, index) => {
      if (!closed && (index === 0 || index === result.length - 1)) return true;
      const previous = result[(index - 1 + result.length) % result.length];
      const following = result[(index + 1) % result.length];
      const line = following.clone().sub(previous);
      const length = line.length();
      if (length < SECTION_EPS) return false;
      const distance = Math.abs(line.x * (previous.y - point.y) - (previous.x - point.x) * line.y) / length;
      const directionA = point.clone().sub(previous).normalize();
      const directionB = following.clone().sub(point).normalize();
      return distance > .012 || directionA.dot(directionB) < .9985;
    });
    if (next.length === result.length || next.length < 3) break;
    result = next;
  }
  return result;
}

function isSquare(points: THREE.Vector2[]) {
  if (points.length !== 4) return false;
  const sides = points.map((point, index) => point.distanceTo(points[(index + 1) % 4]));
  if (Math.max(...sides) / Math.max(SECTION_EPS, Math.min(...sides)) >= 1.06) return false;
  return points.every((point, index) => {
    const previous = points[(index + 3) % 4].clone().sub(point).normalize();
    const next = points[(index + 1) % 4].clone().sub(point).normalize();
    return Math.abs(previous.dot(next)) < .075;
  });
}

const EMPTY: SectionClassification = { type: "none", label: "没有切到", insight: "移动光片，让它穿过立体后再试一次。" };

function classify(shape: SliceShapeId, contours: SectionContour[], normal: THREE.Vector3, offset: number): SectionClassification {
  if (!contours.length) return EMPTY;
  if (shape === "sphere") {
    const distance = Math.abs(offset);
    if (distance > SPHERE_RADIUS + SECTION_EPS) return EMPTY;
    const radius = Math.sqrt(Math.max(0, SPHERE_RADIUS ** 2 - distance ** 2));
    const greatCircle = distance < SPHERE_RADIUS * .05;
    return {
      type: greatCircle ? "great-circle" : "circle",
      label: greatCircle ? "最大圆" : "圆",
      insight: greatCircle ? "光片穿过了球心，所以出现了球体能拥有的最大截面。" : "方向可以不断改变，只要切到球体，截面始终是圆。",
      formula: `r² = R² − d² · 当前 r ≈ ${radius.toFixed(2)}`,
      greatCircle,
    };
  }
  if (shape === "cube") {
    const main = [...contours].filter((contour) => contour.closed).sort((a, b) => b.points2D.length - a.points2D.length)[0] ?? contours[0];
    const count = main.points2D.length;
    if (count === 3) return { type: "triangle", label: "三角形", insight: "光片靠近一个顶角，同时穿过相邻的三个面。" };
    if (count === 4 && isSquare(main.points2D)) return { type: "square", label: "正方形", insight: "四条边一样长，四个角都是直角。" };
    if (count === 4) return { type: "quadrilateral", label: "四边形", insight: "光片穿过了立方体的四个面。" };
    if (count === 5) return { type: "pentagon", label: "五边形", insight: "这个切面依次穿过了立方体的五个面。" };
    if (count >= 6) return { type: "hexagon", label: "六边形", insight: "光片同时穿过了立方体的六个面，六边形真的藏在里面。" };
    return { type: "special", label: "特殊截面", insight: "光片碰到了边或顶点，移动一点会看到更完整的形状。" };
  }
  const theta = Math.acos(THREE.MathUtils.clamp(Math.abs(normal.clone().normalize().y), 0, 1));
  if (shape === "cylinder") {
    if (theta < THREE.MathUtils.degToRad(4)) return { type: "circle", label: "圆", insight: "光片与圆柱轴垂直，完整复刻了圆柱的圆形底面。" };
    if (theta > THREE.MathUtils.degToRad(86)) return { type: "rectangle", label: "矩形", insight: "光片几乎平行于圆柱轴，于是上下边和两条母线围成矩形。" };
    const ny = Math.max(.0001, Math.abs(normal.y));
    const radial = Math.hypot(normal.x, normal.z);
    const centerY = Math.abs(offset / ny);
    const span = CYLINDER_RADIUS * radial / ny;
    if (centerY + span < CYLINDER_HEIGHT / 2 - .025) return { type: "ellipse", label: "椭圆", insight: "倾斜的光片完整穿过圆柱侧面，把圆拉成了椭圆。" };
    return { type: "mixed", label: "斜截面", insight: "光片同时经过侧面和底面，形成了圆与直线共同围出的过渡形状。" };
  }
  if (Math.abs(offset) < .025) return { type: "special", label: "特殊切法", insight: "光片恰好经过圆锥顶点。移动一点，会看到完整的圆锥曲线。" };
  const threshold = Math.PI / 2 - CONE_HALF_ANGLE;
  const circleTolerance = THREE.MathUtils.degToRad(3);
  const parabolaTolerance = THREE.MathUtils.degToRad(3);
  if (theta < circleTolerance) return { type: "circle", label: "圆", insight: "光片与圆锥轴垂直，圆锥留下了一条圆形切痕。" };
  if (Math.abs(theta - threshold) <= parabolaTolerance) return { type: "parabola", label: "抛物线", insight: "光片与圆锥侧面平行，一条开放的抛物线出现了。" };
  if (theta < threshold) return { type: "ellipse", label: "椭圆", insight: "光片只穿过圆锥的一侧，形成了一条闭合的椭圆。" };
  return { type: "hyperbola", label: "双曲线", insight: "光片同时穿过上下两个圆锥，留下了彼此分开的两支曲线。" };
}

export function computeSection(shape: SliceShapeId, meshes: THREE.Mesh[], normal: THREE.Vector3, offset: number): SectionResult {
  const unitNormal = normal.clone().normalize();
  const plane = new THREE.Plane(unitNormal, -offset);
  const segments = meshes.flatMap((mesh) => meshSegments(mesh, plane));
  const paths = stitchSegments(segments);
  const { u, v, origin } = planeBasis(unitNormal, offset);
  const contours = paths.map((path) => {
    const projected = path.points.map((point) => {
      const delta = point.clone().sub(origin);
      return new THREE.Vector2(delta.dot(u), delta.dot(v));
    });
    const simplified = simplify(projected, path.closed);
    const points3D = simplified.map((point) => origin.clone().addScaledVector(u, point.x).addScaledVector(v, point.y));
    return { points3D, points2D: simplified, closed: path.closed };
  }).filter((contour) => contour.points2D.length >= 2);
  return { contours, classification: classify(shape, contours, unitNormal, offset), normal: unitNormal, offset };
}

export const SPACE_SLICE_DIMENSIONS = {
  sphereRadius: SPHERE_RADIUS,
  cylinderRadius: CYLINDER_RADIUS,
  cylinderHeight: CYLINDER_HEIGHT,
  coneRadius: CONE_RADIUS,
  coneHeight: CONE_HEIGHT,
  coneHalfAngle: CONE_HALF_ANGLE,
};
