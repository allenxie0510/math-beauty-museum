"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { observeMathAction } from "../math-observer-events";
import { triangularLatticeResearch as research } from "./catalog";
import { cellArea, gaussianEnergy, latticePoints, LATTICE_DOMAIN, unitDensityBasis, type LatticeBasis } from "./lattice-energy";
import "./lattice-energy.css";

const TRIANGULAR = unitDensityBasis(60, 1);
const SQUARE = unitDensityBasis(90, 1);
const DEFAULTS = { angle: 90, ratio: 1, alpha: 2 };
type Parameters = typeof DEFAULTS;

function LatticePlot({ basis, alpha, reference, label }: { basis: LatticeBasis; alpha: number; reference?: boolean; label: string }) {
  const points = useMemo(() => latticePoints(basis, 5.5).filter(([x, y]) => Math.abs(x) < 3.9 && Math.abs(y) < 3.9), [basis]);
  const [u, v] = basis;
  const toSvg = ([x, y]: readonly number[]) => `${x * 48},${-y * 48}`;
  const color = reference ? "#8bd4c4" : "#f5b878";
  return <svg viewBox="-200 -200 400 400" role="img" aria-label={`${label}，基本单元面积为 1，与另一幅图使用相同尺度`}>
    <title>{label}：等密度点阵</title>
    <path d="M-192 0H192 M0 -192V192" stroke="#ffffff" strokeOpacity=".08" />
    <circle r={48 / Math.sqrt(alpha)} fill={color} fillOpacity=".07" stroke={color} strokeOpacity=".3" strokeDasharray="3 5" />
    <polygon points={`0,0 ${toSvg(u)} ${toSvg([u[0] + v[0], u[1] + v[1]])} ${toSvg(v)}`} fill={color} fillOpacity=".12" stroke={color} strokeWidth="1.4" />
    {points.map(([x, y], i) => {
      const weight = Math.exp(-alpha * (x * x + y * y));
      return <g key={i}>
        {weight > .015 && <line x1="0" y1="0" x2={x * 48} y2={-y * 48} stroke={color} strokeOpacity={weight * .7} />}
        <circle cx={x * 48} cy={-y * 48} r={2.4 + weight * 5} fill={color} opacity={.38 + .62 * weight} />
      </g>;
    })}
    <circle r="6" fill={color} /><circle r="10" fill="none" stroke={color} strokeOpacity=".45" />
    <text x="-183" y="185" fill="#a6aebc" fontSize="10">1 单位长度</text><path d="M-183 162v5h48v-5" fill="none" stroke="#a6aebc" />
  </svg>;
}

