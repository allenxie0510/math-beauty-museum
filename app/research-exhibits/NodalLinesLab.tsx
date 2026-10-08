"use client";

import { useState } from "react";
import NodalPlot from "./NodalPlot";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { nodalResearch } from "./catalog";
import { torusEigenvalue, type NodalParameters } from "./nodal-lines";

const DEFAULT: NodalParameters = { m: 2, n: 1, mix: 35, phase: 0 };

export default function NodalLinesLab({ onBack }: { onBack: () => void }) {
  const [parameters, setParameters] = useState(DEFAULT), [tiled, setTiled] = useState(false);
  const eigenvalue = torusEigenvalue(parameters.m, parameters.n);
  const update = (key: keyof NodalParameters, value: number) => setParameters((previous) => ({ ...previous, [key]: value }));
  return <ResearchLab title="闭曲面节点线" subtitle="把相对边接起来，振动的零点就没有边界。" backLabel="返回克拉尼图形" onBack={onBack} research={nodalResearch} controls={<>
    <div className="lattice-console-heading"><span>同一特征值，两种振动方向</span><b>平坦环面 R²/Z² · 无边界</b></div>
    <div className="research-presets"><button aria-pressed={!tiled} onClick={() => setTiled(false)}>展开单元</button><button aria-pressed={tiled} onClick={() => setTiled(true)}>周期拼接</button></div>
    <ResearchRange item="nodal-lines" label="频率 m" value={parameters.m} min={1} max={5} step={1} onChange={(value) => update("m", value)} />
    <ResearchRange item="nodal-lines" label="频率 n" value={parameters.n} min={0} max={5} step={1} onChange={(value) => update("n", value)} />
    <ResearchRange item="nodal-lines" label="混合角 β" value={parameters.mix} min={0} max={90} step={1} display={`${parameters.mix}°`} onChange={(value) => update("mix", value)} hint="只改变同一特征值空间中的组合，λ 保持不变。" />
    <ResearchRange item="nodal-lines" label="相位 φ" value={parameters.phase} min={0} max={360} step={5} display={`${parameters.phase}°`} onChange={(value) => update("phase", value)} />
    <button className="lattice-reset" onClick={() => { setParameters(DEFAULT); setTiled(false); }}>恢复默认</button>
    <div className="lattice-formula"><span>经典模型 · −Δu = λu</span><p role="math">u = cosβ cos(2π(mx+ny))<br />+ sinβ cos(2π(nx−my)+φ)</p><p role="math">λ = 4π²(m²+n²)</p><small>两个频率向量 (m,n)、(n,−m) 正交且等长。m≥1 保证 λ&gt;0；组合不会恒为零。</small></div>
    <details className="lattice-details"><summary>曲面与节点线的边界</summary><p>正方形只是一张展开图，相对边被识别为同一条边，构成无边界的平坦环面。它不使用三维甜甜圈嵌入后的曲面度量。</p><p>白线由当前公式的零点分支自适应细分，以 SVG 矢量路径独立绘制；混合角为45°时用精确直线保留交叉点。幅值底图独立按显示尺寸采样，放大不会放大白线的像素。颜色表示瞬时函数的正负与幅值；白线粗细仅用于辨认，不报告长度，也不拟合论文中的常数 C。</p><p>改变频率可能增加复杂程度；这里不声称每次调整都会使节点线增长。</p></details>
  </>}>
    <figure className="research-stage"><NodalPlot parameters={parameters} tiled={tiled} /><figcaption>暖色 u&gt;0，冷色 u&lt;0，白线 u=0。同色边彼此连接，节点线穿过边缘后继续延伸。</figcaption></figure>
    <div className="nodal-edge-legend"><span>青色：左右相接 ↔</span><span>紫色：上下相接 ↕</span></div>
    <div className="research-stat-row" aria-live="polite"><span>特征值 λ ≈ <b>{eigenvalue.toFixed(3)}</b></span><span>√λ ≈ <b>{Math.sqrt(eigenvalue).toFixed(3)}</b></span><span>积分 ∫u² = <b>½</b></span></div>
    <p className="research-note">先保持 m、n 不变，只调混合角：图案会变，特征值不变。再切换“周期拼接”，观察白线怎样跨越边界。</p>
  </ResearchLab>;
}
