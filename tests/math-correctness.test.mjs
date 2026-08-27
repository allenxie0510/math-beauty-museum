import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps the four halls' formulas aligned with their rendered models", async () => {
  const museum = await read("../app/NatureMuseum3D.tsx");
  assert.match(museum, /α = 360°\/φ² ≈ 137\.5°/);
  assert.match(museum, /h = a\[cosh\(L\/\(2a\)\) − 1\]/);
  assert.match(museum, /solveCatenaryParameter\(span, rise\)/);
  assert.match(museum, /αₙ = \(n−2\)·180°\/n\\nmαₙ = 360°/);
  assert.match(museum, /Σₙ₌₁ᴺ n⁻ᵖ sin\(2πnf₀t\)/);
  assert.match(museum, /uₘₙ = sin\(mπx\)sin\(nπy\) − sin\(nπx\)sin\(mπy\)/);
  assert.match(museum, /solveEccentricAnomaly\(meanAnomaly, eccentricity\)/);
  assert.match(museum, /radius = innerRadius \* Math\.exp\(curvature \* theta\)/);
  assert.match(museum, /repeatTime = leastCommonMultiple\(p, q\)/);
  assert.doesNotMatch(museum, /Σ interior angles = 360°/);
  assert.doesNotMatch(museum, /Math\.pow\(progress, \.72\)/);
});

test("keeps garden controls tied to the displayed equations", async () => {
  const garden = await read("../app/MathGarden3D.tsx");
  assert.match(garden, /flowerRatio", symbol: "c", label: "径向间距"/);
  assert.match(garden, /control\.key==="flowerAngle"&&Math\.abs\(value-137\.5\)/);
  assert.match(garden, /sᵢ\(t\) = 1 \+ A sin\(3\.2vt − 0\.72i\)/);
  assert.match(garden, /shellGrowth", symbol: "g"/);
  assert.match(garden, /mobiusTwist", symbol: "k".*step: 2/);
  assert.match(garden, /z\(θ\) = R exp\(iθ\) = R\(cosθ\+i sinθ\)/);
  assert.match(garden, /const endpoint=new THREE\.Vector3\(Math\.cos\(phase\)\*radius/);
  assert.doesNotMatch(garden, /formula: "X\(u,v; R,w,k\)/);
});

test("normalizes legacy hometown overlays and preserves exact period counts", async () => {
  const [registry, overlay, hometown] = await Promise.all([
    read("../app/hometown-math/domain/registry.ts"),
    read("../app/HometownMathOverlay.tsx"),
    read("../app/HometownMathWorld.tsx"),
  ]);
  assert.match(registry, /spacing: 6/);
  assert.match(registry, /spacing: 5/);
  assert.match(registry, /normalizeOverlayCount/);
  assert.match(registry, /λ ≈ L\/\$\{count\}/);
  assert.match(overlay, /t \* Math\.PI \* 2 \* count/);
  assert.match(hometown, /learning: buildLearningContent\(item\.conceptId, item\.overlay, item\.interpretation\)/);
});

test("retains correct workshop symmetry and section formulas", async () => {
  const [workshop, geometry] = await Promise.all([
    read("../app/InteractiveWorkshop.tsx"),
    read("../app/space-slice/geometry.ts"),
  ]);
  assert.match(workshop, /360° ÷ \{repeat\} = \{360 \/ repeat\}°/);
  assert.match(geometry, /r² = R² − d²/);
  assert.match(geometry, /threshold = Math\.PI \/ 2 - CONE_HALF_ANGLE/);
});

test("keeps displayed formulas free of prose and non-mathematical separators", async () => {
  const sources = await Promise.all([
    read("../app/NatureMuseum3D.tsx"),
    read("../app/MathGarden3D.tsx"),
    read("../app/hometown-math/domain/registry.ts"),
    read("../app/space-slice/geometry.ts"),
  ]);
  const literal = /formula:\s*(["`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  const formulas = sources.flatMap((source) => [...source.matchAll(literal)].map((match) => match[2]));
  assert.ok(formulas.length >= 25);
  for (const formula of formulas) {
    assert.doesNotMatch(formula, /[\u3400-\u9fff]/);
    assert.doesNotMatch(formula, /[；，。]/);
    assert.doesNotMatch(formula, /\s·\s/);
  }
});
