"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type HallKey = "nature" | "architecture" | "sound" | "cosmos";
type VisualKind =
  | "golden"
  | "fractal"
  | "phyllotaxis"
  | "pythagoras"
  | "catenary"
  | "tessellation"
  | "sine"
  | "harmonics"
  | "chladni"
  | "orbit"
  | "spiral"
  | "resonance";

type MuseumSettings = Record<string, number>;
type MuseumControl = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
  target?: number;
  targetLabel?: string;
};
type MuseumItem = {
  id: string;
  index: string;
  icon: string;
  name: string;
  english: string;
  formula: string;
  color: string;
  discovery: string;
  explanation: string;
  visual: VisualKind;
  previewCaption: string;
  controls: MuseumControl[];
};
type HallDefinition = {
  key: HallKey;
  index: string;
  name: string;
  english: string;
  eyebrow: string;
  subtitle: string;
  category: string;
  accent: string;
  items: MuseumItem[];
};

const HALLS: HallDefinition[] = [
  {
    key: "nature",
    index: "01",
    name: "自然数学馆",
    english: "NATURE MATHEMATICS HALL",
    eyebrow: "NATURE MATHEMATICS HALL · 01",
    subtitle: "花瓣、枝条与种子，都在用数学生长",
    category: "自然规律",
    accent: "#ef79b7",
    items: [
      {
        id: "golden",
        index: "01",
        icon: "φ",
        name: "黄金比例花",
        english: "Golden Ratio Flower",
        formula: "φ ≈ 1.618",
        color: "#ef79b7",
        discovery: "一朵花，正在寻找最舒展的排列。",
        explanation: "花瓣依次转过黄金角，彼此错开，让每一片都更容易得到阳光。改变角度时，你会看到秩序如何出现或消失。",
        visual: "golden",
        previewCaption: "花瓣沿黄金角依次展开",
        controls: [
          { key: "goldenPetals", label: "花瓣数量", min: 8, max: 34, step: 1, defaultValue: 21 },
          { key: "goldenAngle", label: "旋转角度", min: 110, max: 155, step: .1, defaultValue: 137.5, suffix: "°", target: 137.5, targetLabel: "黄金角" },
          { key: "goldenSpread", label: "展开距离", min: .65, max: 1.45, step: .01, defaultValue: 1 },
        ],
      },
      {
        id: "fractal",
        index: "02",
        icon: "⌘",
        name: "分形生长",
        english: "Fractal Growth",
        formula: "Lₙ = L₀ · rⁿ",
        color: "#9edc65",
        discovery: "一条简单规则，长成了一棵复杂的树。",
        explanation: "每根枝条都缩短一点、转动一点，再复制自己。重复不是单调，它能从很少的信息里创造丰富生命。",
        visual: "fractal",
        previewCaption: "简单规则 × 重复 = 复杂生命",
        controls: [
          { key: "fractalDepth", label: "生长层级", min: 2, max: 9, step: 1, defaultValue: 7 },
          { key: "fractalAngle", label: "分枝角度", min: 14, max: 42, step: 1, defaultValue: 27, suffix: "°" },
          { key: "fractalRatio", label: "枝条比例", min: .58, max: .76, step: .01, defaultValue: .67 },
        ],
      },
      {
        id: "phyllotaxis",
        index: "03",
        icon: "∞",
        name: "斐波那契花盘",
        english: "Fibonacci Phyllotaxis",
        formula: "1, 1, 2, 3, 5, 8…",
        color: "#e9b94e",
        discovery: "小小种子，也懂得怎样装满一个圆。",
        explanation: "每颗种子沿固定角度生长，会自然形成两组反向螺旋。向日葵用数列，把有限空间安排得井井有条。",
        visual: "phyllotaxis",
        previewCaption: "两组反向螺旋共同填满花盘",
        controls: [
          { key: "fibonacciSeeds", label: "种子数量", min: 34, max: 144, step: 1, defaultValue: 89 },
          { key: "fibonacciAngle", label: "生长角度", min: 128, max: 145, step: .1, defaultValue: 137.5, suffix: "°", target: 137.5, targetLabel: "黄金角" },
          { key: "fibonacciScale", label: "排列间距", min: .65, max: 1.3, step: .01, defaultValue: 1 },
        ],
      },
    ],
  },
  {
    key: "architecture",
    index: "02",
    name: "建筑数学馆",
    english: "ARCHITECTURE MATHEMATICS HALL",
    eyebrow: "ARCHITECTURE MATHEMATICS HALL · 02",
    subtitle: "从一条受力线，到支撑文明的空间秩序",
    category: "建筑结构",
    accent: "#f39b67",
    items: [
      {
        id: "pythagoras",
        index: "01",
        icon: "△",
        name: "勾股结构",
        english: "Pythagorean Structure",
        formula: "a² + b² = c²",
        color: "#f39b67",
        discovery: "三条边，组成建筑里最可靠的承诺。",
        explanation: "直角三角形可以把受力稳定地传向地面。改变两条直角边，斜梁会始终遵守勾股关系。",
        visual: "pythagoras",
        previewCaption: "三角结构把力量稳定传向地面",
        controls: [
          { key: "pythagorasA", label: "水平梁 a", min: 2, max: 6, step: .1, defaultValue: 3 },
          { key: "pythagorasB", label: "垂直梁 b", min: 2, max: 6, step: .1, defaultValue: 4 },
          { key: "pythagorasWidth", label: "构件厚度", min: 6, max: 24, step: 1, defaultValue: 15 },
        ],
      },
      {
        id: "catenary",
        index: "02",
        icon: "⌒",
        name: "悬链拱",
        english: "Catenary Arch",
        formula: "y = a cosh(x/a)",
        color: "#7fc6c4",
        discovery: "一条自然垂落的曲线，翻转后可以撑起穹顶。",
        explanation: "绳索在重力下形成悬链线。把它上下翻转，压力会沿曲线流动，因此许多拱门和穹顶格外稳定。",
        visual: "catenary",
        previewCaption: "重力画出的曲线，成为稳定的拱",
        controls: [
          { key: "catenarySpan", label: "拱跨宽度", min: 4, max: 9, step: .1, defaultValue: 6.8 },
          { key: "catenarySag", label: "拱顶高度", min: 1.2, max: 4, step: .1, defaultValue: 2.6 },
          { key: "catenaryLoads", label: "受力节点", min: 5, max: 17, step: 1, defaultValue: 11 },
        ],
      },
      {
        id: "tessellation",
        index: "03",
        icon: "⬡",
        name: "几何铺砌",
        english: "Geometric Tessellation",
        formula: "Σ interior angles = 360°",
        color: "#8d79d8",
        discovery: "没有缝隙的重复，铺成一整面城市表皮。",
        explanation: "三角形、正方形和正六边形能够围绕一点完整拼合。改变边数与旋转角，观察空间何时严丝合缝。",
        visual: "tessellation",
        previewCaption: "重复单元组合成连续的建筑表皮",
        controls: [
          { key: "tileSides", label: "多边形边数", min: 3, max: 8, step: 1, defaultValue: 6 },
          { key: "tileScale", label: "单元尺寸", min: 24, max: 62, step: 1, defaultValue: 42 },
          { key: "tileRotation", label: "旋转角度", min: 0, max: 60, step: 1, defaultValue: 30, suffix: "°" },
        ],
      },
    ],
  },
  {
    key: "sound",
    index: "03",
    name: "声音数学馆",
    english: "SOUND MATHEMATICS HALL",
    eyebrow: "SOUND MATHEMATICS HALL · 03",
    subtitle: "让看不见的振动，变成可以阅读的形状",
    category: "声音规律",
    accent: "#61cfe4",
    items: [
      {
        id: "sine",
        index: "01",
        icon: "∿",
        name: "正弦波",
        english: "Sine Wave",
        formula: "y = A sin(2πft + φ)",
        color: "#61cfe4",
        discovery: "最简单的声音，是一条平滑起伏的曲线。",
        explanation: "频率决定音高，振幅决定响度，相位决定波从哪里开始。三个参数共同描述最基础的纯音。",
        visual: "sine",
        previewCaption: "频率、振幅与相位共同塑造声音",
        controls: [
          { key: "waveFrequency", label: "频率", min: 1, max: 8, step: .1, defaultValue: 3.2 },
          { key: "waveAmplitude", label: "振幅", min: 30, max: 150, step: 1, defaultValue: 92 },
          { key: "wavePhase", label: "相位", min: 0, max: 360, step: 1, defaultValue: 0, suffix: "°" },
        ],
      },
      {
        id: "harmonics",
        index: "02",
        icon: "Σ",
        name: "傅里叶叠加",
        english: "Fourier Harmonics",
        formula: "f(t) = Σ Aₙ sin(nωt)",
        color: "#ed82bd",
        discovery: "复杂的声音，可以拆成许多个简单波。",
        explanation: "把不同频率的正弦波叠加，就能得到丰富音色。增加谐波层数，观察简单波如何共同塑造复杂声音。",
        visual: "harmonics",
        previewCaption: "多个简单波叠加成复杂音色",
        controls: [
          { key: "harmonicCount", label: "谐波层数", min: 1, max: 9, step: 1, defaultValue: 5 },
          { key: "harmonicDecay", label: "衰减速度", min: .45, max: 1.6, step: .01, defaultValue: .9 },
          { key: "harmonicBase", label: "基础频率", min: 1, max: 5, step: .1, defaultValue: 2.2 },
        ],
      },
      {
        id: "chladni",
        index: "03",
        icon: "✣",
        name: "克拉尼图形",
        english: "Chladni Figures",
        formula: "∇²u + k²u = 0",
        color: "#e4b85c",
        discovery: "沙粒会主动离开振动最强的位置。",
        explanation: "薄板振动时，几乎不动的节点会收集沙粒，显现出隐藏的几何图案。频率模式不同，图案也会改变。",
        visual: "chladni",
        previewCaption: "振动节点把声音变成几何花纹",
        controls: [
          { key: "chladniM", label: "横向模态 m", min: 1, max: 8, step: 1, defaultValue: 4 },
          { key: "chladniN", label: "纵向模态 n", min: 1, max: 8, step: 1, defaultValue: 3 },
          { key: "chladniThreshold", label: "节点清晰度", min: .03, max: .18, step: .01, defaultValue: .08 },
        ],
      },
    ],
  },
  {
    key: "cosmos",
    index: "04",
    name: "宇宙数学馆",
    english: "COSMOS MATHEMATICS HALL",
    eyebrow: "COSMOS MATHEMATICS HALL · 04",
    subtitle: "从行星轨道，到跨越星系的螺旋节奏",
    category: "宇宙规律",
    accent: "#8a73d9",
    items: [
      {
        id: "orbit",
        index: "01",
        icon: "◌",
        name: "开普勒轨道",
        english: "Kepler Orbit",
        formula: "r = a(1-e²)/(1+e cos θ)",
        color: "#75bce7",
        discovery: "行星绕行的不是正圆，而是优雅的椭圆。",
        explanation: "太阳位于椭圆的一个焦点。改变离心率，观察轨道从接近圆形逐渐拉长，以及行星速度的变化。",
        visual: "orbit",
        previewCaption: "行星沿椭圆轨道绕焦点运行",
        controls: [
          { key: "orbitEccentricity", label: "轨道离心率", min: 0, max: .82, step: .01, defaultValue: .35 },
          { key: "orbitSpeed", label: "运行速度", min: .4, max: 2.4, step: .1, defaultValue: 1.2 },
          { key: "orbitBodies", label: "轨迹采样点", min: 4, max: 18, step: 1, defaultValue: 10 },
        ],
      },
      {
        id: "galaxy",
        index: "02",
        icon: "↻",
        name: "螺旋星系",
        english: "Spiral Galaxy",
        formula: "r = aeᵇθ",
        color: "#d179c7",
        discovery: "亿万颗星，排列成跨越光年的螺旋。",
        explanation: "星系旋臂近似对数螺旋。改变旋臂数量与曲率，你会发现台风、贝壳和银河共享相似语言。",
        visual: "spiral",
        previewCaption: "对数螺旋把亿万颗星组织在一起",
        controls: [
          { key: "spiralArms", label: "旋臂数量", min: 2, max: 7, step: 1, defaultValue: 4 },
          { key: "spiralCurvature", label: "旋转曲率", min: .12, max: .55, step: .01, defaultValue: .3 },
          { key: "spiralStars", label: "星体数量", min: 120, max: 520, step: 10, defaultValue: 320 },
        ],
      },
      {
        id: "resonance",
        index: "03",
        icon: "∞",
        name: "轨道共振",
        english: "Orbital Resonance",
        formula: "T₁ : T₂ = p : q",
        color: "#e9b45f",
        discovery: "不同速度的行星，也能找到共同节拍。",
        explanation: "当两个天体的公转周期形成整数比，它们会周期性回到相似位置，画出稳定而优美的共振轨迹。",
        visual: "resonance",
        previewCaption: "整数周期比让行星形成稳定节奏",
        controls: [
          { key: "resonanceA", label: "内轨周期 p", min: 1, max: 8, step: 1, defaultValue: 3 },
          { key: "resonanceB", label: "外轨周期 q", min: 1, max: 9, step: 1, defaultValue: 5 },
          { key: "resonancePhase", label: "相位差", min: 0, max: 180, step: 1, defaultValue: 36, suffix: "°" },
        ],
      },
    ],
  },
];

