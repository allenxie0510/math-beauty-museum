"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type NatureId = "golden" | "fractal" | "fibonacci";
type NatureSettings = {
  goldenPetals: number;
  goldenAngle: number;
  goldenSpread: number;
  fractalDepth: number;
  fractalAngle: number;
  fractalRatio: number;
  fibonacciSeeds: number;
  fibonacciAngle: number;
  fibonacciScale: number;
};

type NatureItem = {
  id: NatureId;
  index: string;
  icon: string;
  name: string;
  english: string;
  formula: string;
  color: string;
  discovery: string;
  explanation: string;
  controls: Array<{ key: keyof NatureSettings; label: string; min: number; max: number; step: number; suffix?: string }>;
};

const NATURE_ITEMS: NatureItem[] = [
  {
    id: "golden", index: "01", icon: "φ", name: "黄金比例花", english: "Golden Ratio Flower", formula: "φ ≈ 1.618",
    color: "#ef79b7", discovery: "一朵花，正在寻找最舒展的排列。",
    explanation: "花瓣依次转过黄金角，彼此错开，让每一片都更容易得到阳光。改变角度时，你会看到秩序如何出现或消失。",
    controls: [
      { key: "goldenPetals", label: "花瓣数量", min: 8, max: 34, step: 1 },
      { key: "goldenAngle", label: "旋转角度", min: 110, max: 155, step: .1, suffix: "°" },
      { key: "goldenSpread", label: "展开距离", min: .65, max: 1.45, step: .01 },
    ],
  },
  {
    id: "fractal", index: "02", icon: "⌘", name: "分形生长", english: "Fractal Growth", formula: "Lₙ = L₀ · rⁿ",
    color: "#aaf060", discovery: "一条简单规则，长成了一棵复杂的树。",
    explanation: "每根枝条都缩短一点、转动一点，再复制自己。重复不是单调，它能从很少的信息里创造丰富生命。",
    controls: [
      { key: "fractalDepth", label: "生长层级", min: 2, max: 9, step: 1 },
      { key: "fractalAngle", label: "分枝角度", min: 14, max: 42, step: 1, suffix: "°" },
      { key: "fractalRatio", label: "枝条比例", min: .58, max: .76, step: .01 },
    ],
  },
  {
    id: "fibonacci", index: "03", icon: "∞", name: "斐波那契花盘", english: "Fibonacci Phyllotaxis", formula: "1, 1, 2, 3, 5, 8…",
    color: "#ffc75e", discovery: "小小种子，也懂得怎样装满一个圆。",
    explanation: "每颗种子沿固定角度生长，会自然形成两组反向螺旋。向日葵用数列，把有限空间安排得井井有条。",
    controls: [
      { key: "fibonacciSeeds", label: "种子数量", min: 34, max: 144, step: 1 },
      { key: "fibonacciAngle", label: "生长角度", min: 128, max: 145, step: .1, suffix: "°" },
      { key: "fibonacciScale", label: "排列间距", min: .65, max: 1.3, step: .01 },
    ],
  },
];

const DEFAULT_SETTINGS: NatureSettings = {
  goldenPetals: 21, goldenAngle: 137.5, goldenSpread: 1,
  fractalDepth: 7, fractalAngle: 27, fractalRatio: .67,
  fibonacciSeeds: 89, fibonacciAngle: 137.5, fibonacciScale: 1,
};

function physical(color: string, options: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: .58, metalness: .02, clearcoat: .04, ...options });
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.LineSegments)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((entry) => {
      const mapped = entry as THREE.Material & { map?: THREE.Texture | null };
      mapped.map?.dispose();
      entry.dispose();
    });
  });
}

