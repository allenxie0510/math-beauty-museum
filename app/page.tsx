"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MathGardenWorld } from "./MathGarden3D";

type ExhibitId = "flower" | "forest" | "geometry" | "sound" | "universe";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function DiscoveryStamp({ active }: { active: boolean }) {
  return (
    <span className={`discovery-stamp ${active ? "is-active" : ""}`} aria-label={active ? "已发现" : "尚未发现"}>
      {active ? "✓ 已发现" : "等待探索"}
    </span>
  );
}

function ModernHallSculpture() {
  return (
    <div className="museum-object" aria-label="漂浮在现代展厅中的三维数学装置">
      <div className="object-orbit orbit-wide" />
      <div className="object-orbit orbit-tall" />
      <div className="math-blob blob-pink"><span>φ</span></div>
      <div className="math-blob blob-blue"><span>∞</span></div>
      <div className="math-blob blob-lime"><span>∿</span></div>
      <div className="math-blob blob-orange"><span>△</span></div>
      <div className="object-core"><span>∑</span><small>规律在这里相遇</small></div>
      <div className="object-pedestal"><i /></div>
    </div>
  );
}

function GoldenFlower({ discovered, discover }: { discovered: boolean; discover: () => void }) {
  const [ratio, setRatio] = useState(1.618);
  const petals = useMemo(() => Array.from({ length: 72 }, (_, i) => {
    const angle = Number((i * ratio * 137.508).toFixed(3));
    const radius = 4.1 * Math.sqrt(i);
    return {
      angle,
      x: Number((Math.cos(angle * Math.PI / 180) * radius).toFixed(3)),
      y: Number((Math.sin(angle * Math.PI / 180) * radius).toFixed(3)),
      scale: Number((.58 + i / 170).toFixed(3)),
    };
  }), [ratio]);

  return (
    <ExhibitShell id="flower" no="01" room="自然数学馆 · NATURE" title="黄金比例花" english="Golden Flower" formula="φ ≈ 1.618" color="pink" discovered={discovered}>
      <div className="visual flower-visual" aria-label={`花瓣比例 ${ratio.toFixed(3)}`}>
        <div className="orbit-line orbit-one" />
        <div className="orbit-line orbit-two" />
        <div className="flower-core">
          {petals.map((petal, i) => (
            <span key={i} className="petal" style={{ transform: `translate(${petal.x}px, ${petal.y}px) rotate(${petal.angle}deg) scale(${petal.scale})`, zIndex: i }} />
          ))}
          <i>φ</i>
        </div>
        <p className="visual-caption">花瓣不是随意生长的，<br />它们正在寻找阳光的最佳位置。</p>
      </div>
      <ControlPanel label="拖动比例，观察花的秩序如何改变">
        <div className="live-value"><span>比例值</span><strong>{ratio.toFixed(3)}</strong></div>
        <input aria-label="黄金比例值" type="range" min="0.5" max="2" step="0.001" value={ratio} onChange={(e) => { setRatio(Number(e.target.value)); discover(); }} />
        <div className="range-labels"><span>0.500</span><button onClick={() => { setRatio(1.618); discover(); }}>回到黄金比例</button><span>2.000</span></div>
        <p className="insight"><b>你发现了：</b> 当比例接近 1.618 时，花瓣彼此错开，让每一片都得到更多空间。</p>
      </ControlPanel>
    </ExhibitShell>
  );
}

