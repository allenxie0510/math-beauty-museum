"use client";

import { useEffect, useRef, useState } from "react";

type ToolId = "spiro" | "symmetry" | "waves";
type RecipeValues = [number, number, number];
type WorkshopRecipe = { tool: ToolId; values: RecipeValues; color: string };
type SavedRecipe = { id: string; recipe: WorkshopRecipe };
type ToolDefinition = {
  icon: string;
  name: string;
  short: string;
  canvasName: string;
  formula: string;
  summary: string;
  defaults: RecipeValues;
  controls: Array<{ symbol: string; name: string; explanation: string; min: number; max: number }>;
};

const COLORS = ["#8f7cff", "#57d9ff", "#ff6fae", "#9ae66e"];
const STORAGE_KEY = "math-beauty-workshop-recipes-v1";

const TOOLS: Record<ToolId, ToolDefinition> = {
  spiro: {
    icon: "◎",
    name: "旋轮线画笔",
    short: "齿轮滚出的曲线",
    canvasName: "旋轮线作品",
    formula: "x = (R − r) cos t + d cos ((R − r)t/r)",
    summary: "大齿轮 R · 小齿轮 r · 画笔位置 d",
    defaults: [13, 5, 8],
    controls: [
      { symbol: "R", name: "大齿轮", explanation: "R 越大，作品的整体骨架越宽。", min: 8, max: 18 },
      { symbol: "r", name: "小齿轮", explanation: "r 改变小齿轮的转速，也会改变花瓣数量。", min: 2, max: 9 },
      { symbol: "d", name: "画笔位置", explanation: "d 是画笔离小齿轮中心的距离。", min: 1, max: 12 },
    ],
  },
  symmetry: {
    icon: "✣",
    name: "对称印花",
    short: "旋转复制一片花瓣",
    canvasName: "玫瑰线印花",
    formula: "ρ = a · cos(kθ + φ)",
    summary: "图案半径 a · 对称次数 k · 旋转角 φ",
    defaults: [8, 5, 24],
    controls: [
      { symbol: "a", name: "图案半径", explanation: "a 决定每一片曲线伸展得有多远。", min: 4, max: 12 },
      { symbol: "k", name: "对称次数", explanation: "k 改变旋转复制的次数，也改变花瓣数。", min: 2, max: 12 },
      { symbol: "φ", name: "旋转角", explanation: "φ 让整组花瓣绕中心慢慢旋转。", min: 0, max: 90 },
    ],
  },
  waves: {
    icon: "∿",
    name: "波形织布机",
    short: "两个振动织成轨迹",
    canvasName: "李萨如波纹",
    formula: "x = sin(αt + δ),  y = sin(βt)",
    summary: "横向频率 α · 纵向频率 β · 相位差 δ",
    defaults: [3, 4, 45],
    controls: [
      { symbol: "α", name: "横向频率", explanation: "α 表示画笔左右振动的速度。", min: 1, max: 9 },
      { symbol: "β", name: "纵向频率", explanation: "β 表示画笔上下振动的速度。", min: 1, max: 9 },
      { symbol: "δ", name: "相位差", explanation: "δ 改变两次振动从哪里开始相遇。", min: 0, max: 180 },
    ],
  },
};
const TOOL_IDS = Object.keys(TOOLS) as ToolId[];

function prepareCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);
  const gradient = context.createRadialGradient(width * .5, height * .5, 0, width * .5, height * .5, Math.max(width, height) * .7);
  gradient.addColorStop(0, "#171a2d");
  gradient.addColorStop(.48, "#0d101c");
  gradient.addColorStop(1, "#06080e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(255,255,255,.035)";
  context.lineWidth = 1;
  for (let x = 24; x < width; x += 36) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 24; y < height; y += 36) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  return { context, width, height };
}

function setArtworkStroke(context: CanvasRenderingContext2D, color: string, lineWidth = 1.35) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.globalAlpha = .92;
}

