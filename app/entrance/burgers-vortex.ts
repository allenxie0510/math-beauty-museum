/** Classical steady Burgers vortex, density-normalized and unforced on R³.
 * This is a local visualization, not the finite-energy OpenAI blowup construction.
 * Cylindrical convention: u_r=-a r/2, u_z=a z, u_theta=Γ(1-exp(-a r²/4ν))/(2πr).
 */
export type VortexParameters = { strain: number; viscosity: number; circulation: number };
export type VortexPoint = readonly [number, number, number];
export const DEFAULT_VORTEX: VortexParameters = { strain: .75, viscosity: .16, circulation: 20 };
export const FLUID_RESEARCH_COMMIT = "f9e8bc5b38b6e212696e8a30e3e91517af887bbd";
export const FLUID_RESEARCH_URL = `https://github.com/openai/NavierStokesAndEuler/tree/${FLUID_RESEARCH_COMMIT}`;
export const BURGERS_SOURCE_URL = "https://brian-f-farrell.fas.harvard.edu/sites/g/files/omnuum10491/files/brian_f_farrell/files/generalized.pdf";

export function validateVortex(p: VortexParameters) {
  if (!Number.isFinite(p.strain) || p.strain < .3 || p.strain > 1.2 || !Number.isFinite(p.viscosity) || p.viscosity < .06 || p.viscosity > .4 || !Number.isFinite(p.circulation) || Math.abs(p.circulation) > 24) throw new RangeError("Invalid vortex parameters");
}

export function vortexAngularSpeed(radiusSquared: number, p: VortexParameters) {
  const c = p.strain / (4 * p.viscosity);
  // expm1 avoids cancellation, with the removable axial singularity filled in.
  return p.circulation / (2 * Math.PI) * (radiusSquared < 1e-12 ? c : -Math.expm1(-c * radiusSquared) / radiusSquared);
}
export function vortexVelocity([x, y, z]: VortexPoint, p: VortexParameters): VortexPoint {
  const omega = vortexAngularSpeed(x * x + y * y, p);
  return [-p.strain * x / 2 - omega * y, -p.strain * y / 2 + omega * x, p.strain * z];
}
export function vortexVorticity(radius: number, p: VortexParameters) {
  return p.circulation * p.strain / (4 * Math.PI * p.viscosity) * Math.exp(-p.strain * radius * radius / (4 * p.viscosity));
}
/** ∇p for the exact steady solution; p_z=-a²z, p_r=u_theta²/r-a²r/4. */
export function vortexPressureGradient([x, y, z]: VortexPoint, p: VortexParameters): VortexPoint {
  const omega = vortexAngularSpeed(x * x + y * y, p);
  const radial = omega * omega - p.strain * p.strain / 4;
  return [radial * x, radial * y, -p.strain * p.strain * z];
}

/** Exact r(t), z(t), Simpson integration of θ'(t). Time sampling is uniform. */
export function vortexTrajectory(seed: VortexPoint, duration: number, steps: number, p: VortexParameters): VortexPoint[] {
  validateVortex(p);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 24 || !Number.isInteger(steps) || steps < 16 || steps > 1024 || seed.some((v) => !Number.isFinite(v))) throw new RangeError("Invalid trajectory");
  const radius = Math.hypot(seed[0], seed[1]), dt = duration / steps;
  let angle = Math.atan2(seed[1], seed[0]);
  const points: VortexPoint[] = [[...seed]];
  const angularAt = (t: number) => vortexAngularSpeed(radius * radius * Math.exp(-p.strain * t), p);
  for (let i = 1; i <= steps; i++) {
    const t = i * dt;
    angle += dt / 6 * (angularAt(t - dt) + 4 * angularAt(t - dt / 2) + angularAt(t));
    const r = radius * Math.exp(-p.strain * t / 2);
    points.push([r * Math.cos(angle), r * Math.sin(angle), seed[2] * Math.exp(p.strain * t)]);
  }
  return points;
}
