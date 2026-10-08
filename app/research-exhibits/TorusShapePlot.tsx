"use client";
import { useEffect, useRef, useState } from "react";
import { observeElementSize } from "../viewport";
import { torusBoundary, torusContains, type TorusShape, type Vec3 } from "./torus-isoperimetric";

export default function TorusShapePlot({ volume, shape, periodic }: { volume: number; shape: TorusShape; periodic: boolean }) {
  const modelRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState({ yaw: -.55, pitch: .4 });
  const turn = (x: number, y: number) => setView((v) => ({ yaw: (v.yaw + x) % (Math.PI * 2), pitch: Math.max(-1.25, Math.min(1.25, v.pitch + y)) }));
  useEffect(() => {
    const canvas = modelRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const faces = torusBoundary(volume, shape);
    return observeElementSize(canvas, () => {
      const { width, height } = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); if (!width || !height) return;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width / 2.1, height / (periodic ? 3.9 : 2.1)), centerX = width / 2, centerY = height / 2;
      const rotate = ([x, y, z]: Vec3): Vec3 => { const u = x * Math.cos(view.yaw) + z * Math.sin(view.yaw), w = -x * Math.sin(view.yaw) + z * Math.cos(view.yaw); return [u, y * Math.cos(view.pitch) - w * Math.sin(view.pitch), y * Math.sin(view.pitch) + w * Math.cos(view.pitch)]; };
      const path = (points: Vec3[]) => { ctx.beginPath(); points.forEach((p, i) => { const x = centerX + p[0] * scale, y = centerY - p[1] * scale; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); };
      const offsets = periodic ? [-1, 0, 1] : [0];
      const polygons = offsets.flatMap((offset) => faces.map((face) => ({ offset, points: face.map(([x, y, z]) => rotate([x, y + offset, z])) }))).sort((a, b) => a.points.reduce((s, p) => s + p[2], 0) / a.points.length - b.points.reduce((s, p) => s + p[2], 0) / b.points.length);
      for (const polygon of polygons) { path(polygon.points); ctx.fillStyle = polygon.offset === 0 ? "#3999a532" : "#79aab514"; ctx.fill(); ctx.strokeStyle = polygon.offset === 0 ? "#2e819551" : "#759ba12e"; ctx.lineWidth = .6; ctx.stroke(); }
      for (const offset of offsets) {
        ctx.strokeStyle = offset === 0 ? "#4b8c9cac" : "#859fa650"; ctx.lineWidth = offset === 0 ? 1.4 : 1;
        for (let axis = 0; axis < 3; axis++) for (const a of [-.5, .5]) for (const b of [-.5, .5]) {
          const start = [0, offset, 0], end = [0, offset, 0]; start[axis] -= .5; end[axis] += .5; start[(axis + 1) % 3] += a; end[(axis + 1) % 3] += a; start[(axis + 2) % 3] += b; end[(axis + 2) % 3] += b;
          path([rotate(start as unknown as Vec3), rotate(end as unknown as Vec3)]); ctx.stroke();
        }
      }

    });
  }, [volume, shape, periodic, view]);
  return <div className="torus-scene">
    <div className="torus-scene-label">{periodic ? "沿 y 延续 · 三个相邻单元" : "单位立方体 · 相对面连接"}</div>
    <figure className="torus-model-frame"><canvas className="torus-model" ref={modelRef} tabIndex={0} role="img" aria-label="三维平坦环面的周期界面模型，可拖动或用方向键旋转"
      onPointerDown={(e) => { if (!e.isPrimary || e.button !== 0) return; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); }}
      onPointerMove={(e) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; turn((e.clientX - d.x) * .01, (e.clientY - d.y) * .01); d.x = e.clientX; d.y = e.clientY; }}
      onPointerUp={(e) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={(e) => { const keys: Record<string, [number, number]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }; if (keys[e.key]) { e.preventDefault(); turn(...keys[e.key]); } }} />
      <figcaption>青色为界面 · 周期圆管无端盖</figcaption></figure>
    <div className="torus-view-tools"><span>拖动或用方向键旋转</span><button onClick={() => setView({ yaw: -.55, pitch: .4 })}>复位视角</button></div>
  </div>;
}

export function TorusSlicePlot({ volume, shape, slice }: { volume: number; shape: TorusShape; slice: number }) {
  const sliceRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = sliceRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const size = 160; canvas.width = size; canvas.height = size;
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const inside = torusContains([(x + .5) / size - .5, .5 - (y + .5) / size, slice], volume, shape);
      pixels.data.set([...(inside ? [100, 174, 184] : [231, 240, 244]), 255], (y * size + x) * 4);
    }
    ctx.putImageData(pixels, 0, 0);
  }, [volume, shape, slice]);
  return <canvas ref={sliceRef} className="torus-section-canvas" role="img" aria-label={`z=${slice.toFixed(2)}的截面，青色是所选区域，浅灰是空域`} />;
}