function drawEditorialArtwork(ctx: CanvasRenderingContext2D, item: NatureItem, width: number, height: number) {
  ctx.save();
  ctx.translate(width * .69, height * .58);
  if (item.id === "golden") {
    ctx.strokeStyle = "rgba(203,139,48,.7)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const angle = i * 2.399963;
      const radius = 12 * Math.sqrt(i);
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -42, 15, 52, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.fillStyle = "#e9b94e"; ctx.fill();
  } else if (item.id === "fractal") {
    const branch = (x: number, y: number, length: number, angle: number, depth: number) => {
      if (depth <= 0) return;
      const nx = x + Math.cos(angle) * length, ny = y + Math.sin(angle) * length;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny);
      ctx.lineWidth = Math.max(1.5, depth * 1.7);
      ctx.strokeStyle = depth < 3 ? "#6bb64f" : "#75678e";
      ctx.stroke();
      branch(nx, ny, length * .69, angle - .45, depth - 1);
      branch(nx, ny, length * .69, angle + .45, depth - 1);
    };
    branch(0, 130, 90, -Math.PI / 2, 7);
  } else {
    for (let i = 0; i < 89; i++) {
      const angle = i * 2.399963, radius = 7.2 * Math.sqrt(i);
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4.5 + i / 120, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? "#6f8533" : i % 3 === 1 ? "#a5b84b" : "#d4a848";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(111,133,51,.45)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 6; t += .08) {
      const r = Math.exp(.12 * t) * 3.4;
      const x = Math.cos(t) * r, y = Math.sin(t) * r;
      t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function makeBoardTexture(item: NatureItem) {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = item.id === "fractal" ? "#f0f0ed" : item.id === "golden" ? "#f4f0e9" : "#eff1e8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#202124";
  ctx.font = "700 31px Arial, sans-serif";
  ctx.fillText(`NATURE MATHEMATICS / ${item.index}`, 72, 78);
  ctx.font = "700 64px Arial, sans-serif";
  ctx.fillText(item.name, 72, 185);
  ctx.fillStyle = "#686a6d";
  ctx.font = "500 26px Arial, sans-serif";
  ctx.fillText(item.english.toUpperCase(), 72, 227);
  ctx.strokeStyle = "rgba(32,33,36,.18)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(72, 275); ctx.lineTo(1464, 275); ctx.stroke();
  ctx.fillStyle = item.color;
  ctx.font = "italic 74px Georgia, serif";
  ctx.fillText(item.formula, 72, 408);
  ctx.fillStyle = "#2f3033";
  ctx.font = "600 31px Arial, sans-serif";
  ctx.fillText(item.discovery, 72, 510);
  ctx.fillStyle = "#747579";
  ctx.font = "500 25px Arial, sans-serif";
  ctx.fillText("点击展板，打开互动实验与图形预览", 72, 570);
  ctx.fillStyle = item.color;
  ctx.fillRect(72, 760, 235, 6);
  ctx.fillStyle = "#202124";
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText("EXPLORE  ↗", 72, 840);
  drawEditorialArtwork(ctx, item, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function addBoard(scene: THREE.Scene, item: NatureItem, x: number) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.15, 3.34, .13), physical("#111216", { metalness: .35, roughness: .34 }));
  frame.castShadow = true;
  group.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4.93, 3.08), new THREE.MeshBasicMaterial({ map: makeBoardTexture(item), toneMapped: false }));
  face.position.z = .071;
  group.add(face);
  group.position.set(x, 3.25, -6.04);
  group.userData.natureId = item.id;
  group.traverse((child) => { child.userData.natureId = item.id; });
  scene.add(group);
}

