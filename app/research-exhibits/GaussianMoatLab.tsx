"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { observeElementSize } from "../viewport";
import { ResearchLab, ResearchRange } from "./ResearchLab";
import { gaussianResearch } from "./catalog";
import { gaussianWindow, gaussianComponent, gaussianKey, isGaussianPrime, type GaussianPoint } from "./gaussian-moat";
const name = ([a, b]: GaussianPoint) => `${a}${b < 0 ? "−" : "+"}${Math.abs(b)}i`;
type Graph = ReturnType<typeof gaussianComponent>;

function PrimePlot({ points, graph, radius, start, lines, onSelect }: { points: GaussianPoint[]; graph: Graph; radius: number; start: GaussianPoint; lines: boolean; onSelect: (p: GaussianPoint) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    return observeElementSize(canvas, () => {
      const size = canvas.getBoundingClientRect().width, dpr = Math.min(devicePixelRatio || 1, 2); if (!size) return;
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      const scale = (size - 44) / (2 * radius), center = size / 2;
      const map = ([a, b]: GaussianPoint) => [center + a * scale, center - b * scale];
      ctx.strokeStyle = "#a4b9d122"; ctx.lineWidth = 1;
      for (const n of [-radius, -radius / 2, 0, radius / 2, radius]) { const x = center + n * scale;ctx.beginPath();ctx.moveTo(x, 22);ctx.lineTo(x, size - 22);ctx.moveTo(22, x);ctx.lineTo(size - 22, x);ctx.stroke(); }
      ctx.strokeStyle = graph.escapingEdge ? "#e6b472" : "#728ea7"; ctx.setLineDash([5, 4]);ctx.strokeRect(22, 22, size - 44, size - 44);ctx.setLineDash([]);
      if (lines) { ctx.strokeStyle = "#f4bd853c";ctx.lineWidth = 1;ctx.beginPath();for (const [a, b] of graph.tree) { ctx.moveTo(...map(a) as [number, number]); ctx.lineTo(...map(b) as [number, number]); }ctx.stroke(); }
      for (const point of points) { const [x, y] = map(point), reached = graph.visited.has(gaussianKey(point));ctx.fillStyle = reached ? "#f4bd85" : "#728aa9";ctx.beginPath();ctx.arc(x, y, Math.max(1.5, Math.min(3.5, scale * .17)), 0, Math.PI * 2);ctx.fill(); }
      const [sx, sy] = map(start); ctx.strokeStyle = "#a1f5dd";ctx.lineWidth = 2.5;ctx.beginPath();ctx.arc(sx, sy, 7, 0, Math.PI * 2);ctx.stroke();
      ctx.fillStyle = "#b7c4d6";ctx.font = "11px sans-serif";ctx.fillText(`−${radius}`, 17, size - 6);ctx.fillText(`${radius} · Re`, size - 60, size - 6);ctx.fillText(`${radius} · Im`, 25, 14);ctx.fillText("0", center + 4, center + 14);
    });
  }, [points, graph, radius, start, lines]);
  return <canvas ref={ref} role="img" aria-label="高斯素数图，金色为当前窗口可达点，青色圆圈为起点；点击素数可更换起点，下方也可输入坐标" onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect(), scale = (rect.width - 44) / (2 * radius), x = e.clientX - rect.left, y = e.clientY - rect.top;
    let distance = 12 ** 2, selected: GaussianPoint | null = null;
    for (const point of points) { const d = (rect.width / 2 + point[0] * scale - x) ** 2 + (rect.width / 2 - point[1] * scale - y) ** 2;if (d < distance) { distance = d;selected = point; } }
    if (selected) onSelect(selected);
  }} />;
}

