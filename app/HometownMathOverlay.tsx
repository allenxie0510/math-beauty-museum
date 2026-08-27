"use client";

import { useRef } from "react";
import { normalizeOverlayCount } from "./hometown-math/domain/registry";
import type { OverlayGeometry } from "./hometown-math/domain/types";

type Props = {
  overlay: OverlayGeometry;
  aspectRatio?: number;
  editable?: boolean;
  onChange?: (overlay: OverlayGeometry) => void;
};

const clamp = (value: number | undefined, fallback: number) => Math.max(.03, Math.min(.97, value ?? fallback));

export function HometownMathOverlay({ overlay, aspectRatio = 4 / 3, editable = false, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewWidth = aspectRatio >= 1 ? 100 * aspectRatio : 100;
  const viewHeight = aspectRatio >= 1 ? 100 : 100 / aspectRatio;
  const scale = Math.min(viewWidth, viewHeight);
  const x = (value: number | undefined, fallback: number) => clamp(value, fallback) * viewWidth;
  const y = (value: number | undefined, fallback: number) => clamp(value, fallback) * viewHeight;
  const pair = (point: [number, number] | undefined, fallback: [number, number]) => [x(point?.[0], fallback[0]), y(point?.[1], fallback[1])] as const;
  const [cx, cy] = pair(overlay.center, [.5, .5]);
  const radius = clamp(overlay.radius, .32) * scale;
  const count = normalizeOverlayCount(overlay);
  const rotation = overlay.rotation ?? 0;
  const points = overlay.points ?? [];
  const primary = { stroke: "#fff", strokeWidth: 3.2, fill: "none", vectorEffect: "non-scaling-stroke" as const };
  const guide = { ...primary, strokeWidth: 1.45, strokeDasharray: "5 5", opacity: .58 };

  const move = (event: React.PointerEvent<SVGCircleElement>, kind: "center" | "radius" | "point", pointIndex = -1) => {
    if (!editable || !onChange || !svgRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (clientX: number, clientY: number) => {
      const bounds = svgRef.current!.getBoundingClientRect();
      const x = Math.max(.03, Math.min(.97, (clientX - bounds.left) / bounds.width));
      const y = Math.max(.03, Math.min(.97, (clientY - bounds.top) / bounds.height));
      if (kind === "center") onChange({ ...overlay, center: [x, y] });
      else if (kind === "point") {
        const nextPoints = [...(overlay.points ?? [])];
        nextPoints[pointIndex] = [x, y];
        onChange({ ...overlay, points: nextPoints });
      }
      else {
        const dx = (x - (overlay.center?.[0] ?? .5)) * viewWidth;
        const dy = (y - (overlay.center?.[1] ?? .5)) * viewHeight;
        onChange({ ...overlay, radius: Math.max(.05, Math.min(.7, Math.hypot(dx, dy) / scale)) });
      }
    };
    const pointerMove = (next: PointerEvent) => update(next.clientX, next.clientY);
    const pointerUp = (next: PointerEvent) => {
      update(next.clientX, next.clientY);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
  };

  const radial = Array.from({ length: count }, (_, index) => {
    const angle = (rotation + index * 360 / count - 90) * Math.PI / 180;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return <g key={index}><line x1={cx} y1={cy} x2={x} y2={y} {...guide}/><circle cx={x} cy={y} r="1.15" fill="#fff"/></g>;
  });

  let geometry: React.ReactNode;
  if (overlay.type === "axis") {
    const [startX, startY] = pair(points[0], [.5, .12]);
    const [endX, endY] = pair(points[1], [.5, .88]);
    geometry = <><line x1={startX} y1={startY} x2={endX} y2={endY} {...primary}/><line x1={startX - 11} y1={startY + 23} x2={startX + 11} y2={startY + 23} {...guide}/><line x1={endX - 11} y1={endY - 23} x2={endX + 11} y2={endY - 23} {...guide}/></>;
  } else if (overlay.type === "radial") {
    geometry = <><circle cx={cx} cy={cy} r={radius} {...primary}/>{radial}<circle cx={cx} cy={cy} r="2" fill="#fff"/></>;
  } else if (overlay.type === "nested") {
    const [startX, startY] = pair(points[0], [.16, .17]);
    const [endX, endY] = pair(points[1], [.84, .83]);
    const width = endX - startX;
    const height = endY - startY;
    geometry = <>{[0, 1, 2, 3].map((index) => {
      const t = index / 3;
      const left = startX + width * (.02 + t * .09);
      const right = endX - width * (.02 + t * .09);
      const baseline = startY + height * (.2 + t * .2);
      const rise = height * (.18 - t * .025);
      const path = `M${left} ${baseline + rise * .35}C${left + width * .2} ${baseline - rise},${left + width * .36} ${baseline + rise * .7},${left + width * .52} ${baseline}S${right - width * .18} ${baseline - rise * .8},${right} ${baseline + rise * .25}`;
      return <path key={index} d={path} {...(index === 0 ? primary : guide)}/>;
    })}<line x1={startX} y1={startY} x2={endX} y2={endY} {...guide} opacity=".28"/></>;
  } else if (overlay.type === "repeat") {
    const [startX, startY] = pair(points[0], [.14, .5]);
    const [endX, endY] = pair(points[1], [.86, .5]);
    geometry = <><line x1={startX} y1={startY} x2={endX} y2={endY} {...guide}/>{Array.from({ length: count }, (_, index) => { const t = count === 1 ? 0 : index / (count - 1); const x = startX + (endX - startX) * t; const y = startY + (endY - startY) * t; return <g key={index}><path d={`M${x - 3} ${y - 6}L${x + 3} ${y}L${x - 3} ${y + 6}`} {...primary}/><circle cx={x} cy={y} r="1" fill="#fff"/></g>; })}</>;
  } else if (overlay.type === "arch") {
    const [leftX, leftY] = pair(points[0], [.16, .72]);
    const [topX, topY] = pair(points[1], [.5, .25]);
    const [rightX, rightY] = pair(points[2], [.84, .72]);
    geometry = <><path d={`M${leftX} ${leftY}Q${topX} ${topY * 1.15} ${rightX} ${rightY}`} {...primary}/><line x1={leftX} y1={leftY} x2={rightX} y2={rightY} {...guide}/><line x1={topX} y1={topY} x2={topX} y2={Math.max(leftY, rightY)} {...guide}/><circle cx={leftX} cy={leftY} r="1.3" fill="#fff"/><circle cx={topX} cy={topY} r="1.3" fill="#fff"/><circle cx={rightX} cy={rightY} r="1.3" fill="#fff"/></>;
  } else if (overlay.type === "hexgrid") {
    const hexRadius = radius * .26;
    const cells = [[0,0],[-1.5,-.87],[0,-1.74],[1.5,-.87],[-1.5,.87],[0,1.74],[1.5,.87]];
    geometry = <>{cells.map(([dx, dy], index) => { const x = cx + dx * hexRadius; const y = cy + dy * hexRadius; const vertices = Array.from({ length: 6 }, (_, i) => `${x + Math.cos(i * Math.PI / 3) * hexRadius},${y + Math.sin(i * Math.PI / 3) * hexRadius}`).join(" "); return <polygon key={index} points={vertices} {...(index === 0 ? primary : guide)}/>; })}</>;
  } else if (overlay.type === "spiral") {
    const spiralPoints = Array.from({ length: 90 }, (_, index) => { const t = index / 89 * Math.PI * 4.5; const r = radius * index / 89; return `${cx + Math.cos(t + rotation * Math.PI / 180) * r},${cy + Math.sin(t + rotation * Math.PI / 180) * r}`; }).join(" ");
    geometry = <><polyline points={spiralPoints} {...primary}/><circle cx={cx} cy={cy} r="2" fill="#fff"/></>;
  } else {
    const [startX, baseline] = pair(points[0], [.08, .54]);
    const [endX] = pair(points[1], [.92, .54]);
    const wavePoints = Array.from({ length: 100 }, (_, index) => { const t = index / 99; return `${startX + (endX - startX) * t},${baseline + Math.sin(t * Math.PI * 2 * count + rotation * Math.PI / 180) * radius * .28}`; }).join(" ");
    geometry = <><line x1={startX} y1={baseline} x2={endX} y2={baseline} {...guide}/><polyline points={wavePoints} {...primary}/></>;
  }

  return <svg ref={svgRef} viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" className={editable ? "is-editable" : ""} aria-label={editable ? "可拖动的照片数学标注" : "照片上的数学结构标注"}>
    <g className="math-overlay-geometry">{geometry}</g>
    {editable && <g className="math-overlay-controls">
      {["radial", "hexgrid", "spiral"].includes(overlay.type) && <circle cx={cx} cy={cy} r="2.4" onPointerDown={(event) => move(event, "center")}/>}
      {["radial", "hexgrid", "spiral", "wave"].includes(overlay.type) && <><circle cx={cx + radius} cy={cy} r="2" onPointerDown={(event) => move(event, "radius")}/><line x1={cx} y1={cy} x2={cx + radius} y2={cy} stroke="#fff" strokeDasharray="2 2" opacity=".55"/></>}
      {points.map((point, index) => <circle key={index} cx={x(point[0], .5)} cy={y(point[1], .5)} r="2" onPointerDown={(event) => move(event, "point", index)}/>)}</g>}
  </svg>;
}