export default function LatticeEnergyLab({ onBack }: { onBack: () => void }) {
  const [parameters, setParameters] = useState(DEFAULTS);
  const backRef = useRef<HTMLButtonElement>(null);
  const { angle, ratio, alpha } = parameters;
  const basis = useMemo(() => unitDensityBasis(angle, ratio), [angle, ratio]);
  const energy = useMemo(() => gaussianEnergy(basis, alpha), [basis, alpha]);
  const triangularEnergy = useMemo(() => gaussianEnergy(TRIANGULAR, alpha), [alpha]);
  const squareEnergy = useMemo(() => gaussianEnergy(SQUARE, alpha), [alpha]);
  const difference = energy - triangularEnergy;
  const equal = Math.abs(difference) < 5e-9;
  const isSquare = angle === 90 && ratio === 1;
  const isTriangular = (angle === 60 || angle === 120) && ratio === 1;
  const energyMax = Math.max(energy, triangularEnergy, squareEnergy);

  useEffect(() => { backRef.current?.focus(); }, []);

  const record = (parameter: string, value: number) => observeMathAction({
    id: `lattice-${parameter}`, scene: "hall", action: "lattice_energy_parameter_adjusted", outcome: "exploring", importance: .4,
    context: { item: "lattice-energy", parameter, value, angle, ratio, alpha, approximateEnergy: energy },
  });
  const preset = (angle: number) => {
    setParameters((previous) => ({ ...previous, angle, ratio: 1 }));
    observeMathAction({ id: `lattice-preset-${angle}`, scene: "hall", action: "lattice_energy_preset_selected", outcome: "discovery", importance: .65, context: { item: "lattice-energy", preset: angle === 60 ? "triangular" : "square", alpha } });
  };

  return <div className="lattice-lab">
    <header className="lattice-header">
      <button ref={backRef} type="button" onClick={onBack}>← 返回几何铺砌</button>
      <div className="lattice-provenance"><span className="lattice-frontier-badge">2026 数学前沿</span><span>OpenAI 研究手稿 · 家族 {research.familyId}</span></div>
      <h2>三角晶格能量</h2>
      <p>一样密的点，怎样排列，能量更低？</p>
      <p className="lattice-version">{research.version}</p>
    </header>
    <div className="lattice-body">
      <section className="lattice-comparison" aria-label="等密度晶格比较">
        <section className="lattice-frontier" aria-label="OpenAI 前沿研究主张">
          <span>这件展品连接的前沿概念</span>
          <h3>{research.frontierTitle}</h3>
          <p>{research.frontierSummary}</p>
          <p className="lattice-frontier-claim">{research.frontierScope}</p>
          <div><a href={research.paperUrl} target="_blank" rel="noreferrer">阅读 OpenAI 手稿 ↗</a><span>手稿主张 · 本馆未独立复核</span></div>
        </section>
        <div className="lattice-experiment-label"><span>数值探索</span>用高斯势，体验这个前沿问题</div>
        <div className="lattice-plot-grid">
          <figure>
            <figcaption><span>你的点阵</span><b>{isSquare ? "方格" : isTriangular ? "三角格" : "变形晶格"}</b></figcaption>
            <LatticePlot basis={basis} alpha={alpha} label="你的点阵" />
            <div className="lattice-readout"><span>近似能量</span><output aria-label="当前晶格近似能量">{energy.toFixed(8)}</output></div>
          </figure>
          <figure className="lattice-reference">
            <figcaption><span>比较基准</span><b>三角格 · 60°</b></figcaption>
            <LatticePlot basis={TRIANGULAR} alpha={alpha} reference label="三角格基准" />
            <div className="lattice-readout"><span>近似能量</span><output aria-label="三角格近似能量">{triangularEnergy.toFixed(8)}</output></div>
          </figure>
        </div>
        <p className="lattice-legend">亮点是中心粒子。邻点越亮，对它的能量贡献越大；描边平行四边形的面积始终为 1。两幅图使用相同尺度。</p>
        <div className="lattice-result" aria-live="polite" aria-atomic="true">
          <span>与三角格相比</span><strong>{equal ? "在显示精度内相同" : `${difference >= 0 ? "+" : "−"}${Math.abs(difference).toFixed(8)}`}</strong>
          <p>{equal ? "换一个夹角或长宽比，继续比较。" : "试着把夹角调到 60°、长宽比调到 1，观察差值怎样变化。"}</p>
        </div>
        <div className="lattice-energy-bars" aria-label="相同势尺度下的近似能量对比">
          {[{ name: "你的点阵", value: energy }, { name: "方格", value: squareEnergy }, { name: "三角格", value: triangularEnergy }].map(({ name, value }) => <div key={name}><span>{name}</span><i><b style={{ width: `${value / energyMax * 100}%` }} /></i><span>{value.toFixed(8)}</span></div>)}
        </div>
        <section className="lattice-knowledge" aria-label="经典数学与前沿研究的区别">
          <h3>哪些是已有知识，哪些是新主张？</h3>
          <div><span>经典基础</span><p>{research.classicalBackground}</p></div>
          <div><span>数值探索</span><p>{research.experimentScope}</p></div>
          <div className="lattice-knowledge-frontier"><span>前沿主张</span><p>{research.frontierScope}</p></div>
        </section>
      </section>
      <aside className="lattice-console" aria-label="晶格参数">
        <div className="lattice-console-heading"><span>改变排列，保持密度</span><b>单元面积 {cellArea(basis).toFixed(4)}</b></div>
        <div className="lattice-presets"><button type="button" aria-pressed={isSquare} onClick={() => preset(90)}>方格 · 90°</button><button type="button" aria-pressed={isTriangular} onClick={() => preset(60)}>三角格 · 60°</button></div>
        {([
          { key: "angle", label: "晶格夹角 θ", suffix: "°", hint: "改变两个基向量之间的夹角。" },
          { key: "ratio", label: "长宽比 r", suffix: "", hint: "拉长一边时，另一边会补偿，保持面积不变。" },
          { key: "alpha", label: "势尺度 α", suffix: "", hint: "α 越大，远处粒子的贡献衰减得越快。" },
        ] as const).map(({ key, label, suffix, hint }) => <label className="lattice-control" key={key}>
          <span>{label}<output>{parameters[key].toFixed(key === "angle" ? 0 : 2)}{suffix}</output></span>
          <input
            type="range"
            aria-label={label}
            {...LATTICE_DOMAIN[key]}
            value={parameters[key]}
            style={{ "--lattice-progress": `${(parameters[key] - LATTICE_DOMAIN[key].min) / (LATTICE_DOMAIN[key].max - LATTICE_DOMAIN[key].min) * 100}%` } as CSSProperties}
            onChange={(event) => setParameters((previous: Parameters) => ({ ...previous, [key]: Number(event.target.value) }))}
            onPointerUp={() => record(key, parameters[key])}
            onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) record(key, parameters[key]); }}
          />
          <small>{hint}</small>
        </label>)}
        <button type="button" className="lattice-reset" onClick={() => { setParameters(DEFAULTS); record("reset", 1); }}>恢复默认</button>
        <div className="lattice-formula"><span>经典数学工具 · 高斯势能量定义</span><p role="math">Eα(L) = Σᵥ≠₀ exp(−α‖v‖²)</p><small>从中心粒子向所有其他点求和，排除自身；每个非零向量计一次，不乘 ½。这一能量定义是理解研究的工具。</small></div>
        <details className="lattice-details"><summary>这个实验说明了什么？</summary>
          <p>这里比较的是二维晶格中的高斯能量。三角形排列也出现在经典的平面圆堆积中，但最密堆积与最低能量是不同的问题。</p>
          <p>屏幕只画出部分点阵；计算取距离中心不超过 8 的全部晶格点。所示数值是截断近似，有限次比较不能证明一般最优性。</p>
          <p>单位密度约束：ab sinθ = 1；r = a/b；a = √(r/sinθ)，b = √(1/(r sinθ))。在本实验参数网格中，半径 8 与 10 的求和差小于 10⁻¹⁰。这是数值核对容限，不是一般势函数的误差定理。</p>
        </details>
        <details className="lattice-details"><summary>OpenAI 研究来源与验证范围</summary>
          <p>{research.origin}</p><p>{research.title}</p>
          <p>{research.version} · 家族 {research.familyId}</p><p>{research.claim}</p><p>{research.verification}</p>
          <p>高斯势属于上述势函数类；任意吸引与排斥势不自动适用这些主张。</p>
          <div className="lattice-sources"><a href={research.paperUrl} target="_blank" rel="noreferrer">手稿固定版本 ↗</a><a href={research.scopeUrl} target="_blank" rel="noreferrer">形式化范围 ↗</a><a href={research.repositoryUrl} target="_blank" rel="noreferrer">仓库验证说明 ↗</a></div>
        </details>
      </aside>
    </div>
  </div>;
}
