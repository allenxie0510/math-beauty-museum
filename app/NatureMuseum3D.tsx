"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCompatibleAudioContext, resumeAudioContext } from "./audio";
import { observeElementSize, observeElementVisibility } from "./viewport";

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
type SoundMode = "idle" | "music" | "microphone";
type SoundSignal = {
  mode: SoundMode;
  energy: number;
  bass: number;
  mid: number;
  treble: number;
  tick: number;
};
type SoundSignalRef = MutableRefObject<SoundSignal>;
type MuseumControl = {
  key: string;
  symbol: string;
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
    accent: "#9fc94f",
    items: [
      {
        id: "golden",
        index: "01",
        icon: "φ",
        name: "黄金比例花",
        english: "Golden Ratio Flower",
        formula: "φ ≈ 1.618",
        color: "#a8cf58",
        discovery: "一朵花，正在寻找最舒展的排列。",
        explanation: "花瓣依次转过黄金角，彼此错开，让每一片都更容易得到阳光。改变角度时，你会看到秩序如何出现或消失。",
        visual: "golden",
        previewCaption: "花瓣沿黄金角依次展开",
        controls: [
          { key: "goldenPetals", symbol: "N", label: "花瓣数量", min: 8, max: 34, step: 1, defaultValue: 21 },
          { key: "goldenAngle", symbol: "θ", label: "旋转角度", min: 110, max: 155, step: .1, defaultValue: 137.5, suffix: "°", target: 137.5, targetLabel: "黄金角" },
          { key: "goldenSpread", symbol: "s", label: "展开距离", min: .65, max: 1.45, step: .01, defaultValue: 1 },
        ],
      },
      {
        id: "fractal",
        index: "02",
        icon: "⌘",
        name: "分形生长",
        english: "Fractal Growth",
        formula: "Lₙ = L₀ · rⁿ",
        color: "#72b86c",
        discovery: "一条简单规则，长成了一棵复杂的树。",
        explanation: "每根枝条都缩短一点、转动一点，再复制自己。重复不是单调，它能从很少的信息里创造丰富生命。",
        visual: "fractal",
        previewCaption: "简单规则 × 重复 = 复杂生命",
        controls: [
          { key: "fractalDepth", symbol: "n", label: "生长层级", min: 2, max: 9, step: 1, defaultValue: 7 },
          { key: "fractalAngle", symbol: "α", label: "分枝角度", min: 14, max: 42, step: 1, defaultValue: 27, suffix: "°" },
          { key: "fractalRatio", symbol: "r", label: "枝条比例", min: .58, max: .76, step: .01, defaultValue: .67 },
        ],
      },
      {
        id: "phyllotaxis",
        index: "03",
        icon: "∞",
        name: "斐波那契花盘",
        english: "Fibonacci Phyllotaxis",
        formula: "1, 1, 2, 3, 5, 8…",
        color: "#cdb54b",
        discovery: "小小种子，也懂得怎样装满一个圆。",
        explanation: "每颗种子沿固定角度生长，会自然形成两组反向螺旋。向日葵用数列，把有限空间安排得井井有条。",
        visual: "phyllotaxis",
        previewCaption: "两组反向螺旋共同填满花盘",
        controls: [
          { key: "fibonacciSeeds", symbol: "Fₙ", label: "种子数量", min: 34, max: 144, step: 1, defaultValue: 89 },
          { key: "fibonacciAngle", symbol: "θ", label: "生长角度", min: 128, max: 145, step: .1, defaultValue: 137.5, suffix: "°", target: 137.5, targetLabel: "黄金角" },
          { key: "fibonacciScale", symbol: "s", label: "排列间距", min: .65, max: 1.3, step: .01, defaultValue: 1 },
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
    accent: "#ed9b45",
    items: [
      {
        id: "pythagoras",
        index: "01",
        icon: "△",
        name: "勾股结构",
        english: "Pythagorean Structure",
        formula: "a² + b² = c²",
        color: "#ef9847",
        discovery: "三条边，组成建筑里最可靠的承诺。",
        explanation: "直角三角形可以把受力稳定地传向地面。改变两条直角边，斜梁会始终遵守勾股关系。",
        visual: "pythagoras",
        previewCaption: "三角结构把力量稳定传向地面",
        controls: [
          { key: "pythagorasA", symbol: "a", label: "水平梁", min: 2, max: 6, step: .1, defaultValue: 3 },
          { key: "pythagorasB", symbol: "b", label: "垂直梁", min: 2, max: 6, step: .1, defaultValue: 4 },
          { key: "pythagorasWidth", symbol: "τ", label: "构件厚度", min: 6, max: 24, step: 1, defaultValue: 15 },
        ],
      },
      {
        id: "catenary",
        index: "02",
        icon: "⌒",
        name: "悬链拱",
        english: "Catenary Arch",
        formula: "y = a cosh(x/a)",
        color: "#dfb354",
        discovery: "一条自然垂落的曲线，翻转后可以撑起穹顶。",
        explanation: "绳索在重力下形成悬链线。把它上下翻转，压力会沿曲线流动，因此许多拱门和穹顶格外稳定。",
        visual: "catenary",
        previewCaption: "重力画出的曲线，成为稳定的拱",
        controls: [
          { key: "catenarySpan", symbol: "L", label: "拱跨宽度", min: 4, max: 9, step: .1, defaultValue: 6.8 },
          { key: "catenarySag", symbol: "a", label: "拱顶高度", min: 1.2, max: 4, step: .1, defaultValue: 2.6 },
          { key: "catenaryLoads", symbol: "N", label: "受力节点", min: 5, max: 17, step: 1, defaultValue: 11 },
        ],
      },
      {
        id: "tessellation",
        index: "03",
        icon: "⬡",
        name: "几何铺砌",
        english: "Geometric Tessellation",
        formula: "Σ interior angles = 360°",
        color: "#e77f4c",
        discovery: "没有缝隙的重复，铺成一整面城市表皮。",
        explanation: "三角形、正方形和正六边形能够围绕一点完整拼合。改变边数与旋转角，观察空间何时严丝合缝。",
        visual: "tessellation",
        previewCaption: "重复单元组合成连续的建筑表皮",
        controls: [
          { key: "tileSides", symbol: "n", label: "多边形边数", min: 3, max: 8, step: 1, defaultValue: 6 },
          { key: "tileScale", symbol: "s", label: "单元尺寸", min: 24, max: 62, step: 1, defaultValue: 42 },
          { key: "tileRotation", symbol: "θ", label: "旋转角度", min: 0, max: 60, step: 1, defaultValue: 30, suffix: "°" },
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
    accent: "#d875b5",
    items: [
      {
        id: "sine",
        index: "01",
        icon: "∿",
        name: "正弦波",
        english: "Sine Wave",
        formula: "y = A sin(2πft + φ)",
        color: "#dc79b7",
        discovery: "最简单的声音，是一条平滑起伏的曲线。",
        explanation: "频率决定音高，振幅决定响度，相位决定波从哪里开始。三个参数共同描述最基础的纯音。",
        visual: "sine",
        previewCaption: "频率、振幅与相位共同塑造声音",
        controls: [
          { key: "waveFrequency", symbol: "f", label: "频率", min: 1, max: 8, step: .1, defaultValue: 3.2 },
          { key: "waveAmplitude", symbol: "A", label: "振幅", min: 30, max: 150, step: 1, defaultValue: 92 },
          { key: "wavePhase", symbol: "φ", label: "相位", min: 0, max: 360, step: 1, defaultValue: 0, suffix: "°" },
        ],
      },
      {
        id: "harmonics",
        index: "02",
        icon: "Σ",
        name: "傅里叶叠加",
        english: "Fourier Harmonics",
        formula: "f(t) = Σ Aₙ sin(nωt)",
        color: "#a979d3",
        discovery: "复杂的声音，可以拆成许多个简单波。",
        explanation: "把不同频率的正弦波叠加，就能得到丰富音色。增加谐波层数，观察简单波如何共同塑造复杂声音。",
        visual: "harmonics",
        previewCaption: "多个简单波叠加成复杂音色",
        controls: [
          { key: "harmonicCount", symbol: "N", label: "谐波层数", min: 1, max: 9, step: 1, defaultValue: 5 },
          { key: "harmonicDecay", symbol: "λ", label: "衰减速度", min: .45, max: 1.6, step: .01, defaultValue: .9 },
          { key: "harmonicBase", symbol: "ω", label: "基础频率", min: 1, max: 5, step: .1, defaultValue: 2.2 },
        ],
      },
      {
        id: "chladni",
        index: "03",
        icon: "✣",
        name: "克拉尼图形",
        english: "Chladni Figures",
        formula: "∇²u + k²u = 0",
        color: "#ed98ae",
        discovery: "沙粒会主动离开振动最强的位置。",
        explanation: "薄板振动时，几乎不动的节点会收集沙粒，显现出隐藏的几何图案。频率模式不同，图案也会改变。",
        visual: "chladni",
        previewCaption: "振动节点把声音变成几何花纹",
        controls: [
          { key: "chladniM", symbol: "m", label: "横向模态", min: 1, max: 8, step: 1, defaultValue: 4 },
          { key: "chladniN", symbol: "n", label: "纵向模态", min: 1, max: 8, step: 1, defaultValue: 3 },
          { key: "chladniThreshold", symbol: "ε", label: "节点清晰度", min: .03, max: .18, step: .01, defaultValue: .08 },
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
    accent: "#647fd1",
    items: [
      {
        id: "orbit",
        index: "01",
        icon: "◌",
        name: "开普勒轨道",
        english: "Kepler Orbit",
        formula: "r = a(1-e²)/(1+e cos θ)",
        color: "#5c9bd2",
        discovery: "行星绕行的不是正圆，而是优雅的椭圆。",
        explanation: "太阳位于椭圆的一个焦点。改变离心率，观察轨道从接近圆形逐渐拉长，以及行星速度的变化。",
        visual: "orbit",
        previewCaption: "行星沿椭圆轨道绕焦点运行",
        controls: [
          { key: "orbitEccentricity", symbol: "e", label: "轨道离心率", min: 0, max: .82, step: .01, defaultValue: .35 },
          { key: "orbitSpeed", symbol: "ω", label: "运行速度", min: .4, max: 2.4, step: .1, defaultValue: 1.2 },
          { key: "orbitBodies", symbol: "N", label: "轨迹采样点", min: 4, max: 18, step: 1, defaultValue: 10 },
        ],
      },
      {
        id: "galaxy",
        index: "02",
        icon: "↻",
        name: "螺旋星系",
        english: "Spiral Galaxy",
        formula: "r = aeᵇθ",
        color: "#7772ce",
        discovery: "亿万颗星，排列成跨越光年的螺旋。",
        explanation: "星系旋臂近似对数螺旋。改变旋臂数量与曲率，你会发现台风、贝壳和银河共享相似语言。",
        visual: "spiral",
        previewCaption: "对数螺旋把亿万颗星组织在一起",
        controls: [
          { key: "spiralScale", symbol: "a", label: "螺旋尺度", min: .12, max: .32, step: .01, defaultValue: .2 },
          { key: "spiralCurvature", symbol: "b", label: "旋转曲率", min: .12, max: .55, step: .01, defaultValue: .3 },
          { key: "spiralArms", symbol: "k", label: "旋臂数量", min: 2, max: 7, step: 1, defaultValue: 4 },
          { key: "spiralStars", symbol: "N", label: "星体数量", min: 120, max: 520, step: 10, defaultValue: 320 },
        ],
      },
      {
        id: "resonance",
        index: "03",
        icon: "∞",
        name: "轨道共振",
        english: "Orbital Resonance",
        formula: "T₁ : T₂ = p : q",
        color: "#4f83bd",
        discovery: "不同速度的行星，也能找到共同节拍。",
        explanation: "当两个天体的公转周期形成整数比，它们会周期性回到相似位置，画出稳定而优美的共振轨迹。",
        visual: "resonance",
        previewCaption: "整数周期比让行星形成稳定节奏",
        controls: [
          { key: "resonanceA", symbol: "p", label: "内轨周期", min: 1, max: 8, step: 1, defaultValue: 3 },
          { key: "resonanceB", symbol: "q", label: "外轨周期", min: 1, max: 9, step: 1, defaultValue: 5 },
          { key: "resonancePhase", symbol: "φ", label: "相位差", min: 0, max: 180, step: 1, defaultValue: 36, suffix: "°" },
        ],
      },
    ],
  },
];

const DEFAULT_SETTINGS: MuseumSettings = {};
HALLS.forEach((hall) => hall.items.forEach((item) => item.controls.forEach((control) => {
  DEFAULT_SETTINGS[control.key] = control.defaultValue;
})));

const AUTO_CONTROL_KEYS: Record<string, string[]> = {
  golden: ["goldenAngle", "goldenSpread"],
  fractal: ["fractalDepth", "fractalAngle"],
  phyllotaxis: ["fibonacciAngle", "fibonacciScale"],
  pythagoras: ["pythagorasA", "pythagorasB"],
  catenary: ["catenarySpan", "catenarySag"],
  tessellation: ["tileSides", "tileRotation"],
  sine: ["waveFrequency", "waveAmplitude"],
  harmonics: ["harmonicCount", "harmonicDecay"],
  chladni: ["chladniM", "chladniN"],
  orbit: ["orbitEccentricity", "orbitSpeed"],
  galaxy: ["spiralScale", "spiralCurvature"],
  resonance: ["resonanceA", "resonanceB"],
};

function controlDecimals(control: MuseumControl) {
  return control.step < .1 ? 2 : control.step < 1 ? 1 : 0;
}

function controlDisplayValue(control: MuseumControl, value: number) {
  return value.toFixed(controlDecimals(control)) + (control.suffix ?? "");
}

function snapControlValue(control: MuseumControl, value: number) {
  const stepped = control.min + Math.round((value - control.min) / control.step) * control.step;
  const bounded = Math.max(control.min, Math.min(control.max, stepped));
  return Number(bounded.toFixed(Math.max(0, controlDecimals(control))));
}

const EMPTY_SOUND_SIGNAL: SoundSignal = { mode: "idle", energy: 0, bass: 0, mid: 0, treble: 0, tick: 0 };
const SOUND_CLIPS = [
  {
    id: "crystal",
    name: "晶体琶音",
    detail: "清亮 · 高音",
    tempo: 260,
    waveform: "sine" as OscillatorType,
    notes: [261.63, 329.63, 392, 523.25, 392, 329.63],
    ratios: [1, 2, 3],
  },
  {
    id: "pulse",
    name: "几何脉冲",
    detail: "节拍 · 低音",
    tempo: 220,
    waveform: "triangle" as OscillatorType,
    notes: [110, 110, 164.81, 146.83, 110, 220, 164.81, 146.83],
    ratios: [1, 1.5, 2],
  },
  {
    id: "cosmos",
    name: "深空和弦",
    detail: "舒缓 · 宽频",
    tempo: 620,
    waveform: "sine" as OscillatorType,
    notes: [146.83, 220, 293.66, 246.94],
    ratios: [1, 1.5, 2.01],
  },
] as const;

function physical(color: string, options: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: .58, metalness: .02, clearcoat: .04, ...options });
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line) && !(child instanceof THREE.Points)) return;
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

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
}

function drawMiniArtwork(ctx: CanvasRenderingContext2D, item: MuseumItem, width: number, height: number, centerY = height * .57, artworkScale = 1) {
  const cx = width * .5;
  ctx.save();
  ctx.translate(cx, centerY);
  ctx.scale(artworkScale, artworkScale);
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = .62;
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 18;
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
  const secondaryColor: Record<HallKey, string> = {
    nature: "#6f8de8",
    architecture: "#bd6fd8",
    sound: "#55d5dd",
    cosmos: "#ad7bde",
  };
  const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  baseGradient.addColorStop(0, "#0d111b");
  baseGradient.addColorStop(.62, "#080b13");
  baseGradient.addColorStop(1, "#05070c");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const posterX = 38;
  const posterY = 36;
  const posterWidth = canvas.width - posterX * 2;
  const posterHeight = 970;
  ctx.save();
  roundedRectPath(ctx, posterX, posterY, posterWidth, posterHeight, 34);
  ctx.clip();
  const posterGradient = ctx.createLinearGradient(posterX, posterY, posterX + posterWidth, posterY + posterHeight);
  posterGradient.addColorStop(0, item.color + "70");
  posterGradient.addColorStop(.42, secondaryColor[hall.key] + "38");
  posterGradient.addColorStop(.76, "rgba(16,20,31,.78)");
  posterGradient.addColorStop(1, "rgba(7,10,17,.96)");
  ctx.fillStyle = posterGradient;
  ctx.fillRect(posterX, posterY, posterWidth, posterHeight);
  const halo = ctx.createRadialGradient(canvas.width * .62, 530, 16, canvas.width * .62, 530, 520);
  halo.addColorStop(0, "rgba(255,255,255,.16)");
  halo.addColorStop(.42, item.color + "22");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(posterX, posterY, posterWidth, posterHeight);
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 4; index++) {
    ctx.beginPath();
    ctx.arc(790, 250, 118 + index * 72, Math.PI * .62, Math.PI * 1.62);
    ctx.stroke();
  }
  ctx.restore();
  roundedRectPath(ctx, posterX, posterY, posterWidth, posterHeight, 34);
  ctx.strokeStyle = "rgba(255,255,255,.11)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = item.color;
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText("MATHEMATICAL BEAUTY  ·  " + hall.index + "." + item.index, 76, 100);
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.font = "700 62px Arial, sans-serif";
  ctx.fillText(item.name, 76, 194);
  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = "600 23px Arial, sans-serif";
  ctx.fillText(item.english.toUpperCase(), 76, 239);
  ctx.fillStyle = item.color;
  ctx.font = "italic 46px Georgia, serif";
  ctx.fillText(item.formula, 76, 326);
  drawMiniArtwork(ctx, item, canvas.width, canvas.height, 670, 1.22);
  ctx.fillStyle = "rgba(255,255,255,.38)";
  ctx.font = "600 17px Arial, sans-serif";
  ctx.fillText("FORM · NUMBER · PATTERN", 76, 952);

  ctx.fillStyle = "#f5f6fb";
  ctx.font = "700 29px Arial, sans-serif";
  ctx.fillText(item.discovery, 64, 1102);
  ctx.fillStyle = "rgba(190,199,215,.72)";
  ctx.font = "500 21px Arial, sans-serif";
  ctx.fillText("点击展板，打开互动实验与图形预览", 64, 1152);
  ctx.fillStyle = item.color;
  ctx.fillRect(64, 1258, 128, 4);
  ctx.fillStyle = "rgba(245,246,251,.86)";
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText("EXPLORE", 64, 1338);
  ctx.font = "400 34px Arial, sans-serif";
  ctx.fillText("→", 842, 1340);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function addBoard(parent: THREE.Object3D, item: MuseumItem, hall: HallDefinition, position: THREE.Vector3, rotationY = 0) {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.28, 5.08, .24), physical("#171a22", {
    roughness: .38,
    metalness: .16,
    clearcoat: .32,
  }));
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(3.08, 4.9),
    new THREE.MeshBasicMaterial({
      map: makeBoardTexture(item, hall),
      toneMapped: false,
      transparent: true,
      opacity: .88,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  face.position.z = .132;
  face.renderOrder = 1;
  group.add(face);
  group.position.copy(position);
  group.rotation.y = rotationY;
  group.userData.itemId = item.id;
  const hallIndex = HALLS.indexOf(hall);
  group.traverse((child) => {
    child.userData.itemId = item.id;
    child.userData.hallIndex = hallIndex;
  });
  parent.add(group);
}

const MUSEUM_CAMERA_STOPS = [
  { position: new THREE.Vector3(0, 4.8, 18.8), target: new THREE.Vector3(0, 4.2, .2) },
  { position: new THREE.Vector3(-2.8, 4.05, -11.5), target: new THREE.Vector3(-2.8, 3.55, -20.8) },
  { position: new THREE.Vector3(3.6, 4.05, -31.5), target: new THREE.Vector3(3.6, 3.55, -40.8) },
  { position: new THREE.Vector3(-3.6, 4.05, -51.5), target: new THREE.Vector3(-3.6, 3.55, -60.8) },
  { position: new THREE.Vector3(2.6, 4.05, -71.5), target: new THREE.Vector3(2.6, 3.55, -80.8) },
];

const HALL_CENTERS = [
  new THREE.Vector3(-2.8, 0, -20),
  new THREE.Vector3(3.6, 0, -40),
  new THREE.Vector3(-3.6, 0, -60),
  new THREE.Vector3(2.6, 0, -80),
];

function glowMaterial(color: string, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
    blending: opacity < .8 ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opacity >= .8,
  });
}

function makeTextMaterial(text: string, color: string, fontSize = 118, square = false, canvasWidth = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = square ? 384 : canvasWidth;
  canvas.height = square ? 384 : 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    emissive: color,
    emissiveMap: texture,
    emissiveIntensity: 2.2,
    transparent: true,
    alphaTest: .02,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    roughness: .35,
    metalness: .08,
  });
}

