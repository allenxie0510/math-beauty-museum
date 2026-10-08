import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { vortexAngularSpeed, vortexTrajectory, type VortexParameters } from "./burgers-vortex";

/** A bounded bundle of steady streamlines with tracers moving in physical time. */
export function makeVortexSculpture(parameters: VortexParameters, lowPower: boolean) {
  const group = new THREE.Group();
  group.name = "atrium-navier-stokes-vortex";
  group.scale.setScalar(1.08);
  const paths: { points: THREE.Vector3[]; duration: number }[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const arms = lowPower ? 5 : 8, steps = lowPower ? 112 : 224;
  const cold = new THREE.Color("#159da9"), blue = new THREE.Color("#2857b4"), warm = new THREE.Color("#bc691f");
  const maxOmega = Math.abs(vortexAngularSpeed(0, parameters));
  for (const sign of [-1, 1]) for (let layer = 0; layer < 3; layer++) for (let arm = 0; arm < arms; arm++) {
    const angle = arm / arms * Math.PI * 2 + layer * .31;
    const radius = 2.5 - layer * .19, height = sign * (.025 + layer * .047);
    const duration = Math.log(2.65 / Math.abs(height)) / parameters.strain;
    const samples = vortexTrajectory([radius * Math.cos(angle), radius * Math.sin(angle), height], duration, steps, parameters);
    // Mathematical z is the vertical axis; this rigid rotation preserves handedness.
    const points = samples.map(([x, y, z]) => new THREE.Vector3(x, z, -y));
    paths.push({ points, duration });
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const tube = new THREE.TubeGeometry(curve, steps, lowPower ? .027 : .025, 6, false);
    const colors = new Float32Array(tube.attributes.position.count * 3);
    const position = tube.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const r2 = position.getX(i) ** 2 + position.getZ(i) ** 2;
      const strength = maxOmega ? Math.min(1, Math.abs(vortexAngularSpeed(r2, parameters)) / maxOmega) : 0;
      const color = strength < .5 ? cold.clone().lerp(blue, strength * 2) : blue.clone().lerp(warm, (strength - .5) * 2);
      color.toArray(colors, i * 3);
    }
    tube.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometries.push(tube);
  }
  const geometry = mergeGeometries(geometries)!;
  geometries.forEach((part) => part.dispose());
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .25, roughness: .43, emissive: "#123349", emissiveIntensity: .12 })));
  const positions = new Float32Array(paths.length * 2 * 3);
  const tracerGeometry = new THREE.BufferGeometry();
  tracerGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const tracers = new THREE.Points(tracerGeometry, new THREE.PointsMaterial({ color: "#fff4da", size: lowPower ? .047 : .058, transparent: true, opacity: .94, depthWrite: false, toneMapped: false }));
  tracers.frustumCulled = false;
  group.add(tracers);
  const update = (time: number) => {
    paths.forEach(({ points, duration }, index) => {
      for (let copy = 0; copy < 2; copy++) {
        const q = ((time * .55 / duration + index * .61803398875 + copy * .5) % 1) * (points.length - 1);
        const start = Math.floor(q), fraction = q - start;
        const a = points[start], b = points[Math.min(start + 1, points.length - 1)];
        const offset = (index * 2 + copy) * 3;
        positions[offset] = a.x + (b.x - a.x) * fraction;
        positions[offset + 1] = a.y + (b.y - a.y) * fraction;
        positions[offset + 2] = a.z + (b.z - a.z) * fraction;
      }
    });
    tracerGeometry.attributes.position.needsUpdate = true;
  };
  update(0);
  return { group, update };
}
