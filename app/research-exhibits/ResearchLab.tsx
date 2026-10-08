"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { observeMathAction } from "../math-observer-events";
import type { ResearchRecord } from "./catalog";
import "./lattice-energy.css";
import "./research-labs.css";

export function ResearchRange({ label, value, min, max, step, display, hint, onChange, item }: { label: string; value: number; min: number; max: number; step: number | "any"; display?: string; hint?: string; onChange: (value: number) => void; item: string }) {
  const record = () => observeMathAction({ id: `${item}-${label}`, scene: ["mahler", "torus", "gaussian", "voronoi"].includes(item) ? `workshop-${item}` : "hall", action: "research_parameter_adjusted", outcome: "exploring", importance: .35, context: { item, parameter: label, value } });
  return <label className="lattice-control"><span>{label}<output>{display ?? value}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} style={{ "--lattice-progress": `${(value - min) / (max - min) * 100}%` } as CSSProperties} onChange={(event) => onChange(Number(event.target.value))} onPointerUp={record} onKeyUp={(event) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) record(); }} />
    {hint && <small>{hint}</small>}
  </label>;
}

export function ResearchLab({ title, subtitle, backLabel, onBack, research, children, controls }: { title: string; subtitle: string; backLabel: string; onBack: () => void; research: ResearchRecord; children: ReactNode; controls: ReactNode }) {
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  return <div className="lattice-lab research-lab">
    <header className="lattice-header">
      <button ref={backRef} type="button" onClick={onBack}>← {backLabel}</button>
      <div className="lattice-provenance"><span className="lattice-frontier-badge">2026 数学前沿</span><span>OpenAI 研究手稿 · 家族 {research.familyId}</span></div>
      <h2>{title}</h2><p>{subtitle}</p><p className="lattice-version">{research.version}</p>
    </header>
    <div className="lattice-body">
      <section className="lattice-comparison" aria-label={`${title}可视化`}>
        <section className="lattice-frontier" aria-label="OpenAI 前沿研究主张"><span>这件展品连接的前沿概念</span><h3>{research.frontierTitle}</h3><p className="lattice-frontier-claim">{research.claim}</p><div><a href={research.paperUrl} target="_blank" rel="noreferrer">阅读 OpenAI 手稿 ↗</a><span>手稿主张 · 本馆未独立复核</span></div></section>
        <div className="lattice-experiment-label"><span>数值探索</span>经典模型，理解前沿问题</div>
        {children}
        <section className="lattice-knowledge" aria-label="知识层次"><h3>经典基础与前沿主张</h3><div><span>经典基础</span><p>{research.classicalBackground}</p></div><div><span>数值探索</span><p>{research.experimentScope}</p></div></section>
      </section>
      <aside className="lattice-console" aria-label={`${title}参数`}>
        {controls}
        <details className="lattice-details"><summary>OpenAI 研究来源与验证范围</summary><p>OpenAI math · 内部模型生成的研究手稿</p><p>{research.title}</p><p>{research.verification}</p><div className="lattice-sources"><a href={research.paperUrl} target="_blank" rel="noreferrer">手稿固定版本 ↗</a><a href={research.scopeUrl} target="_blank" rel="noreferrer">{research.scopeLabel ?? "形式化范围"} ↗</a>{research.comparatorUrl && <a href={research.comparatorUrl} target="_blank" rel="noreferrer">Comparator 声明 ↗</a>}</div></details>
      </aside>
    </div>
  </div>;
}

/** Workshop owns its dialog; hall experiments use the existing exhibit dialog. */
export function ResearchModal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab" || !ref.current) return;
      const elements = Array.from(ref.current.querySelectorAll<HTMLElement>('button, input, select, summary, a[href], [tabindex="0"]')).filter((element) => element.getClientRects().length > 0 && (!element.closest("details:not([open])") || element.matches("details:not([open]) > summary")));
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [close]);
  return createPortal(<div ref={ref} className="nature-lab-backdrop" role="dialog" aria-modal="true" aria-label={title}><button className="nature-lab-close" onClick={close} aria-label="关闭并返回互动工坊">×</button>{children}</div>, document.body);
}