function makeChevronMaterial(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.globalAlpha = .78;
  ctx.lineWidth = 42;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(92, 344);
  ctx.lineTo(256, 190);
  ctx.lineTo(420, 344);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: .72,
    depthWrite: false,
    toneMapped: false,
  });
}

function addTextRing(
  parent: THREE.Group,
  text: string,
  radius: number,
  y: number,
  color: string,
  scale: number,
  offset = 0,
  phraseArc = Math.PI * .72,
) {
  const characters = Array.from(text);
  const weights = characters.map((character) => character === " " ? .48 : 1);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = offset - phraseArc / 2;

  characters.forEach((character, index) => {
    const characterArc = phraseArc * weights[index] / weightTotal;
    if (character !== " ") {
      const angle = cursor + characterArc / 2;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), makeTextMaterial(character, color, 178, true));
      mesh.position.set(Math.sin(angle) * (radius + .055), y, Math.cos(angle) * (radius + .055));
      mesh.rotation.y = angle;
      parent.add(mesh);
    }
    cursor += characterArc;
  });

  const bandHeight = scale * 1.16;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, bandHeight, 160, 1, true),
    physical(color, {
      roughness: .08,
      metalness: .08,
      transmission: .78,
      transparent: true,
      opacity: .24,
      thickness: .6,
      ior: 1.42,
      clearcoat: 1,
      clearcoatRoughness: .07,
      emissive: color,
      emissiveIntensity: .055,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.position.y = y;
  glass.renderOrder = -1;
  parent.add(glass);

  [-1, 1].forEach((edge) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, .032, 8, 160), glowMaterial(color, .66));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y + edge * bandHeight * .5;
    parent.add(rim);
  });

  const reflection = new THREE.Mesh(
    new THREE.TorusGeometry(radius + .018, .012, 6, 160),
    glowMaterial("#ffffff", .44),
  );
  reflection.rotation.x = Math.PI / 2;
  reflection.position.y = y + bandHeight * .28;
  parent.add(reflection);
}

class PortalArchCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly depth: number,
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const radius = this.width / 2;
    const legHeight = Math.max(.01, this.height - radius);
    const arcLength = Math.PI * radius;
    const distance = THREE.MathUtils.clamp(t, 0, 1) * (legHeight * 2 + arcLength);

    if (distance <= legHeight) {
      return target.set(-radius, distance, this.depth);
    }
    if (distance <= legHeight + arcLength) {
      const theta = Math.PI - (distance - legHeight) / radius;
      return target.set(Math.cos(theta) * radius, legHeight + Math.sin(theta) * radius, this.depth);
    }
    return target.set(radius, legHeight - (distance - legHeight - arcLength), this.depth);
  }
}

function addAtriumDepthCorridor(parent: THREE.Object3D, lowPower: boolean, primary: string, secondary: string) {
  const corridor = new THREE.Group();
  corridor.name = "atrium-depth-corridor";
  const frameCount = lowPower ? 4 : 6;
  const edgeCount = frameCount * 4;
  const edgeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const frameMaterial = glowMaterial(primary, lowPower ? .16 : .23);
  const haloMaterial = glowMaterial(primary, lowPower ? .035 : .055);
  const frames = new THREE.InstancedMesh(edgeGeometry, frameMaterial, edgeCount);
  const halos = new THREE.InstancedMesh(edgeGeometry.clone(), haloMaterial, edgeCount);
  const edge = new THREE.Object3D();
  let edgeIndex = 0;

  const placeEdge = (localX: number, localY: number, z: number, width: number, height: number, tilt: number, horizontal: boolean) => {
    edge.position.set(
      localX * Math.cos(tilt) - localY * Math.sin(tilt),
      3.65 + localX * Math.sin(tilt) + localY * Math.cos(tilt),
      z,
    );
    edge.rotation.set(0, 0, tilt);
    edge.scale.set(horizontal ? width : .055, horizontal ? .055 : height, .07);
    edge.updateMatrix();
    frames.setMatrixAt(edgeIndex, edge.matrix);
    edge.scale.set(horizontal ? width : .14, horizontal ? .14 : height, .12);
    edge.updateMatrix();
    halos.setMatrixAt(edgeIndex, edge.matrix);
    edgeIndex++;
  };

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const width = 14.8;
    const height = 6.8;
    const z = 4.4 - frameIndex * 3.25;
    const tilt = [0, -.018, .014, -.012, .009, -.006][frameIndex];
    placeEdge(0, height / 2, z, width, height, tilt, true);
    placeEdge(0, -height / 2, z, width, height, tilt, true);
    placeEdge(-width / 2, 0, z, width, height, tilt, false);
    placeEdge(width / 2, 0, z, width, height, tilt, false);
  }
  frames.instanceMatrix.needsUpdate = true;
  halos.instanceMatrix.needsUpdate = true;
  frames.renderOrder = 1;
  halos.renderOrder = 0;
  corridor.add(halos, frames);

  const accentGeometry = new THREE.BoxGeometry(1, 1, 1);
  const accentMaterial = glowMaterial(secondary, lowPower ? .09 : .14);
  const accentLines = new THREE.InstancedMesh(accentGeometry, accentMaterial, lowPower ? 2 : 3);
  const accent = new THREE.Object3D();
  const accentSegments = [
    [new THREE.Vector3(-7.25, 1.15, 3.8), new THREE.Vector3(-5.1, 7.05, -4.9)],
    [new THREE.Vector3(7.2, 1.35, .6), new THREE.Vector3(5.25, 7.02, -8.2)],
    [new THREE.Vector3(-5.8, 7.08, 2.5), new THREE.Vector3(5.4, 7.08, -8.8)],
  ];
  accentSegments.slice(0, lowPower ? 2 : 3).forEach(([start, end], index) => {
    const axis = end.clone().sub(start);
    accent.position.copy(start).add(end).multiplyScalar(.5);
    accent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    accent.scale.set(.038, axis.length(), .038);
    accent.updateMatrix();
    accentLines.setMatrixAt(index, accent.matrix);
  });
  accentLines.instanceMatrix.needsUpdate = true;
  corridor.add(accentLines);

  const depthPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(14.6, 6.65),
    new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: .035, depthWrite: false, side: THREE.DoubleSide }),
  );
  depthPlane.position.set(0, 3.65, 4.4 - frameCount * 3.25);
  corridor.add(depthPlane);
  parent.add(corridor);
  return corridor;
}

function addPortal(parent: THREE.Object3D, x: number, z: number, color: string, rotationY = 0) {
  const portal = new THREE.Group();
  [0, 1, 2].forEach((layer) => {
    const width = 5.8 + layer * .55;
    const height = 7.2 + layer * .32;
    const curve = new PortalArchCurve(width, height, layer * .24);
    const frame = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 96, .045 + layer * .014, 12, false),
      glowMaterial(color, .48 - layer * .1),
    );
    portal.add(frame);
  });
  portal.position.set(x, .04, z);
  portal.rotation.y = rotationY;
  parent.add(portal);
  return portal;
}

function makePointCloud(points: THREE.Vector3[], color: string, size = .08, opacity = .8) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
}

function addParticleSegment(points: THREE.Vector3[], start: THREE.Vector3, end: THREE.Vector3, steps = 18) {
  for (let step = 0; step <= steps; step++) points.push(start.clone().lerp(end, step / steps));
}

function addHallHologram(parent: THREE.Object3D, hallIndex: number, center: THREE.Vector3, lowPower: boolean) {
  const group = new THREE.Group();
  group.userData.hologram = hallIndex;
  group.userData.hologramMode = ["fibonacci", "architecture", "fourier", "galaxy"][hallIndex];
  const color = HALLS[hallIndex].accent;

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.78, lowPower ? 28 : 52, lowPower ? 18 : 36),
    physical(color, {
      roughness: .06,
      metalness: .04,
      transmission: lowPower ? .18 : .72,
      transparent: true,
      opacity: lowPower ? .16 : .12,
      thickness: .52,
      ior: 1.38,
      clearcoat: 1,
      clearcoatRoughness: .05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.renderOrder = 2;
  group.add(glass);

  const innerGrid = new THREE.Mesh(
    new THREE.SphereGeometry(1.67, lowPower ? 18 : 30, lowPower ? 12 : 20),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: .055, depthWrite: false, toneMapped: false }),
  );
  group.add(innerGrid);

  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, .12, lowPower ? 8 : 14, lowPower ? 64 : 120),
    physical("#151a25", { roughness: .2, metalness: .82, clearcoat: .72, clearcoatRoughness: .12 }),
  );
  group.add(frame);

  const gimbal = new THREE.Mesh(
    new THREE.TorusGeometry(1.98, .046, 8, lowPower ? 64 : 120),
    glowMaterial(color, .78),
  );
  gimbal.rotation.y = .76;
  group.add(gimbal);

  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(1.83, .028, 7, lowPower ? 56 : 110),
    glowMaterial("#9eeaff", .72),
  );
  equator.rotation.x = Math.PI / 2;
  group.add(equator);
  group.userData.rings = [gimbal, equator];
  group.userData.glass = glass;

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    const mount = new THREE.Mesh(
      new THREE.CylinderGeometry(.16, .16, .5, 14),
      physical("#283245", { roughness: .22, metalness: .72, clearcoat: .5 }),
    );
    mount.rotation.z = angle + Math.PI / 2;
    mount.position.set(Math.cos(angle) * 2.18, Math.sin(angle) * 2.18, 0);
    group.add(mount);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), glowMaterial(color, .96));
    lamp.position.set(Math.cos(angle) * 2.18, Math.sin(angle) * 2.18, .18);
    group.add(lamp);
  });

  const core = new THREE.Mesh(new THREE.SphereGeometry(.13, 18, 12), glowMaterial("#ffffff", .96));
  core.scale.set(1, 1, 1.65);
  group.add(core);
  const coreLight = new THREE.PointLight(color, lowPower ? 4.5 : 8.5, 5.5, 2);
  group.add(coreLight);

  let particles: THREE.Points;
  if (hallIndex === 0) {
    const points: THREE.Vector3[] = [];
    const count = lowPower ? 240 : 520;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - i / Math.max(1, count - 1) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * goldenAngle;
      points.push(new THREE.Vector3(Math.cos(angle) * radius * 1.5, y * 1.5, Math.sin(angle) * radius * 1.5));
    }
    particles = makePointCloud(points, "#d7ff86", lowPower ? .07 : .055, .94);
  } else if (hallIndex === 1) {
    const points: THREE.Vector3[] = [];
    const towers = [
      { x: -1.05, z: -.25, width: .7, height: 1.8 },
      { x: -.2, z: .2, width: .62, height: 2.65 },
      { x: .62, z: -.15, width: .82, height: 2.15 },
      { x: 1.18, z: .28, width: .42, height: 1.35 },
    ];
    towers.forEach(({ x, z, width, height }) => {
      const bottom = -1.32;
      const top = bottom + height;
      const corners = [
        new THREE.Vector3(x - width / 2, bottom, z - width / 2), new THREE.Vector3(x + width / 2, bottom, z - width / 2),
        new THREE.Vector3(x + width / 2, bottom, z + width / 2), new THREE.Vector3(x - width / 2, bottom, z + width / 2),
      ];
      corners.forEach((corner, cornerIndex) => {
        addParticleSegment(points, corner, new THREE.Vector3(corner.x, top, corner.z), lowPower ? 9 : 17);
        addParticleSegment(points, new THREE.Vector3(corner.x, top, corner.z), new THREE.Vector3(corners[(cornerIndex + 1) % 4].x, top, corners[(cornerIndex + 1) % 4].z), lowPower ? 6 : 12);
      });
    });
    addParticleSegment(points, new THREE.Vector3(-1.55, -1.32, .75), new THREE.Vector3(0, 1.25, .75), lowPower ? 14 : 28);
    addParticleSegment(points, new THREE.Vector3(0, 1.25, .75), new THREE.Vector3(1.55, -1.32, .75), lowPower ? 14 : 28);
    addParticleSegment(points, new THREE.Vector3(-1.55, -1.32, .75), new THREE.Vector3(1.55, -1.32, .75), lowPower ? 18 : 34);
    particles = makePointCloud(points, "#ffc875", lowPower ? .075 : .058, .94);
  } else if (hallIndex === 2) {
    const points: THREE.Vector3[] = [];
    const samples = lowPower ? 72 : 138;
    for (let wave = 0; wave < 4; wave++) {
      for (let i = 0; i < samples; i++) {
        const x = i / (samples - 1) * 3.1 - 1.55;
        const band = (wave - 1.5) * .42;
        points.push(new THREE.Vector3(x, band + Math.sin(x * (2.2 + wave * 1.15)) * (.34 - wave * .035), (wave - 1.5) * .18));
      }
    }
    particles = makePointCloud(points, "#77e7ff", lowPower ? .075 : .055, .96);
    particles.userData.waveSamples = samples;
  } else {
    const points: THREE.Vector3[] = [];
    const count = lowPower ? 320 : 760;
    for (let i = 0; i < count; i++) {
      const arm = i % 4;
      const progress = i / count;
      const theta = progress * Math.PI * 7.5 + arm * Math.PI / 2;
      const radius = .08 + progress * 1.52;
      const drift = Math.sin(i * 12.9898) * .09 * (1 - progress * .45);
      points.push(new THREE.Vector3(Math.cos(theta) * (radius + drift), Math.sin(theta) * (radius + drift) * .62, Math.sin(i * 2.41) * .18 * (1 - progress)));
    }
    particles = makePointCloud(points, "#aebaff", lowPower ? .065 : .045, .95);
  }

  particles.userData.hologramParticles = true;
  group.userData.particles = particles;
  group.add(particles);
  group.scale.setScalar(.8);
  group.position.set(center.x - 6.2, 4.62, center.z - 2.15);
  parent.add(group);
  return group;
}

