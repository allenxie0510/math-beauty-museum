"use client";

import { useMemo, useState } from "react";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { mahlerResearch } from "./catalog";
import { mahlerPair, type Point2 } from "./mahler-polar";

function PolarPlot({ points, polar }: { points: Point2[]; polar?: boolean }) {
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${(x * 80).toFixed(3)},${(-y * 80).toFixed(3)}`).join(" ") + "Z";
  const color = polar ? "#8bd4c4" : "#f4bd85";
  return <svg viewBox="-176 -176 352 352" role="img" aria-label={polar ? "极对偶 K°，与原形同一尺度" : "原形 K，与极对偶同一尺度"}><path d="M-160 0H160 M0 -160V160" stroke="#ffffff20" />{[-1, 1].map((v) => <path key={v} d={`M${v * 80} -4v8 M-4 ${v * 80}h8`} stroke="#aab5c5" />)}<path d={path} fill={color} fillOpacity=".14" stroke={color} strokeWidth="2" /><circle r="3" fill="#fff" /><text x="86" y="15" fill="#aab5c5" fontSize="11">1</text></svg>;
}

export default function MahlerPolarLab({ onBack }: { onBack: () => void }) {
  const [p, setP] = useState(2), [shear, setShear] = useState(0);
  const pair = useMemo(() => mahlerPair(p, shear), [p, shear]);
  return <ResearchLab title="Mahler 凸体对偶" subtitle="改变一个形状，它的对偶会怎样回应？" backLabel="返回互动工坊" onBack={onBack} research={mahlerResearch} controls={<>
    <div className="lattice-console-heading"><span>形状与对偶，一起变化</span><b>二维 · 关于原点对称</b></div>
    <div className="research-presets">{[{ p: 1, name: "菱形" }, { p: 2, name: "圆" }, { p: 8, name: "圆角方形" }].map((preset) => <button key={preset.p} aria-pressed={p === preset.p} onClick={() => setP(preset.p)}>{preset.name}</button>)}</div>
    <ResearchRange item="mahler" label="形状指数 p" value={p} min={1} max={8} step={.05} display={p.toFixed(2)} onChange={setP} hint="p=1 是菱形，p=2 是圆；有限的 p=8 仍是圆角形状。" />
    <ResearchRange item="mahler" label="剪切 s" value={shear} min={-.8} max={.8} step={.02} display={shear.toFixed(2)} onChange={setShear} hint="剪切只改变形状的倾斜，不改变面积乘积。" />
    <button className="lattice-reset" onClick={() => { setP(2); setShear(0); }}>恢复默认</button>
    <div className="lattice-formula"><span>经典定义 · 极对偶</span><p role="math">K° = {'{y : x·y ≤ 1, ∀x ∈ K}'}</p><small>极对偶收集所有与原形中每个点的内积都不超过 1 的向量。</small><p role="math">1/p + 1/q = 1</p><small>p=1 时 q=∞，极对偶是精确正方形。</small></div>
    <details className="lattice-details"><summary>计算与变换说明</summary><p>原形为 |x|ᵖ+|y|ᵖ≤1。原形使用 A(x,y)=(x+sy,y)；对偶使用 A⁻ᵀ(x,y)=(x,y−sx)。两个变换共同保持内积关系。</p><p>边界采样 2048 点，鞋带公式计算面积；菱形与正方形使用精确四个顶点。两幅图使用固定的相同尺度。</p></details>
  </>}>
    <div className="lattice-plot-grid">
      <figure><figcaption><span>原形 K</span><b>p = {p.toFixed(2)}</b></figcaption><PolarPlot points={pair.body} /><div className="lattice-readout"><span>面积 ≈</span><output>{pair.bodyArea.toFixed(5)}</output></div></figure>
      <figure className="lattice-reference"><figcaption><span>极对偶 K°</span><b>q = {Number.isFinite(pair.q) ? pair.q.toFixed(2) : "∞"}</b></figcaption><PolarPlot points={pair.polar} polar /><div className="lattice-readout"><span>面积 ≈</span><output>{pair.polarArea.toFixed(5)}</output></div></figure>
    </div>
    <p className="lattice-legend">先改变 p，观察面积乘积；再只改变剪切 s，观察乘积是否保持不变。</p>
    <div className="lattice-result" aria-live="polite"><span>面积乘积 · 数值近似</span><strong>{pair.product.toFixed(5)}</strong><p>二维对称下界 8 · 圆的乘积 π² ≈ 9.86960</p></div>
  </ResearchLab>;
}
