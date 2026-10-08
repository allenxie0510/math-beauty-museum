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
    const tube = new THREE.TubeGeometry(curve, steps, lowPower ? .017 : .014, 6, false);
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
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .25, roughness: .43, emissive: "#123349", emissiveIntensity: .12, transparent: true, opacity: .28, depthWrite: false })));
  // Solid luminous heads and fading tails make advection visible against the steady field.
  const count = paths.length * 2, tailSteps = lowPower ? 10 : 18, tailSeconds = .28;
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(lowPower ? .047 : .042, 8, 6), new THREE.MeshBasicMaterial({ color: "#fff2b1", toneMapped: false }), count);
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heads.frustumCulled = false;
  group.add(heads);
  const positions = new Float32Array(count * tailSteps * 6);
  const colors = new Float32Array(positions.length);
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const dim = new THREE.Color("#164960"), bright = new THREE.Color("#c5fff6");
  for (let particle = 0; particle < count; particle++) for (let segment = 0; segment < tailSteps; segment++) {
    for (let end = 0; end < 2; end++) dim.clone().lerp(bright, 1 - (segment + end) / tailSteps).toArray(colors, (particle * tailSteps + segment) * 6 + end * 3);
  }
  tailGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const tails = new THREE.LineSegments(tailGeometry, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: .9, depthWrite: false }));
  tails.frustumCulled = false;
  group.add(tails);
  const position = new THREE.Vector3(), matrix = new THREE.Matrix4();
  const sample = (points: THREE.Vector3[], phase: number, target: THREE.Vector3) => {
    const q = Math.max(0, Math.min(1, phase)) * (points.length - 1);
    const start = Math.floor(q);
    return target.copy(points[start]).lerp(points[Math.min(start + 1, points.length - 1)], q - start);
  };
  const update = (time: number) => {
    paths.forEach(({ points, duration }, index) => {
      for (let copy = 0; copy < 2; copy++) {
        const phase = (time / duration + index * .61803398875 + copy * .5) % 1;
        const particle = index * 2 + copy;
        sample(points, phase, position);
        heads.setMatrixAt(particle, matrix.makeTranslation(position.x, position.y, position.z));
        for (let segment = 0; segment < tailSteps; segment++) for (let end = 0; end < 2; end++) {
          // Clamp the trailing end at the inlet; never draw a line across reinjection.
          sample(points, phase - tailSeconds / duration * (segment + end) / tailSteps, position);
          position.toArray(positions, (particle * tailSteps + segment) * 6 + end * 3);
        }
      }
    });
    heads.instanceMatrix.needsUpdate = true;
    tailGeometry.attributes.position.needsUpdate = true;
  };
  update(0);
  return { group, update };
}
