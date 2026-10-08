"use client";
import { useState } from "react";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { torusResearch } from "./catalog";
import { TORUS_SHAPES, TORUS_TRANSITIONS, torusCandidates, type TorusShape } from "./torus-isoperimetric";
import TorusShapePlot from "./TorusShapePlot";
const names = { ball: "球", tube: "周期圆管", slab: "薄层" };
const colors = { ball: "#f4bd85", tube: "#8bd4c4", slab: "#bda0ed" };

export default function TorusIsoperimetricLab({ onBack }: { onBack: () => void }) {
  const [volume, setVolume] = useState(.22), [choice, setChoice] = useState<TorusShape | "auto">("auto"), [periodic, setPeriodic] = useState(true), [slice, setSlice] = useState(0);
  const data = torusCandidates(volume), shape = choice === "auto" ? data.winners[0] : choice;
  const updateVolume = (v: number) => { setVolume(v); setChoice("auto"); };
  return <ResearchLab title="三维环面等周形态" subtitle="同样的体积，在周期空间里怎样减少界面？" backLabel="返回互动工坊" onBack={onBack} research={torusResearch} controls={<>
    <div className="lattice-console-heading"><span>体积分数与周期边界</span><b>R³/Z³ · 单元体积 1</b></div>
    <ResearchRange item="torus" label="体积分数 V" min={.01} max={.99} step="any" value={volume} display={`${(volume * 100).toFixed(3)}%`} onChange={updateVolume} />
    <div className="research-presets">{[.08, .22, .42].map((v, i) => <button key={v} onClick={() => updateVolume(v)}>{["小体积", "中体积", "大体积"][i]}</button>)}</div>
    <div className="research-presets"><button onClick={() => updateVolume(TORUS_TRANSITIONS[0])}>球／管转换点</button><button onClick={() => updateVolume(TORUS_TRANSITIONS[1])}>管／层转换点</button></div>
    <button className="lattice-reset" onClick={() => updateVolume(1 - volume)}>查看补集 · V ↔ 1−V</button>
    <div className="research-presets" role="group" aria-label="显示形态"><button aria-pressed={choice === "auto"} onClick={() => setChoice("auto")}>候选中最小</button>{TORUS_SHAPES.map((key) => <button key={key} aria-pressed={choice === key} onClick={() => setChoice(key)}>{names[key]}</button>)}</div>
    <div className="research-presets"><button aria-pressed={!periodic} onClick={() => setPeriodic(false)}>单个单元</button><button aria-pressed={periodic} onClick={() => setPeriodic(true)}>相邻单元</button></div>
    <ResearchRange item="torus" label="剖面位置 z" min={-.5} max={.5} step={.01} value={slice} display={slice.toFixed(2)} onChange={setSlice} />
    <button className="lattice-reset" onClick={() => { setVolume(.22); setChoice("auto"); setPeriodic(true); setSlice(0); }}>恢复默认参数</button>
    <div className="lattice-formula"><span>经典几何 · 三类候选的面积</span><p role="math">A球 = (36π)¹ᐟ³ v²ᐟ³<br />A管 = 2√(πv)<br />A层 = 2</p><small>v=min(V,1−V)。圆管没有端盖；薄层只有两个实际界面。把这三类的最小值等同于所有区域的最优值，是手稿的研究主张。</small></div>
    <details className="lattice-details"><summary>形态与显示范围</summary><p>球半径 (3v/4π)¹ᐟ³；沿 y 方向圆管半径 √(v/π)；沿 x 方向薄层宽度 v。V&gt;½ 使用补集，两侧体积互换，界面面积不变。</p><p>转换点是 4π/81 和 1/π；在转换点相邻两类并列。图面是几何示意，不是流体演化或数值求解证明。</p></details>
  </>}>
    <div className="lattice-result" aria-live="polite"><span>三类候选中面积最小 · {data.complement ? "补集" : "原区域"}</span><strong>{data.winners.map((key) => names[key]).join(" ＋ ")}{data.winners.length > 1 && " · 并列"}</strong><p>V={volume.toFixed(6)} · v={data.v.toFixed(6)} · 最小候选面积 {data.minimum.toFixed(5)}</p></div>
    <div className="research-stat-row">{TORUS_SHAPES.map((key) => <span key={key} style={{ color: colors[key] }}>{names[key]} <b>{data.areas[key].toFixed(5)}</b></span>)}</div>
    <p className="research-note">当前画面：{names[shape]}{data.complement && "的补集界面"}。{!data.winners.includes(shape) ? "这一候选当前不是三类中面积最小的形态。" : "手稿把这些候选的最小面积声明为全局最优；本馆未独立复核。"}</p>
    <TorusShapePlot volume={volume} shape={shape} periodic={periodic} slice={slice} />
    <figure className="torus-profile"><svg viewBox="0 0 600 270" role="img" aria-label="三类候选面积随较小侧体积v变化，两个虚线标出转换点">{TORUS_SHAPES.map((key) => <path key={key} fill="none" stroke={colors[key]} strokeWidth="2" d={Array.from({ length: 101 }, (_, i) => { const v = .001 + i * .00499; return `${i ? "L" : "M"}${35 + v * 1080},${230 - torusCandidates(v).areas[key] * 70}`; }).join(" ")} />)}{TORUS_TRANSITIONS.map((v) => <path key={v} d={`M${35 + v * 1080} 12V232`} stroke="#ffffff55" strokeDasharray="4 4" />)}<circle cx={35 + data.v * 1080} cy={230 - data.areas[shape] * 70} r="5" fill={colors[shape]} /><text x="35" y="256">v=0</text><text x="515" y="256">v=½</text><text x="35" y="18">界面面积</text></svg><figcaption>金：球 · 青：圆管 · 紫：薄层。竖虚线：4π/81≈0.155140、1/π≈0.318310。</figcaption></figure>
  </ResearchLab>;
}
