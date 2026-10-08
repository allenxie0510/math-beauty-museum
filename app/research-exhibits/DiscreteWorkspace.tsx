"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ResearchRecord } from "./catalog";
import "./discrete-workspace.css";

/** Compact frame shared by the two discrete experiments; mathematical state stays in each lab. */
export default function DiscreteWorkspace({ title, subtitle, research, toolbar, stageTitle, stageTools, stage, legend, controls, explanation, scope, onBack, onReset }: {
  title: string; subtitle: string; research: ResearchRecord; toolbar?: ReactNode;
  stageTitle: ReactNode; stageTools?: ReactNode; stage: ReactNode; legend: ReactNode;
  controls: ReactNode; explanation: ReactNode; scope: string; onBack: () => void; onReset: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const info = useRef<HTMLDialogElement>(null), back = useRef<HTMLButtonElement>(null), titleId = useId();
  useEffect(() => { back.current?.focus(); }, []);
  useEffect(() => { if (infoOpen) info.current?.showModal(); else info.current?.close(); }, [infoOpen]);
  return <article className="lattice-lab discrete-workspace" aria-label={`${title}操作页`}>
    <header className="discrete-header"><div><span className="discrete-eyebrow">2026 数学前沿 · OpenAI 手稿 {research.familyId}</span><h2>{title}</h2><p>{subtitle}</p></div>{toolbar}</header>
    <div className="discrete-body">
      <section className="discrete-stage" aria-label={`${title}展示区`}><div className="discrete-stage-heading"><span>{stageTitle}</span><div className="discrete-stage-tools">{stageTools}</div></div><div className="discrete-plot">{stage}</div><p className="discrete-legend">{legend}</p></section>
      <aside className="discrete-panel" aria-label={`${title}参数与结果`}>{controls}<p className="discrete-scope">{scope}</p></aside>
    </div>
    <footer className="discrete-footer"><button ref={back} onClick={onBack}>← 返回工坊</button><button className="discrete-info-trigger" onClick={() => setInfoOpen(true)}>模型与研究说明</button><button onClick={onReset}>恢复默认参数</button></footer>
    <dialog ref={info} className="discrete-info-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setInfoOpen(false); }} onKeyDown={event => { if (["Escape", "Tab"].includes(event.key)) event.stopPropagation(); }}>
      <header><h3 id={titleId}>{title} · 模型与研究说明</h3><button onClick={() => setInfoOpen(false)} aria-label="收起模型与研究说明">×</button></header><div className="discrete-info-body">{explanation}<h4>2026 数学前沿 · OpenAI 手稿 {research.familyId}</h4><h5>{research.frontierTitle}</h5><p>{research.claim}</p><h4>经典基础与实验范围</h4><p>{research.classicalBackground}</p><p>{research.experimentScope}</p><p>{research.verification}</p><small>{research.version}</small><div className="discrete-source-links"><a href={research.paperUrl} target="_blank" rel="noreferrer">手稿固定版本 ↗</a><a href={research.scopeUrl} target="_blank" rel="noreferrer">{research.scopeLabel ?? "形式化范围"} ↗</a>{research.comparatorUrl && <a href={research.comparatorUrl} target="_blank" rel="noreferrer">Comparator 声明 ↗</a>}</div></div>
    </dialog>
  </article>;
}
