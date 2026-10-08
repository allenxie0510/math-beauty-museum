"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { observeElementSize } from "../viewport";
import { ResearchRange } from "./ResearchLab";
import { gaussianResearch } from "./catalog";
import { gaussianWindow, gaussianComponent, gaussianKey, isGaussianPrime, type GaussianPoint } from "./gaussian-moat";
import DiscreteWorkspace from "./DiscreteWorkspace";
const name = ([a, b]: GaussianPoint) => `${a}${b < 0 ? "−" : "+"}${Math.abs(b)}i`;
type Graph = ReturnType<typeof gaussianComponent>;

function PrimePlot({ points, graph, radius, start, lines, onSelect }: { points: GaussianPoint[]; graph: Graph; radius: number; start: GaussianPoint; lines: boolean; onSelect: (p: GaussianPoint) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    return observeElementSize(canvas, () => {
      const { width, height } = canvas.getBoundingClientRect(), size = Math.min(width, height), dpr = Math.min(devicePixelRatio || 1, 2); if (size <= 44) return;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.translate((width - size) / 2, (height - size) / 2);
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
  return <canvas ref={ref} role="img" aria-label="高斯素数图，金色为当前窗口可达点，青色圆圈为起点；点击素数可更换起点，也可展开起点设置输入坐标" onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect(), size = Math.min(rect.width, rect.height), scale = (size - 44) / (2 * radius), x = e.clientX - rect.left - (rect.width - size) / 2, y = e.clientY - rect.top - (rect.height - size) / 2;
    if (scale <= 0 || x < 22 || x > size - 22 || y < 22 || y > size - 22) return;
    let distance = 12 ** 2, selected: GaussianPoint | null = null;
    for (const point of points) { const d = (size / 2 + point[0] * scale - x) ** 2 + (size / 2 - point[1] * scale - y) ** 2;if (d < distance) { distance = d;selected = point; } }
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
  return <DiscreteWorkspace title="高斯素数护城河" subtitle="每一步都有限长，能沿着素数走多远？" research={gaussianResearch} onBack={onBack}
    onReset={() => { setRadius(24);setStepSquared(2);setLines(true);select([1, 1]); }}
    stageTitle="高斯整数平面 · 点击素数选择起点"
    stageTools={<button aria-pressed={lines} onClick={() => setLines(!lines)}>{lines ? "隐藏探索连线" : "显示探索连线"}</button>}
    stage={<PrimePlot points={points} graph={graph} radius={radius} start={start} lines={lines} onSelect={select} />}
    legend={<>金色：可达素数 · 灰蓝：其他素数 · 青色圈：起点。{lines ? "连线是一棵探索树。" : "隐藏连线不改变计算。"}</>}
    scope="窗口边框不是数学护城河。这里只报告当前起点，不能据此给出全平面的统一上界。"
    controls={<>
      <section className="discrete-result" aria-live="polite"><span>当前窗口可达 · 起点 {name(start)}</span><strong>{graph.visited.size}<small> 个高斯素数</small></strong><p>窗口内共 {points.length} 点 · D²={stepSquared}</p></section>
      <div className={`discrete-boundary${graph.escapingEdge ? " is-truncated" : ""}`} role="status"><b>{graph.escapingEdge ? "存在跨窗连边 · 分量被截断" : "当前起点未发现跨窗连边"}</b><span>{graph.escapingEdge ? `${name(graph.escapingEdge[0])} → ${name(graph.escapingEdge[1])}；可扩大窗口观察。` : "检查包含可达点到窗外的所有允许邻点。"}</span></div>
      <div className="discrete-primary-controls">
        <ResearchRange item="gaussian" label="最大步长 D" min={0} max={36} step={1} value={stepSquared} display={`√${stepSquared} ≈ ${Math.sqrt(stepSquared).toFixed(3)}`} onChange={setStepSquared} />
        <div className="discrete-presets" role="group" aria-label="步长预设">{[2, 4, 5, 9, 16, 36].map((n) => <button key={n} aria-pressed={stepSquared === n} onClick={() => setStepSquared(n)}>{Number.isInteger(Math.sqrt(n)) ? Math.sqrt(n) : `√${n}`}</button>)}</div>
        <label className="discrete-select">窗口范围<select aria-label="高斯素数窗口范围" value={radius} onChange={(e) => { const r = Number(e.target.value);setRadius(r);if (Math.max(...start.map(Math.abs)) > r) { select([1, 1]);setMessage("缩小窗口后，起点已回到 1+1i。"); } }}>{[12, 24, 40, 60].map((r) => <option key={r} value={r}>实部／虚部：−{r} 到 {r}</option>)}</select></label>
      </div>
      <div className="discrete-presets" role="group" aria-label="起点预设">{([[1, 1], [3, 0], [8, 3]] as GaussianPoint[]).map((point) => <button key={gaussianKey(point)} aria-pressed={gaussianKey(start) === gaussianKey(point)} onClick={() => select(point)}>从 {name(point)}</button>)}</div>
      <details className="discrete-details"><summary>输入起点坐标</summary><form className="discrete-form" onSubmit={submit}><label>实部 a<input aria-label="起点实部 a" type="number" min={-radius} max={radius} step={1} value={a} onChange={(e) => setA(e.target.value)} /></label><label>虚部 b<input aria-label="起点虚部 b" type="number" min={-radius} max={radius} step={1} value={b} onChange={(e) => setB(e.target.value)} /></label><button type="submit">使用此起点</button></form></details>
      {message && <p className="discrete-message" role="status">{message}</p>}
    </>}
    explanation={<><h4>经典判定 · 高斯素数</h4><p role="math">ab≠0：a²+b² 是普通素数<br />ab=0：非零坐标的绝对值是模 4 余 3 的普通素数</p><p>0、±1、±i 不是高斯素数。2 在坐标轴上也不是高斯素数。</p><h4>有限窗口与边界检查</h4><p>窗口内完整枚举整数格点并判素；广度优先搜索所有距离平方≤D²的整数偏移。滑杆按整数距离平方分档。金色连线只是一棵探索树，不是所有边，也不是一条不重复路径。</p><p>对每个可达点检查所有允许邻点，包括窗外素数。发现跨窗连边时明确报告截断。没有跨窗连边也不据此估计手稿的全局统一上界 B_D。</p><p>最大窗口 121×121 格点，D≤6；固定预算同步计算，不运行无限搜索。屏幕中的点数不是 B_D。</p></>}
  />;
}