type HallSceneBundle = {
  root: THREE.Group;
  hologram: THREE.Group;
  portals: THREE.Group[];
};

function buildHallScene(hallIndex: number, lowPower: boolean): HallSceneBundle {
  const hall = HALLS[hallIndex];
  const center = HALL_CENTERS[hallIndex];
  const accent = hall.accent;
  const root = new THREE.Group();
  root.userData.hallIndex = hallIndex;
  root.name = `hall-${hall.key}`;

  const wallMaterial = physical(hallIndex === 3 ? "#10131d" : "#232229", { roughness: .82, metalness: .06 });
  const frostMaterial = physical(accent, {
    roughness: .24,
    transmission: lowPower ? .08 : .32,
    transparent: true,
    opacity: lowPower ? .24 : .32,
    thickness: .8,
    side: THREE.DoubleSide,
  });

  [-4.15, 0, 4.15].forEach((offset, boardIndex) => {
    const backing = new THREE.Mesh(new THREE.BoxGeometry(3.72, 7.75, .22), wallMaterial.clone());
    backing.position.set(center.x + offset, 3.88, center.z - 6.23);
    backing.receiveShadow = true;
    root.add(backing);
    addBoard(root, hall.items[boardIndex], hall, new THREE.Vector3(center.x + offset, 3.55, center.z - 6.05));
    const wash = new THREE.PointLight(accent, lowPower ? 2.4 : 4.8, 7.5, 2);
    wash.position.set(center.x + offset, 6.8, center.z - 2.7);
    root.add(wash);
  });

  [-8.55, 8.55].forEach((offset) => {
    const partition = new THREE.Mesh(new THREE.BoxGeometry(.24, 7.7, 7.4), frostMaterial.clone());
    partition.position.set(center.x + offset, 3.85, center.z - 1.9);
    partition.rotation.y = offset < 0 ? -.16 : .16;
    root.add(partition);
    for (let rib = -3; rib <= 3; rib++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(.035, 7.15, .055), glowMaterial(accent, .28));
      line.position.set(center.x + offset + (offset < 0 ? .13 : -.13), 3.85, center.z - 1.9 + rib * .92);
      root.add(line);
    }
  });

  const nextCenter = HALL_CENTERS[Math.min(hallIndex + 1, HALL_CENTERS.length - 1)];
  const portalX = hallIndex === 3 ? center.x + 7.1 : center.x + (nextCenter.x - center.x > 0 ? 7.1 : -7.1);
  const portals = [addPortal(root, portalX, center.z - 7.15, accent)];
  const hologram = addHallHologram(root, hallIndex, center, lowPower);
  const hallTitle = new THREE.Group();
  hallTitle.name = `hall-title-${hall.key}`;
  hallTitle.position.set(center.x, 7.78, center.z - 5.62);

  const titleMaterial = makeTextMaterial(hall.name + "  /  " + hall.english, accent, 74, false, 2048);
  const titleFace = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.575), titleMaterial);
  titleFace.position.z = .08;
  titleFace.renderOrder = 3;
  hallTitle.add(titleFace);

  const titleDepthMaterial = titleMaterial.clone();
  titleDepthMaterial.color.set(accent);
  titleDepthMaterial.emissiveIntensity = .68;
  titleDepthMaterial.opacity = .46;
  titleDepthMaterial.alphaTest = .04;
  [-.005, -.07].forEach((depth, layerIndex) => {
    const depthLayer = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.575), titleDepthMaterial);
    depthLayer.position.set(-.018 * (layerIndex + 1), -.018 * (layerIndex + 1), depth);
    depthLayer.renderOrder = 2 - layerIndex;
    hallTitle.add(depthLayer);
  });
  root.add(hallTitle);

  wallMaterial.dispose();
  frostMaterial.dispose();
  return { root, hologram, portals };
}

