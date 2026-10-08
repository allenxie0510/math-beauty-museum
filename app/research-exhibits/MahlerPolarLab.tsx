"use client";

import { useEffect, useMemo, useState } from "react";
import { setMathObserverScene } from "../math-observer-events";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { mahlerResearch } from "./catalog";
import { mahlerPair, mahlerPair3, type Point2 } from "./mahler-polar";

import MahlerSolidPlot, { DEFAULT_SOLID_VIEW } from "./MahlerSolidPlot";

function PolarPlot({ points, polar }: { points: Point2[]; polar?: boolean }) {
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${(x * 80).toFixed(3)},${(-y * 80).toFixed(3)}`).join(" ") + "Z";
  const color = polar ? "#8bd4c4" : "#f4bd85";
  return <svg viewBox="-176 -176 352 352" role="img" aria-label={polar ? "极对偶 K°，与原形同一尺度" : "原形 K，与极对偶同一尺度"}><path d="M-160 0H160 M0 -160V160" stroke="#ffffff20" />{[-1, 1].map((v) => <path key={v} d={`M${v * 80} -4v8 M-4 ${v * 80}h8`} stroke="#aab5c5" />)}<path d={path} fill={color} fillOpacity=".14" stroke={color} strokeWidth="2" /><circle r="3" fill="#fff" /><text x="86" y="15" fill="#aab5c5" fontSize="11">1</text></svg>;
}

export default function MahlerPolarLab({ onBack }: { onBack: () => void }) {
  const [dimension, setDimension] = useState<2 | 3>(3);
  const [p, setP] = useState(1), [shear, setShear] = useState(0);
  const [view, setView] = useState(DEFAULT_SOLID_VIEW);
  useEffect(() => { setMathObserverScene("workshop-mahler", { name: "Mahler 凸体对偶", dimension, formula: dimension === 3 ? "|K| |K°| ≥ 32/3（三维）" : "|K| |K°| ≥ 8（二维）" }); }, [dimension]);
  const pair = useMemo(() => mahlerPair(p, shear), [p, shear]);
  const solid = useMemo(() => dimension === 3 ? mahlerPair3(p, shear) : null, [p, shear, dimension]);
  const rotate = (yaw: number, pitch: number) => setView((previous) => ({ yaw: (previous.yaw + yaw) % (2 * Math.PI), pitch: Math.max(-1.3, Math.min(1.3, previous.pitch + pitch)) }));
  const measure = dimension === 3 ? "体积" : "面积";
  const presets = dimension === 3 ? ["八面体", "球体", "圆角立方体"] : ["菱形", "圆", "圆角方形"];
  const q = solid?.q ?? pair.q;
  return <ResearchLab title="Mahler 凸体对偶" subtitle="改变一个形状，它的对偶会怎样回应？" backLabel="返回互动工坊" onBack={onBack} research={mahlerResearch} controls={<>
    <div className="lattice-console-heading"><span>形状与对偶，一起变化</span><b>{dimension === 3 ? "三维" : "二维"} · 关于原点对称</b></div>
    <div className="research-presets" role="group" aria-label="实验维度">{([2, 3] as const).map((value) => <button key={value} aria-pressed={dimension === value} onClick={() => setDimension(value)}>{value}D · {value === 3 ? "立体" : "平面"}</button>)}</div>
    <div className="research-presets">{[1, 2, 8].map((value, i) => <button key={value} aria-pressed={p === value} onClick={() => setP(value)}>{presets[i]}</button>)}</div>
    <ResearchRange item="mahler" label="形状指数 p" value={p} min={1} max={8} step={.05} display={p.toFixed(2)} onChange={setP} hint={`p=1 是${presets[0]}，p=2 是${presets[1]}；p=8 仍有圆角。`} />
    <ResearchRange item="mahler" label="剪切 s" value={shear} min={-.8} max={.8} step={.02} display={shear.toFixed(2)} onChange={setShear} hint={`剪切改变倾斜，保持${measure}与${measure}乘积不变。`} />
    <button className="lattice-reset" onClick={() => { setP(1); setShear(0); setView(DEFAULT_SOLID_VIEW); }}>恢复默认</button>
    <div className="lattice-formula"><span>经典定义 · 极对偶</span><p role="math">K° = {'{y : x·y ≤ 1, ∀x ∈ K}'}</p><small>极对偶收集所有与原形中每个点的内积都不超过 1 的向量。</small><p role="math">1/p + 1/q = 1</p><small>p=1 时 q=∞，极对偶是精确{dimension === 3 ? "立方体" : "正方形"}。</small></div>
    <details className="lattice-details"><summary>计算与变换说明</summary>
      <p>原形为 {dimension === 3 ? "|x|ᵖ+|y|ᵖ+|z|ᵖ≤1" : "|x|ᵖ+|y|ᵖ≤1"}。原形使用 x′=x+sy；对偶使用 y′=y−sx，其余坐标不变。这是 A 与 A⁻ᵀ，共同保持内积关系。</p>
      {dimension === 3 ? <><p role="math">V₃(p) = 8 Γ(1+1/p)³ / Γ(1+3/p)</p><p>体积读数用经典解析公式作数值计算，独立于显示网格。八面体与立方体使用精确平面；其他曲面为网格近似。两图使用固定同尺度的正交投影，并同步旋转。</p></> : <p>边界采样2048点，鞋带公式计算面积；菱形与正方形使用精确顶点。两图同尺度。</p>}
      <p><a href="https://arxiv.org/abs/1706.01749v3" target="_blank" rel="noreferrer">三维对称情形的已有证明 · Iriyeh–Shibata ↗</a></p>
    </details>
  </>}>
    {solid && <div className="mahler-view-toolbar"><span>3D · 同步旋转 · 同一尺度</span><button onClick={() => setView(DEFAULT_SOLID_VIEW)}>复位视角</button></div>}
    <div className={`lattice-plot-grid${solid ? " mahler-solid-grid" : ""}`}>
      <figure><figcaption><span>原形 K</span><b>p = {p.toFixed(2)}</b></figcaption>{solid ? <MahlerSolidPlot mesh={solid.body} view={view} onRotate={rotate} /> : <PolarPlot points={pair.body} />}<div className="lattice-readout"><span>{measure} ≈</span><output>{(solid?.bodyVolume ?? pair.bodyArea).toFixed(5)}</output></div></figure>
      <figure className="lattice-reference"><figcaption><span>极对偶 K°</span><b>q = {Number.isFinite(q) ? q.toFixed(2) : "∞"}</b></figcaption>{solid ? <MahlerSolidPlot mesh={solid.polar} polar view={view} onRotate={rotate} /> : <PolarPlot points={pair.polar} polar />}<div className="lattice-readout"><span>{measure} ≈</span><output>{(solid?.polarVolume ?? pair.polarArea).toFixed(5)}</output></div></figure>
    </div>
    <p className="lattice-legend">{solid ? "拖动任一模型，两图一起旋转；聚焦模型后也可用方向键旋转。" : "先改变 p，再只改变剪切 s。"}观察{measure}乘积怎样变化。{solid && "旋转只改变观察方向，不改变体积。"}</p>
    <div className="lattice-result" aria-live="polite"><span>{measure}乘积 · {solid ? "解析公式的数值结果" : "数值近似"}</span><strong>{(solid?.product ?? pair.product).toFixed(5)}</strong><p>{solid ? "三维对称下界 32/3 ≈ 10.66667 · 球的乘积 16π²/9 ≈ 17.54596" : "二维对称下界 8 · 圆的乘积 π² ≈ 9.86960"}</p></div>
    {solid && <p className="research-note">八面体的对偶是立方体，球的对偶仍是球。三维对称下界是已有定理；上方前沿卡对应手稿关于所有维数的主张。本实验只展示 Lp 家族及其剪切。</p>}
  </ResearchLab>;
}