export default function GaussianMoatLab({ onBack }: { onBack: () => void }) {
  const [radius, setRadius] = useState(24), [stepSquared, setStepSquared] = useState(2), [start, setStart] = useState<GaussianPoint>([1, 1]), [lines, setLines] = useState(true);
  const [a, setA] = useState("1"), [b, setB] = useState("1"), [message, setMessage] = useState("");
  const points = useMemo(() => gaussianWindow(radius), [radius]);
  const graph = useMemo(() => gaussianComponent(points, radius, stepSquared, start), [points, radius, stepSquared, start]);
  const select = (point: GaussianPoint) => { setStart(point);setA(String(point[0]));setB(String(point[1]));setMessage(""); };
  const submit = (event: FormEvent) => { event.preventDefault();const x = Number(a), y = Number(b);if (!a.trim() || !b.trim() || !Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > radius || Math.abs(y) > radius) { setMessage(`请输入 −${radius} 到 ${radius} 之间的整数坐标。`);return; }if (!isGaussianPrime(x, y)) { setMessage(`${name([x, y])} 不是高斯素数，请换一个起点。`);return; }select([x, y]); };
  return <ResearchLab title="高斯素数护城河" subtitle="每一步都有限长，能沿着素数走多远？" backLabel="返回互动工坊" onBack={onBack} research={gaussianResearch} controls={<>
    <div className="lattice-console-heading"><span>选择步长与起点</span><b>四个象限 · 包含坐标轴素数</b></div>
    <ResearchRange item="gaussian" label="最大步长 D" min={0} max={36} step={1} value={stepSquared} display={`√${stepSquared} ≈ ${Math.sqrt(stepSquared).toFixed(3)}`} onChange={setStepSquared} hint="按整数距离平方分档；当两点欧氏距离 ≤ D 时连边。" />
    <div className="research-presets">{[2, 4, 5, 9, 16, 36].map((n) => <button key={n} aria-pressed={stepSquared === n} onClick={() => setStepSquared(n)}>{Number.isInteger(Math.sqrt(n)) ? Math.sqrt(n) : `√${n}`}</button>)}</div>
    <label className="research-select">窗口范围<select aria-label="高斯素数窗口范围" value={radius} onChange={(e) => { const r = Number(e.target.value);setRadius(r);if (Math.max(...start.map(Math.abs)) > r) { select([1, 1]);setMessage("缩小窗口后，起点已回到 1+1i。"); } }}>{[12, 24, 40, 60].map((r) => <option key={r} value={r}>实部／虚部：−{r} 到 {r}</option>)}</select></label>
    <div className="research-presets">{([[1, 1], [3, 0], [8, 3]] as GaussianPoint[]).map((point) => <button key={gaussianKey(point)} onClick={() => select(point)}>从 {name(point)}</button>)}</div>
    <form className="gaussian-start" onSubmit={submit}><label>实部 a<input aria-label="起点实部 a" type="number" min={-radius} max={radius} step={1} value={a} onChange={(e) => setA(e.target.value)} /></label><label>虚部 b<input aria-label="起点虚部 b" type="number" min={-radius} max={radius} step={1} value={b} onChange={(e) => setB(e.target.value)} /></label><button type="submit">使用此起点</button></form>
    <p className="gaussian-message" role="status">{message || "也可以直接点击图中的素数点。"}</p>
    <div className="research-presets"><button aria-pressed={lines} onClick={() => setLines(!lines)}>{lines ? "隐藏探索连线" : "显示探索连线"}</button><button onClick={() => { setRadius(24);setStepSquared(2);setLines(true);select([1, 1]); }}>恢复默认</button></div>
    <div className="lattice-formula"><span>经典判定 · 高斯素数</span><p role="math">ab≠0：a²+b² 是普通素数</p><p role="math">ab=0：非零坐标的绝对值是<br />模 4 余 3 的普通素数</p><small>0、±1、±i 不是高斯素数。2 在坐标轴上也不是高斯素数。</small></div>
    <details className="lattice-details"><summary>有限窗口与边界检查</summary><p>窗口内完整枚举整数格点并判素；广度优先搜索所有距离平方≤D²的整数偏移。金色连线只是一棵探索树，不是所有边，也不是一条不重复路径。</p><p>对每个可达点检查所有允许邻点，包括窗外素数。若发现跨窗连边，明确报告截断。没有跨窗连边也不据此估计手稿的全局统一上界 B_D。</p><p>最大窗口121×121格点，D≤6；固定预算同步计算，不运行无限搜索。</p></details>
  </>}>
    <div className="lattice-result" aria-live="polite"><span>当前窗口可达范围 · 起点 {name(start)}</span><strong>{graph.visited.size} 个高斯素数</strong><p>窗口内共 {points.length} 点 · D²={stepSquared} · 最大步长约 {Math.sqrt(stepSquared).toFixed(3)}</p></div>
    <p className={`research-note${graph.escapingEdge ? " gaussian-truncated" : ""}`} role="status">{graph.escapingEdge ? `存在跨窗连边：${name(graph.escapingEdge[0])} → ${name(graph.escapingEdge[1])}。当前分量被窗口截断，可扩大窗口继续观察。` : "当前可达分量未发现跨窗连边；这里只报告该起点的计算结果，不给出所有起点的统一上界。"} 窗口边框不是数学护城河。</p>
    <figure className="research-stage gaussian-stage"><PrimePlot points={points} graph={graph} radius={radius} start={start} lines={lines} onSelect={select} /><figcaption>金色：可达素数 · 灰蓝：其他素数 · 青色圈：起点。{lines ? "连线展示探索树，分叉不代表一条连续不重复行走路线。" : "所有允许连边仍参与计算，当前仅隐藏连线。"}</figcaption></figure>
    <p className="research-note">有限画面帮助理解“有界步长”和“连通分量”。手稿声称每个 D 都存在统一有限上界 B_D，但没有给出显式函数；本实验不把屏幕中的点数当作 B_D。</p>
  </ResearchLab>;
}