function MuseumCanvas({ hallIndex, onSelect, onEnter }: { hallIndex: number; onSelect: (id: string, hallIndex: number) => void; onEnter: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [retryKey, setRetryKey] = useState(0);
  const fallbackHall = hallIndex >= 0 ? HALLS[hallIndex] : null;
  const onSelectRef = useRef(onSelect);
  const onEnterRef = useRef(onEnter);
  const hallIndexRef = useRef(hallIndex);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
  useEffect(() => { hallIndexRef.current = hallIndex; }, [hallIndex]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.dataset.webglReady = "false";
    container.dataset.webglError = "false";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 700 || window.matchMedia("(pointer: coarse)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: lowPower ? "low-power" : "high-performance" });
    } catch (error) {
      console.error("Museum WebGL initialization failed", error);
      container.dataset.webglError = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !lowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "数学美学展连续 WebGL 展馆，可拖动视角并点击展板探索");
    container.appendChild(renderer.domElement);
    container.dataset.quality = lowPower ? "eco" : "standard";
    container.dataset.targetFps = lowPower ? "30" : "60";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070910");
    scene.fog = new THREE.FogExp2("#080a10", .0135);
    const camera = new THREE.PerspectiveCamera(49, container.clientWidth / container.clientHeight, .1, 150);
    camera.position.copy(MUSEUM_CAMERA_STOPS[0].position);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 7.5;
    controls.maxDistance = 20;
    controls.minPolarAngle = .76;
    controls.maxPolarAngle = 1.5;
    controls.minAzimuthAngle = -.68;
    controls.maxAzimuthAngle = .68;
    controls.target.copy(MUSEUM_CAMERA_STOPS[0].target);

    scene.add(new THREE.HemisphereLight("#a7b8d7", "#120f18", .7));
    scene.add(new THREE.AmbientLight("#d9d5e6", .22));
    const keyLight = new THREE.DirectionalLight("#fff1da", 1.45);
    keyLight.position.set(7, 12, 12);
    keyLight.target.position.set(0, 3.5, -28);
    keyLight.castShadow = !lowPower;
    keyLight.shadow.mapSize.set(lowPower ? 512 : 1536, lowPower ? 512 : 1536);
    keyLight.shadow.radius = 5;
    scene.add(keyLight, keyLight.target);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 118), physical("#17171b", { roughness: .74, metalness: .12, clearcoat: .08 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -38;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(42, 118), physical("#090a0f", { roughness: .92 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 9.4, -38);
    scene.add(ceiling);

    const ambientPoints: THREE.Vector3[] = [];
    for (let i = 0; i < (lowPower ? 260 : 760); i++) {
      const z = 8 - i / (lowPower ? 260 : 760) * 102;
      ambientPoints.push(new THREE.Vector3(Math.sin(i * 7.31) * 14, 1.3 + (Math.sin(i * 3.17) + 1) * 3.7, z));
    }
    const ambientParticles = makePointCloud(ambientPoints, "#8fa7ff", lowPower ? .045 : .06, .33);
    scene.add(ambientParticles);

    const atriumBlue = "#5d7fd0";
    const atriumBlueGlow = "#79a0ff";
    const atrium = new THREE.Group();
    addTextRing(atrium, "MATH BEAUTY MUSEUM", 5.45, 8.55, "#f4f2ff", .96, 0, 2.36);
    addTextRing(atrium, "数学美学展", 3.7, 7.65, "#b8c9ff", 1.08, 0, 1.52);
    scene.add(atrium);
    const atriumDepth = addAtriumDepthCorridor(scene, lowPower, atriumBlueGlow, "#ba73d9");

    const entranceGuide = new THREE.Group();
    entranceGuide.position.set(0, .045, 5.9);
    entranceGuide.userData.museumAction = "enter-first-hall";
    const entranceHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 32),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    entranceHitArea.rotation.x = -Math.PI / 2;
    entranceGuide.add(entranceHitArea);
    const entranceArrow = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), makeChevronMaterial("#fff0ca"));
    entranceArrow.rotation.x = -Math.PI / 2;
    entranceArrow.position.y = .065;
    entranceGuide.add(entranceArrow);
    const entranceLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.8, .6), makeTextMaterial("点击进入  ·  ENTER", "#fff0ce", 74));
    entranceLabel.rotation.x = -Math.PI / 2;
    entranceLabel.position.set(0, .07, 1.25);
    entranceGuide.add(entranceLabel);
    entranceGuide.traverse((object) => { object.userData.museumAction = "enter-first-hall"; });
    scene.add(entranceGuide);

    const atriumPortalMaterial = physical(atriumBlue, {
      roughness: .22,
      transmission: lowPower ? .12 : .36,
      transparent: true,
      opacity: lowPower ? .2 : .24,
      thickness: .58,
      ior: 1.38,
      emissive: "#183a82",
      emissiveIntensity: .16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    [-8.8, 8.8].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 8.6, 48, 1, true, -.62, 1.24), atriumPortalMaterial);
      wall.position.set(x, 4.3, 1.2);
      wall.rotation.y = x < 0 ? -.5 : .5;
      scene.add(wall);
    });

    const continuum = new THREE.Group();
    continuum.position.set(0, 3.05, .25);
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.72, .42, lowPower ? 90 : 180, lowPower ? 14 : 28, 2, 3),
      physical("#d8e6ff", { roughness: .15, metalness: .08, transmission: .62, transparent: true, opacity: .86, thickness: .8, emissive: "#667dcc", emissiveIntensity: .35 }),
    );
    knot.scale.setScalar(1.1);
    knot.castShadow = !lowPower;
    continuum.add(knot);

    const displayRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.72, .045, 8, lowPower ? 72 : 128),
      glowMaterial(atriumBlueGlow, .72),
    );
    displayRing.rotation.x = Math.PI / 2;
    displayRing.position.y = -3;
    continuum.add(displayRing);
    const displayRingGlow = new THREE.Mesh(
      new THREE.TorusGeometry(2.72, .14, 8, lowPower ? 72 : 128),
      glowMaterial(atriumBlue, .1),
    );
    displayRingGlow.rotation.x = Math.PI / 2;
    displayRingGlow.position.y = -3.012;
    continuum.add(displayRingGlow);

    const beamSource = new THREE.Vector3(-4.6, 7.2, 3.4);
    const beamTarget = new THREE.Vector3(0, .05, 0);
    const beamAxis = beamSource.clone().sub(beamTarget);
    const beamLength = beamAxis.length();
    const beamRig = new THREE.Group();
    beamRig.position.copy(beamSource).add(beamTarget).multiplyScalar(.5);
    beamRig.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamAxis.clone().normalize());
    const beamMaterial = (opacity: number) => new THREE.MeshBasicMaterial({
      color: atriumBlue,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const outerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(.12, 2.4, beamLength, lowPower ? 20 : 40, 1, true),
      beamMaterial(lowPower ? .022 : .032),
    );
    const innerBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(.06, 1.18, beamLength, lowPower ? 16 : 32, 1, true),
      beamMaterial(lowPower ? .035 : .055),
    );
    beamRig.add(outerBeam, innerBeam);
    const beamDustPoints: THREE.Vector3[] = [];
    const beamDustCount = lowPower ? 28 : 68;
    for (let index = 0; index < beamDustCount; index++) {
      const progress = (index + .5) / beamDustCount;
      const radius = (1 - progress) * 1.9 + .04;
      const angle = index * 2.399963;
      const drift = (Math.sin(index * 17.13) * .5 + .5) * radius;
      beamDustPoints.push(new THREE.Vector3(
        Math.cos(angle) * drift,
        -beamLength / 2 + progress * beamLength,
        Math.sin(angle) * drift,
      ));
    }
    beamRig.add(makePointCloud(beamDustPoints, "#b9caff", lowPower ? .025 : .032, .28));
    continuum.add(beamRig);
    const beamSpot = new THREE.SpotLight(atriumBlueGlow, lowPower ? 28 : 54, 16, Math.PI * .16, .72, 1.35);
    beamSpot.position.copy(beamSource);
    beamSpot.target.position.copy(beamTarget);
    continuum.add(beamSpot, beamSpot.target);
    scene.add(continuum);
    const atriumLight = new THREE.PointLight(atriumBlueGlow, 32, 18, 2);
    atriumLight.position.set(0, 4.4, 1.2);
    scene.add(atriumLight);

    HALL_CENTERS.slice(0, -1).forEach((center, index) => {
      const next = HALL_CENTERS[index + 1];
      const x = (center.x + next.x) / 2;
      const z = (center.z + next.z) / 2;
      addPortal(scene, x, z, HALLS[index + 1].accent);
    });

    let loadedHallIndex = Number.NaN;
    let activeHallScene: HallSceneBundle | null = null;
    const loadOnlyHall = (nextHallIndex: number) => {
      if (nextHallIndex === loadedHallIndex) return;
      if (activeHallScene) {
        scene.remove(activeHallScene.root);
        disposeObject(activeHallScene.root);
        activeHallScene = null;
      }

      loadedHallIndex = nextHallIndex;
      const atriumIsActive = nextHallIndex < 0;
      atrium.visible = atriumIsActive;
      atriumDepth.visible = atriumIsActive;
      continuum.visible = atriumIsActive;
      entranceGuide.visible = atriumIsActive;
      atriumLight.visible = atriumIsActive;

      if (nextHallIndex >= 0 && nextHallIndex < HALLS.length) {
        activeHallScene = buildHallScene(nextHallIndex, lowPower);
        scene.add(activeHallScene.root);
      }
      container.dataset.loadedHall = atriumIsActive ? "atrium" : HALLS[nextHallIndex].key;
      container.dataset.activeHallEffects = activeHallScene ? "1" : "0";
    };
    loadOnlyHall(hallIndexRef.current);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const pointerUp = (event: PointerEvent) => {
      const tapTolerance = event.pointerType === "touch" ? 18 : 7;
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > tapTolerance) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      let object: THREE.Object3D | null = null;
      for (const hit of hits) {
        let candidate: THREE.Object3D | null = hit.object;
        while (candidate && !candidate.userData.itemId && !candidate.userData.museumAction) candidate = candidate.parent;
        if (candidate?.userData.itemId || candidate?.userData.museumAction) { object = candidate; break; }
      }
      if (object?.userData.museumAction === "enter-first-hall") {
        onEnterRef.current();
        return;
      }
      const id = object?.userData.itemId as string | undefined;
      const itemHallIndex = object?.userData.hallIndex as number | undefined;
      if (id && itemHallIndex !== undefined) onSelectRef.current(id, itemHallIndex);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      container.dataset.webglReady = "false";
      container.dataset.webglError = "true";
    };
    const contextRestored = () => { container.dataset.webglReady = "true"; container.dataset.webglError = "false"; };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored);

    let frame = 0;
    let metricsFrame = 0;
    let lastFrameAt = 0;
    const minimumFrameInterval = lowPower ? 1000 / 30 : 0;
    let activeStop = 0;
    let transitionStarted = 0;
    const transitionFromPosition = camera.position.clone();
    const transitionFromTarget = controls.target.clone();
    const clock = new THREE.Clock();
    let isSceneVisible = true;
    const stopObservingVisibility = observeElementVisibility(container, (visible) => { isSceneVisible = visible; });
    const animate = (now = 0) => {
      frame = requestAnimationFrame(animate);
      if (minimumFrameInterval && now - lastFrameAt < minimumFrameInterval) return;
      lastFrameAt = now;
      if (!isSceneVisible || document.hidden || document.body.classList.contains("exhibit-mode")) return;
      const elapsed = clock.getElapsedTime();
      const requestedHallIndex = Math.max(-1, Math.min(HALLS.length - 1, hallIndexRef.current));
      loadOnlyHall(requestedHallIndex);
      const desiredStop = Math.max(0, Math.min(MUSEUM_CAMERA_STOPS.length - 1, hallIndexRef.current + 1));
      controls.minDistance = desiredStop === 0 ? 7.5 : 4.8;
      controls.maxDistance = desiredStop === 0 ? 20 : 11.5;
      if (desiredStop !== activeStop) {
        activeStop = desiredStop;
        transitionStarted = elapsed;
        transitionFromPosition.copy(camera.position);
        transitionFromTarget.copy(controls.target);
        controls.enabled = false;
      }
      const transitionProgress = transitionStarted > 0 ? Math.min(1, (elapsed - transitionStarted) / (reducedMotion ? .05 : 1.65)) : 1;
      if (transitionProgress < 1) {
        const eased = 1 - Math.pow(1 - transitionProgress, 3);
        camera.position.lerpVectors(transitionFromPosition, MUSEUM_CAMERA_STOPS[activeStop].position, eased);
        controls.target.lerpVectors(transitionFromTarget, MUSEUM_CAMERA_STOPS[activeStop].target, eased);
      } else {
        controls.enabled = true;
        controls.update();
      }
      if (!reducedMotion) {
        if (loadedHallIndex < 0) {
          const entrancePulse = 1 + Math.sin(elapsed * 2.1) * .035;
          entranceGuide.scale.set(entrancePulse, 1, entrancePulse);
          entranceArrow.material.opacity = .62 + Math.sin(elapsed * 2.1) * .1;
          knot.rotation.set(elapsed * .13, elapsed * .19, elapsed * .09);
          knot.scale.set(1.1 + Math.sin(elapsed * .55) * .07, 1.1 + Math.sin(elapsed * .72 + 1) * .09, 1.1 + Math.sin(elapsed * .48 + 2) * .07);
        }
        ambientParticles.rotation.y = Math.sin(elapsed * .05) * .035;
        if (activeHallScene) {
          const hologram = activeHallScene.hologram;
          const index = loadedHallIndex;
          const particles = hologram.userData.particles as THREE.Points;
          const rings = hologram.userData.rings as THREE.Mesh[];
          const glass = hologram.userData.glass as THREE.Mesh;
          particles.rotation.y = elapsed * (.12 + index * .025);
          particles.rotation.z = Math.sin(elapsed * .28 + index) * .12;
          rings[0].rotation.y = .76 + Math.sin(elapsed * .32 + index) * .24;
          rings[0].rotation.z = elapsed * .08;
          rings[1].rotation.z = -elapsed * .14;
          const pulse = 1 + Math.sin(elapsed * 1.55 + index * .9) * .018;
          glass.scale.setScalar(pulse);
          (particles.material as THREE.PointsMaterial).opacity = .82 + Math.sin(elapsed * 1.8 + index) * .13;

          if (index === 2) {
            const samples = Number(particles.userData.waveSamples);
            const positions = particles.geometry.getAttribute("position") as THREE.BufferAttribute;
            for (let pointIndex = 0; pointIndex < positions.count; pointIndex++) {
              const wave = Math.floor(pointIndex / samples);
              const sample = pointIndex % samples;
              const x = sample / (samples - 1) * 3.1 - 1.55;
              const band = (wave - 1.5) * .42;
              positions.setY(pointIndex, band + Math.sin(x * (2.2 + wave * 1.15) - elapsed * (1.5 + wave * .18)) * (.34 - wave * .035));
              positions.setZ(pointIndex, (wave - 1.5) * .18 + Math.cos(x * 1.7 - elapsed) * .055);
            }
            positions.needsUpdate = true;
          }
          activeHallScene.portals.forEach((portal, portalIndex) => {
            portal.scale.setScalar(1 + Math.sin(elapsed * .58 + portalIndex * .7) * .008);
          });
        }
      }
      renderer.render(scene, camera);
      metricsFrame++;
      if (metricsFrame % 30 === 0) {
        container.dataset.renderCalls = String(renderer.info.render.calls);
        container.dataset.gpuGeometries = String(renderer.info.memory.geometries);
        container.dataset.gpuTextures = String(renderer.info.memory.textures);
      }
      if (container.dataset.webglReady !== "true") { container.dataset.webglReady = "true"; container.dataset.webglError = "false"; }
    };
    animate();
    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.5));
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const stopObservingResize = observeElementSize(container, resize);
    return () => {
      cancelAnimationFrame(frame);
      stopObservingResize();
      stopObservingVisibility();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      delete container.dataset.webglReady;
      delete container.dataset.webglError;
    };
  }, [retryKey]);

  return <div className="nature-museum-webgl museum-canvas-fade" ref={host}>
    <div className="nature-webgl-fallback" role="status" aria-live="polite">
      <b className="webgl-loading-copy">正在开启 3D 数学展馆</b><span className="webgl-loading-copy">沉浸式空间正在准备</span>
      <b className="webgl-error-copy">3D 展馆暂时没有开启</b><span className="webgl-error-copy">请开启图形加速，或点击下方按钮再次尝试。</span>
      <button className="webgl-retry" type="button" onClick={() => setRetryKey((key) => key + 1)}>重新开启 3D</button>
      <div className="webgl-fallback-actions" aria-label={fallbackHall ? `直接探索${fallbackHall.name}` : "不使用 3D 继续参观"}>
        {fallbackHall ? fallbackHall.items.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item.id, hallIndex)}>
            <span aria-hidden="true">{item.icon}</span>{item.name}
          </button>
        )) : (
          <button type="button" onClick={onEnter}>进入自然数学馆</button>
        )}
      </div>
    </div>
  </div>;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = "rgba(139,166,218,.075)";
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

