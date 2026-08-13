import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("ships the hometown module as a third lazy immersive destination", async () => {
  const [page, world, css] = await Promise.all([read("../app/page.tsx"), read("../app/HometownMathWorld.tsx"), read("../app/globals.css")]);
  assert.match(page, /import\("\.\/HometownMathWorld"\)/);
  assert.match(page, />我的家乡数学馆</);
  assert.match(page, /DeferredHometownMath/);
  assert.match(world, /我的家乡<br\/>是一座数学馆/);
  assert.match(world, /原照片.*显现结构.*寻找证据.*读懂数学/s);
  assert.match(world, /开始导览/);
  assert.match(world, /open-hometown-exhibit/);
  assert.match(world, /当前设备使用轻量参观模式/);
  assert.match(world, /IntersectionObserver/);
  assert.match(world, /document\.hidden/);
  assert.match(css, /\.hometown-world/);
  assert.match(css, /\.hometown-reveal/);
});

test("uses a controlled concept registry and one manifest contract", async () => {
  const [registry, types, builder, defaults] = await Promise.all([
    read("../app/hometown-math/domain/registry.ts"),
    read("../app/hometown-math/domain/types.ts"),
    read("../app/hometown-math/domain/manifest.ts"),
    read("../app/hometown-math/domain/default-manifest.ts"),
  ]);
  for (const id of ["symmetry.axial", "symmetry.rotational", "fractal.self_similarity", "pattern.repetition", "geometry.arch", "geometry.hexagon", "spiral.phyllotaxis", "wave.periodicity"]) assert.match(registry, new RegExp(id.replace(".", "\\.")));
  assert.match(types, /export type HometownSceneManifest/);
  assert.match(types, /teacherConfirmed: boolean/);
  assert.match(builder, /item\.teacherConfirmed && item\.conceptId && item\.overlay/);
  assert.match(builder, /validateForPublish/);
  assert.match(builder, /尚未由教师确认数学概念/);
  for (const zone of ["自然的规律", "劳动的智慧", "建筑的秩序", "山水的节奏"]) assert.match(defaults, new RegExp(zone));
});

test("aligns per-photo vector evidence with deterministic learning formulas", async () => {
  const overlay = await read("../app/HometownMathOverlay.tsx");
  const registry = await read("../app/hometown-math/domain/registry.ts");
  const world = await read("../app/HometownMathWorld.tsx");
  const studio = await read("../app/HometownTeacherStudio.tsx");
  assert.match(overlay, /aspectRatio/);
  assert.match(overlay, /editable/);
  assert.match(overlay, /vectorEffect/);
  assert.match(registry, /θ ≈ 360° ÷/);
  assert.match(registry, /d\(P, l\) ≈ d\(P′, l\)/);
  assert.match(registry, /f\(x \+ T\) ≈ f\(x\)/);
  assert.match(world, /核心测量/);
  assert.match(world, /数学表达式/);
  assert.match(world, /为什么这种结构很美/);
  assert.match(world, /hometown-photo-carousel/);
  assert.doesNotMatch(world, /objectFit: "fill"/);
  assert.match(studio, /照片级结构校准/);
  assert.match(studio, /AI 照片分析/);
  assert.doesNotMatch(studio, /画面证据<textarea/);
  assert.match(studio, /showCount/);
  assert.match(studio, /确认概念、标注与解读/);
});

test("persists teacher workflow in D1 and images in R2", async () => {
  const [hosting, schema, upload, server, studio, migration] = await Promise.all([
    read("../.openai/hosting.json"),
    read("../db/schema.ts"),
    read("../app/api/hometown/upload/route.ts"),
    read("../app/hometown-math/services/server.ts"),
    read("../app/HometownTeacherStudio.tsx"),
    read("../drizzle/0000_bouncy_magma.sql"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  for (const table of ["hometown_exhibitions", "hometown_assets", "hometown_exhibits", "hometown_zones", "hometown_published_manifests"]) {
    assert.match(schema, new RegExp(table));
    assert.match(migration, new RegExp(table));
  }
  assert.match(upload, /12 \* 1024 \* 1024/);
  assert.match(upload, /env\.MEDIA\.put/);
  assert.match(studio, /Promise\.all\(\[worker\(\), worker\(\), worker\(\)\]\)/);
  assert.match(studio, /移除 EXIF/);
  assert.match(server, /env\.MEDIA\.delete/);
  assert.match(server, /manifestVersion: version/);
});