function drawSpirograph(context: CanvasRenderingContext2D, width: number, height: number, values: RecipeValues, color: string, progress: number) {
  const [outer, inner, pen] = values;
  const turns = Math.min(60, inner * 2);
  const totalSteps = 1700;
  const steps = Math.max(2, Math.round(totalSteps * progress));
  const scale = Math.min(width, height) * .38 / Math.max(outer - inner + pen, 1);
  context.save(); context.translate(width / 2, height / 2); context.beginPath();
  for (let index = 0; index <= steps; index += 1) {
    const angle = index / totalSteps * Math.PI * 2 * turns;
    const x = (outer - inner) * Math.cos(angle) + pen * Math.cos((outer - inner) / inner * angle);
    const y = (outer - inner) * Math.sin(angle) - pen * Math.sin((outer - inner) / inner * angle);
    if (index === 0) context.moveTo(x * scale, y * scale); else context.lineTo(x * scale, y * scale);
  }
  setArtworkStroke(context, color); context.stroke(); context.restore();
}

function drawSymmetry(context: CanvasRenderingContext2D, width: number, height: number, values: RecipeValues, color: string, progress: number) {
  const [radius, symmetry, rotation] = values;
  const totalSteps = 1200;
  const steps = Math.max(2, Math.round(totalSteps * progress));
  const scale = Math.min(width, height) * .038 * radius;
  context.save(); context.translate(width / 2, height / 2);
  for (let layer = 0; layer < 4; layer += 1) {
    context.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const angle = index / totalSteps * Math.PI * 2;
      const rho = Math.cos(symmetry * angle + rotation * Math.PI / 180 + layer * .12) * (1 - layer * .11);
      const x = Math.cos(angle) * rho * scale;
      const y = Math.sin(angle) * rho * scale;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    setArtworkStroke(context, color, 1.25 - layer * .14);
    context.globalAlpha = .88 - layer * .16;
    context.stroke();
  }
  context.restore();
}

function drawWaves(context: CanvasRenderingContext2D, width: number, height: number, values: RecipeValues, color: string, progress: number) {
  const [horizontal, vertical, phase] = values;
  const totalSteps = 1300;
  const steps = Math.max(2, Math.round(totalSteps * progress));
  const scaleX = width * .34;
  const scaleY = height * .34;
  context.save(); context.translate(width / 2, height / 2);
  for (let strand = -5; strand <= 5; strand += 1) {
    context.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const time = index / totalSteps * Math.PI * 2;
      const offset = strand * .026;
      const x = Math.sin(horizontal * time + phase * Math.PI / 180 + offset * 4) * scaleX;
      const y = Math.sin(vertical * time + offset) * scaleY + strand * 2.4;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    setArtworkStroke(context, color, strand === 0 ? 1.45 : .8);
    context.globalAlpha = strand === 0 ? .92 : .24;
    context.stroke();
  }
  context.restore();
}

function drawArtwork(canvas: HTMLCanvasElement, recipe: WorkshopRecipe, progress: number) {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  if (recipe.tool === "spiro") drawSpirograph(context, width, height, recipe.values, recipe.color, progress);
  if (recipe.tool === "symmetry") drawSymmetry(context, width, height, recipe.values, recipe.color, progress);
  if (recipe.tool === "waves") drawWaves(context, width, height, recipe.values, recipe.color, progress);
}