function drawPreview(
  ctx: CanvasRenderingContext2D,
  item: MuseumItem,
  settings: MuseumSettings,
  width: number,
  height: number,
  signal: SoundSignal,
) {
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
    ctx.strokeStyle = "rgba(235,239,248,.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy - 34, 34, 34);
    ctx.fillStyle = "#e9edf6";
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
    ctx.strokeStyle = "#c8cdd7";
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
    const live = signal.mode !== "idle";
    const frequency = value("waveFrequency") * (1 + (live ? signal.mid * .18 : 0));
    const amplitude = value("waveAmplitude") * (1 + (live ? signal.energy * .72 : 0));
    const phase = THREE.MathUtils.degToRad(value("wavePhase")) + (live ? signal.tick * .0016 * (1 + signal.treble) : 0);
    ctx.strokeStyle = "rgba(210,222,241,.24)";
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
    const sineGradient = ctx.createLinearGradient(90, 0, width - 65, 0);
    sineGradient.addColorStop(0, "#46bad4");
    sineGradient.addColorStop(.5, live ? "#e875b5" : "#7a82dc");
    sineGradient.addColorStop(1, live ? "#f0b854" : "#46bad4");
    ctx.strokeStyle = sineGradient;
    ctx.lineWidth = 7 + (live ? signal.energy * 5 : 0);
    ctx.shadowColor = live ? "#e875b5" : "#61cfe4";
    ctx.shadowBlur = 15 + (live ? signal.energy * 18 : 0);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (item.visual === "harmonics") {
    const count = Math.round(value("harmonicCount"));
    const decay = value("harmonicDecay");
    const base = value("harmonicBase");
    const live = signal.mode !== "idle";
    const animationPhase = live ? signal.tick * .0012 : 0;
    const bands = [signal.bass, signal.mid, signal.treble];
    const colors = ["#61cfe4", "#ed82bd", "#e4b85c", "#8a73d9", "#79c986", "#f08d67"];
    for (let harmonic = 1; harmonic <= count; harmonic++) {
      ctx.beginPath();
      for (let x = 65; x <= width - 65; x += 2) {
        const t = (x - 65) / (width - 130);
        const bandBoost = live ? .72 + bands[(harmonic - 1) % bands.length] * .82 : 1;
        const y = cy + Math.sin(t * Math.PI * 2 * base * harmonic + animationPhase * harmonic) * 72 * bandBoost / Math.pow(harmonic, decay);
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
        const bandBoost = live ? .72 + bands[(harmonic - 1) % bands.length] * .82 : 1;
        sum += Math.sin(t * Math.PI * 2 * base * harmonic + animationPhase * harmonic) * bandBoost / Math.pow(harmonic, decay);
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
    ctx.lineWidth = 7 + (live ? signal.energy * 4 : 0);
    ctx.shadowColor = live ? "rgba(220,117,181,.5)" : "transparent";
    ctx.shadowBlur = live ? 10 + signal.energy * 16 : 0;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (item.visual === "chladni") {
    const m = Math.round(value("chladniM"));
    const n = Math.round(value("chladniN"));
    const live = signal.mode !== "idle";
    const threshold = value("chladniThreshold") * (live ? .82 + signal.energy * 1.15 : 1);
    const phaseX = live ? Math.sin(signal.tick * .0014) * signal.bass * .7 : 0;
    const phaseY = live ? Math.cos(signal.tick * .0011) * signal.treble * .7 : 0;
    const size = Math.min(width * .62, height * .76);
    const left = (width - size) / 2;
    const top = (height - size) / 2;
    const edgeInset = size * .045;
    for (let py = edgeInset; py <= size - edgeInset; py += 5) for (let px = edgeInset; px <= size - edgeInset; px += 5) {
      const x = px / size;
      const y = py / size;
      const mode = Math.sin(m * Math.PI * x + phaseX) * Math.sin(n * Math.PI * y + phaseY)
        - Math.sin(n * Math.PI * x + phaseY) * Math.sin(m * Math.PI * y + phaseX);
      if (Math.abs(mode) < threshold) {
        const hue = 185 + (x + y) * 70 + (live ? signal.mid * 45 : 0);
        ctx.fillStyle = "hsl(" + hue + " 62% 46%)";
        ctx.beginPath();
        ctx.arc(left + px, top + py, 2.2 + (live ? signal.energy * 1.3 : 0), 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
    const spiralScale = value("spiralScale") / .2;
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
      const radius = (22 + 290 * Math.pow(progress, .72)) * spiralScale;
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

function SoundDrivePanel({ signalRef }: { signalRef: SoundSignalRef }) {
  const [mode, setMode] = useState<SoundMode>("idle");
  const [clipId, setClipId] = useState<(typeof SOUND_CLIPS)[number]["id"]>("crystal");
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState("选择音乐片段，或让麦克风捕捉身边的声音");
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const stepTimerRef = useRef<number | null>(null);
  const analysisRafRef = useRef<number | null>(null);

  const stopEngine = useCallback(() => {
    if (stepTimerRef.current !== null) window.clearInterval(stepTimerRef.current);
    if (analysisRafRef.current !== null) window.cancelAnimationFrame(analysisRafRef.current);
    stepTimerRef.current = null;
    analysisRafRef.current = null;
    oscillatorsRef.current.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
    });
    oscillatorsRef.current = [];
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    signalRef.current = { ...EMPTY_SOUND_SIGNAL };
    setLevel(0);
  }, [signalRef]);

  const startAnalysis = useCallback((analyser: AnalyserNode, sourceMode: Exclude<SoundMode, "idle">) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const average = (from: number, to: number) => {
      let sum = 0;
      const end = Math.max(from + 1, Math.min(data.length, to));
      for (let i = from; i < end; i++) sum += data[i];
      return sum / Math.max(1, end - from) / 255;
    };
    const sample = () => {
      analyser.getByteFrequencyData(data);
      const bass = average(0, Math.floor(data.length * .13));
      const mid = average(Math.floor(data.length * .13), Math.floor(data.length * .46));
      const treble = average(Math.floor(data.length * .46), data.length);
      const energy = Math.min(1, bass * .42 + mid * .38 + treble * .32);
      signalRef.current = { mode: sourceMode, energy, bass, mid, treble, tick: performance.now() };
      if (frame++ % 4 === 0) setLevel(energy);
      analysisRafRef.current = window.requestAnimationFrame(sample);
    };
    sample();
  }, [signalRef]);

  const startMusic = useCallback(async (nextClipId: (typeof SOUND_CLIPS)[number]["id"]) => {
    stopEngine();
    const clip = SOUND_CLIPS.find((entry) => entry.id === nextClipId) ?? SOUND_CLIPS[0];
    try {
      const context = createCompatibleAudioContext();
      contextRef.current = context;
      await resumeAudioContext(context);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .82;
      const master = context.createGain();
      master.gain.value = .32;
      analyser.connect(master);
      master.connect(context.destination);

      const voices = clip.ratios.map((ratio, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? clip.waveform : "sine";
        oscillator.frequency.value = clip.notes[0] * ratio;
        gain.gain.value = .13 / (index + 1);
        oscillator.connect(gain);
        gain.connect(analyser);
        oscillator.start();
        return oscillator;
      });
      oscillatorsRef.current = voices;
      let step = 0;
      const advance = () => {
        const now = context.currentTime;
        const note = clip.notes[step % clip.notes.length];
        voices.forEach((oscillator, index) => {
          oscillator.frequency.cancelScheduledValues(now);
          oscillator.frequency.setTargetAtTime(note * clip.ratios[index], now, .045 + index * .02);
        });
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(.36, now);
        master.gain.exponentialRampToValueAtTime(.19, now + Math.min(.5, clip.tempo / 1000 * .86));
        step += 1;
      };
      advance();
      stepTimerRef.current = window.setInterval(advance, clip.tempo);
      setClipId(clip.id);
      setMode("music");
      setStatus("正在播放「" + clip.name + "」· 曲线随频谱实时变化");
      startAnalysis(analyser, "music");
    } catch {
      stopEngine();
      setMode("idle");
      setStatus("浏览器暂时无法播放声音，请检查声音权限");
    }
  }, [startAnalysis, stopEngine]);

  const startMicrophone = useCallback(async () => {
    stopEngine();
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("当前浏览器不支持麦克风输入");
      return;
    }
    setStatus("正在请求麦克风权限…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const context = createCompatibleAudioContext();
      contextRef.current = context;
      await resumeAudioContext(context);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .72;
      context.createMediaStreamSource(stream).connect(analyser);
      setMode("microphone");
      setStatus("麦克风已连接 · 试着说话、拍手或播放声音");
      startAnalysis(analyser, "microphone");
    } catch {
      stopEngine();
      setMode("idle");
      setStatus("未能使用麦克风，请允许权限后再试");
    }
  }, [startAnalysis, stopEngine]);

  const pause = () => {
    stopEngine();
    setMode("idle");
    setStatus("声音已暂停，可选择另一段音乐或麦克风");
  };

  useEffect(() => () => stopEngine(), [stopEngine]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return;
      stopEngine();
      setMode("idle");
      setStatus("页面进入后台，声音已自动暂停");
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, [stopEngine]);

  return (
    <section className="sound-drive-panel" aria-label="声音实时驱动">
      <div className="sound-drive-heading">
        <span><i aria-hidden="true" />声音实时驱动</span>
        <b>{mode === "music" ? "MUSIC" : mode === "microphone" ? "MIC LIVE" : "READY"}</b>
      </div>
      <div className="sound-input-row">
        <label className="sound-clip-select">
          <span>音乐片段</span>
          <select
            aria-label="选择声音片段"
            value={clipId}
            onChange={(event) => {
              const nextClipId = event.target.value as (typeof SOUND_CLIPS)[number]["id"];
              setClipId(nextClipId);
              if (mode === "music") void startMusic(nextClipId);
            }}
          >
            {SOUND_CLIPS.map((clip) => <option key={clip.id} value={clip.id}>{clip.name} · {clip.detail}</option>)}
          </select>
        </label>
        <div className="sound-source-actions">
          <button className={mode === "music" ? "active" : ""} type="button" onClick={() => mode === "music" ? pause() : void startMusic(clipId)}>
            {mode === "music" ? "暂停" : "播放音乐"}
          </button>
          <button className={mode === "microphone" ? "active" : ""} type="button" onClick={() => mode === "microphone" ? pause() : void startMicrophone()}>
            {mode === "microphone" ? "停止" : "麦克风驱动"}
          </button>
        </div>
      </div>
      <div className="sound-level-row">
        <span>输入强度</span><div className="sound-level-track"><i style={{ width: Math.max(3, level * 100) + "%" }} /></div>
      </div>
      <div className="sound-status-row"><p className="sound-drive-status">{status}</p><small className="sound-privacy-note">本机分析 · 不录音、不上传</small></div>
    </section>
  );
}

function makeGalaxyGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, "rgba(255,252,225,1)");
  glow.addColorStop(.12, "rgba(255,218,166,.96)");
  glow.addColorStop(.38, "rgba(225,135,207,.58)");
  glow.addColorStop(1, "rgba(93,105,205,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Galaxy3DPreview({ settings }: { settings: MuseumSettings }) {
  const host = useRef<HTMLDivElement>(null);
  const [retryKey, setRetryKey] = useState(0);
  const rebuildRef = useRef<(next: MuseumSettings) => void>(() => undefined);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    rebuildRef.current(settings);
  }, [settings]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.dataset.webglReady = "false";
    container.dataset.webglError = "false";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 700 || window.matchMedia("(pointer: coarse)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: lowPower ? "low-power" : "high-performance" });
    } catch (error) {
      console.error("Galaxy WebGL initialization failed", error);
      container.dataset.webglError = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "可拖动旋转与缩放的三维螺旋星系");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#01040b");
    scene.fog = new THREE.FogExp2("#020612", .052);
    const camera = new THREE.PerspectiveCamera(48, Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight), .05, 60);
    camera.position.set(0, 4.7, 7.8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 13;
    controls.minPolarAngle = .08;
    controls.maxPolarAngle = Math.PI - .08;
    controls.target.set(0, 0, 0);

    const galaxy = new THREE.Group();
    galaxy.rotation.x = -.12;
    scene.add(galaxy);
    const glowTexture = makeGalaxyGlowTexture();
    const coreMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: "#fff4d1", transparent: true, opacity: .92, depthWrite: false, blending: THREE.AdditiveBlending });
    const core = new THREE.Sprite(coreMaterial);
    core.scale.set(3.1, 3.1, 1);
    galaxy.add(core);
    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(.2, 28, 20),
      new THREE.MeshBasicMaterial({ color: "#fff7cf", transparent: true, opacity: .92, toneMapped: false }),
    );
    galaxy.add(innerCore);

    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ size: .052, vertexColors: true, transparent: true, opacity: .96, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const stars = new THREE.Points(starGeometry, starMaterial);
    galaxy.add(stars);
    const dustGeometry = new THREE.BufferGeometry();
    const dustMaterial = new THREE.PointsMaterial({ size: .025, vertexColors: true, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    galaxy.add(dust);

    const colorA = new THREE.Color("#ffafd8");
    const colorB = new THREE.Color("#80d6ff");
    const colorC = new THREE.Color("#ffe6a0");
    const tempColor = new THREE.Color();
    const deterministic = (seed: number) => {
      const value = Math.sin(seed * 91.739 + 17.31) * 43758.5453;
      return value - Math.floor(value);
    };

    const rebuild = (next: MuseumSettings) => {
      const spiralScale = (next.spiralScale ?? DEFAULT_SETTINGS.spiralScale) / .2;
      const arms = Math.round(next.spiralArms ?? DEFAULT_SETTINGS.spiralArms);
      const curvature = next.spiralCurvature ?? DEFAULT_SETTINGS.spiralCurvature;
      const requestedStars = Math.round(next.spiralStars ?? DEFAULT_SETTINGS.spiralStars);
      const count = requestedStars * (lowPower ? 3 : 7);
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const arm = i % arms;
        const progress = i / Math.max(1, count - 1);
        const radius = (.08 + Math.pow(progress, .62) * 4.25) * spiralScale;
        const angleNoise = (deterministic(i + 2) - .5) * (.3 + progress * .42);
        const angle = arm / arms * Math.PI * 2 + progress * Math.PI * (3.7 + curvature * 11) + angleNoise;
        const radialNoise = (deterministic(i + 4) - .5) * (.2 + progress * .82);
        const actualRadius = Math.max(.03, radius + radialNoise);
        const thickness = (deterministic(i + 8) - .5) * (.58 - progress * .42);
        positions[i * 3] = Math.cos(angle) * actualRadius;
        positions[i * 3 + 1] = thickness + Math.sin(angle * .45) * .045;
        positions[i * 3 + 2] = Math.sin(angle) * actualRadius;
        const palette = i % 3 === 0 ? colorA : i % 3 === 1 ? colorB : colorC;
        tempColor.copy(palette).lerp(colorC, Math.max(0, .34 - progress) * 1.8).multiplyScalar(.62 + deterministic(i + 12) * .52);
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }
      starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      starGeometry.computeBoundingSphere();

      const dustCount = lowPower ? 850 : 2200;
      const dustPositions = new Float32Array(dustCount * 3);
      const dustColors = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const radius = Math.pow(deterministic(i + 31), .58) * 4.7;
        const angle = deterministic(i + 43) * Math.PI * 2;
        dustPositions[i * 3] = Math.cos(angle) * radius;
        dustPositions[i * 3 + 1] = (deterministic(i + 51) - .5) * (.85 - radius * .11);
        dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
        tempColor.copy(i % 2 ? colorA : colorB).multiplyScalar(.3 + deterministic(i + 61) * .35);
        dustColors[i * 3] = tempColor.r;
        dustColors[i * 3 + 1] = tempColor.g;
        dustColors[i * 3 + 2] = tempColor.b;
      }
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
      dustGeometry.computeBoundingSphere();
    };
    rebuildRef.current = rebuild;
    rebuild(settingsRef.current);

    const contextLost = (event: Event) => {
      event.preventDefault();
      container.dataset.webglReady = "false";
      container.dataset.webglError = "true";
    };
    const contextRestored = () => {
      container.dataset.webglReady = "true";
      container.dataset.webglError = "false";
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored);

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      const elapsed = clock.getElapsedTime();
      if (!reducedMotion) galaxy.rotation.y = elapsed * .035;
      coreMaterial.opacity = .84 + Math.sin(elapsed * 1.1) * .08;
      controls.update();
      renderer.render(scene, camera);
      if (container.dataset.webglReady !== "true") { container.dataset.webglReady = "true"; container.dataset.webglError = "false"; }
    };
    animate();
    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const stopObservingResize = observeElementSize(container, resize);
    return () => {
      cancelAnimationFrame(frame);
      stopObservingResize();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
      controls.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      innerCore.geometry.dispose();
      (innerCore.material as THREE.Material).dispose();
      glowTexture.dispose();
      coreMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      rebuildRef.current = () => undefined;
      delete container.dataset.webglReady;
      delete container.dataset.webglError;
    };
  }, [retryKey]);

  return <div className="galaxy-3d-preview" ref={host}>
    <div className="webgl-recovery" role="status" aria-live="polite"><b>三维星系暂时没有开启</b><span>请开启图形加速后再次尝试。</span><button className="webgl-retry" type="button" onClick={() => setRetryKey((key) => key + 1)}>重新开启 3D</button></div>
    <span>拖动旋转 · 滚轮或双指缩放</span>
  </div>;
}

