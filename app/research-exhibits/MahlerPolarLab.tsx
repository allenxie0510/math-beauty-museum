"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setMathObserverScene } from "../math-observer-events";
import { ResearchRange } from "./ResearchLab";
import { mahlerResearch } from "./catalog";
import { mahlerPair, mahlerPair3, type Point2 } from "./mahler-polar";
import MahlerSolidPlot, { DEFAULT_SOLID_VIEW } from "./MahlerSolidPlot";
import "./mahler-workspace.css";

function PolarPlot({ points, polar }: { points: Point2[]; polar?: boolean }) {
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${(x * 80).toFixed(3)},${(-y * 80).toFixed(3)}`).join(" ") + "Z";
  const color = polar ? "#288e87" : "#b77835";
  return <svg viewBox="-176 -176 352 352" role="img" aria-label={polar ? "极对偶 K°，与原形同一尺度" : "原形 K，与极对偶同一尺度"}><path d="M-160 0H160 M0 -160V160" stroke="#597b8735" />{[-1, 1].map((v) => <path key={v} d={`M${v * 80} -4v8 M-4 ${v * 80}h8`} stroke="#69818b" />)}<path d={path} fill={color} fillOpacity=".16" stroke={color} strokeWidth="2" /><circle r="3" fill="#4b6570" /><text x="86" y="15" fill="#607b87" fontSize="11">1</text></svg>;
}

export default function MahlerPolarLab({ onBack }: { onBack: () => void }) {
  const [dimension, setDimension] = useState<2 | 3>(3);
  const [p, setP] = useState(1), [shear, setShear] = useState(0);
  const [view, setView] = useState(DEFAULT_SOLID_VIEW);
  const [infoOpen, setInfoOpen] = useState(false);
  const info = useRef<HTMLDialogElement>(null), back = useRef<HTMLButtonElement>(null);
  useEffect(() => { back.current?.focus(); }, []);
  useEffect(() => { if (infoOpen) info.current?.showModal(); else info.current?.close(); }, [infoOpen]);
  useEffect(() => { setMathObserverScene("workshop-mahler", { name: "Mahler 凸体对偶", dimension, formula: dimension === 3 ? "|K| |K°| ≥ 32/3（三维）" : "|K| |K°| ≥ 8（二维）" }); }, [dimension]);
  const pair = useMemo(() => mahlerPair(p, shear), [p, shear]);
  const solid = useMemo(() => dimension === 3 ? mahlerPair3(p, shear) : null, [p, shear, dimension]);
  const rotate = (yaw: number, pitch: number) => setView((previous) => ({ yaw: (previous.yaw + yaw) % (2 * Math.PI), pitch: Math.max(-1.3, Math.min(1.3, previous.pitch + pitch)) }));
  const measure = dimension === 3 ? "体积" : "面积";
  const presets = dimension === 3 ? ["八面体", "球体", "圆角立方体"] : ["菱形", "圆", "圆角方形"];
  const q = solid?.q ?? pair.q;
  return <article className="lattice-lab mahler-workspace" aria-label="Mahler 凸体对偶操作页">
    <header className="mahler-workspace-header">
      <div><span className="mahler-eyebrow">2026 数学前沿 · OpenAI 手稿 087</span><h2>Mahler 凸体对偶</h2><p>改变一个形状，它的对偶会怎样回应？</p></div>
      <div className="mahler-dimension-tabs" role="group" aria-label="实验维度">{([2, 3] as const).map((value) => <button key={value} aria-pressed={dimension === value} onClick={() => setDimension(value)}><i>{value === 3 ? "◇" : "◯"}</i><span>{value}D · {value === 3 ? "立体" : "平面"}<small>{value === 3 ? "SOLID" : "PLANE"}</small></span></button>)}</div>
    </header>
    <div className="mahler-workspace-body">
      <section className="mahler-workspace-stage" aria-label="原形与极对偶，同尺度比较">
        <div className="mahler-stage-heading"><span>{dimension}D · 同一尺度{solid && " · 同步旋转"}</span>{solid && <button onClick={() => setView(DEFAULT_SOLID_VIEW)}>复位视角</button>}</div>
        <div className="mahler-pair-grid">
          <figure><figcaption><span>原形 <b>K</b></span><small>p = {p.toFixed(2)}</small></figcaption><div className="mahler-plot-frame">{solid ? <MahlerSolidPlot mesh={solid.body} view={view} onRotate={rotate} /> : <PolarPlot points={pair.body} />}</div><div className="mahler-measure"><span>{measure} ≈</span><output>{(solid?.bodyVolume ?? pair.bodyArea).toFixed(5)}</output></div></figure>
          <figure className="mahler-polar-figure"><figcaption><span>极对偶 <b>K°</b></span><small>q = {Number.isFinite(q) ? q.toFixed(2) : "∞"}</small></figcaption><div className="mahler-plot-frame">{solid ? <MahlerSolidPlot mesh={solid.polar} polar view={view} onRotate={rotate} /> : <PolarPlot points={pair.polar} polar />}</div><div className="mahler-measure"><span>{measure} ≈</span><output>{(solid?.polarVolume ?? pair.polarArea).toFixed(5)}</output></div></figure>
        </div>
        <p className="mahler-stage-hint">{solid ? "拖动任一模型或用方向键，两图同步旋转；体积保持不变。" : "两图同一尺度：改变 p 看形状，只改变 s 看剪切。"}</p>
      </section>
      <aside className="mahler-workspace-panel" aria-label="Mahler 参数与实时结果">
        <section className="mahler-product" aria-live="polite"><span>{measure}乘积 · |K| |K°|</span><strong>{(solid?.product ?? pair.product).toFixed(5)}</strong><small>{solid ? "经典解析公式的数值结果" : "边界采样的数值近似"}</small></section>
        <div className="mahler-benchmarks"><span>已知对称下界<b>{solid ? "32/3 ≈ 10.66667" : "8"}</b></span><span>{solid ? "球的乘积" : "圆的乘积"}<b>{solid ? "16π²/9 ≈ 17.54596" : "π² ≈ 9.86960"}</b></span></div>
        <div className="mahler-parameters">
          <div className="mahler-presets" role="group" aria-label="形状预设">{[1, 2, 8].map((value, i) => <button key={value} aria-pressed={p === value} onClick={() => setP(value)}>{presets[i]}</button>)}</div>
          <ResearchRange item="mahler" label="形状指数 p" value={p} min={1} max={8} step={.05} display={p.toFixed(2)} onChange={setP} />
          <p className="mahler-parameter-hint">p=1：{presets[0]} · p=2：{presets[1]}<br />p=8 仍有圆角，不是精确{solid ? "立方体" : "正方形"}。</p>
          <ResearchRange item="mahler" label="剪切 s" value={shear} min={-.8} max={.8} step={.02} display={shear.toFixed(2)} onChange={setShear} />
          <p className="mahler-parameter-hint">只改变倾斜，保持两者{measure}及其乘积。</p>
        </div>
        <p className="mahler-duality" role="math">1/p + 1/q = 1<span>p=1 时 q=∞</span></p>
        <p className="mahler-scope-note">{solid ? "三维" : "二维"}对称下界是已有定理。OpenAI 手稿涉及所有维数，本馆未独立复核；此处只探索 Lp 家族及其剪切。</p>
      </aside>
    </div>
    <footer className="mahler-workspace-footer"><button ref={back} onClick={onBack}>← 返回工坊</button><button className="mahler-info-trigger" onClick={() => setInfoOpen(true)}>公式与研究说明</button><button onClick={() => { setDimension(3); setP(1); setShear(0); setView(DEFAULT_SOLID_VIEW); }}>恢复默认参数</button></footer>
    <dialog ref={info} className="mahler-info-dialog" aria-labelledby="mahler-info-title" onCancel={event => { event.preventDefault(); setInfoOpen(false); }} onKeyDown={event => { if (["Escape", "Tab"].includes(event.key)) event.stopPropagation(); }}>
      <header><h3 id="mahler-info-title">公式与研究说明</h3><button onClick={() => setInfoOpen(false)} aria-label="收起 Mahler 研究说明">×</button></header>
      <div className="mahler-info-body">
        <h4>经典定义 · 极对偶</h4><p role="math">K° = {'{y : x·y ≤ 1, ∀x ∈ K}'}</p><p>极对偶收集所有与原形中每个点的内积都不超过 1 的向量。1/p + 1/q = 1；p=1 时 q=∞，极对偶是精确{solid ? "立方体" : "正方形"}。</p>
        <h4>计算与变换</h4><p>原形为 {solid ? "|x|ᵖ+|y|ᵖ+|z|ᵖ≤1" : "|x|ᵖ+|y|ᵖ≤1"}。原形使用 x′=x+sy；对偶使用 y′=y−sx，其余坐标不变。这是 A 与 A⁻ᵀ，共同保持内积关系。</p>
        {solid ? <><p role="math">V₃(p) = 8 Γ(1+1/p)³ / Γ(1+3/p)</p><p>体积读数用经典解析公式作数值计算，独立于显示网格。八面体与立方体使用精确平面；其他曲面为网格近似。两图使用同尺度正交投影，并同步旋转。旋转只改变观察方向，不改变体积。</p></> : <p>边界采样 2048 点，鞋带公式计算面积；菱形与正方形使用精确顶点。两图同尺度。</p>}
        <p><a href="https://arxiv.org/abs/1706.01749v3" target="_blank" rel="noreferrer">三维对称情形的已有证明 · Iriyeh–Shibata ↗</a></p>
        <h4>2026 数学前沿 · OpenAI 手稿 087</h4><h5>{mahlerResearch.frontierTitle}</h5><p>{mahlerResearch.claim}</p><p>{mahlerResearch.classicalBackground}</p><p>{mahlerResearch.experimentScope}</p><p>{mahlerResearch.verification}</p><small>{mahlerResearch.version}</small>
        <div className="mahler-source-links"><a href={mahlerResearch.paperUrl} target="_blank" rel="noreferrer">手稿固定版本 ↗</a><a href={mahlerResearch.scopeUrl} target="_blank" rel="noreferrer">形式化范围 ↗</a>{mahlerResearch.comparatorUrl && <a href={mahlerResearch.comparatorUrl} target="_blank" rel="noreferrer">Comparator 声明 ↗</a>}</div>
      </div>
    </dialog>
  </article>;
}
