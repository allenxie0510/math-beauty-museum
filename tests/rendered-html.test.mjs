import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
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
  assert.doesNotMatch(html, /THE LANGUAGE BEHIND BEAUTY · PROLOGUE/);
  assert.match(html, /数学探索花园/);
  assert.doesNotMatch(html, /journey-intro|class="exhibit|互动实验台/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("ships four interactive WebGL halls and twelve concepts", async () => {
  const [museum, garden, page, layout, css, audio, viewport] = await Promise.all([
    readFile(new URL("../app/NatureMuseum3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MathGarden3D.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/audio.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/viewport.ts", import.meta.url), "utf8"),
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
  assert.match(museum, /window\.matchMedia\("\(pointer: coarse\)"\)/);
  assert.match(museum, /tapTolerance = event\.pointerType === "touch" \? 18 : 7/);
  assert.match(museum, /webglcontextlost/);
  assert.match(museum, /setRetryKey\(\(key\) => key \+ 1\)/);
  assert.match(museum, /container\.dataset\.webglError = "true"/);
  assert.match(museum, /className="webgl-fallback-actions"/);
  assert.match(museum, /进入自然数学馆/);
  assert.match(museum, /className="museum-keyboard-exhibits"/);
  assert.match(museum, /键盘访问/);
  assert.match(museum, /OrbitControls/);
  assert.match(museum, /switchHall\(-1\)/);
  assert.match(museum, /switchHall\(1\)/);
  assert.match(museum, /const handleHallWheel/);
  assert.match(museum, /wheelAccumulator\.current \+= delta/);
  assert.match(museum, /wheelAccumulator\.current > 0 \? -1 : 1/);
  assert.match(museum, /const handleMuseumWheel/);
  assert.match(museum, /bounds\.bottom <= 0 \|\| bounds\.top >= window\.innerHeight/);
  assert.match(museum, /window\.addEventListener\("wheel", handleMuseumWheel, \{ passive: false \}\)/);
  assert.match(museum, /window\.removeEventListener\("wheel", handleMuseumWheel\)/);
  assert.match(museum, /ref=\{galleryRef\}/);
  assert.doesNotMatch(museum, /onWheel=\{handleHallWheel\}/);
  assert.match(museum, /direction > 0 && hallIndex >= HALLS\.length - 1\) return/);
  assert.doesNotMatch(museum, /getElementById\("garden"\)\?\.scrollIntoView/);
  assert.match(museum, /已经位于最后一个展厅/);
  assert.match(museum, /museum-navigation-busy/);
  assert.match(museum, /MUSEUM_CAMERA_STOPS/);
  assert.match(museum, /new THREE\.Vector3\(0, 4\.8, 18\.8\)/);
  assert.match(museum, /controls\.enableZoom = false/);
  assert.match(museum, /HALL_CENTERS/);
  assert.doesNotMatch(museum, /new THREE\.CatmullRomCurve3/);
  assert.match(museum, /class PortalArchCurve extends THREE\.Curve<THREE\.Vector3>/);
  assert.match(museum, /const arcLength = Math\.PI \* radius/);
  assert.match(museum, /new THREE\.TubeGeometry\(curve, 96, \.045 \+ layer \* \.014, 12, false\)/);
  assert.match(museum, /glowMaterial\(color, \.48 - layer \* \.1\)/);
  assert.match(museum, /addTextRing/);
  assert.match(museum, /let cursor = offset - phraseArc \/ 2/);
  assert.doesNotMatch(museum, /repeatCount|repeatGap/);
  assert.match(museum, /new THREE\.CylinderGeometry\(radius, radius, bandHeight/);
  assert.match(museum, /transmission: \.78/);
  assert.match(museum, /"MATH BEAUTY MUSEUM", 5\.45, 8\.55, "#f4f2ff", \.96, 0, 2\.36/);
  assert.match(museum, /"数学美学展", 3\.7, 7\.65, "#b8c9ff", 1\.08, 0, 1\.52/);
  assert.match(museum, /emissiveMap: texture/);
  assert.match(museum, /emissiveIntensity: 2\.2/);
  assert.doesNotMatch(museum, /atrium\.rotation\.y = elapsed/);
  assert.match(museum, /museumAction = "enter-first-hall"/);
  assert.match(museum, /function makeChevronMaterial/);
  assert.match(museum, /ctx\.lineCap = "round"/);
  assert.match(museum, /entranceGuide\.position\.set\(0, \.045, 5\.9\)/);
  assert.match(museum, /new THREE\.PlaneGeometry\(\.9, \.9\), makeChevronMaterial/);
  assert.doesNotMatch(museum, /const arrowShape = new THREE\.Shape/);
  assert.doesNotMatch(museum, /const guidePoints =/);
  assert.doesNotMatch(museum, /const guideCurve =/);
  assert.match(museum, /onEnterRef\.current\(\)/);
  assert.doesNotMatch(museum, /点击地面指引进入第一展馆/);
  assert.match(museum, /MATH BEAUTY MUSEUM/);
  assert.match(museum, /数学美学展/);
  assert.match(museum, /new THREE\.TorusKnotGeometry/);
  assert.match(museum, /function roundedRectPath/);
  assert.match(museum, /const secondaryColor: Record<HallKey, string>/);
  assert.match(museum, /FORM · NUMBER · PATTERN/);
  assert.match(museum, /opacity: \.88/);
  assert.match(museum, /polygonOffsetFactor: -1/);
  assert.match(museum, /face\.position\.z = \.132/);
  assert.match(museum, /face\.renderOrder = 1/);
  assert.doesNotMatch(museum, /const pedestal = new THREE\.Mesh/);
  assert.match(museum, /const atriumBlue = "#5d7fd0"/);
  assert.match(museum, /const atriumPortalMaterial = physical\(atriumBlue/);
  assert.match(museum, /continuum\.position\.set\(0, 3\.05, \.25\)/);
  assert.match(museum, /knot\.scale\.setScalar\(1\.1\)/);
  assert.match(museum, /const displayRing = new THREE\.Mesh/);
  assert.match(museum, /new THREE\.TorusGeometry\(2\.72, \.045/);
  assert.match(museum, /displayRing\.position\.y = -3/);
  assert.match(museum, /const beamRig = new THREE\.Group/);
  assert.match(museum, /const outerBeam = new THREE\.Mesh/);
  assert.match(museum, /const beamSpot = new THREE\.SpotLight/);
  assert.match(museum, /const beamDustCount = lowPower \? 28 : 68/);
  assert.doesNotMatch(museum, /className="nature-museum-title atrium-title"/);
  assert.doesNotMatch(museum, /THE LANGUAGE BEHIND BEAUTY · PROLOGUE/);
  assert.doesNotMatch(museum, /continuumStates|continuumDust|pedestalHalo/);
  assert.doesNotMatch(museum, /new THREE\.IcosahedronGeometry\(2\.15/);
  assert.match(museum, /makePointCloud/);
  assert.match(museum, /function addHallHologram/);
  assert.match(museum, /group\.scale\.setScalar\(\.8\)/);
  assert.match(museum, /function buildHallScene/);
  assert.match(museum, /hallTitle\.position\.set\(center\.x, 7\.78, center\.z - 5\.62\)/);
  assert.match(museum, /titleFace\.position\.z = \.08/);
  assert.match(museum, /\[-\.005, -\.07\]\.forEach/);
  assert.match(museum, /titleDepthMaterial\.emissiveIntensity = \.68/);
  assert.match(museum, /let activeHallScene: HallSceneBundle \| null = null/);
  assert.match(museum, /disposeObject\(activeHallScene\.root\)/);
  assert.match(museum, /loadOnlyHall\(requestedHallIndex\)/);
  assert.match(museum, /container\.dataset\.loadedHall/);
  assert.match(museum, /container\.dataset\.targetFps = lowPower \? "30" : "60"/);
  assert.match(museum, /const minimumFrameInterval = lowPower \? 1000 \/ 30 : 0/);
  assert.match(museum, /if \(loadedHallIndex < 0\)/);
  assert.match(museum, /\["fibonacci", "architecture", "fourier", "galaxy"\]/);
  assert.match(museum, /new THREE\.SphereGeometry\(1\.78/);
  assert.match(museum, /transmission: lowPower \? \.18 : \.72/);
  assert.match(museum, /particles\.userData\.waveSamples/);
  assert.match(museum, /positions\.needsUpdate = true/);
  assert.doesNotMatch(museum, /addHallSignature/);
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
  assert.match(museum, /mobileCanvas \? 1\.5 : 2\.5/);
  assert.match(museum, /lowPower \? 1\.25 : 2/);
  assert.match(garden, /controls\.autoRotate=!reducedMotion/);
  assert.match(garden, /renderer\.shadowMap\.enabled=!lowPower/);
  assert.match(garden, /tapTolerance=e\.pointerType==="touch"\?18:7/);
  assert.match(garden, /webglcontextlost/);
  assert.match(garden, /setRetryKey\(key=>key\+1\)/);
  assert.match(garden, /container\.dataset\.webglError="true"/);
  assert.match(garden, /container\.dataset\.quality=lowPower\?"eco":"standard"/);
  assert.match(garden, /new THREE\.CircleGeometry\(30,lowPower\?64:128\)/);
  assert.match(garden, /const seedGeometry=new THREE\.SphereGeometry\(\.028,10,8\)/);
  assert.match(garden, /const branchMaterials=/);
  assert.match(garden, /const geometries=new Set<THREE\.BufferGeometry>/);
  assert.match(garden, /gardenCanvasReady/);
  assert.match(garden, /intersectionRatio>=\.01/);
  assert.match(garden, /stopObservingVisibility\(\)/);
  assert.match(museum, /document\.body\.classList\.contains\("exhibit-mode"\)/);
  assert.match(museum, /<select/);
  assert.match(museum, /className="sound-clip-select"/);
  assert.doesNotMatch(museum, /className="sound-clip-grid"/);
  assert.match(museum, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(museum, /createCompatibleAudioContext\(\)/);
  assert.match(museum, /document\.addEventListener\("visibilitychange", pauseWhenHidden\)/);
  assert.match(garden, /resumeAudioContext\(pondAudioContext\.current\)/);
  assert.match(garden, /pondAudioContext\.current\?\.suspend\(\)/);
  assert.match(audio, /webkitAudioContext/);
  assert.match(audio, /context\.state !== "running"/);
  assert.match(museum, /observeElementSize\(container, resize\)/);
  assert.match(museum, /observeElementSize\(canvas, resize\)/);
  assert.match(viewport, /"ResizeObserver" in window/);
  assert.match(viewport, /orientationchange/);
  assert.match(viewport, /window\.visualViewport\?\.addEventListener\("resize"/);
  assert.match(viewport, /if \(!\("IntersectionObserver" in window\)\)/);
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
  assert.match(css, /\.nature-lab-live-vars\{display:flex!important;flex-wrap:wrap/);
  assert.match(css, /color:#a9b0bc;font-size:14px;line-height:1\.2/);
  assert.match(css, /\.nature-lab-live-vars span i\{color:#dbe0e9;font-family:Georgia,serif;font-size:18px/);
  assert.match(css, /\.nature-console-actions/);
  assert.match(css, /\.nature-control-name em/);
  assert.match(css, /nature-formula-expression>strong\{font-size:40px/);
  assert.match(css, /Full-screen exhibit mode and compact fixed console/);
  assert.match(css, /\.exhibit-mode \.site-header/);
  assert.match(css, /\.site-nav-visible \.site-header/);
  assert.match(css, /\.museum-navigation-busy \.site-header/);
  assert.match(css, /\.exhibit-mode\.exhibit-nav-visible \.site-header/);
  assert.match(css, /\.exhibit-mode\.exhibit-nav-visible \.nature-lab-close/);
  assert.match(css, /\.nature-lab-shell\{width:100%;height:100svh/);
  assert.match(css, /\.nature-lab-controls\{position:fixed/);
  assert.match(css, /\.sound-clip-select select/);
  assert.match(css, /\.galaxy-3d-preview/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /height:100dvh/);
  assert.match(css, /Mobile child-friendly readability and cross-browser touch targets/);
  assert.match(css, /\.brand\{min-height:44px\}/);
  assert.match(css, /\.nature-lab-control>span\{font-size:10px\}/);
  assert.match(css, /input\[type=range\]::-moz-range-thumb\{width:20px;height:20px\}/);
  assert.match(css, /data-webgl-ready="false"\] canvas\{opacity:0\}/);
  assert.match(css, /Recoverable WebGL fallback/);
  assert.match(css, /\[data-webgl-error="true"\] \.webgl-retry\{display:inline-flex\}/);
  assert.match(css, /\[data-webgl-error="true"\] \.webgl-fallback-actions\{display:flex\}/);
  assert.match(css, /\.museum-keyboard-exhibits:focus-within/);
  assert.match(css, /\.sound-drive-panel/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /\.hall-transition-leaving/);
  assert.doesNotMatch(css, /\.museum-hall-switcher/);
  assert.match(css, /--hall-accent/);
  assert.match(page, />四展馆</);
  assert.match(page, /<LazyNatureMuseumWorld \/>/);
  assert.match(page, /lazy\(async \(\) =>/);
  assert.match(page, /import\("\.\/NatureMuseum3D"\)/);
  assert.match(page, /import\("\.\/MathGarden3D"\)/);
  assert.match(page, /<MuseumLoading \/>/);
  assert.match(page, /<DeferredMathGarden/);
  assert.match(page, /rootMargin: "240px 0px"/);
  assert.match(page, /body\.classList\.add\("site-nav-visible"\)/);
  assert.match(page, /window\.addEventListener\("pointermove", updateNavigation/);
  assert.doesNotMatch(page, /GoldenFlower|FractalForest|GeometryBuilder|FourierSound|SpiralUniverse|journey-intro/);
  assert.match(layout, /Math Beauty Museum/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});

test("separates the heavy WebGL worlds from the compact page shell", async () => {
  const chunkDirectory = new URL("../dist/client/_next/static/chunks/", import.meta.url);
  const files = await readdir(chunkDirectory);
  const museumChunk = files.find((file) => file.startsWith("NatureMuseum3D-") && file.endsWith(".js"));
  const gardenChunk = files.find((file) => file.startsWith("MathGarden3D-") && file.endsWith(".js"));
  const pageChunk = files.find((file) => file.startsWith("page-") && file.endsWith(".js"));
  assert.ok(museumChunk, "the museum should be emitted as its own lazy chunk");
  assert.ok(gardenChunk, "the garden should be emitted as its own lazy chunk");
  assert.ok(pageChunk, "the page entry chunk should exist");
  const pageSize = (await stat(new URL(pageChunk, chunkDirectory))).size;
  assert.ok(pageSize < 32 * 1024, `the initial page shell should stay below 32 KB; received ${pageSize} bytes`);
});