function MuseumPreview({ item, settings, signalRef }: { item: MuseumItem; settings: MuseumSettings; signalRef: SoundSignalRef }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isSoundVisual = item.visual === "sine" || item.visual === "harmonics" || item.visual === "chladni";
    let raf = 0;
    let cssWidth = 1000;
    let cssHeight = 680;
    let pixelRatio = 1;
    const render = () => {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.fillStyle = "#01040b";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      const logicalWidth = 1000;
      const logicalHeight = 680;
      const scale = Math.min(cssWidth / logicalWidth, cssHeight / logicalHeight);
      const offsetX = (cssWidth - logicalWidth * scale) / 2;
      const offsetY = (cssHeight - logicalHeight * scale) / 2;
      ctx.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelRatio * offsetX, pixelRatio * offsetY);
      const background = ctx.createLinearGradient(0, 0, 0, logicalHeight);
      background.addColorStop(0, "#07101f");
      background.addColorStop(.55, "#030915");
      background.addColorStop(1, "#01040b");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      drawGrid(ctx, logicalWidth, logicalHeight);
      drawPreview(ctx, item, settings, logicalWidth, logicalHeight, signalRef.current);
      ctx.fillStyle = "rgba(228,233,244,.72)";
      ctx.font = "600 18px Arial, sans-serif";
      ctx.fillText(item.previewCaption, 44, logicalHeight - 34);
      if (isSoundVisual) raf = window.requestAnimationFrame(render);
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      cssWidth = Math.max(320, bounds.width || 1000);
      cssHeight = Math.max(260, bounds.height || 680);
      const mobileCanvas = window.innerWidth < 700 || window.matchMedia("(pointer: coarse)").matches;
      pixelRatio = Math.min(window.devicePixelRatio || 1, mobileCanvas ? 1.5 : 2.5);
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      window.cancelAnimationFrame(raf);
      render();
    };
    const stopObservingResize = observeElementSize(canvas, resize);
    return () => {
      stopObservingResize();
      window.cancelAnimationFrame(raf);
    };
  }, [item, settings, signalRef]);
  return <canvas ref={canvasRef} aria-label={item.name + "参数图形预览"} />;
}

