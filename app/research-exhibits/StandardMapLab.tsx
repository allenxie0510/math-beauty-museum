"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { observeElementSize } from "../viewport";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { standardMapResearch } from "./catalog";
import { mapOrbit, mod1, seededStarts, torusDistance, type MapPoint } from "./standard-map";

const DEFAULT = { k: .15, x: .17, y: .31, steps: 1200, seed: 7 };

function PhasePlot({ orbits, first, second, onSelect }: { orbits: MapPoint[][]; first: MapPoint[]; second: MapPoint[]; onSelect: (x: number, y: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    return observeElementSize(canvas, () => {
      const size = Math.max(240, canvas.getBoundingClientRect().width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "#080f1c"; context.fillRect(0, 0, size, size);
      context.strokeStyle = "#ffffff10"; context.lineWidth = 1;
      for (let i = 1; i < 10; i++) { context.beginPath(); context.moveTo(i * size / 10, 0); context.lineTo(i * size / 10, size); context.moveTo(0, i * size / 10); context.lineTo(size, i * size / 10); context.stroke(); }
      const points = (orbit: MapPoint[], color: string, radius: number) => {
        context.fillStyle = color;
        // Points, not connected segments: crossings of a periodic boundary cannot make false long lines.
        for (const [x, y] of orbit) context.fillRect(x * size, (1 - y) * size, radius, radius);
      };
      orbits.forEach((orbit, i) => points(orbit, `hsla(${205 + i * 11},65%,70%,.42)`, 1.25));
      points(first, "#f4bd85", 2); points(second, "#8bd4c4", 1.5);
      context.strokeStyle = "#fff"; context.lineWidth = 1.5; context.beginPath(); context.arc(first[0][0] * size, (1 - first[0][1]) * size, 6, 0, 2 * Math.PI); context.stroke();
    });
  }, [orbits, first, second]);
  return <button className="research-map-picker" aria-label="点击相图选择起点，也可使用下方起点滑杆" onClick={(event) => {
    if (event.detail === 0) return; // Keyboard users have the equivalent x/y sliders.
    const rect = event.currentTarget.getBoundingClientRect();
    onSelect(mod1((event.clientX - rect.left) / rect.width), mod1(1 - (event.clientY - rect.top) / rect.height));
  }}><canvas ref={ref} role="img" aria-label="标准映射单位环面相图，橙色与绿色为相邻起点的轨迹，圆圈标记起点" /></button>;
}

export default function StandardMapLab({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState(DEFAULT);
  const { k, x, y, steps, seed } = settings;
  const orbits = useMemo(() => seededStarts(seed).map((start) => mapOrbit(start, k, steps)), [seed, k, steps]);
  const first = useMemo(() => mapOrbit([x, y], k, steps), [x, y, k, steps]);
  const second = useMemo(() => mapOrbit([mod1(x + 1e-6), y], k, steps), [x, y, k, steps]);
  const distances = useMemo(() => first.map((point, index) => torusDistance(point, second[index])), [first, second]);
  const update = (key: keyof typeof DEFAULT, value: number) => setSettings((previous) => ({ ...previous, [key]: value }));
  const distancePath = distances.map((value, i) => `${i ? "L" : "M"}${i / steps * 600},${110 - value / Math.SQRT1_2 * 100}`).join(" ");
  return <ResearchLab title="标准映射混沌" subtitle="几乎相同的起点，会走向怎样不同的轨迹？" backLabel="返回轨道之舞" onBack={onBack} research={standardMapResearch} controls={<>
    <div className="lattice-console-heading"><span>每一步都保持面积</span><b>单位环面 · 相对边连接</b></div>
    <div className="research-presets">{[{ k: 0, name: "无扰动" }, { k: .15, name: "弱扰动" }, { k: .9, name: "强扰动" }].map((preset) => <button key={preset.k} aria-pressed={k === preset.k} onClick={() => update("k", preset.k)}>{preset.name}</button>)}</div>
    <ResearchRange item="standard-map" label="扰动强度 k" value={k} min={0} max={3} step={.01} display={k.toFixed(2)} onChange={(value) => update("k", value)} hint="不同参数可能同时出现规则区域与复杂区域；预设不是理论阈值。" />
    <ResearchRange item="standard-map" label="起点 x" value={x} min={0} max={.99} step={.01} display={x.toFixed(2)} onChange={(value) => update("x", value)} />
    <ResearchRange item="standard-map" label="起点 y" value={y} min={0} max={.99} step={.01} display={y.toFixed(2)} onChange={(value) => update("y", value)} />
    <ResearchRange item="standard-map" label="迭代步数" value={steps} min={200} max={2400} step={200} onChange={(value) => update("steps", value)} />
    <ResearchRange item="standard-map" label="背景起点种子" value={seed} min={1} max={9} step={1} onChange={(value) => update("seed", value)} hint="同一组参数和种子会生成同一张相图。" />
    <button className="lattice-reset" onClick={() => setSettings(DEFAULT)}>恢复默认</button>
    <div className="lattice-formula"><span>经典模型 · 每步按此顺序更新</span><p role="math">y′ = (y + k sin(2πx)) mod 1<br />x′ = (x + y′) mod 1</p><small>使用新 y′ 更新 x。这里采用单位环面的 k；常见角度制参数 K=2πk。</small></div>
    <details className="lattice-details"><summary>数值范围与限制</summary><p>背景12条轨迹，加上两条相邻起点轨迹，每条最多2400步。显示离散迭代点，不跨边界连线。</p><p>绿色起点仅在 x 方向比橙色相差10⁻⁶。下方曲线显示环面上的最短距离，不是熵或 Lyapunov 指数。有限精度迭代不能判定无限时间的动力学性质。</p></details>
  </>}>
    <figure className="research-stage"><PhasePlot orbits={orbits} first={first} second={second} onSelect={(nextX, nextY) => setSettings((previous) => ({ ...previous, x: Math.min(.99, Math.round(nextX * 100) / 100), y: Math.min(.99, Math.round(nextY * 100) / 100) }))} /><figcaption>x 向右、y 向上，范围均为 [0,1)。左右相接、上下相接。橙色：原起点；绿色：相差10⁻⁶的起点。点击图面可选起点。</figcaption></figure>
    <div className="research-stat-row" aria-live="polite"><span>当前迭代 <b>{steps} 步</b></span><span>末步双轨迹距离 <b>{distances[steps].toExponential(3)}</b></span></div>
    <svg className="research-chart" viewBox="0 0 600 130" role="img" aria-label="双起点轨迹的环面距离随迭代步数变化"><path d={distancePath} stroke="#f4bd85" strokeWidth="1.3" fill="none" /><text x="0" y="128" fill="#aab5c5" fontSize="11">0 步</text><text x="510" y="128" fill="#aab5c5" fontSize="11">{steps} 步</text><text x="0" y="10" fill="#aab5c5" fontSize="11">距离上限 √½</text></svg>
    <p className="research-note">观察轨迹怎样分离，也留意仍然规则的区域。眼前的复杂图案只是理解正测度熵问题的入口。</p>
  </ResearchLab>;
}
