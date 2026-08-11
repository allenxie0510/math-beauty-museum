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
  assert.match(html, /数学美学展序厅/);
  assert.match(html, /下一个展厅：自然数学馆/);
  assert.match(html, /MATH BEAUTY MUSEUM/);
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
  assert.equal((museum.match(/new THREE\.WebGLRenderer/g) ?? []).length, 2);
  assert.match(museum, /OrbitControls/);
  assert.match(museum, /switchHall\(-1\)/);
  assert.match(museum, /switchHall\(1\)/);
  assert.match(museum, /MUSEUM_CAMERA_STOPS/);
  assert.match(museum, /HALL_CENTERS/);
  assert.match(museum, /new THREE\.CatmullRomCurve3/);
  assert.match(museum, /addTextRing/);
  assert.match(museum, /repeatCount = 2/);
  assert.match(museum, /const repeatGap = \(Math\.PI \* 2 - phraseArc \* repeatCount\) \/ repeatCount/);
  assert.match(museum, /new THREE\.CylinderGeometry\(radius, radius, bandHeight/);
  assert.match(museum, /transmission: \.78/);
  assert.match(museum, /"MATH BEAUTY MUSEUM", 5\.45, 8\.15, "#f4f2ff", \.96, 0, 2, 2\.36/);
  assert.match(museum, /"数学美学展", 3\.7, 7\.25, "#b8c9ff", 1\.08, \.18, 2, 1\.52/);
  assert.match(museum, /museumAction = "enter-first-hall"/);
  assert.match(museum, /onEnterRef\.current\(\)/);
  assert.match(museum, /点击地面指引进入第一展馆/);
  assert.match(museum, /MATH BEAUTY MUSEUM/);
  assert.match(museum, /数学美学展/);
  assert.match(museum, /new THREE\.TorusKnotGeometry/);
  assert.match(museum, /continuumStates/);
  assert.match(museum, /continuumPhase = elapsed \/ 3\.5/);
  assert.match(museum, /naturalState/);
  assert.match(museum, /architectureState/);
  assert.match(museum, /soundState/);
  assert.match(museum, /cosmosState/);
  assert.match(museum, /makePointCloud/);
  assert.match(museum, /transmission:/);
  assert.match(museum, /type="range"/);
  assert.equal((museum.match(/symbol: "/g) ?? []).length, 37);
  assert.match(museum, /key: "spiralScale", symbol: "a"/);
  assert.match(museum, /AUTO_CONTROL_KEYS/);
  assert.match(museum, /className="nature-lab-live-vars"/);
  assert.match(museum, /aria-label="公式实时变量"/);
  assert.match(museum, /controlDisplayValue/);
  assert.match(museum, /activeControlKey/);
  assert.match(museum, /isAutoPlaying/);
  assert.match(museum, /自动演示/);
  assert.match(museum, /暂停动画/);
  assert.match(museum, /requestAnimationFrame\(animateControls\)/);
  assert.match(museum, /hall-transition-/);
  assert.match(museum, /THREE\.PCFSoftShadowMap/);
  assert.match(museum, /function SoundDrivePanel/);
  assert.match(museum, /function Galaxy3DPreview/);
  assert.match(museum, /可拖动旋转与缩放的三维螺旋星系/);
  assert.match(museum, /selected\.id === "galaxy"/);
  assert.match(museum, /pixelRatio = Math\.min\(window\.devicePixelRatio \|\| 1, 2\.5\)/);
  assert.match(museum, /<select/);
  assert.match(museum, /className="sound-clip-select"/);
  assert.doesNotMatch(museum, /className="sound-clip-grid"/);
  assert.match(museum, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(museum, /context\.createAnalyser\(\)/);
  assert.match(museum, /id: "crystal"/);
  assert.match(museum, /id: "pulse"/);
  assert.match(museum, /id: "cosmos"/);
  assert.match(museum, /signalRef\.current/);
  assert.match(museum, /const left = \(width - size\) \/ 2/);
  assert.match(museum, /const top = \(height - size\) \/ 2/);
  assert.match(museum, /const edgeInset = size \* \.045/);
  assert.doesNotMatch(museum, /ctx\.strokeStyle = "#b9c4d6"/);
  assert.match(museum, /body\.style\.position = "fixed"/);
  assert.match(museum, /body\.classList\.add\("exhibit-mode"\)/);
  assert.match(museum, /event\.clientY <= 12/);
  assert.match(museum, /body\.classList\.remove\("exhibit-mode", "exhibit-nav-visible"\)/);
  assert.match(museum, /root\.style\.overscrollBehavior = "none"/);
  assert.match(museum, /onWheel=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(museum, /className="immersive-lab-header"/);
  assert.match(museum, /nature-console-grid/);
  assert.doesNotMatch(museum, /className="nature-room-dock"/);
  assert.match(css, /\.museum-hall-arrows/);
  assert.match(css, /\.museum-route-indicator/);
  assert.match(css, /\.immersive-lab-header/);
  assert.match(css, /\.nature-console-grid/);
  assert.match(css, /\.nature-lab-live-vars/);
  assert.match(css, /\.nature-console-actions/);
  assert.match(css, /\.nature-control-name em/);
  assert.match(css, /nature-formula-expression>strong\{font-size:40px/);
  assert.match(css, /Full-screen exhibit mode and compact fixed console/);
  assert.match(css, /\.exhibit-mode \.site-header/);
  assert.match(css, /\.exhibit-mode\.exhibit-nav-visible \.site-header/);
  assert.match(css, /\.exhibit-mode\.exhibit-nav-visible \.nature-lab-close/);
  assert.match(css, /\.nature-lab-shell\{width:100%;height:100svh/);
  assert.match(css, /\.nature-lab-controls\{position:fixed/);
  assert.match(css, /\.sound-clip-select select/);
  assert.match(css, /\.galaxy-3d-preview/);
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
