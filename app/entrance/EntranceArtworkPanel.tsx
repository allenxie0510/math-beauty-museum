"use client";
import { BURGERS_SOURCE_URL, DEFAULT_VORTEX, FLUID_RESEARCH_URL, type VortexParameters } from "./burgers-vortex";
import "./entrance-artwork.css";

export const ENTRANCE_ARTWORKS = ["三维流体 · 涡旋拉伸", "复平方根 · 双叶曲面", "四维超立方体 · 投影"];
export default function EntranceArtworkPanel({ artwork, paused, parameters, onSelect, onPause, onParameters }: {
  artwork: number; paused: boolean; parameters: VortexParameters;
  onSelect: (index: number) => void; onPause: (paused: boolean) => void; onParameters: (parameters: VortexParameters) => void;
}) {
  return <aside className="entrance-artwork-panel" aria-label="入口数学装置">
    <div className="entrance-artwork-heading"><span>0{artwork + 1} / 03</span><strong>{ENTRANCE_ARTWORKS[artwork]}</strong></div>
    <div className="entrance-artwork-switcher">
      {ENTRANCE_ARTWORKS.map((name, index) => <button key={name} aria-label={`展示${name}`} aria-pressed={artwork === index} onClick={() => onSelect(index)}>{["流体", "复平面", "四维"][index]}</button>)}
      <button onClick={() => onPause(!paused)}>{paused ? "轮播三件装置" : "停留此装置"}</button>
    </div>
    {artwork === 0 && <>
      <p className="entrance-artwork-summary">向内旋转，沿轴拉伸。光点随流动前行。</p>
      <details onToggle={(event) => { if (event.currentTarget.open) onPause(true); }}>
        <summary>调整流动 · 公式与研究来源</summary>
        <div className="entrance-fluid-controls">
          {([{ key: "viscosity", label: "黏性 ν", min: .06, max: .4 }, { key: "strain", label: "拉伸率 a", min: .3, max: 1.2 }] as const).map(({ key, label, min, max }) => <label key={key}><span>{label}<output>{parameters[key].toFixed(2)}</output></span><input aria-label={label} type="range" min={min} max={max} step=".01" value={parameters[key]} onChange={(event) => onParameters({ ...parameters, [key]: Number(event.target.value) })} /></label>)}
          <button onClick={() => onParameters(DEFAULT_VORTEX)}>恢复流动参数</button>
        </div>
        <div className="entrance-fluid-formula"><b>经典方程 · 不可压缩流体</b><p role="math">∂ₜu + (u·∇)u = −∇p + νΔu + f<br />∇·u = 0</p><b>本装置 · Burgers 稳态涡旋</b><p role="math">uᵣ = −ar/2 · u_z = az<br />u_θ = Γ(1−e^(−ar²/4ν))/(2πr)</p><p>Γ=20，f=0，密度归一化。青色角速度较慢，橙色较快；角速度不同于线速度。黏性与拉伸平衡，涡核保持平滑。</p><a href={BURGERS_SOURCE_URL} target="_blank" rel="noreferrer">经典解析解来源 · 式 3.1–3.3 ↗</a></div>
        <div className="entrance-fluid-frontier"><b>2026 数学前沿 · OpenAI</b><p>研究主张：在光滑外力作用下，三维流体可出现有限时间奇点。公开仓库提供 Lean 形式化文件，本馆未独立复核。</p><p>这里展示经典局部模型，不复现该奇点构造。背景拉伸场在全空间的总能量不有限，因此也不构成千禧年问题的验证。</p><a href={FLUID_RESEARCH_URL} target="_blank" rel="noreferrer">OpenAI 研究与方程 · GitHub ↗</a></div>
      </details>
    </>}
  </aside>;
}
