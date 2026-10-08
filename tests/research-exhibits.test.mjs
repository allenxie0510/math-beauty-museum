import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function module(name) {
  const source = await readFile(new URL(`../app/research-exhibits/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const mahler = await module("mahler-polar");
const standard = await module("standard-map");
const nodal = await module("nodal-lines");
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}, tolerance ${tolerance}`);

test("Mahler endpoints, common scale, polar incidence, and shear invariance", () => {
  for (const shear of [-.8, 0, .8]) {
    const diamond = mahler.mahlerPair(1, shear);
    assert.equal(diamond.q, Infinity);
    near(diamond.bodyArea, 2); near(diamond.polarArea, 4); near(diamond.product, 8);
    near(mahler.mahlerPair(2, shear).product, Math.PI ** 2, 4e-5);
  }
  let worst = 0;
  for (let index = 0; index <= 140; index++) {
    const p = 1 + index * .05;
    const plain = mahler.mahlerPair(p, 0);
    const refined = mahler.mahlerPair(p, 0, 4096);
    worst = Math.max(worst, Math.abs(plain.product - refined.product));
    assert.ok(plain.product >= 8 - 1e-10 && plain.product <= Math.PI ** 2 + 1e-10);
    for (const shear of [-.8, .8]) {
      const result = mahler.mahlerPair(p, shear);
      near(result.product, plain.product);
      for (let i = 0; i < result.body.length; i += 127) for (let j = 0; j < result.polar.length; j += 127) {
        const [x, y] = result.body[i], [u, v] = result.polar[j];
        assert.ok(x * u + y * v <= 1 + 1e-10, "polar definition must survive shear");
      }
    }
  }
  assert.ok(worst < 8e-5, `sampling difference ${worst}`);
  console.log({ mahlerMaxSamplingDifference: worst });
  assert.equal(mahler.lpBoundary(8).length, 2048);
  assert.throws(() => mahler.mahlerPair(0, 0), RangeError);
  assert.throws(() => mahler.mahlerPair(2, 1), RangeError);
});

test("standard map uses new y, wraps negative positions, and is invertible/area preserving", () => {
  const next = standard.standardMapStep([.25, .1], .25);
  near(next[0], .6); near(next[1], .35); near(standard.mod1(-.2), .8);
  const orbit = standard.mapOrbit([.17, .31], 0, 2400);
  orbit.forEach(([x, y], index) => { near(y, .31); near(standard.torusDistance([x, y], [standard.mod1(.17 + index * .31), .31]), 0); });
  for (const k of [0, .15, .9, 3]) for (const start of standard.seededStarts(7)) {
    const [u, v] = standard.standardMapStep(start, k);
    const x = standard.mod1(u - v), y = standard.mod1(v - k * Math.sin(2 * Math.PI * x));
    near(standard.torusDistance(start, [x, y]), 0);
    assert.ok(u >= 0 && u < 1 && v >= 0 && v < 1);
    const h = 1e-6;
    const dx = standard.standardMapStep([start[0] + h, start[1]], k);
    const dy = standard.standardMapStep([start[0], start[1] + h], k);
    const wrapDelta = (a, b) => standard.mod1(a - b + .5) - .5;
    const determinant = (wrapDelta(dx[0], u) * wrapDelta(dy[1], v) - wrapDelta(dy[0], u) * wrapDelta(dx[1], v)) / h ** 2;
    near(determinant, 1, 2e-7);
  }
  near(standard.torusDistance([.99, .5], [.01, .5]), .02);
});

test("standard map seeded trajectories are reproducible and computation is bounded", () => {
  assert.deepEqual(standard.seededStarts(7), standard.seededStarts(7));
  assert.notDeepEqual(standard.seededStarts(7), standard.seededStarts(8));
  assert.deepEqual(standard.mapOrbit([.1, .2], .9, 200), standard.mapOrbit([.1, .2], .9, 200));
  const time = performance.now();
  const traces = standard.seededStarts(7, 14).map((start) => standard.mapOrbit(start, 3, 2400));
  assert.equal(traces.flat().length, 14 * 2401);
  console.log({ maxOrbitBatchMs: performance.now() - time });
  for (const args of [[[NaN, 0], 1, 20], [[0, 0], 4, 20], [[0, 0], 1, 2401]]) assert.throws(() => standard.mapOrbit(...args), RangeError);
});

test("torus modes have the same positive eigenvalue, are periodic and never identically zero", () => {
  for (let m = 1; m <= 5; m++) for (let n = 0; n <= 5; n++) for (const mix of [0, 35, 45, 90]) for (const phase of [0, 90, 360]) {
    const parameters = { m, n, mix, phase };
    nodal.validateNodal(parameters);
    const f = (x, y) => nodal.torusEigenfunction(x, y, parameters);
    const lambda = nodal.torusEigenvalue(m, n);
    assert.ok(lambda > 0);
    near(f(.173, .391), f(1.173, .391)); near(f(.173, .391), f(.173, 1.391));
    const x = .173, y = .391, h = 1e-5;
    const minusLaplacian = -(f(x + h, y) + f(x - h, y) + f(x, y + h) + f(x, y - h) - 4 * f(x, y)) / h ** 2;
    near(minusLaplacian / lambda, f(x, y), 2e-6);
    let mean = 0, squared = 0;
    for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { const value = f(i / 32, j / 32); mean += value; squared += value * value; }
    near(mean / 1024, 0); near(squared / 1024, .5);
  }
});

test("nodal extraction produces finite zero contours, including the analytic single mode", () => {
  const single = nodal.nodalSegments({ m: 1, n: 0, mix: 0, phase: 0 });
  let length = 0;
  for (const [[x, y], [u, v]] of single) {
    assert.ok(Math.min(Math.abs(x - .25), Math.abs(x - .75)) < 1e-10);
    length += Math.hypot(x - u, y - v);
  }
  near(length, 2);
  for (const parameters of [{ m: 5, n: 5, mix: 45, phase: 0 }, { m: 5, n: 4, mix: 35, phase: 85 }, { m: 1, n: 1, mix: 90, phase: 360 }]) {
    const segments = nodal.nodalSegments(parameters);
    assert.ok(segments.length > 0 && segments.length < 2 * 160 * 160);
    for (const segment of segments) for (const [x, y] of segment) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1);
      assert.ok(Math.abs(nodal.torusEigenfunction(x, y, parameters)) < .02);
    }
  }
  assert.throws(() => nodal.nodalSegments({ m: 0, n: 0, mix: 0, phase: 0 }), RangeError);
});