export function NatureMuseumWorld() {
  const [hallIndex, setHallIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MuseumSettings>({ ...DEFAULT_SETTINGS });
  const [discoveries, setDiscoveries] = useState<Set<string>>(() => new Set());
  const [activeControlKey, setActiveControlKey] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [transition, setTransition] = useState<"idle" | "leaving" | "entering">("idle");
  const [transitionDirection, setTransitionDirection] = useState<"previous" | "next">("next");
  const transitionTimers = useRef<number[]>([]);
  const wheelAccumulator = useRef(0);
  const wheelCooldownUntil = useRef(0);
  const galleryRef = useRef<HTMLElement>(null);
  const soundSignalRef = useRef<SoundSignal>({ ...EMPTY_SOUND_SIGNAL });
  const hall = hallIndex >= 0 ? HALLS[hallIndex] : null;
  const selected = useMemo(() => hall?.items.find((item) => item.id === selectedId) ?? null, [hall, selectedId]);
  const currentDiscoveries = hall?.items.filter((item) => discoveries.has(item.id)).length ?? 0;

  const select = useCallback((id: string, targetHallIndex: number) => {
    const item = HALLS[targetHallIndex]?.items.find((candidate) => candidate.id === id);
    setHallIndex(targetHallIndex);
    setSelectedId(id);
    setIsAutoPlaying(false);
    setActiveControlKey(item?.controls[0]?.key ?? null);
    setDiscoveries((previous) => new Set(previous).add(id));
  }, []);

  const switchHall = useCallback((direction: number) => {
    document.body.classList.remove("site-nav-visible", "exhibit-nav-visible");
    if (transition !== "idle") return;
    if (direction < 0 && hallIndex <= -1) return;
    if (direction > 0 && hallIndex >= HALLS.length - 1) return;
    setSelectedId(null);
    setIsAutoPlaying(false);
    setTransitionDirection(direction < 0 ? "previous" : "next");
    setTransition("leaving");
    const swapTimer = window.setTimeout(() => {
      setHallIndex((previous) => Math.max(-1, Math.min(HALLS.length - 1, previous + direction)));
      setTransition("entering");
      const enterTimer = window.setTimeout(() => setTransition("idle"), 520);
      transitionTimers.current.push(enterTimer);
    }, 180);
    transitionTimers.current.push(swapTimer);
  }, [hallIndex, transition]);

  const handleHallWheel = useCallback((event: WheelEvent) => {
    if (selectedId) return;
    event.preventDefault();
    event.stopPropagation();
    document.body.classList.remove("site-nav-visible", "exhibit-nav-visible");
    if (transition !== "idle") return;
    const now = performance.now();
    if (now < wheelCooldownUntil.current) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = Math.max(-120, Math.min(120, event.deltaY * unit));
    if (!delta) return;
    if (Math.sign(delta) !== Math.sign(wheelAccumulator.current)) wheelAccumulator.current = 0;
    wheelAccumulator.current += delta;
    if (Math.abs(wheelAccumulator.current) < 48) return;
    const direction = wheelAccumulator.current > 0 ? -1 : 1;
    wheelAccumulator.current = 0;
    wheelCooldownUntil.current = now + 900;
    switchHall(direction);
  }, [selectedId, switchHall, transition]);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const handleMuseumWheel = (event: WheelEvent) => {
      const bounds = gallery.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      handleHallWheel(event);
    };
    window.addEventListener("wheel", handleMuseumWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleMuseumWheel);
  }, [handleHallWheel]);

  useEffect(() => {
    const body = document.body;
    if (transition === "idle") {
      body.classList.remove("museum-navigation-busy");
      return;
    }
    body.classList.add("museum-navigation-busy");
    body.classList.remove("site-nav-visible", "exhibit-nav-visible");
  }, [transition]);

  const resetSelected = () => {
    if (!selected) return;
    setIsAutoPlaying(false);
    setActiveControlKey(selected.controls[0]?.key ?? null);
    setSettings((previous) => {
      const next = { ...previous };
      selected.controls.forEach((control) => { next[control.key] = control.defaultValue; });
      return next;
    });
  };

  useEffect(() => {
    if (!selected || !isAutoPlaying) return;
    const keys = AUTO_CONTROL_KEYS[selected.id] ?? selected.controls.slice(0, 1).map((control) => control.key);
    const controls = keys.map((key) => selected.controls.find((control) => control.key === key)).filter((control): control is MuseumControl => Boolean(control));
    if (!controls.length) return;
    let frame = 0;
    let lastUpdate = 0;
    const startedAt = performance.now();
    const animateControls = (now: number) => {
      if (now - lastUpdate > 84) {
        lastUpdate = now;
        const elapsed = now - startedAt;
        setSettings((previous) => {
          const next = { ...previous };
          controls.forEach((control, index) => {
            const duration = 5200 + index * 1150;
            const phase = elapsed / duration * Math.PI * 2 + index * Math.PI * .58;
            const normalized = (Math.sin(phase) + 1) / 2;
            next[control.key] = snapControlValue(control, control.min + (control.max - control.min) * normalized);
          });
          return next;
        });
      }
      frame = window.requestAnimationFrame(animateControls);
    };
    frame = window.requestAnimationFrame(animateControls);
    return () => window.cancelAnimationFrame(frame);
  }, [isAutoPlaying, selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setIsAutoPlaying(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const scrollPosition = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const previousBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const previousRoot = {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    };
    const updateGlobalNavigation = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.clientY <= 12) body.classList.add("exhibit-nav-visible");
      else if (event.clientY > 92) body.classList.remove("exhibit-nav-visible");
    };
    body.classList.add("exhibit-mode");
    body.classList.remove("exhibit-nav-visible", "site-nav-visible");
    window.addEventListener("pointermove", updateGlobalNavigation, { passive: true });
    body.style.position = "fixed";
    body.style.top = `-${scrollPosition}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      window.removeEventListener("pointermove", updateGlobalNavigation);
      body.classList.remove("exhibit-mode", "exhibit-nav-visible");
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.left = previousBody.left;
      body.style.right = previousBody.right;
      body.style.width = previousBody.width;
      body.style.overflow = previousBody.overflow;
      root.style.overflow = previousRoot.overflow;
      root.style.overscrollBehavior = previousRoot.overscrollBehavior;
      window.scrollTo(0, scrollPosition);
    };
  }, [selectedId]);

  useEffect(() => () => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimers.current = [];
    document.body.classList.remove("museum-navigation-busy");
  }, []);

  return (
    <section
      ref={galleryRef}
      className={"nature-museum nature-museum-gallery hall-transition-" + transition + " hall-direction-" + transitionDirection}
      id="hall"
      aria-label={(hall?.name ?? "数学美学展序厅") + " WebGL 展厅"}
      data-hall={hall?.key ?? "atrium"}
      style={{ "--hall-accent": hall?.accent ?? "#9fb4ff" } as React.CSSProperties}
    >
      <MuseumCanvas hallIndex={hallIndex} onSelect={select} onEnter={() => switchHall(1)} />
      <div className="nature-museum-shade" aria-hidden="true" />
      <div className="nature-progress" aria-label={hall ? "已经发现 " + currentDiscoveries + " 个" + hall.category : "数学美学展序厅"}>
        <span>{hall ? currentDiscoveries : "00"}{hall && <small>/ 3</small>}</span>
        <p>{hall?.category ?? "参观序章"}<br /><b>{hall ? currentDiscoveries === 3 ? "全部发现" : "等待探索" : "连续体正在变化"}</b></p>
      </div>

      <div className="museum-route-indicator" aria-label="展馆参观进度">
        {["序", "自然", "建筑", "声音", "宇宙"].map((label, index) => <i key={label} className={hallIndex + 1 === index ? "active" : hallIndex + 1 > index ? "passed" : ""}><span>{label}</span></i>)}
      </div>

      <div className="museum-hall-arrows" aria-label="切换数学展厅">
        <button className="hall-arrow-previous" disabled={transition !== "idle" || hallIndex <= -1} onClick={() => switchHall(-1)} aria-label={hallIndex === 0 ? "返回数学美学展序厅" : hallIndex > 0 ? "上一个展厅：" + HALLS[hallIndex - 1].name : "已经位于序厅"}>←</button>
        <button className="hall-arrow-next" disabled={transition !== "idle" || hallIndex >= HALLS.length - 1} onClick={() => switchHall(1)} aria-label={hallIndex < HALLS.length - 1 ? "下一个展厅：" + HALLS[hallIndex + 1].name : "已经位于最后一个展厅"}>→</button>
      </div>

      {hall && (
        <nav className="museum-keyboard-exhibits" aria-label={`键盘访问${hall.name}展板`}>
          <span>展板快捷导航</span>
          {hall.items.map((item) => (
            <button key={item.id} type="button" onClick={() => select(item.id, hallIndex)}>
              <i aria-hidden="true">{item.icon}</i>{item.name}
            </button>
          ))}
        </nav>
      )}

      {selected && hall && (
        <div
          className="nature-lab-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name + "互动实验"}
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <div className={"nature-lab-shell " + (hall.key === "sound" ? "sound-lab-shell" : "")} style={{ "--nature-color": selected.color } as React.CSSProperties}>
            <button className="nature-lab-close" onClick={() => { setSelectedId(null); setIsAutoPlaying(false); }} aria-label="关闭并返回当前展馆">×</button>
            <header className="immersive-lab-header">
              <span className="nature-lab-index">{hall.english} / DISCOVERY {selected.index}</span>
              <div className="nature-lab-heading"><i>{selected.icon}</i><div><h3>{selected.name}</h3><p>{selected.english}</p></div></div>
              <div className="nature-lab-formula">
                <div className="nature-formula-expression"><span>隐藏规律</span><strong>{selected.formula}</strong></div>
                <div className="nature-lab-live-vars" aria-live="polite" aria-label="公式实时变量">
                  {selected.controls.map((control) => {
                    const value = settings[control.key] ?? control.defaultValue;
                    const autoActive = isAutoPlaying && (AUTO_CONTROL_KEYS[selected.id] ?? []).includes(control.key);
                    return <span key={control.key} className={activeControlKey === control.key || autoActive ? "active" : ""}><i>{control.symbol}</i><b>=</b>{controlDisplayValue(control, value)}</span>;
                  })}
                </div>
              </div>
            </header>
            <div className="nature-lab-preview">
              <div className="nature-preview-header"><span>REAL-TIME VISUALIZATION</span><b>参数实时预览</b></div>
              {selected.id === "galaxy"
                ? <Galaxy3DPreview settings={settings} />
                : <MuseumPreview item={selected} settings={settings} signalRef={soundSignalRef} />}
              <div className="nature-preview-caption"><span>{selected.formula}</span><p>{selected.previewCaption}。图形会随底部控制台实时变化。</p></div>
            </div>
            <aside className={"nature-lab-controls " + (hall.key === "sound" ? "sound-console" : "")}>
              <div className="nature-console-story">
                <p className="nature-lab-discovery">{selected.discovery}</p>
                <p className="nature-lab-copy">{selected.explanation}</p>
                <div className="nature-lab-reward"><span>🌱 数学种子 +1</span><b>发现已收藏 ✓</b></div>
              </div>
              {hall.key === "sound" && <SoundDrivePanel signalRef={soundSignalRef} />}
              <div className="nature-console-parameters">
                <div className="nature-lab-try">
                  <span>控制台 · 变量与图形同步变化</span>
                  <div className="nature-console-actions">
                    <button className={isAutoPlaying ? "active" : ""} type="button" aria-pressed={isAutoPlaying} onClick={() => setIsAutoPlaying((playing) => !playing)}>{isAutoPlaying ? "暂停动画" : "自动演示"}</button>
                    <button type="button" onClick={resetSelected}>恢复默认</button>
                  </div>
                </div>
                <div className={"nature-console-grid " + (selected.controls.length > 3 ? "four-controls" : "")}>
                  {selected.controls.map((control) => {
                    const setting = settings[control.key] ?? control.defaultValue;
                    const reached = control.target !== undefined && Math.abs(setting - control.target) < control.step / 2 + .001;
                    const autoActive = isAutoPlaying && (AUTO_CONTROL_KEYS[selected.id] ?? []).includes(control.key);
                    return (
                      <label className={"nature-lab-control " + (activeControlKey === control.key || autoActive ? "active" : "")} key={control.key}>
                        <span><span className="nature-control-name"><em>{control.symbol}</em>{control.label}</span><b>{control.symbol} = {controlDisplayValue(control, setting)}</b></span>
                        <input
                          aria-label={control.symbol + "，" + control.label}
                          type="range"
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          value={setting}
                          onPointerDown={() => { setIsAutoPlaying(false); setActiveControlKey(control.key); }}
                          onFocus={() => setActiveControlKey(control.key)}
                          onChange={(event) => {
                            setIsAutoPlaying(false);
                            setActiveControlKey(control.key);
                            setSettings((previous) => ({ ...previous, [control.key]: Number(event.target.value) }));
                          }}
                        />
                        {control.target !== undefined && <small className={reached ? "reached" : ""}>{control.targetLabel} {control.target}{control.suffix} {reached ? "· 已对准" : "· 试着对准它"}</small>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