function NatureMuseumCanvas({ selectedId, onSelect }: { selectedId: NatureId | null; onSelect: (id: NatureId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef<NatureId | null>(selectedId);
  onSelectRef.current = onSelect;
  selectedRef.current = selectedId;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.dataset.webglReady = "false";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      console.error("Nature museum WebGL initialization failed", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "可拖动浏览并点击墙面展板的自然数学馆三维空间");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111216");
    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, .1, 70);
    camera.position.set(0, 3.7, 11.7);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.minDistance = 6.3;
    controls.maxDistance = 15;
    controls.minPolarAngle = .75;
    controls.maxPolarAngle = 1.48;
    controls.minAzimuthAngle = -.82;
    controls.maxAzimuthAngle = .82;
    controls.target.set(0, 3.25, -3.2);

    scene.add(new THREE.HemisphereLight("#f0f0eb", "#29272d", 1.18));
    scene.add(new THREE.AmbientLight("#d8d8d2", .58));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 32), physical("#383a3e", { roughness: .82 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(21, 7.7, .24), physical("#ccccca", { roughness: .88 }));
    backWall.position.set(0, 3.85, -6.25);
    backWall.receiveShadow = true;
    scene.add(backWall);
    [-10.4, 10.4].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(.25, 7.7, 13), physical("#bdbdba", { roughness: .88 }));
      wall.position.set(x, 3.85, 0);
      wall.receiveShadow = true;
      scene.add(wall);
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(21, 13), physical("#060709", { roughness: .74 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7.62, 0);
    scene.add(ceiling);
    const grid = new THREE.GridHelper(21, 18, "#45474c", "#292b2f");
    grid.position.set(0, 7.54, -.15);
    scene.add(grid);

    addBoard(scene, NATURE_ITEMS[0], -5.55);
    addBoard(scene, NATURE_ITEMS[1], 0);
    addBoard(scene, NATURE_ITEMS[2], 5.55);

    const accentColors = ["#f3bfda", "#ccef9a", "#ffe4a6"];
    [-5.55, 0, 5.55].forEach((x, index) => {
      const target = new THREE.Object3D();
      target.position.set(x, 3.1, -6);
      scene.add(target);
      const spot = new THREE.SpotLight(accentColors[index], 82, 17, .34, .55, 1.2);
      spot.position.set(x, 7.15, -1.8);
      spot.target = target;
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      scene.add(spot);
      const fixture = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, .42, 18), physical("#08090b", { metalness: .55, roughness: .3 }));
      fixture.position.copy(spot.position);
      fixture.rotation.x = -.5;
      scene.add(fixture);
    });
    const wallWash = new THREE.PointLight("#8a76b5", 11, 18);
    wallWash.position.set(0, 1.3, 3);
    scene.add(wallWash);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(scene.children, true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.natureId) object = object.parent;
      const id = object?.userData.natureId as NatureId | undefined;
      if (id) onSelectRef.current(id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);

    let frame = 0;
    const defaultTarget = new THREE.Vector3(0, 3.25, -3.2);
    const focusTargets: Record<NatureId, THREE.Vector3> = {
      golden: new THREE.Vector3(-5.1, 3.1, -5.5), fractal: new THREE.Vector3(0, 3.1, -5.5), fibonacci: new THREE.Vector3(5.1, 3.1, -5.5),
    };
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.target.lerp(selectedRef.current ? focusTargets[selectedRef.current] : defaultTarget, .035);
      controls.update();
      renderer.render(scene, camera);
      if (container.dataset.webglReady !== "true") container.dataset.webglReady = "true";
    };
    animate();
    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
      delete container.dataset.webglReady;
    };
  }, []);

  return <div className="nature-museum-webgl" ref={host}><div className="nature-webgl-fallback"><b>自然数学馆需要 WebGL</b><span>请开启浏览器图形加速后重新进入。</span></div></div>;
}