function FractalForest({ discovered, discover }: { discovered: boolean; discover: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(25);
  const [depth, setDepth] = useState(8);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width = 760;
    const h = c.height = 520;
    ctx.clearRect(0, 0, w, h);
    const rad = angle * Math.PI / 180;
    const branch = (x: number, y: number, len: number, theta: number, level: number) => {
      if (level <= 0) return;
      const nx = x + Math.cos(theta) * len;
      const ny = y + Math.sin(theta) * len;
      const hue = 262 - level * 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.lineWidth = Math.max(1, level * 1.2);
      ctx.lineCap = "round";
      ctx.strokeStyle = level < 3 ? `hsla(${100 + level * 16}, 88%, 68%, .82)` : `hsla(${hue}, 82%, 72%, .82)`;
      ctx.shadowColor = level < 3 ? "#b8f36b" : "#9077ff";
      ctx.shadowBlur = level < 3 ? 8 : 4;
      ctx.stroke();
      branch(nx, ny, len * .72, theta - rad, level - 1);
      branch(nx, ny, len * .72, theta + rad * .82, level - 1);
    };
    branch(w / 2, h - 10, 112, -Math.PI / 2, depth);
  }, [angle, depth]);

  return (
    <ExhibitShell id="forest" no="02" room="自然数学馆 · NATURE" title="分形森林" english="Fractal Forest" formula="Lₙ = L₀ × rⁿ" color="green" discovered={discovered} flip>
      <div className="visual forest-visual"><canvas ref={canvas} aria-label="由递归规则生成的分形树" /><p className="visual-caption">一根枝条重复同一条规则，<br />慢慢长成一整片生命。</p></div>
      <ControlPanel label="改变规则，培育你的数学之树">
        <label className="control-row"><span>分枝角度 <b>{angle}°</b></span><input aria-label="分枝角度" type="range" min="12" max="42" value={angle} onChange={(e) => { setAngle(Number(e.target.value)); discover(); }} /></label>
        <label className="control-row"><span>生长层级 <b>{depth}</b></span><input aria-label="生长层级" type="range" min="4" max="10" value={depth} onChange={(e) => { setDepth(Number(e.target.value)); discover(); }} /></label>
        <button className="action-button green" onClick={() => { setAngle(Math.round(16 + Math.random() * 22)); setDepth(Math.round(6 + Math.random() * 4)); discover(); }}>生成一棵新树 <span>↗</span></button>
        <p className="insight"><b>你发现了：</b> 自然的复杂并不一定需要复杂的指令，重复一条简单规则就够了。</p>
      </ControlPanel>
    </ExhibitShell>
  );
}

function GeometryBuilder({ discovered, discover }: { discovered: boolean; discover: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const cValue = Math.sqrt(a * a + b * b);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = 760; cv.height = 520;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const ox = 155, oy = 410, scale = 48;
    const ax = ox + a * scale, ay = oy;
    const bx = ox, by = oy - b * scale;
    const drawBeam = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.stroke();
    };
    drawBeam(ox, oy, ax, ay, "#ffb866");
    drawBeam(ox, oy, bx, by, "#ff7ab8");
    drawBeam(bx, by, ax, ay, "#75dcff");
    [ [ox,oy], [ax,ay], [bx,by] ].forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.fillStyle="#fff6dd"; ctx.fill(); });
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.font = "600 22px Arial";
    ctx.fillText(`a = ${a}`, ox + a * scale / 2 - 28, oy + 45);
    ctx.fillText(`b = ${b}`, ox - 78, oy - b * scale / 2);
    ctx.fillText(`c = ${cValue.toFixed(2)}`, (bx + ax) / 2 + 18, (by + ay) / 2 - 20);
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.strokeRect(ox, oy - 28, 28, 28);
  }, [a, b, cValue]);

  return (
    <ExhibitShell id="geometry" no="03" room="建筑数学馆 · ARCHITECTURE" title="数学建筑师" english="Geometry Builder" formula="a² + b² = c²" color="orange" discovered={discovered}>
      <div className="visual geometry-visual"><canvas ref={canvas} aria-label={`直角三角形，边长 ${a}、${b}、${cValue.toFixed(2)}`} /><div className="stability-pill"><i /> 结构稳定</div><p className="visual-caption">三条边互相承诺，<br />共同撑起一座不会倒的建筑。</p></div>
      <ControlPanel label="调整梁柱长度，验证勾股定理">
        <label className="control-row"><span>水平梁 a <b>{a}</b></span><input aria-label="水平梁长度" type="range" min="2" max="6" step="0.1" value={a} onChange={(e) => { setA(Number(e.target.value)); discover(); }} /></label>
        <label className="control-row"><span>垂直梁 b <b>{b}</b></span><input aria-label="垂直梁长度" type="range" min="2" max="6" step="0.1" value={b} onChange={(e) => { setB(Number(e.target.value)); discover(); }} /></label>
        <div className="equation-box"><span>{a.toFixed(1)}² + {b.toFixed(1)}²</span><strong>= {cValue.toFixed(2)}²</strong></div>
        <p className="insight"><b>你发现了：</b> 直角三角形把力量稳稳传向地面，它是桥梁和屋顶里的隐形骨架。</p>
      </ControlPanel>
    </ExhibitShell>
  );
}

