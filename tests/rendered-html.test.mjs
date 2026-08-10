import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(process.pid) + "-" + String(Date.now()));
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished mathematics museum", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>数学美学展 · Math Beauty Museum<\/title>/i);
  assert.match(html, /自然数学馆/);
  assert.match(html, /切换数学展厅/);
  assert.match(html, /上一个展厅：宇宙数学馆/);
  assert.match(html, /下一个展厅：建筑数学馆/);
  assert.match(html, /数学探索花园/);
  assert.doesNotMatch(html, /journey-intro|class="exhibit|互动实验台/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("ships four interactive WebGL halls and twelve concepts", async () => {
  const [museum, page, layout, css] = await Promise.all([
    readFile(new URL("../app/NatureMuseum3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const hall of ["自然数学馆", "建筑数学馆", "声音数学馆", "宇宙数学馆"]) {
    assert.match(museum, new RegExp('name: "' + hall + '"'));
  }
  for (const id of [
    "golden", "fractal", "phyllotaxis",
    "pythagoras", "catenary", "tessellation",
    "sine", "harmonics", "chladni",
    "orbit", "galaxy", "resonance",
  ]) {
    assert.match(museum, new RegExp('id: "' + id + '"'));
  }

  assert.equal((museum.match(/key: "(nature|architecture|sound|cosmos)"/g) ?? []).length, 4);
  assert.match(museum, /new THREE\.WebGLRenderer/);
  assert.match(museum, /OrbitControls/);
  assert.match(museum, /switchHall\(-1\)/);
  assert.match(museum, /switchHall\(1\)/);
  assert.match(museum, /type="range"/);
  assert.match(museum, /hall-transition-/);
  assert.match(museum, /THREE\.PCFSoftShadowMap/);
  assert.match(museum, /target\.position\.set\(x, 6\.52/);
  assert.match(museum, /function SoundDrivePanel/);
  assert.match(museum, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(museum, /context\.createAnalyser\(\)/);
  assert.match(museum, /id: "crystal"/);
  assert.match(museum, /id: "pulse"/);
  assert.match(museum, /id: "cosmos"/);
  assert.match(museum, /signalRef\.current/);
  assert.match(museum, /body\.style\.position = "fixed"/);
  assert.match(museum, /root\.style\.overscrollBehavior = "none"/);
  assert.match(museum, /onWheel=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.doesNotMatch(museum, /className="nature-room-dock"/);
  assert.match(css, /\.museum-hall-arrows/);
  assert.match(css, /\.sound-drive-panel/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /\.hall-transition-leaving/);
  assert.doesNotMatch(css, /\.museum-hall-switcher/);
  assert.match(css, /--hall-accent/);
  assert.match(page, />四展馆</);
  assert.match(page, /<NatureMuseumWorld \/>/);
  assert.match(page, /<MathGardenWorld/);
  assert.doesNotMatch(page, /GoldenFlower|FractalForest|GeometryBuilder|FourierSound|SpiralUniverse|journey-intro/);
  assert.match(layout, /Math Beauty Museum/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});