function NaturePreview({ item, settings }: { item: NatureItem; settings: NatureSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1000;
    canvas.height = 680;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const background = ctx.createLinearGradient(0, 0, w, h);
    background.addColorStop(0, "#fbfaf7");
    background.addColorStop(1, item.id === "fractal" ? "#eef5ea" : item.id === "golden" ? "#f7edf3" : "#f5f0df");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(29,31,34,.07)";
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 40; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (item.id === "golden") {
      const count = Math.round(settings.goldenPetals), cx = w * .53, cy = h * .51;
      for (let i = count - 1; i >= 0; i--) {
        const angle = THREE.MathUtils.degToRad(i * settings.goldenAngle), p = i / Math.max(1, count - 1);
        const radius = (38 + Math.sqrt(i) * 27) * settings.goldenSpread;
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2);
        const petal = ctx.createLinearGradient(0, -70, 0, 70);
        petal.addColorStop(0, i % 2 ? "#7ed4ca" : "#ef8fbd"); petal.addColorStop(1, "#f8e9ef");
        ctx.fillStyle = petal; ctx.beginPath(); ctx.ellipse(0, -35, 25 - p * 4, 69 - p * 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(87,56,91,.25)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      const center = ctx.createRadialGradient(cx - 16, cy - 15, 5, cx, cy, 74);
      center.addColorStop(0, "#ffe07a"); center.addColorStop(1, "#ad6d2f");
      ctx.fillStyle = center; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(169,111,44,.5)"; ctx.lineWidth = 3; ctx.beginPath();
      for (let t = 0; t < Math.PI * 8; t += .06) { const r = 3.5 * Math.exp(.14 * t); const x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r; t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    } else if (item.id === "fractal") {
      const angle = THREE.MathUtils.degToRad(settings.fractalAngle), depth = Math.round(settings.fractalDepth);
      const branch = (x: number, y: number, length: number, theta: number, level: number) => {
        if (level <= 0) return;
        const nx = x + Math.cos(theta) * length, ny = y + Math.sin(theta) * length;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, level * 2.1);
        ctx.strokeStyle = level < 3 ? "#70c956" : level < 6 ? "#8272d7" : "#4dbad0";
        ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = level < 3 ? 5 : 9; ctx.stroke(); ctx.shadowBlur = 0;
        branch(nx, ny, length * settings.fractalRatio, theta - angle, level - 1);
        branch(nx, ny, length * settings.fractalRatio, theta + angle, level - 1);
      };
      branch(w * .5, h - 10, 155, -Math.PI / 2, depth);
    } else {
      const count = Math.round(settings.fibonacciSeeds), cx = w * .52, cy = h * .5;
      for (let i = 0; i < count; i++) {
        const angle = THREE.MathUtils.degToRad(i * settings.fibonacciAngle), radius = 17 * Math.sqrt(i) * settings.fibonacciScale;
        const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius;
        const size = 7 + i / count * 4;
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? "#526f36" : i % 3 === 1 ? "#a3b944" : "#d09b32";
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(99,122,53,.7)"; ctx.lineWidth = 3; ctx.beginPath();
      for (let t = 0; t < Math.PI * 8; t += .05) { const r = 4.4 * Math.exp(.13 * t); const x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r; t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(31,32,35,.72)"; ctx.font = "600 18px Arial, sans-serif";
    ctx.fillText(item.id === "fractal" ? "简单规则 × 重复 = 复杂生命" : item.id === "golden" ? "花瓣沿黄金角依次展开" : "两组反向螺旋共同填满花盘", 44, h - 34);
  }, [item, settings]);
  return <canvas ref={canvasRef} aria-label={`${item.name}参数图形预览`} />;
}

export function NatureMuseumWorld({ onEnterGarden }: { onEnterGarden: () => void }) {
  const [selectedId, setSelectedId] = useState<NatureId | null>(null);
  const [settings, setSettings] = useState<NatureSettings>(DEFAULT_SETTINGS);
  const [discoveries, setDiscoveries] = useState<Set<NatureId>>(() => new Set());
  const selected = useMemo(() => NATURE_ITEMS.find((item) => item.id === selectedId) ?? null, [selectedId]);
  const select = useCallback((id: NatureId) => {
    setSelectedId(id);
    setDiscoveries((previous) => new Set(previous).add(id));
  }, []);
  const resetSelected = () => {
    if (!selected) return;
    setSettings((previous) => {
      const next = { ...previous };
      selected.controls.forEach((control) => { next[control.key] = DEFAULT_SETTINGS[control.key]; });
      return next;
    });
  };

  return (
    <section className="nature-museum nature-museum-dark" id="hall" aria-label="自然数学馆 WebGL 原型">
      <NatureMuseumCanvas selectedId={selectedId} onSelect={select} />
      <div className="nature-museum-shade" aria-hidden="true" />
      <div className="nature-museum-title">
        <span>NATURE MATHEMATICS HALL · 01</span>
        <h2>自然数学馆</h2>
        <p>拖动浏览展厅 · 点击墙上展板进入互动实验</p>
      </div>
      <div className="nature-progress" aria-label={`已经发现 ${discoveries.size} 个自然数学规律`}><span>{discoveries.size}<small>/ 3</small></span><p>自然规律<br /><b>{discoveries.size === 3 ? "全部发现" : "等待探索"}</b></p></div>
      <div className="nature-room-dock" aria-label="自然数学馆展板导航">
        {NATURE_ITEMS.map((item) => <button key={item.id} className={`${selectedId === item.id ? "active" : ""} ${discoveries.has(item.id) ? "found" : ""}`} onClick={() => select(item.id)} style={{ "--nature-color": item.color } as React.CSSProperties}><i>{item.icon}</i><span><b>{item.index}</b>{item.name}<small>{item.english}</small></span><em>{discoveries.has(item.id) ? "✓" : "+"}</em></button>)}
        <button className="nature-garden-exit" onClick={onEnterGarden}><i>↗</i><span><b>EXIT</b>数学花园<small>继续自由探索</small></span></button>
      </div>
      {selected && <div className="nature-lab-backdrop" role="dialog" aria-modal="true" aria-label={`${selected.name}互动实验`}>
        <div className="nature-lab-shell" style={{ "--nature-color": selected.color } as React.CSSProperties}>
          <button className="nature-lab-close" onClick={() => setSelectedId(null)} aria-label="关闭互动实验">×</button>
          <aside className="nature-lab-controls">
            <span className="nature-lab-index">NATURE / DISCOVERY {selected.index}</span>
            <div className="nature-lab-heading"><i>{selected.icon}</i><div><h3>{selected.name}</h3><p>{selected.english}</p></div></div>
            <div className="nature-lab-formula"><span>隐藏规律</span><strong>{selected.formula}</strong></div>
            <p className="nature-lab-discovery">{selected.discovery}</p>
            <p className="nature-lab-copy">{selected.explanation}</p>
            <div className="nature-lab-try"><span>改变参数，观察规律</span><button onClick={resetSelected}>恢复默认</button></div>
            {selected.controls.map((control) => {
              const value = settings[control.key], decimals = control.step < .1 ? 2 : control.step < 1 ? 1 : 0;
              const golden = (control.key === "goldenAngle" || control.key === "fibonacciAngle") && Math.abs(value - 137.5) < .051;
              return <label className="nature-lab-control" key={control.key}><span>{control.label}<b>{value.toFixed(decimals)}{control.suffix}</b></span><input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={value} onChange={(event) => setSettings((previous) => ({ ...previous, [control.key]: Number(event.target.value) }))}/>{(control.key === "goldenAngle" || control.key === "fibonacciAngle") && <small className={golden ? "reached" : ""}>黄金角 137.5° {golden ? "· 已对准" : "· 试着对准它"}</small>}</label>;
            })}
            <div className="nature-lab-reward"><span>🌱 数学种子 +1</span><b>发现已收藏 ✓</b></div>
          </aside>
          <div className="nature-lab-preview"><div className="nature-preview-header"><span>REAL-TIME VISUALIZATION</span><b>参数实时预览</b></div><NaturePreview item={selected} settings={settings}/><div className="nature-preview-caption"><span>{selected.formula}</span><p>以清晰表达数学概念为目标，图形会随左侧参数实时变化。</p></div></div>
        </div>
      </div>}
    </section>
  );
}
