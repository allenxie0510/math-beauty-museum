"use client";
import { BURGERS_SOURCE_URL, DEFAULT_VORTEX, DEFAULT_PLAYBACK, FLUID_RESEARCH_URL, vortexCoreRadius, type VortexParameters, type VortexPlayback } from "./burgers-vortex";
import "./entrance-artwork.css";

export const ENTRANCE_ARTWORKS = ["三维流体 · 涡旋拉伸", "复平方根 · 双叶曲面", "四维超立方体 · 投影"];
export default function EntranceArtworkPanel({ artwork, paused, parameters, playback, onSelect, onPause, onParameters, onPlayback }: {
  artwork: number; paused: boolean; parameters: VortexParameters; playback: VortexPlayback;
  onSelect: (index: number) => void; onPause: (paused: boolean) => void; onParameters: (parameters: VortexParameters) => void; onPlayback: (playback: VortexPlayback) => void;
}) {
  const change = (next: VortexParameters) => { onPause(true); onParameters(next); };
  return <aside className="entrance-artwork-panel" aria-label="入口数学装置">
    <div className="entrance-artwork-heading"><span>0{artwork + 1} / 03</span><strong>{ENTRANCE_ARTWORKS[artwork]}</strong></div>
    <div className="entrance-artwork-switcher">
      {ENTRANCE_ARTWORKS.map((name, index) => <button key={name} aria-label={`展示${name}`} aria-pressed={artwork === index} onClick={() => onSelect(index)}>{["流体", "复平面", "四维"][index]}</button>)}
      <button onClick={() => onPause(!paused)}>{paused ? "轮播三件装置" : "停留此装置"}</button>
    </div>
    {artwork === 0 && <>
      <p className="entrance-artwork-summary">追随亮点：向内汇聚、绕轴旋转，再向两端拉伸。</p>
      <div className="entrance-fluid-controls entrance-fluid-primary">
        <label><span>环量 Γ · 旋转强弱与方向<output>{parameters.circulation.toFixed(0)}</output></span><input aria-label="环量 Γ" type="range" min={-24} max={24} step={1} value={parameters.circulation} onChange={(event) => change({ ...parameters, circulation: Number(event.target.value) })} /></label>
      </div>
      <div className="entrance-fluid-presets" aria-label="涡旋对比">
        <button onClick={() => change({ ...parameters, viscosity: .06, strain: 1.2 })}>细涡核</button>
        <button onClick={() => change({ ...parameters, viscosity: .4, strain: .3 })}>宽涡核</button>
        <button onClick={() => change({ ...parameters, circulation: -(parameters.circulation || 20) })}>反向旋转</button>
      </div>
      <p className="entrance-fluid-readout">涡核半径 {vortexCoreRadius(parameters).toFixed(2)} · {parameters.circulation === 0 ? "无旋转，仍汇聚与拉伸" : parameters.circulation > 0 ? "正向旋转" : "反向旋转"}</p>
      <details name="entrance-fluid-details" onToggle={(event) => { if (event.currentTarget.open) onPause(true); }}>
        <summary>调节涡核与流速</summary>
        <div className="entrance-fluid-controls">
          {([{ key: "viscosity", label: "黏性 ν · 增大使涡核变宽", min: .06, max: .4 }, { key: "strain", label: "拉伸率 a · 增大使涡核收紧", min: .3, max: 1.2 }] as const).map(({ key, label, min, max }) => <label key={key}><span>{label}<output>{parameters[key].toFixed(2)}</output></span><input aria-label={label} type="range" min={min} max={max} step=".01" value={parameters[key]} onChange={(event) => change({ ...parameters, [key]: Number(event.target.value) })} /></label>)}
          <label><span>播放速度 · 不改变流场<output>{playback.speed.toFixed(2)}×</output></span><input aria-label="播放速度" type="range" min={.25} max={2} step={.25} value={playback.speed} onChange={(event) => onPlayback({ ...playback, speed: Number(event.target.value) })} /></label>
          <div className="entrance-fluid-presets"><button onClick={() => onPlayback({ ...playback, paused: !playback.paused })}>{playback.paused ? "继续流动" : "暂停流动"}</button><button onClick={() => { change(DEFAULT_VORTEX); onPlayback(DEFAULT_PLAYBACK); }}>恢复默认</button></div>
        </div>
        <p>暗线是固定流线，亮点与尾迹沿流场运动。参数切换比较不同稳态解，不表示流场的瞬态演化。</p>
        <p className="entrance-fluid-reduced">系统已开启减少动态效果，流动动画保持静止；参数仍可调整。</p>
      </details>
      <details name="entrance-fluid-details" onToggle={(event) => { if (event.currentTarget.open) onPause(true); }}>
        <summary>公式与研究来源</summary>
        <div className="entrance-fluid-formula"><b>经典方程 · 不可压缩流体</b><p role="math">∂ₜu + (u·∇)u = −∇p + νΔu + f<br />∇·u = 0</p><b>本装置 · Burgers 稳态涡旋</b><p role="math">uᵣ = −ar/2 · u_z = az<br />u_θ = Γ(1−e^(−ar²/4ν))/(2πr)<br />涡核半径 δ = √(4ν/a)</p><p>Γ={parameters.circulation.toFixed(0)}，f=0，密度归一化。半径 δ 处的涡量降至轴上值的 1/e；Γ=0 时涡量处处为零，δ 仅为参数尺度。暗线的青色到橙色表示角速度绝对值由低到高（每组参数单独归一化），方向由亮点显示。角速度不同于线速度。黏性与拉伸平衡，涡核保持平滑。</p><a href={BURGERS_SOURCE_URL} target="_blank" rel="noreferrer">经典解析解来源 · 式 3.1–3.3 ↗</a></div>
        <div className="entrance-fluid-frontier"><b>2026 数学前沿 · OpenAI</b><p>研究主张：在光滑外力作用下，三维流体可出现有限时间奇点。公开仓库提供 Lean 形式化文件，本馆未独立复核。</p><p>这里展示经典局部模型，不复现该奇点构造。背景拉伸场在全空间的总能量不有限，因此也不构成千禧年问题的验证。</p><a href={FLUID_RESEARCH_URL} target="_blank" rel="noreferrer">OpenAI 研究与方程 · GitHub ↗</a></div>
      </details>
    </>}
  </aside>;
}