function FourierSound({ discovered, discover }: { discovered: boolean; discover: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [f1, setF1] = useState(220);
  const [f2, setF2] = useState(330);
  const [mix, setMix] = useState(.48);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = 760; cv.height = 520;
    let raf = 0;
    const draw = (time = 0) => {
      ctx.clearRect(0,0,cv.width,cv.height);
      ctx.strokeStyle = "rgba(104,227,255,.09)"; ctx.lineWidth = 1;
      for (let y = 80; y < 470; y += 65) { ctx.beginPath(); ctx.moveTo(35,y); ctx.lineTo(725,y); ctx.stroke(); }
      const wave = (baseY: number, freq: number, color: string, amp: number, phase: number) => {
        ctx.beginPath();
        for (let x = 35; x <= 725; x++) {
          const y = baseY + Math.sin((x / 690) * Math.PI * 2 * (freq / 95) + phase) * amp;
          x === 35 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      };
      const phase = playing ? time / 500 : 0;
      wave(130, f1, "#68e3ff", 30, phase);
      wave(255, f2, "#ff86d6", 30, -phase*.8);
      ctx.beginPath();
      for (let x = 35; x <= 725; x++) {
        const y = 400 + (Math.sin((x/690)*Math.PI*2*(f1/95)+phase)*(1-mix) + Math.sin((x/690)*Math.PI*2*(f2/95)-phase*.8)*mix) * 48;
        x === 35 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.strokeStyle="#fff2ad"; ctx.lineWidth=4; ctx.shadowColor="#fff2ad"; ctx.shadowBlur=18; ctx.stroke();
      if (playing) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [f1, f2, mix, playing]);

  const toggleSound = async () => {
    discover();
    if (playing) {
      nodesRef.current.forEach(node => { try { node.stop(); } catch {} });
      nodesRef.current = [];
      setPlaying(false);
      return;
    }
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    await context.resume();
    const master = context.createGain(); master.gain.value = .08; master.connect(context.destination);
    const o1 = context.createOscillator(), o2 = context.createOscillator();
    const g1 = context.createGain(), g2 = context.createGain();
    o1.frequency.value = f1; o2.frequency.value = f2;
    g1.gain.value = 1-mix; g2.gain.value = mix;
    o1.connect(g1).connect(master); o2.connect(g2).connect(master); o1.start(); o2.start();
    nodesRef.current = [o1,o2]; setPlaying(true);
  };

  useEffect(() => { nodesRef.current.forEach((node, index) => node.frequency.setTargetAtTime(index ? f2 : f1, audioRef.current?.currentTime ?? 0, .02)); }, [f1, f2]);

  return (
    <ExhibitShell id="sound" no="04" room="声音数学馆 · SOUND" title="声音实验室" english="Fourier Sound Lab" formula="f(t) = Σ Aₙ sin(2πfₙt)" color="cyan" discovered={discovered} flip>
      <div className="visual sound-visual"><canvas ref={canvas} aria-label="两个简单声波组合成复杂波形" /><div className="wave-legend"><span><i className="cyan-dot" />频率 A</span><span><i className="pink-dot" />频率 B</span><span><i className="gold-dot" />合成声音</span></div></div>
      <ControlPanel label="混合简单波，听见复杂声音">
        <button className={`sound-button ${playing ? "is-playing" : ""}`} onClick={toggleSound}><i>{playing ? "Ⅱ" : "▶"}</i><span>{playing ? "暂停声音" : "播放声音"}<small>{playing ? "正在听见数学" : "请打开设备声音"}</small></span></button>
        <label className="control-row"><span>频率 A <b>{f1} Hz</b></span><input aria-label="频率 A" type="range" min="110" max="440" value={f1} onChange={(e) => { setF1(Number(e.target.value)); discover(); }} /></label>
        <label className="control-row"><span>频率 B <b>{f2} Hz</b></span><input aria-label="频率 B" type="range" min="140" max="660" value={f2} onChange={(e) => { setF2(Number(e.target.value)); discover(); }} /></label>
        <label className="control-row"><span>混合比例 <b>{Math.round(mix*100)}%</b></span><input aria-label="混合比例" type="range" min="0" max="1" step="0.01" value={mix} onChange={(e) => { setMix(Number(e.target.value)); discover(); }} /></label>
        <p className="insight"><b>你发现了：</b> 再复杂的声音，也能拆成许多个简单波。数学让声音变得可见。</p>
      </ControlPanel>
    </ExhibitShell>
  );
}

function SpiralUniverse({ discovered, discover }: { discovered: boolean; discover: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [arms, setArms] = useState(3);
  const [twist, setTwist] = useState(1.45);
  const [rotation, setRotation] = useState(0);
  const drag = useRef<{x:number; rotation:number} | null>(null);

  const draw = useCallback(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    cv.width=760; cv.height=520; ctx.clearRect(0,0,760,520);
    const cx=380, cy=260;
    const seeded = (n:number) => { const x=Math.sin(n*999.7)*43758.5453; return x-Math.floor(x); };
    for (let i=0;i<1250;i++) {
      const arm=i%arms, t=(i/arms)%420/420;
      const noise=(seeded(i)-.5)*.58;
      const theta=arm*Math.PI*2/arms + t*Math.PI*2*twist + rotation + noise;
      const r=8+Math.pow(t,.7)*220 + (seeded(i+12)-.5)*36;
      const x=cx+Math.cos(theta)*r*1.23, y=cy+Math.sin(theta)*r*.82;
      const size=.7+seeded(i+4)*2.2*(1-t*.35);
      const hue=188+t*105+(arm*18);
      ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fillStyle=`hsla(${hue},92%,${68+seeded(i+2)*22}%,${.3+seeded(i+1)*.7})`; ctx.fill();
    }
    const glow=ctx.createRadialGradient(cx,cy,2,cx,cy,84); glow.addColorStop(0,"rgba(255,255,225,.95)"); glow.addColorStop(.2,"rgba(255,173,234,.8)"); glow.addColorStop(1,"rgba(103,90,255,0)"); ctx.fillStyle=glow; ctx.fillRect(cx-90,cy-90,180,180);
  }, [arms, twist, rotation]);
  useEffect(draw, [draw]);

  return (
    <ExhibitShell id="universe" no="05" room="宇宙数学馆 · COSMOS" title="螺旋宇宙" english="Spiral Universe" formula="r = aeᵇᶿ" color="purple" discovered={discovered}>
      <div className="visual universe-visual">
        <canvas ref={canvas} aria-label="可以拖动旋转的数学星系" onPointerDown={(e) => { drag.current={x:e.clientX,rotation}; e.currentTarget.setPointerCapture(e.pointerId); discover(); }} onPointerMove={(e) => { if(drag.current) setRotation(drag.current.rotation+(e.clientX-drag.current.x)/130); }} onPointerUp={() => drag.current=null} />
        <div className="drag-hint">↔ 拖动旋转星云</div>
      </div>
      <ControlPanel label="转动宇宙，创造你的银河">
        <label className="control-row"><span>旋臂数量 <b>{arms}</b></span><input aria-label="旋臂数量" type="range" min="2" max="6" value={arms} onChange={(e) => { setArms(Number(e.target.value)); discover(); }} /></label>
        <label className="control-row"><span>旋转曲率 <b>{twist.toFixed(2)}</b></span><input aria-label="旋转曲率" type="range" min="0.6" max="2.4" step="0.01" value={twist} onChange={(e) => { setTwist(Number(e.target.value)); discover(); }} /></label>
        <button className="action-button purple" onClick={() => { setArms(Math.round(2+Math.random()*4)); setTwist(.65+Math.random()*1.7); setRotation(Math.random()*Math.PI); discover(); }}>生成我的宇宙 <span>✦</span></button>
        <p className="insight"><b>你发现了：</b> 贝壳、台风和银河相隔万里，却共享同一种螺旋语言。</p>
      </ControlPanel>
    </ExhibitShell>
  );
}

function ExhibitShell({ id, no, room, title, english, formula, color, discovered, flip=false, children }: { id: string; no: string; room: string; title: string; english: string; formula: string; color: string; discovered: boolean; flip?: boolean; children: React.ReactNode }) {
  const [visual, controls] = Array.isArray(children) ? children : [children];
  return (
    <section className={`exhibit exhibit-${color}`} id={id}>
      <div className="section-heading">
        <div><Mark>{room}</Mark><span className="exhibit-number">EXHIBIT {no}</span></div>
        <DiscoveryStamp active={discovered} />
      </div>
      <div className="title-row"><h2>{title}<small>{english}</small></h2><div className="formula-chip">{formula}</div></div>
      <div className={`exhibit-grid ${flip ? "flip" : ""}`}>
        <div className="visual-wrap">{visual}</div>
        <div className="controls-wrap">{controls}</div>
      </div>
    </section>
  );
}

function ControlPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="control-panel"><span className="control-label">互动实验台</span><h3>{label}</h3>{children}</div>;
}

function Certificate({ name, setName, close }: { name: string; setName: (n:string)=>void; close: ()=>void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="数学之美发现者证书">
      <div className="certificate-modal">
        <button className="modal-close" onClick={close} aria-label="关闭证书">×</button>
        <div className="certificate-inner">
          <div className="certificate-orbit orbit-a" /><div className="certificate-orbit orbit-b" />
          <span className="certificate-symbol">φ</span>
          <Mark>THE LANGUAGE OF THE UNIVERSE</Mark>
          <p className="certificate-kicker">数学美学展 · 探索证明</p>
          <h2>数学之美<br />发现者证书</h2>
          <p>恭喜</p>
          <input value={name} onChange={(e)=>setName(e.target.value)} aria-label="你的名字" placeholder="在这里写下你的名字" />
          <p>发现了数学隐藏在世界中的美。<br />完成了自然、建筑、声音与宇宙中的五项探索。</p>
          <div className="certificate-formulas"><span>φ</span><span>∞</span><span>△</span><span>∿</span><span>✦</span></div>
          <div className="certificate-domains"><span>✓ 黄金比例</span><span>✓ 分形森林</span><span>✓ 声音波纹</span><span>✓ 宇宙螺旋</span></div>
          <p className="certificate-explorer">MATH BEAUTY EXPLORER</p>
          <div className="certificate-footer"><span>MATH BEAUTY MUSEUM</span><span>{new Date().getFullYear()} · 数学探索编号 0518</span></div>
        </div>
        <button className="print-button" onClick={()=>window.print()}>打印 / 保存证书 <span>↗</span></button>
      </div>
    </div>
  );
}

export default function Home() {
  const [discoveries, setDiscoveries] = useState<Set<ExhibitId>>(() => new Set());
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [name, setName] = useState("Allen");
  const [gardenProgress, setGardenProgress] = useState(0);
  const discover = useCallback((id: ExhibitId) => setDiscoveries(prev => { const next = new Set(prev); next.add(id); return next; }), []);
  const updateGardenProgress = useCallback((value:number)=>setGardenProgress(value),[]);

  return (
    <main>
      <header className="site-header">
        <button className="brand" onClick={()=>scrollToId("top")}><span className="brand-mark">φ</span><span>数学美学展<small>Math Beauty Museum</small></span></button>
        <nav aria-label="展品导航">
          <button onClick={()=>scrollToId("hall")}>展厅</button>
          <button onClick={()=>scrollToId("flower")}>探索</button>
          <button onClick={()=>scrollToId("garden")}>花园</button>
        </nav>
        <button className="progress-button" onClick={()=>gardenProgress>=5 ? setCertificateOpen(true) : scrollToId("garden")}><span>{Math.min(gardenProgress,5)}/5</span><i>{gardenProgress>=5 ? "证书已解锁" : "探险家进度"}</i></button>
      </header>

      <section className="hero" id="top">
        <div className="hero-architecture" aria-hidden="true"><i /><i /><i /></div>
        <div className="hero-copy">
          <Mark>AI × MATHEMATICS × VISUAL ART</Mark>
          <h1>看见<span>公式背后的美</span></h1>
          <p>欢迎来到一座没有标准答案的博物馆。<br />在这里，数学不是考试，而是世界写给你的秘密语言。</p>
          <button className="primary-button" onClick={()=>scrollToId("hall")}>推开展馆大门 <span>↓</span></button>
        </div>
        <ModernHallSculpture />
        <div className="hero-foot"><span>SCROLL TO EXPLORE</span><i /><p>一次为好奇心准备的数字展览</p></div>
      </section>

      <section className="hall" id="hall">
        <div className="hall-intro"><Mark>THE CENTRAL HALL · 中央大厅</Mark><h2>一个开阔空间，<br /><em>四种数学视角。</em></h2><p>沿着弧形展墙进入不同展馆，让自然、建筑、声音与宇宙依次展开。</p></div>
        <div className="hall-space">
          <div className="hall-curve" aria-hidden="true"><span>MATHEMATICS IS EVERYWHERE</span></div>
          <div className="hall-floor" aria-hidden="true" />
          <div className="hall-centerpiece" aria-hidden="true"><i>∞</i><span>中央大厅<small>CENTRAL HALL</small></span></div>
          <div className="room-map">
            {[
              ["flower","01","自然数学馆","花瓣、枝条与生命的秩序","φ","pink"],
              ["geometry","02","建筑数学馆","支撑文明的几何骨架","△","orange"],
              ["sound","03","声音数学馆","把看不见的声音变成波","∿","cyan"],
              ["universe","04","宇宙数学馆","从贝壳到银河的共同旋律","✦","purple"]
            ].map(([id,no,title,desc,symbol,color])=>(
              <button key={id} className={`room-card room-${color}`} onClick={()=>scrollToId(id)}><span>{no}</span><i>{symbol}</i><h3>{title}</h3><p>{desc}</p><b>进入展馆 <em>→</em></b></button>
            ))}
          </div>
        </div>
      </section>

      <section className="journey-intro" id="explore"><Mark>FIVE DISCOVERIES · 五次发现</Mark><h2>用手指改变参数，<br />让规律亲自回答你。</h2><p>每完成一次互动，就会收集一枚“数学发现”。</p></section>

      <GoldenFlower discovered={discoveries.has("flower")} discover={()=>discover("flower")} />
      <FractalForest discovered={discoveries.has("forest")} discover={()=>discover("forest")} />
      <GeometryBuilder discovered={discoveries.has("geometry")} discover={()=>discover("geometry")} />
      <FourierSound discovered={discoveries.has("sound")} discover={()=>discover("sound")} />
      <SpiralUniverse discovered={discoveries.has("universe")} discover={()=>discover("universe")} />

      <MathGardenWorld onProgress={updateGardenProgress} onOpenCertificate={()=>setCertificateOpen(true)} />

      <footer><div className="brand"><span className="brand-mark">φ</span><span>数学美学展<small>Math Beauty Museum</small></span></div><p>愿每个孩子，都有机会看见隐藏在世界中的数学之美。</p><button onClick={()=>scrollToId("top")}>回到展馆入口 ↑</button></footer>
      {certificateOpen && <Certificate name={name} setName={setName} close={()=>setCertificateOpen(false)} />}
    </main>
  );
}