function WorkshopRange({ symbol, name, explanation, min, max, value, onChange }: { symbol: string; name: string; explanation: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return <label className="workshop-range"><span><b><i>{symbol}</i>{name}</b><strong>{value}</strong></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={`${name}，公式变量 ${symbol}`} /><small>{explanation}</small></label>;
}

function isSavedRecipe(value: unknown): value is SavedRecipe {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedRecipe>;
  return typeof candidate.id === "string" && !!candidate.recipe && typeof candidate.recipe.tool === "string" && Object.hasOwn(TOOLS, candidate.recipe.tool) && Array.isArray(candidate.recipe.values) && candidate.recipe.values.length === 3 && candidate.recipe.values.every((entry) => typeof entry === "number" && Number.isFinite(entry)) && COLORS.includes(candidate.recipe.color);
}

function storeSavedRecipes(recipes: SavedRecipe[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    return true;
  } catch {
    return false;
  }
}

export function InteractiveWorkshop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recipe, setRecipe] = useState<WorkshopRecipe>({ tool: "spiro", values: [...TOOLS.spiro.defaults], color: COLORS[0] });
  const [isPlaying, setIsPlaying] = useState(true);
  const [drawProgress, setDrawProgress] = useState(0);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [notice, setNotice] = useState("拖动一个变量，观察公式怎样改变作品");
  const definition = TOOLS[recipe.tool];
  const isAnimating = isPlaying && drawProgress < 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
        if (Array.isArray(stored)) setSavedRecipes(stored.filter(isSavedRecipe).slice(0, 6));
      } catch {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isPlaying || drawProgress >= 1) return;
    let frame = 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      frame = window.requestAnimationFrame(() => setDrawProgress(1));
      return () => window.cancelAnimationFrame(frame);
    }
    const startedAt = performance.now() - drawProgress * 1150;
    const animate = (now: number) => {
      const next = Math.min(1, (now - startedAt) / 1150);
      setDrawProgress(next);
      if (next < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [drawProgress, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => drawArtwork(canvas, recipe, isPlaying ? drawProgress : 1);
    render();
    if (!("ResizeObserver" in window)) {
      window.addEventListener("resize", render, { passive: true });
      return () => window.removeEventListener("resize", render);
    }
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawProgress, isPlaying, recipe]);

  const restartDrawing = (message: string) => {
    setIsPlaying(true); setDrawProgress(0); setNotice(message);
  };
  const selectTool = (tool: ToolId) => {
    setRecipe((current) => ({ tool, values: [...TOOLS[tool].defaults], color: current.color }));
    restartDrawing(`已换成${TOOLS[tool].name}，试着改变一个变量`);
  };
  const handleToolKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tool: ToolId) => {
    const currentIndex = TOOL_IDS.indexOf(tool);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % TOOL_IDS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + TOOL_IDS.length) % TOOL_IDS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TOOL_IDS.length - 1;
    else return;
    event.preventDefault();
    const nextTool = TOOL_IDS[nextIndex];
    selectTool(nextTool);
    window.requestAnimationFrame(() => document.getElementById(`workshop-tab-${nextTool}`)?.focus());
  };
  const updateValue = (index: number, value: number) => {
    setRecipe((current) => { const values = [...current.values] as RecipeValues; values[index] = value; return { ...current, values }; });
    restartDrawing(`${definition.controls[index].symbol} 已变成 ${value}，画布正在重新计算`);
  };
  const updateColor = (color: string) => {
    setRecipe((current) => ({ ...current, color })); restartDrawing("颜色变了，数学规则保持不变");
  };
  const randomize = () => {
    const values = definition.controls.map((control) => Math.floor(Math.random() * (control.max - control.min + 1)) + control.min) as RecipeValues;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    setRecipe((current) => ({ ...current, values, color })); restartDrawing("发现一组新的数学规则");
  };
  const replayDrawing = () => {
    if (isAnimating) { setIsPlaying(false); setDrawProgress(1); setNotice("作品已完成绘制"); return; }
    restartDrawing("正在重播这件作品的生成过程");
  };
  const saveRecipe = () => {
    const saved: SavedRecipe = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, recipe: { ...recipe, values: [...recipe.values] } };
    const next = [saved, ...savedRecipes].slice(0, 6);
    setSavedRecipes(next); setNotice(storeSavedRecipes(next) ? "作品配方已放入你的陈列架" : "浏览器不允许长期保存，但本次参观中仍可取回作品");
  };
  const loadRecipe = (saved: SavedRecipe) => {
    setRecipe({ ...saved.recipe, values: [...saved.recipe.values] }); restartDrawing(`已从陈列架取回${TOOLS[saved.recipe.tool].name}`);
  };
  const removeRecipe = (id: string) => {
    const next = savedRecipes.filter((saved) => saved.id !== id);
    setSavedRecipes(next); storeSavedRecipes(next); setNotice("这张作品配方已从陈列架移除");
  };
  const downloadArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `数学美学展-${definition.name}.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("作品图片已生成，可以分享给朋友了");
    }, "image/png");
  };

  return (
    <section className="workshop-world" id="workshop" aria-labelledby="workshop-title">
      <div className="workshop-orbit workshop-orbit-a" aria-hidden="true" /><div className="workshop-orbit workshop-orbit-b" aria-hidden="true" />
      <header className="workshop-intro">
        <span>MAKE WITH MATHEMATICS · 互动工坊</span><h2 id="workshop-title">把公式变成<br /><em>你的作品</em></h2>
        <p>这里没有标准答案。选择一支数学画笔，改变公式中的变量，看看只属于你的图案怎样诞生。</p>
        <ol aria-label="工坊创作步骤"><li><b>01</b> 选择工具</li><li><b>02</b> 改变规则</li><li><b>03</b> 收下作品</li></ol>
      </header>
      <div className="workshop-studio">
        <div className="workshop-toolbar" role="tablist" aria-label="选择数学创作工具">
          {TOOL_IDS.map((tool) => { const item = TOOLS[tool]; const active = recipe.tool === tool; return <button key={tool} id={`workshop-tab-${tool}`} className={active ? "active" : ""} role="tab" aria-selected={active} aria-controls="workshop-canvas-panel" tabIndex={active ? 0 : -1} onClick={() => selectTool(tool)} onKeyDown={(event) => handleToolKeyDown(event, tool)}><i>{item.icon}</i><span>{item.name}<small>{item.short}</small></span></button>; })}
        </div>
        <div className="workshop-canvas-wrap" id="workshop-canvas-panel" role="tabpanel" aria-labelledby={`workshop-tab-${recipe.tool}`}>
          <div className="workshop-canvas-heading"><span>LIVE CANVAS · 实时画布</span><b>{definition.canvasName}</b></div>
          <canvas ref={canvasRef} aria-label={`${definition.canvasName}实时预览`}>你的浏览器暂时无法显示画布，但仍可使用右侧控件认识公式。</canvas>
          <div className="workshop-canvas-actions"><button onClick={replayDrawing}>{isAnimating ? "立即完成" : "重播生成"}</button><button onClick={randomize}>给我一个惊喜</button><button onClick={downloadArtwork}>保存为图片 ↓</button></div>
          <p className="workshop-live-notice" aria-live="polite"><i style={{ background: recipe.color }} />{notice}</p>
        </div>
        <aside className="workshop-controls" aria-label={`${definition.name}变量控制台`}>
          <div className="workshop-formula"><span>正在使用的规则</span><strong>{definition.formula}</strong><p>{definition.summary}</p></div>
          {definition.controls.map((control, index) => <WorkshopRange key={control.symbol} {...control} value={recipe.values[index]} onChange={(value) => updateValue(index, value)} />)}
          <fieldset className="workshop-palette"><legend>选择线条颜色</legend><div>{COLORS.map((color) => <button key={color} className={recipe.color === color ? "active" : ""} style={{ "--swatch": color } as React.CSSProperties} onClick={() => updateColor(color)} aria-label={`选择颜色 ${color}`} aria-pressed={recipe.color === color} />)}</div></fieldset>
          <button className="workshop-save" type="button" onClick={saveRecipe}><span>收藏这组规则</span><i>放入作品架 ↗</i></button>
        </aside>
      </div>
      <section className="workshop-shelf" aria-labelledby="workshop-shelf-title">
        <div><span>YOUR RECIPE SHELF</span><h3 id="workshop-shelf-title">我的作品配方</h3><p>配方只保存在这台设备中，不会上传你的信息。</p></div>
        <div className="workshop-shelf-items">
          {savedRecipes.length === 0 && <p className="workshop-shelf-empty">还没有作品。调好喜欢的图案后，点击“收藏这组规则”。</p>}
          {savedRecipes.map((saved, index) => <article key={saved.id}><button className="workshop-recipe-load" onClick={() => loadRecipe(saved)}><i style={{ "--recipe-color": saved.recipe.color } as React.CSSProperties}>{TOOLS[saved.recipe.tool].icon}</i><span><b>作品 {String(savedRecipes.length - index).padStart(2, "0")}</b><small>{TOOLS[saved.recipe.tool].name} · {saved.recipe.values.join(" / ")}</small></span></button><button className="workshop-recipe-remove" onClick={() => removeRecipe(saved.id)} aria-label={`移除作品 ${savedRecipes.length - index}`}>×</button></article>)}
        </div>
      </section>
      <footer className="workshop-note"><span>数学不是只用来计算</span><p>当规则可以被看见、触摸和改变，公式也会成为一种创作语言。</p></footer>
    </section>
  );
}
