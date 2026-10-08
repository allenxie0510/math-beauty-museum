"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResearchRange } from "./ResearchLab";
import { voronoiResearch } from "./catalog";
import { colorMarks, crossing, percolationState, sampleSites, voronoiCells } from "./voronoi-percolation";
import DiscreteWorkspace from "./DiscreteWorkspace";
const nextSeed = (seed: number) => (seed + 1) >>> 0;
const modes = { colors: "固定点集，只重采样颜色", both: "点集与颜色一起重采样" };
type Mode = keyof typeof modes;
type Stats = { done: number; wins: number; running: boolean };

export default function VoronoiPercolationLab({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(64), [seed, setSeed] = useState(224), [colorSeed, setColorSeed] = useState(2026), [p, setP] = useState(.5);
  const [seedDraft, setSeedDraft] = useState("224"), [colorDraft, setColorDraft] = useState("2026"), [error, setError] = useState("");
  const [showPivotal, setShowPivotal] = useState(true), [showSites, setShowSites] = useState(false), [selected, setSelected] = useState(0), [mode, setMode] = useState<Mode>("colors");
  const [view, setView] = useState<"single" | "sampling">("single");
  const [stats, setStats] = useState<Stats>({ done: 0, wins: 0, running: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), generation = useRef(0);
  const cells = useMemo(() => voronoiCells(sampleSites(count, seed)), [count, seed]);
  const marks = useMemo(() => colorMarks(count, colorSeed), [count, colorSeed]);
  const state = useMemo(() => percolationState(cells, marks, p), [cells, marks, p]);
  const cancel = () => { generation.current++;if (timer.current !== null) clearTimeout(timer.current);timer.current = null; };
  const invalidate = () => { cancel();setStats({ done: 0, wins: 0, running: false }); };
  useEffect(() => () => { generation.current++;if (timer.current !== null) clearTimeout(timer.current); }, []);
  const run = () => {
    cancel();const token = generation.current;let done = 0, wins = 0;setStats({ done, wins, running: true });
    const tick = () => {
      if (token !== generation.current) return;
      for (let k = 0; k < 2 && done < 60; k++) {
        const trialCells = mode === "colors" ? cells : voronoiCells(sampleSites(count, (seed + Math.imul(done + 1, 0x9e3779b9)) >>> 0));
        const trialMarks = colorMarks(count, (colorSeed + Math.imul(done + 1, 0x85ebca6b)) >>> 0);
        if (crossing(trialCells, trialMarks.map(mark => mark <= p)).crosses) wins++;
        done++;
      }
      setStats({ done, wins, running: done < 60 });
      timer.current = done < 60 ? setTimeout(tick, 16) : null;
    };
    timer.current = setTimeout(tick, 0);
  };
  const applySeeds = () => {
    const a = Number(seedDraft), b = Number(colorDraft);
    if (!seedDraft.trim() || !colorDraft.trim() || [a, b].some(n => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) { setError("两个种子都应是 0 到 4294967295 之间的整数。");return; }
    invalidate();setSeed(a);setColorSeed(b);setError("");
  };
  const selectedPivotal = state.pivotal.includes(selected);
  return <DiscreteWorkspace title="Voronoi 渗流" subtitle="让相邻色块连起来：一条贯穿通路如何出现？" research={voronoiResearch} onBack={onBack}
    onReset={() => { invalidate();setCount(64);setSeed(224);setColorSeed(2026);setSeedDraft("224");setColorDraft("2026");setP(.5);setSelected(0);setShowPivotal(true);setShowSites(false);setMode("colors");setView("single");setError(""); }}
    toolbar={<div className="discrete-mode-tabs" role="group" aria-label="Voronoi 实验模式"><button aria-pressed={view === "single"} onClick={() => setView("single")}>单图探索</button><button aria-pressed={view === "sampling"} onClick={() => setView("sampling")}>重复采样{stats.running && " · 运行中"}</button></div>}
    stageTitle={view === "single" ? `青色左→右 · ${state.crosses ? "已贯穿" : "尚未贯穿"}` : "参数预览 · 采样结果见统计面板"}
    stageTools={<><button aria-pressed={showPivotal} onClick={() => setShowPivotal(!showPivotal)}>{showPivotal ? "隐藏关键单元" : "显示关键单元"}</button><button aria-pressed={showSites} onClick={() => setShowSites(!showSites)}>{showSites ? "隐藏生成点" : "显示生成点"}</button></>}
    stage={<svg viewBox="-10 -12 120 124" role="img" aria-label="Voronoi 着色图，青色可通行，白线圈出一条贯穿链，金圈标记关键单元；可点击单元查看，也可使用单元选择框" onClick={event => {
      const matrix = event.currentTarget.getScreenCTM();if (!matrix) return;
      const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      if (x < 0 || x > 100 || y < 0 || y > 100) return;
      let nearest = 0;for (let i = 1; i < count; i++) if (Math.hypot(cells[i].site[0] * 100 - x, cells[i].site[1] * 100 - y) < Math.hypot(cells[nearest].site[0] * 100 - x, cells[nearest].site[1] * 100 - y)) nearest = i;setSelected(nearest);
    }}>
      {cells.map((cell, i) => <polygon key={i} points={cell.polygon.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} fill={state.open[i] ? (state.reached.has(i) ? "#8bd4c4" : "#3f8e89") : "#24344e"} stroke={state.path.includes(i) ? "#fff5db" : "#0a1727"} strokeWidth={state.path.includes(i) ? .6 : .25} />)}
      <path d="M0 0V100M100 0V100" stroke="#f4bd85" strokeWidth="1" />
      {cells.map((cell, i) => <g key={i}>{showSites && <circle cx={cell.site[0] * 100} cy={cell.site[1] * 100} r=".5" fill={state.open[i] ? "#0a2731" : "#a8bbd4"} />}{showPivotal && state.pivotal.includes(i) && <circle cx={cell.site[0] * 100} cy={cell.site[1] * 100} r="1.3" stroke="#ffd08a" strokeWidth=".55" fill="#142036" />}</g>)}
      <circle cx={cells[selected].site[0] * 100} cy={cells[selected].site[1] * 100} r="2" stroke="#e4c7ff" strokeWidth=".5" fill="none" />
      <text x="0" y="-5">左边界</text><text x="100" y="-5" textAnchor="end">右边界</text><text x="50" y="109" textAnchor="middle">点集 {seed} · 着色 {colorSeed}</text>
    </svg>}
    legend={<>亮青：左侧可达 · 暗青：其他开启单元 · 深蓝：关闭。白线：贯穿链 · 金圈：关键单元 · 紫圈：选中单元。</>}
    scope="有限窗口、固定点数示意。单图贯穿与样本频率都不验证全平面 Poisson 模型的极限结论。"
    controls={<>
      <section className="discrete-result" aria-live="polite"><span>{view === "single" ? "左→右贯穿 · 单次样本" : "重复采样 · 有限样本频率"}</span><strong>{view === "single" ? (state.crosses ? "已贯穿" : "尚未贯穿") : (stats.done ? `${(stats.wins / stats.done * 100).toFixed(1)}%` : "尚未采样")}</strong><p>{view === "single" ? `${state.open.filter(Boolean).length}/${count} 格为青色 · ${state.pivotal.length} 个关键单元` : `p=${p.toFixed(2)} · N=${count} · ${stats.wins}/${stats.done} 次贯穿`}</p></section>
      <div className="discrete-primary-controls">
        <ResearchRange item="voronoi" label="青色概率 p" min={0} max={1} step={.01} value={p} display={p.toFixed(2)} onChange={(value) => { invalidate();setP(value); }} />
        <div className="discrete-presets" role="group" aria-label="概率预设">{[0, .3, .5, .7, 1].map(value => <button key={value} aria-pressed={p === value} onClick={() => { invalidate();setP(value); }}>p={value}</button>)}</div>
        <label className="discrete-select">点数 N<select aria-label="Voronoi 点数 N" value={count} onChange={e => { invalidate();setCount(Number(e.target.value));setSelected(0); }}>{[32, 64, 96, 160].map(n => <option key={n} value={n}>{n} 个均匀随机点</option>)}</select></label>
      </div>
      {view === "single" ? <>
        <div className="discrete-presets"><button onClick={() => { invalidate();const value = nextSeed(colorSeed);setColorSeed(value);setColorDraft(String(value)); }}>换一组颜色</button><button onClick={() => { invalidate();const value = nextSeed(seed);setSeed(value);setSeedDraft(String(value)); }}>换一个点集</button></div>
        <p className="discrete-current-cell" role="status"><b>单元 {selected + 1} · {selectedPivotal ? "关键单元" : "非关键单元"}</b><br />{state.open[selected] ? "青色" : "深蓝色"} · 阈值 u={marks[selected].toFixed(4)}。{selectedPivotal ? `只翻转它，结果变为「${state.crosses ? "未贯穿" : "已贯穿"}」。` : "只翻转它，不改变当前贯穿结果。"}</p>
        <details className="discrete-details"><summary>选择单元与复现种子</summary>
          <label className="discrete-select">查看单元<select aria-label="查看 Voronoi 单元" value={selected} onChange={e => setSelected(Number(e.target.value))}>{cells.map((_, i) => <option key={i} value={i}>单元 {i + 1}{state.pivotal.includes(i) ? " · 关键" : ""}</option>)}</select></label>
          <form className="discrete-form" onSubmit={e => { e.preventDefault();applySeeds(); }}><label>点集种子<input type="number" aria-label="点集种子" min={0} max={4294967295} step={1} value={seedDraft} onChange={e => setSeedDraft(e.target.value)} /></label><label>着色种子<input type="number" aria-label="着色种子" min={0} max={4294967295} step={1} value={colorDraft} onChange={e => setColorDraft(e.target.value)} /></label><button type="submit">应用种子</button></form><p role="status" className="discrete-message">{error || "相同点数、两个种子和 p 会重现同一幅图。"}</p>
        </details>
      </> : <section className="discrete-sample-controls" aria-label="重复采样实验">
        <div className="discrete-presets" role="group" aria-label="采样方式">{(Object.keys(modes) as Mode[]).map(key => <button key={key} aria-pressed={mode === key} onClick={() => { if (mode !== key) { invalidate();setMode(key); } }}>{modes[key]}</button>)}</div>
        <p>{mode === "colors" ? "固定点集，只对颜色取平均（quenched）。" : "点集与颜色共同取平均（annealed）。"}</p>
        <div className="discrete-presets"><button disabled={stats.running} onClick={run}>采样 60 次</button>{stats.running && <button onClick={() => { cancel();setStats(value => ({ ...value, running: false })); }}>停止采样</button>}</div>
        <progress aria-label="重复采样进度" max={60} value={stats.done} /><p className="discrete-sample-status" role="status">{stats.done ? `${stats.wins} / ${stats.done} 次贯穿${stats.running ? " · 采样中" : stats.done < 60 ? " · 已停止" : " · 已完成"}` : "尚未采样"}</p>
        <small>样本频率有随机误差。切换页面保留统计；修改参数或采样方式会清除统计。相同设置可复现同一批样本。左图仅作参数预览，不逐帧展示采样图。</small>
      </section>}
    </>}
    explanation={<><h4>模型与边界</h4><p>在单位正方形内放置固定 N 个均匀随机点，把每个位置分给最近的点，得到裁剪后的 Voronoi 单元。只有共享一段正长度边的单元才相邻；仅碰到顶点不连接。青色区域接触左、右边界即视为贯穿。</p><p>未生成窗口外的点，没有周期连接，也没有补入 Poisson 随机点数。这是有限窗口、固定点数模型，与手稿的全平面 Poisson 模型及缩放极限不同。</p><p>每格保存独立伪随机阈值 u∈(0,1)，当 u≤p 时变青。拖动 p 保留每格阈值，p 增大只会增加青色格。</p><h4>Pivotal · 关键单元</h4><p>只翻转一个格子的颜色就改变贯穿结果，它就是当前样本的关键单元，通过逐格试翻转确定。手稿用期望关键点数归一化近临界参数；单张图的金圈个数不能替代这个期望。</p><h4>一幅图不是概率</h4><p>固定点集，只重采样颜色，帮助理解 quenched（给定点集的条件分布）；点集与颜色共同重采样，帮助理解 annealed（联合平均）。两种操作都只针对本展品的有限模型。60 次样本频率有随机误差，不是精确概率。</p><h4>近临界普适性</h4><p>关注 p 接近 1/2、尺度趋细时的贯穿阈值联合分布。手稿声称归一化后与三角晶格参考分布一致；本展品没有计算这种极限或比较两种模型的分布。</p></>}
  />;
}
