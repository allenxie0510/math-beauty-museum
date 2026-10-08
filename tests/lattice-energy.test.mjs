import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/research-exhibits/lattice-energy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { cellArea, unitDensityBasis, gaussianEnergy, latticePoints } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

test("every slider combination preserves density and converges under disk enlargement", () => {
  let maxDifference = 0;
  let checks = 0;
  for (let angle = 45; angle <= 135; angle++) {
    for (let r = 60; r <= 180; r += 2) {
      const basis = unitDensityBasis(angle, r / 100);
      near(cellArea(basis), 1);
      // Positive summands make the slowest-decaying alpha=0.5 the worst truncation case.
      const low = gaussianEnergy(basis, 0.5, 8);
      const high = gaussianEnergy(basis, 0.5, 10);
      maxDifference = Math.max(maxDifference, Math.abs(high - low));
      assert.ok(Number.isFinite(low) && high >= low - 1e-13);
      for (let a = 2; a <= 16; a++) {
        const energy = gaussianEnergy(basis, a / 4);
        assert.ok(Number.isFinite(energy) && energy > 0);
        checks++;
      }
    }
  }
  assert.ok(maxDifference < 1e-10, `Worst radius 8→10 difference: ${maxDifference}`);
  console.log({ sliderCombinations: checks, maxRadiusDifference: maxDifference });
});

test("square sum agrees with independent separable Gaussian series and excludes the origin", () => {
  const square = unitDensityBasis(90, 1);
  for (let a = 2; a <= 16; a++) {
    const alpha = a / 4;
    let oneDimensional = 1;
    for (let n = 1; n <= 40; n++) oneDimensional += 2 * Math.exp(-alpha * n * n);
    near(gaussianEnergy(square, alpha), oneDimensional ** 2 - 1);
  }
  assert.equal(latticePoints(square, 1).length, 4);
  near(gaussianEnergy(square, 2, 1), 4 * Math.exp(-2));
});

test("same physical disk is invariant under rotation, basis swaps, and unimodular shears", () => {
  for (const angle of [45, 60, 90, 120, 135]) {
    for (const ratio of [.6, 1, 1.8]) {
      const basis = unitDensityBasis(angle, ratio);
      const [u, v] = basis;
      const rotate = ([x, y]) => [x * Math.cos(.731) - y * Math.sin(.731), x * Math.sin(.731) + y * Math.cos(.731)];
      for (const alpha of [.5, 2, 4]) {
        const expected = gaussianEnergy(basis, alpha);
        for (const equivalent of [[rotate(u), rotate(v)], [v, u], [u, [v[0] + 3 * u[0], v[1] + 3 * u[1]]]]) {
          near(gaussianEnergy(equivalent, alpha), expected);
        }
      }
    }
  }
});

test("triangular and square presets compare under identical density, scale, and counting", () => {
  const triangular = unitDensityBasis(60, 1);
  near(Math.hypot(...triangular[0]), Math.sqrt(2 / Math.sqrt(3)));
  assert.equal(latticePoints(triangular, 1.075).length, 6);
  for (let a = 2; a <= 16; a++) {
    const alpha = a / 4;
    const tri = gaussianEnergy(triangular, alpha);
    assert.ok(tri < gaussianEnergy(unitDensityBasis(90, 1), alpha));
    near(tri, gaussianEnergy(unitDensityBasis(120, 1), alpha));
    for (const angle of [45, 60, 75, 90, 120, 135]) {
      for (const ratio of [.6, 1, 1.8]) assert.ok(gaussianEnergy(unitDensityBasis(angle, ratio), alpha) >= tri - 1e-12);
    }
  }
  console.log({ alpha: 2, square: gaussianEnergy(unitDensityBasis(90, 1), 2), triangular: gaussianEnergy(triangular, 2) });
});

test("invalid and near-degenerate input is rejected with a bounded enumeration budget", () => {
  for (const params of [[NaN, 1], [0, 1], [180, 1], [60, 0], [60, Infinity]]) assert.throws(() => unitDensityBasis(...params), RangeError);
  for (const alpha of [0, -.5, NaN, Infinity, 5]) assert.throws(() => gaussianEnergy(unitDensityBasis(60, 1), alpha), RangeError);
  assert.throws(() => latticePoints([[1, 0], [1, 0]], 8), RangeError);
  assert.throws(() => latticePoints([[1e6, 0], [0, 1e-6]], 8), RangeError);
  assert.throws(() => latticePoints(unitDensityBasis(60, 1), Infinity), RangeError);
});