function meshVolume(mesh) {
  let volume = 0;
  for (const face of mesh.faces) for (let j = 1; j + 1 < face.length; j++) {
    const [a, b, c] = [face[0], face[j], face[j + 1]].map((i) => mesh.vertices[i]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return volume;
}

test("3D Mahler exact polyhedra, sphere and analytic volumes agree with independent integration", () => {
  const octa = mahler.mahlerPair3(1, 0);
  assert.equal(octa.body.faces.length, 8); assert.equal(octa.polar.faces.length, 6);
  near(meshVolume(octa.body), 4 / 3); near(meshVolume(octa.polar), 8); near(octa.product, 32 / 3);
  near(mahler.mahlerPair3(2, 0).product, 16 * Math.PI ** 2 / 9);
  // Integrate the height of the solid above a uniform grid in one octant.
  for (const p of [1.05, 1.5, 2, 4, 8, 21]) {
    const resolution = 1000;
    let volume = 0;
    for (let i = 0; i < resolution; i++) {
      const xp = ((i + .5) / resolution) ** p;
      for (let j = 0; j < resolution; j++) {
        const remainder = 1 - xp - ((j + .5) / resolution) ** p;
        if (remainder > 0) volume += remainder ** (1 / p);
      }
    }
    near(8 * volume / resolution ** 2, mahler.lpVolume3(p), .0015);
  }
  for (const p of [1, 1.05, 2, 8, 21, Infinity]) {
    const coarse = meshVolume(mahler.lpSurface3(p, 12)), fine = meshVolume(mahler.lpSurface3(p, 48)), exact = mahler.lpVolume3(p);
    assert.ok(fine <= exact + 1e-10);
    assert.ok(Math.abs(exact - fine) <= Math.abs(exact - coarse) + 1e-10);
    assert.ok(Math.abs(exact - fine) / exact < .002);
  }
});

test("3D shear preserves actual mesh volumes, polar incidence and a bounded shared viewport", () => {
  for (const p of [1, 1.05, 1.5, 2, 4, 8]) {
    const plain = mahler.mahlerPair3(p, 0);
    for (const shear of [-.8, .8]) {
      const pair = mahler.mahlerPair3(p, shear);
      near(meshVolume(pair.body), meshVolume(plain.body));
      near(meshVolume(pair.polar), meshVolume(plain.polar));
      for (const mesh of [pair.body, pair.polar]) for (const point of mesh.vertices) {
        assert.ok(point.every(Number.isFinite));
        assert.ok(Math.hypot(...point) * .19 < .46, "fits under every orthographic rotation");
      }
      for (let i = 0; i < plain.body.vertices.length; i += 19) for (let j = 0; j < plain.polar.vertices.length; j += 19) {
        const before = plain.body.vertices[i].reduce((sum, v, k) => sum + v * plain.polar.vertices[j][k], 0);
        const after = pair.body.vertices[i].reduce((sum, v, k) => sum + v * pair.polar.vertices[j][k], 0);
        near(before, after); assert.ok(after <= 1 + 1e-10);
      }
    }
  }
  for (let i = 0; i <= 140; i++) {
    const p = 1 + i * .05, q = mahler.polarExponent(p), product = mahler.lpVolume3(p) * mahler.lpVolume3(q);
    assert.ok(product >= 32 / 3 - 1e-10 && product <= 16 * Math.PI ** 2 / 9 + 1e-10);
  }
  assert.throws(() => mahler.lpSurface3(NaN), RangeError);
  assert.throws(() => mahler.lpSurface3(2, 10000), RangeError);
  assert.throws(() => mahler.mahlerPair3(2, 1), RangeError);
});
