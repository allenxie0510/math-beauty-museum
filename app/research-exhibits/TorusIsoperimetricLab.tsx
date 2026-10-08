"use client";
import { useEffect, useRef, useState } from "react";
import { ResearchRange } from "./ResearchLab";
import { torusResearch } from "./catalog";
import { TORUS_SHAPES, TORUS_TRANSITIONS, torusCandidates, type TorusShape } from "./torus-isoperimetric";
import TorusShapePlot, { TorusSlicePlot } from "./TorusShapePlot";
import "./torus-workspace.css";
const names = { ball: "球", tube: "周期圆管", slab: "薄层" };
const colors = { ball: "#a96b3c", tube: "#2a8491", slab: "#7965a5" };

export default function TorusIsoperimetricLab({ onBack }: { onBack: () => void }) {
  const [volume, setVolume] = useState(.22), [choice, setChoice] = useState<TorusShape | "auto">("auto"), [periodic, setPeriodic] = useState(true), [slice, setSlice] = useState(0), [infoOpen, setInfoOpen] = useState(false);
  const info = useRef<HTMLDialogElement>(null), back = useRef<HTMLButtonElement>(null);
  const data = torusCandidates(volume), shape = choice === "auto" ? data.winners[0] : choice;
  useEffect(() => { back.current?.focus(); }, []);
  useEffect(() => { if (infoOpen) info.current?.showModal();else info.current?.close(); }, [infoOpen]);
  const updateVolume = (v: number) => { setVolume(v);setChoice("auto"); };
  return <article className="lattice-lab torus-workspace" aria-label="三维环面等周形态操作页">
    <header className="torus-workspace-header"><div><span className="torus-eyebrow">2026 数学前沿 · OpenAI 手稿 354</span><h2>三维环面等周形态</h2><p>同样的体积，怎样减少周期空间里的界面？</p></div>
      <div className="torus-shape-tabs" role="group" aria-label="显示形态"><button aria-pressed={choice === "auto"} onClick={() => setChoice("auto")}><i>↗</i><span>自动最小<small>COMPARE</small></span></button>{TORUS_SHAPES.map((key, index) => <button key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}><i>{["◯", "⌭", "▱"][index]}</i><span>{names[key]}<small>{["BALL", "TUBE", "SLAB"][index]}</small></span></button>)}</div>
    </header>
    <div className="torus-workspace-body">
      <section className="torus-workspace-stage" aria-label="三维环面操作区"><TorusShapePlot volume={volume} shape={shape} periodic={periodic} /><p className="torus-scene-status">{names[shape]}{data.complement ? "的补集" : "界面"}{!data.winners.includes(shape) && " · 当前不是最小候选"}</p></section>
      <aside className="torus-workspace-panel" aria-label="环面参数与实时剖面">
        <section className="torus-outcome" aria-live="polite"><span>三类候选中面积最小 · {data.complement ? "补集" : "原区域"}</span><strong>{data.winners.map(key => names[key]).join(" ＋ ")}{data.winners.length > 1 && " · 并列"}</strong><small>单位体积 1 · 当前 V={volume.toFixed(5)}</small></section>
        <div className="torus-area-row">{TORUS_SHAPES.map(key => <span key={key} style={{ color: colors[key] }}>{names[key]}<b>{data.areas[key].toFixed(4)}</b></span>)}</div>
        <div className="torus-volume-controls"><ResearchRange item="torus" label="体积分数 V" min={.01} max={.99} step="any" value={volume} display={`${(volume * 100).toFixed(3)}%`} onChange={updateVolume} />
          <div className="torus-button-row">{[.08, .22, .42].map((v, i) => <button key={v} onClick={() => updateVolume(v)}>{["小体积", "中体积", "大体积"][i]}</button>)}</div>
          <div className="torus-button-row"><button onClick={() => updateVolume(TORUS_TRANSITIONS[0])}>球／管转换点</button><button onClick={() => updateVolume(TORUS_TRANSITIONS[1])}>管／层转换点</button></div>
        </div>
        <div className="torus-button-row torus-periodic-controls" role="group" aria-label="周期副本"><button aria-pressed={!periodic} onClick={() => setPeriodic(false)}>单个单元</button><button aria-pressed={periodic} onClick={() => setPeriodic(true)}>相邻单元</button></div>
        <section className="torus-section"><TorusSlicePlot volume={volume} shape={shape} slice={slice} /><div><span>实时剖面 · 横 x / 纵 y</span><ResearchRange item="torus" label="剖面位置 z" min={-.5} max={.5} step={.01} value={slice} display={slice.toFixed(2)} onChange={setSlice} /><small>青色为所选区域{data.complement && "（补集）"}</small></div></section>
        <p className="torus-scope-note">经典候选面积比较；全局最优是手稿主张，本馆未独立复核。</p>
      </aside>
    </div>
    <footer className="torus-workspace-footer"><button ref={back} onClick={onBack}>← 返回工坊</button><button className="torus-info-trigger" onClick={() => setInfoOpen(true)}>面积曲线与研究说明</button><button onClick={() => { setVolume(.22);setChoice("auto");setPeriodic(true);setSlice(0); }}>恢复默认参数</button><button className="torus-complement-button" onClick={() => updateVolume(1 - volume)}>查看补集 <span>V ↔ 1−V</span></button></footer>
    <dialog ref={info} className="torus-info-dialog" aria-labelledby="torus-info-title" onCancel={e => { e.preventDefault();setInfoOpen(false); }} onKeyDown={e => { if (["Escape", "Tab"].includes(e.key)) e.stopPropagation(); }}><header><h3 id="torus-info-title">面积曲线与研究说明</h3><button onClick={() => setInfoOpen(false)} aria-label="收起研究说明">×</button></header><div className="torus-info-body">
      <figure className="torus-profile"><svg viewBox="0 0 600 270" role="img" aria-label="三类候选面积曲线，虚线为两个转换点">{TORUS_SHAPES.map(key => <path key={key} fill="none" stroke={colors[key]} strokeWidth="2" d={Array.from({ length: 101 }, (_, i) => { const v = .001 + i * .00499;return `${i ? "L" : "M"}${35 + v * 1080},${230 - torusCandidates(v).areas[key] * 70}`; }).join(" ")} />)}{TORUS_TRANSITIONS.map(v => <path key={v} d={`M${35 + v * 1080} 12V232`} stroke="#73818e77" strokeDasharray="4 4" />)}<circle cx={35 + data.v * 1080} cy={230 - data.areas[shape] * 70} r="5" fill={colors[shape]} /><text x="35" y="256">v=0</text><text x="515" y="256">v=½</text><text x="35" y="18">界面面积</text></svg><figcaption>棕：球 · 青：圆管 · 紫：薄层。转换点：4π/81≈0.155140、1/π≈0.318310。</figcaption></figure>
      <h4>经典几何 · 候选面积</h4><p role="math">A球 = (36π)¹ᐟ³v²ᐟ³ · A管 = 2√(πv) · A层 = 2</p><p>v=min(V,1−V)。球半径 (3v/4π)¹ᐟ³，圆管半径 √(v/π)，薄层宽 v。V&gt;½ 展示补集，界面不变。转换点有相邻两类并列。</p><p>R³/Z³ 由单位立方体的相对面周期连接而成。圆管沿 y 延续，没有端盖；薄层沿 y、z 延续，只有两个实际界面。线框不是有壁容器。图中展示界面，青色剖面表示占据区域；形态变化不是流体模拟。</p>
      <h4>2026 数学前沿 · OpenAI 手稿 354</h4><p>{torusResearch.claim}</p><p>{torusResearch.classicalBackground}</p><p>{torusResearch.experimentScope}</p><p>{torusResearch.verification}</p><small>{torusResearch.version}</small><div className="torus-source-links"><a href={torusResearch.paperUrl} target="_blank" rel="noreferrer">手稿固定版本 ↗</a><a href={torusResearch.scopeUrl} target="_blank" rel="noreferrer">形式化范围 ↗</a></div>
    </div></dialog>
  </article>;
}