const DEFAULT_SETTINGS: MuseumSettings = {};
HALLS.forEach((hall) => hall.items.forEach((item) => item.controls.forEach((control) => {
  DEFAULT_SETTINGS[control.key] = control.defaultValue;
})));

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

function polygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, sides: number, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * Math.PI * 2 / sides;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawMiniArtwork(ctx: CanvasRenderingContext2D, item: MuseumItem, width: number, height: number) {
  const cx = width * .5;
  const cy = height * .57;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = 5;
  ctx.globalAlpha = .82;
  if (item.visual === "golden" || item.visual === "phyllotaxis" || item.visual === "spiral") {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 8; t += .06) {
      const radius = 4.5 * Math.exp(.13 * t);
      const x = Math.cos(t) * radius;
      const y = Math.sin(t) * radius;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (item.visual !== "spiral") {
      for (let i = 0; i < 55; i++) {
        const angle = i * 2.399963;
        const radius = 8 * Math.sqrt(i);
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (item.visual === "fractal") {
    const branch = (x: number, y: number, length: number, angle: number, depth: number) => {
      if (depth <= 0) return;
      const nx = x + Math.cos(angle) * length;
      const ny = y + Math.sin(angle) * length;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.lineWidth = Math.max(2, depth * 2);
      ctx.stroke();
      branch(nx, ny, length * .68, angle - .48, depth - 1);
      branch(nx, ny, length * .68, angle + .48, depth - 1);
    };
    branch(0, 125, 92, -Math.PI / 2, 6);
  } else if (item.visual === "pythagoras") {
    ctx.beginPath();
    ctx.moveTo(-135, 100);
    ctx.lineTo(-135, -105);
    ctx.lineTo(145, 100);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeRect(-135, 55, 45, 45);
  } else if (item.visual === "catenary") {
    ctx.beginPath();
    for (let i = -170; i <= 170; i += 4) {
      const y = -90 + 95 * (Math.cosh(i / 130) - 1);
      if (i === -170) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-190, 115);
    ctx.lineTo(190, 115);
    ctx.stroke();
  } else if (item.visual === "tessellation") {
    for (let row = -2; row <= 2; row++) for (let col = -3; col <= 3; col++) {
      polygonPath(ctx, col * 62 + (row % 2) * 31, row * 54, 36, 6);
      ctx.stroke();
    }
  } else if (item.visual === "sine" || item.visual === "harmonics") {
    ctx.beginPath();
    for (let x = -190; x <= 190; x += 3) {
      const y = Math.sin(x / 28) * 70 + (item.visual === "harmonics" ? Math.sin(x / 14) * 24 : 0);
      if (x === -190) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (item.visual === "chladni") {
    for (let x = -170; x <= 170; x += 8) for (let y = -150; y <= 150; y += 8) {
      const value = Math.sin(4 * Math.PI * (x + 170) / 340) * Math.sin(3 * Math.PI * (y + 150) / 300)
        - Math.sin(3 * Math.PI * (x + 170) / 340) * Math.sin(4 * Math.PI * (y + 150) / 300);
      if (Math.abs(value) < .12) ctx.fillRect(x, y, 3, 3);
    }
  } else if (item.visual === "orbit" || item.visual === "resonance") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 185, item.visual === "orbit" ? 105 : 140, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (item.visual === "resonance") {
      ctx.beginPath();
      ctx.ellipse(0, 0, 115, 82, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(-70, 0, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function makeBoardTexture(item: MuseumItem, hall: HallDefinition) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#faf8f4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const topGlow = ctx.createLinearGradient(0, 0, canvas.width, canvas.height * .58);
  topGlow.addColorStop(0, "rgba(255,255,255,.98)");
  topGlow.addColorStop(1, item.color + "25");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height * .58);
  ctx.fillStyle = "#17191c";
  ctx.font = "700 25px Arial, sans-serif";
  ctx.fillText(hall.english + " / " + item.index, 64, 72);
  ctx.font = "700 58px Arial, sans-serif";
  ctx.fillText(item.name, 64, 168);
  ctx.fillStyle = "#585d62";
  ctx.font = "600 21px Arial, sans-serif";
  ctx.fillText(item.english.toUpperCase(), 64, 211);
  ctx.strokeStyle = "rgba(23,25,28,.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 254);
  ctx.lineTo(896, 254);
  ctx.stroke();
  ctx.fillStyle = item.color;
  ctx.font = "italic 54px Georgia, serif";
  ctx.fillText(item.formula, 64, 350);
  drawMiniArtwork(ctx, item, canvas.width, canvas.height);
  ctx.fillStyle = "#25282b";
  ctx.font = "700 27px Arial, sans-serif";
  ctx.fillText(item.discovery, 64, 1160);
  ctx.fillStyle = "#666b70";
  ctx.font = "500 22px Arial, sans-serif";
  ctx.fillText("点击展板，打开互动实验与图形预览", 64, 1210);
  ctx.fillStyle = item.color;
  ctx.fillRect(64, 1280, 180, 7);
  ctx.fillStyle = "#17191c";
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText("EXPLORE", 64, 1350);
  ctx.font = "700 35px Arial, sans-serif";
  ctx.fillText("↗", 840, 1354);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function addBoard(scene: THREE.Scene, item: MuseumItem, hall: HallDefinition, x: number) {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.12, 4.94, .2), physical("#f5f0e9", { roughness: .72 }));
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(3.08, 4.9),
    new THREE.MeshBasicMaterial({ map: makeBoardTexture(item, hall), toneMapped: false }),
  );
  face.position.z = .106;
  group.add(face);
  group.position.set(x, 3.55, -5.95);
  group.userData.itemId = item.id;
  group.traverse((child) => { child.userData.itemId = item.id; });
  scene.add(group);
}

function MuseumCanvas({ hall, selectedId, onSelect }: { hall: HallDefinition; selectedId: string | null; onSelect: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef<string | null>(selectedId);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.dataset.webglReady = "false";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      console.error("Museum WebGL initialization failed", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "可拖动浏览并点击墙面展板的" + hall.name + "三维空间");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d9d3cb");
    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, .1, 70);
    camera.position.set(0, 3.8, 12.3);
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
    controls.target.set(0, 3.45, -3.5);

    scene.add(new THREE.HemisphereLight("#fffdf8", "#938c84", 1.48));
    scene.add(new THREE.AmbientLight("#fffaf2", .8));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 32), physical("#c7c0b8", { roughness: .82 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(21, 7.7, .24), physical("#f2eee8", { roughness: .94 }));
    backWall.position.set(0, 3.85, -6.25);
    backWall.receiveShadow = true;
    scene.add(backWall);
    [-10.4, 10.4].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(.25, 7.7, 13), physical("#e9e3dc", { roughness: .93 }));
      wall.position.set(x, 3.85, 0);
      wall.receiveShadow = true;
      scene.add(wall);
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(21, 13), physical("#cac3bb", { roughness: .84 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7.62, 0);
    scene.add(ceiling);
    const boardPositions = [-4.15, 0, 4.15];
    hall.items.forEach((item, index) => addBoard(scene, item, hall, boardPositions[index]));

    boardPositions.forEach((x) => {
      const target = new THREE.Object3D();
      target.position.set(x, 3.55, -6);
      scene.add(target);
      const spot = new THREE.SpotLight("#fff2df", 106, 18, .32, .56, 1.12);
      spot.position.set(x, 7.15, -2.15);
      spot.target = target;
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -.0002;
      scene.add(spot);
    });
    const wallWash = new THREE.PointLight("#fff6eb", 9, 18);
    wallWash.position.set(0, 2.1, 4);
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
      while (object && !object.userData.itemId) object = object.parent;
      const id = object?.userData.itemId as string | undefined;
      if (id) onSelectRef.current(id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);

    let frame = 0;
    const defaultTarget = new THREE.Vector3(0, 3.45, -3.5);
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const selectedIndex = hall.items.findIndex((item) => item.id === selectedRef.current);
      const focus = selectedIndex >= 0
        ? new THREE.Vector3(boardPositions[selectedIndex], 3.5, -5.5)
        : defaultTarget;
      controls.target.lerp(focus, .035);
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
  }, [hall]);

  return <div className="nature-museum-webgl museum-canvas-fade" ref={host}>
    <div className="nature-webgl-fallback"><b>{hall.name}需要 WebGL</b><span>请开启浏览器图形加速后重新进入。</span></div>
  </div>;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = "rgba(36,34,35,.065)";
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, item: MuseumItem, settings: MuseumSettings, width: number, height: number) {
  const value = (key: string) => settings[key] ?? DEFAULT_SETTINGS[key] ?? 0;
  const cx = width * .52;
  const cy = height * .49;
  if (item.visual === "golden") {
    const count = Math.round(value("goldenPetals"));
    for (let i = count - 1; i >= 0; i--) {
      const angle = THREE.MathUtils.degToRad(i * value("goldenAngle"));
      const progress = i / Math.max(1, count - 1);
      const radius = (38 + Math.sqrt(i) * 27) * value("goldenSpread");
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      const petal = ctx.createLinearGradient(0, -70, 0, 70);
      petal.addColorStop(0, i % 2 ? "#77cfc4" : "#ed82b8");
      petal.addColorStop(1, "#f8e9ef");
      ctx.fillStyle = petal;
      ctx.beginPath();
      ctx.ellipse(0, -35, 25 - progress * 4, 69 - progress * 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(87,56,91,.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    const center = ctx.createRadialGradient(cx - 16, cy - 15, 5, cx, cy, 74);
    center.addColorStop(0, "#ffe07a");
    center.addColorStop(1, "#ad6d2f");
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.visual === "fractal") {
    const angle = THREE.MathUtils.degToRad(value("fractalAngle"));
    const depth = Math.round(value("fractalDepth"));
    const branch = (x: number, y: number, length: number, theta: number, level: number) => {
      if (level <= 0) return;
      const nx = x + Math.cos(theta) * length;
      const ny = y + Math.sin(theta) * length;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1, level * 2.1);
      ctx.strokeStyle = level < 3 ? "#6dbe55" : level < 6 ? "#8272d7" : "#4dbad0";
      ctx.stroke();
      branch(nx, ny, length * value("fractalRatio"), theta - angle, level - 1);
      branch(nx, ny, length * value("fractalRatio"), theta + angle, level - 1);
    };
    branch(width * .5, height - 10, 155, -Math.PI / 2, depth);
  } else if (item.visual === "phyllotaxis") {
    const count = Math.round(value("fibonacciSeeds"));
    for (let i = 0; i < count; i++) {
      const angle = THREE.MathUtils.degToRad(i * value("fibonacciAngle"));
      const radius = 17 * Math.sqrt(i) * value("fibonacciScale");
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const size = 7 + i / count * 4;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? "#526f36" : i % 3 === 1 ? "#a3b944" : "#d09b32";
      ctx.fill();
    }
  } else if (item.visual === "pythagoras") {
    const a = value("pythagorasA");
    const b = value("pythagorasB");
    const line = value("pythagorasWidth");
    const scale = 58;
    const ox = width * .25;
    const oy = height * .76;
    const ax = ox + a * scale;
    const by = oy - b * scale;
    const beam = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = line;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    beam(ox, oy, ax, oy, "#eea35e");
    beam(ox, oy, ox, by, "#e47ab0");
    beam(ox, by, ax, oy, "#65bdd8");
    ctx.strokeStyle = "rgba(38,38,40,.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy - 34, 34, 34);
    ctx.fillStyle = "#313238";
    ctx.font = "600 22px Arial";
    ctx.fillText("a = " + a.toFixed(1), (ox + ax) / 2 - 30, oy + 48);
    ctx.fillText("b = " + b.toFixed(1), ox - 85, (oy + by) / 2);
    ctx.fillText("c = " + Math.sqrt(a * a + b * b).toFixed(2), (ox + ax) / 2 + 22, (oy + by) / 2 - 18);
  } else if (item.visual === "catenary") {
    const span = value("catenarySpan");
    const rise = value("catenarySag");
    const nodes = Math.round(value("catenaryLoads"));
    const half = span * 52;
    const baseY = height * .75;
    const topY = baseY - rise * 92;
    ctx.strokeStyle = "#59aeb0";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const t = i / 160 * 2 - 1;
      const x = cx + t * half;
      const normalized = (Math.cosh(t * 1.45) - 1) / (Math.cosh(1.45) - 1);
      const y = topY + normalized * (baseY - topY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(224,132,177,.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < nodes; i++) {
      const t = i / Math.max(1, nodes - 1) * 2 - 1;
      const x = cx + t * half;
      const normalized = (Math.cosh(t * 1.45) - 1) / (Math.cosh(1.45) - 1);
      const y = topY + normalized * (baseY - topY);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, baseY + 38);
      ctx.stroke();
    }
    ctx.strokeStyle = "#5d5e64";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - half - 40, baseY + 38);
    ctx.lineTo(cx + half + 40, baseY + 38);
    ctx.stroke();
  } else if (item.visual === "tessellation") {
    const sides = Math.round(value("tileSides"));
    const radius = value("tileScale");
    const rotation = THREE.MathUtils.degToRad(value("tileRotation"));
    const dx = radius * 1.65;
    const dy = radius * 1.5;
    for (let row = -4; row <= 4; row++) for (let col = -7; col <= 7; col++) {
      const x = cx + col * dx + (row % 2) * dx * .5;
      const y = cy + row * dy;
      polygonPath(ctx, x, y, radius, sides, rotation);
      const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
      gradient.addColorStop(0, row % 2 ? "#f3a36d" : "#8cced0");
      gradient.addColorStop(1, col % 2 ? "#8c79d5" : "#ef86b7");
      ctx.fillStyle = gradient;
      ctx.globalAlpha = .72;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (item.visual === "sine") {
    const frequency = value("waveFrequency");
    const amplitude = value("waveAmplitude");
    const phase = THREE.MathUtils.degToRad(value("wavePhase"));
    ctx.strokeStyle = "rgba(44,45,49,.23)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, cy);
    ctx.lineTo(width - 65, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(90, 70);
    ctx.lineTo(90, height - 70);
    ctx.stroke();
    ctx.beginPath();
    for (let x = 90; x <= width - 65; x++) {
      const t = (x - 90) / (width - 155);
      const y = cy + Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude;
      if (x === 90) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#46bad4";
    ctx.lineWidth = 7;
    ctx.shadowColor = "#61cfe4";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (item.visual === "harmonics") {
    const count = Math.round(value("harmonicCount"));
    const decay = value("harmonicDecay");
    const base = value("harmonicBase");
    const colors = ["#61cfe4", "#ed82bd", "#e4b85c", "#8a73d9", "#79c986", "#f08d67"];
    for (let harmonic = 1; harmonic <= count; harmonic++) {
      ctx.beginPath();
      for (let x = 65; x <= width - 65; x += 2) {
        const t = (x - 65) / (width - 130);
        const y = cy + Math.sin(t * Math.PI * 2 * base * harmonic) * 72 / Math.pow(harmonic, decay);
        if (x === 65) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors[(harmonic - 1) % colors.length];
      ctx.globalAlpha = .24;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let x = 65; x <= width - 65; x += 2) {
      const t = (x - 65) / (width - 130);
      let sum = 0;
      for (let harmonic = 1; harmonic <= count; harmonic++) {
        sum += Math.sin(t * Math.PI * 2 * base * harmonic) / Math.pow(harmonic, decay);
      }
      const y = cy + sum * 68;
      if (x === 65) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const gradient = ctx.createLinearGradient(65, 0, width - 65, 0);
    gradient.addColorStop(0, "#61cfe4");
    gradient.addColorStop(.5, "#ed82bd");
    gradient.addColorStop(1, "#e4b85c");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 7;
    ctx.stroke();
  } else if (item.visual === "chladni") {
    const m = Math.round(value("chladniM"));
    const n = Math.round(value("chladniN"));
    const threshold = value("chladniThreshold");
    const left = 145;
    const top = 75;
    const size = Math.min(width - 290, height - 150);
    ctx.fillStyle = "#eee8de";
    ctx.fillRect(left, top, size, size);
    for (let py = 0; py <= size; py += 5) for (let px = 0; px <= size; px += 5) {
      const x = px / size;
      const y = py / size;
      const mode = Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y)
        - Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y);
      if (Math.abs(mode) < threshold) {
        const hue = 185 + (x + y) * 70;
        ctx.fillStyle = "hsl(" + hue + " 62% 46%)";
        ctx.beginPath();
        ctx.arc(left + px, top + py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = "#57595f";
    ctx.lineWidth = 3;
    ctx.strokeRect(left, top, size, size);
  } else if (item.visual === "orbit") {
    const eccentricity = value("orbitEccentricity");
    const speed = value("orbitSpeed");
    const bodies = Math.round(value("orbitBodies"));
    const a = 315;
    const b = a * Math.sqrt(1 - eccentricity * eccentricity);
    const focus = a * eccentricity;
    ctx.strokeStyle = "#7a72c4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
    const sun = ctx.createRadialGradient(cx - focus - 8, cy - 8, 2, cx - focus, cy, 34);
    sun.addColorStop(0, "#fffbd3");
    sun.addColorStop(1, "#e6a73f");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx - focus, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < bodies; i++) {
      const angle = i / bodies * Math.PI * 2 * speed;
      const x = cx + Math.cos(angle) * a;
      const y = cy + Math.sin(angle) * b;
      ctx.fillStyle = i === bodies - 1 ? "#4faec8" : "rgba(79,174,200,.22)";
      ctx.beginPath();
      ctx.arc(x, y, i === bodies - 1 ? 15 : 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item.visual === "spiral") {
    const arms = Math.round(value("spiralArms"));
    const curvature = value("spiralCurvature");
    const stars = Math.round(value("spiralStars"));
    const background = ctx.createRadialGradient(cx, cy, 0, cx, cy, 330);
    background.addColorStop(0, "rgba(255,242,181,.6)");
    background.addColorStop(.2, "rgba(216,126,201,.22)");
    background.addColorStop(1, "rgba(81,101,178,0)");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < stars; i++) {
      const arm = i % arms;
      const progress = i / stars;
      const hash = Math.sin(i * 91.73) * 43758.5453;
      const jitter = (hash - Math.floor(hash) - .5) * 36;
      const theta = progress * Math.PI * 7 + arm * Math.PI * 2 / arms;
      const radius = 22 + 290 * Math.pow(progress, .72);
      const angle = theta * curvature * 3.4;
      const x = cx + Math.cos(angle) * (radius + jitter);
      const y = cy + Math.sin(angle) * (radius + jitter) * .68;
      const size = 1.5 + (i % 9 === 0 ? 3 : 0);
      ctx.fillStyle = i % 3 === 0 ? "#f2a2d0" : i % 3 === 1 ? "#7cc9e4" : "#f4d78b";
      ctx.globalAlpha = .45 + (i % 5) * .1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (item.visual === "resonance") {
    const p = Math.round(value("resonanceA"));
    const q = Math.round(value("resonanceB"));
    const phase = THREE.MathUtils.degToRad(value("resonancePhase"));
    ctx.strokeStyle = "rgba(84,85,92,.22)";
    ctx.lineWidth = 2;
    [100, 190, 280].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    for (let i = 0; i <= 1600; i++) {
      const t = i / 1600 * Math.PI * 2;
      const radius = 190 + Math.cos(q * t) * 82;
      const angle = p * t + phase;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const gradient = ctx.createLinearGradient(cx - 280, cy - 200, cx + 280, cy + 200);
    gradient.addColorStop(0, "#65c3df");
    gradient.addColorStop(.5, "#d27bc2");
    gradient.addColorStop(1, "#e9b45f");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "#e5a944";
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  }
}

function MuseumPreview({ item, settings }: { item: MuseumItem; settings: MuseumSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1000;
    canvas.height = 680;
    const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, "#fdfbf7");
    background.addColorStop(1, item.color + "24");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);
    drawPreview(ctx, item, settings, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(31,32,35,.72)";
    ctx.font = "600 18px Arial, sans-serif";
    ctx.fillText(item.previewCaption, 44, canvas.height - 34);
  }, [item, settings]);
  return <canvas ref={canvasRef} aria-label={item.name + "参数图形预览"} />;
}

export function NatureMuseumWorld({ onEnterGarden }: { onEnterGarden: () => void }) {
  const [hallIndex, setHallIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MuseumSettings>({ ...DEFAULT_SETTINGS });
  const [discoveries, setDiscoveries] = useState<Set<string>>(() => new Set());
  const hall = HALLS[hallIndex];
  const selected = useMemo(() => hall.items.find((item) => item.id === selectedId) ?? null, [hall, selectedId]);
  const currentDiscoveries = hall.items.filter((item) => discoveries.has(item.id)).length;

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setDiscoveries((previous) => new Set(previous).add(id));
  }, []);

  const switchHall = (direction: number) => {
    setSelectedId(null);
    setHallIndex((previous) => (previous + direction + HALLS.length) % HALLS.length);
  };

  const resetSelected = () => {
    if (!selected) return;
    setSettings((previous) => {
      const next = { ...previous };
      selected.controls.forEach((control) => { next[control.key] = control.defaultValue; });
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      className="nature-museum nature-museum-gallery"
      id="hall"
      aria-label={hall.name + " WebGL 展厅"}
      data-hall={hall.key}
      style={{ "--hall-accent": hall.accent } as React.CSSProperties}
    >
      <MuseumCanvas hall={hall} selectedId={selectedId} onSelect={select} />
      <div className="nature-museum-shade" aria-hidden="true" />
      <div className="nature-museum-title">
        <span>{hall.eyebrow}</span>
        <h2>{hall.name}</h2>
        <p>{hall.subtitle} · 拖动浏览并点击展板</p>
      </div>
      <div className="nature-progress" aria-label={"已经发现 " + currentDiscoveries + " 个" + hall.category}>
        <span>{currentDiscoveries}<small>/ 3</small></span>
        <p>{hall.category}<br /><b>{currentDiscoveries === 3 ? "全部发现" : "等待探索"}</b></p>
      </div>

      <div className="museum-hall-switcher" aria-label="切换数学展厅">
        <button onClick={() => switchHall(-1)} aria-label={"上一个展厅：" + HALLS[(hallIndex + HALLS.length - 1) % HALLS.length].name}>←</button>
        <div><span>{hall.index} / 04</span><b>{hall.name}</b><small>{hall.english}</small></div>
        <button onClick={() => switchHall(1)} aria-label={"下一个展厅：" + HALLS[(hallIndex + 1) % HALLS.length].name}>→</button>
      </div>

      <div className="nature-room-dock" aria-label={hall.name + "展板导航"}>
        {hall.items.map((item) => (
          <button
            key={item.id}
            className={(selectedId === item.id ? "active " : "") + (discoveries.has(item.id) ? "found" : "")}
            onClick={() => select(item.id)}
            style={{ "--nature-color": item.color } as React.CSSProperties}
          >
            <i>{item.icon}</i>
            <span><b>{item.index}</b>{item.name}<small>{item.english}</small></span>
            <em>{discoveries.has(item.id) ? "✓" : "+"}</em>
          </button>
        ))}
        <button className="nature-garden-exit" onClick={onEnterGarden}>
          <i>↗</i><span><b>EXIT</b>数学花园<small>继续自由探索</small></span>
        </button>
      </div>

      {selected && (
        <div className="nature-lab-backdrop" role="dialog" aria-modal="true" aria-label={selected.name + "互动实验"}>
          <div className="nature-lab-shell" style={{ "--nature-color": selected.color } as React.CSSProperties}>
            <button className="nature-lab-close" onClick={() => setSelectedId(null)} aria-label="关闭互动实验">×</button>
            <aside className="nature-lab-controls">
              <span className="nature-lab-index">{hall.english} / DISCOVERY {selected.index}</span>
              <div className="nature-lab-heading"><i>{selected.icon}</i><div><h3>{selected.name}</h3><p>{selected.english}</p></div></div>
              <div className="nature-lab-formula"><span>隐藏规律</span><strong>{selected.formula}</strong></div>
              <p className="nature-lab-discovery">{selected.discovery}</p>
              <p className="nature-lab-copy">{selected.explanation}</p>
              <div className="nature-lab-try"><span>改变参数，观察规律</span><button onClick={resetSelected}>恢复默认</button></div>
              {selected.controls.map((control) => {
                const setting = settings[control.key] ?? control.defaultValue;
                const decimals = control.step < .1 ? 2 : control.step < 1 ? 1 : 0;
                const reached = control.target !== undefined && Math.abs(setting - control.target) < control.step / 2 + .001;
                return (
                  <label className="nature-lab-control" key={control.key}>
                    <span>{control.label}<b>{setting.toFixed(decimals)}{control.suffix}</b></span>
                    <input
                      aria-label={control.label}
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={setting}
                      onChange={(event) => setSettings((previous) => ({ ...previous, [control.key]: Number(event.target.value) }))}
                    />
                    {control.target !== undefined && <small className={reached ? "reached" : ""}>{control.targetLabel} {control.target}{control.suffix} {reached ? "· 已对准" : "· 试着对准它"}</small>}
                  </label>
                );
              })}
              <div className="nature-lab-reward"><span>🌱 数学种子 +1</span><b>发现已收藏 ✓</b></div>
            </aside>
            <div className="nature-lab-preview">
              <div className="nature-preview-header"><span>REAL-TIME VISUALIZATION</span><b>参数实时预览</b></div>
              <MuseumPreview item={selected} settings={settings} />
              <div className="nature-preview-caption"><span>{selected.formula}</span><p>{selected.previewCaption}。图形会随左侧参数实时变化。</p></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
