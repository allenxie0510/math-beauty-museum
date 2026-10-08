"use client";
import { useEffect, useRef, useState } from "react";
import { observeElementSize } from "../viewport";
import { torusBoundary, torusContains, type TorusShape, type Vec3 } from "./torus-isoperimetric";

export default function TorusShapePlot({ volume, shape, periodic, slice }: { volume: number; shape: TorusShape; periodic: boolean; slice: number }) {
  const modelRef = useRef<HTMLCanvasElement>(null), sliceRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState({ yaw: -.55, pitch: .4 });
  const turn = (x: number, y: number) => setView((v) => ({ yaw: (v.yaw + x) % (Math.PI * 2), pitch: Math.max(-1.25, Math.min(1.25, v.pitch + y)) }));
  useEffect(() => {
    const canvas = modelRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const faces = torusBoundary(volume, shape);
    return observeElementSize(canvas, () => {
      const size = canvas.getBoundingClientRect().width, dpr = Math.min(devicePixelRatio || 1, 2); if (!size) return;
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      const scale = size * (periodic ? .23 : .52), center = size / 2;
      const rotate = ([x, y, z]: Vec3): Vec3 => { const u = x * Math.cos(view.yaw) + z * Math.sin(view.yaw), w = -x * Math.sin(view.yaw) + z * Math.cos(view.yaw); return [u, y * Math.cos(view.pitch) - w * Math.sin(view.pitch), y * Math.sin(view.pitch) + w * Math.cos(view.pitch)]; };
      const path = (points: Vec3[]) => { ctx.beginPath(); points.forEach((p, i) => { const x = center + p[0] * scale, y = center - p[1] * scale; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); };
      const offsets = periodic ? [-1, 0, 1] : [0];
      const polygons = offsets.flatMap((offset) => faces.map((face) => ({ offset, points: face.map(([x, y, z]) => rotate([x, y + offset, z])) }))).sort((a, b) => a.points.reduce((s, p) => s + p[2], 0) / a.points.length - b.points.reduce((s, p) => s + p[2], 0) / b.points.length);
      for (const polygon of polygons) { path(polygon.points); ctx.fillStyle = polygon.offset === 0 ? "#f4bd852a" : "#8bd4c412"; ctx.fill(); ctx.strokeStyle = polygon.offset === 0 ? "#f4bd8540" : "#8bd4c420"; ctx.lineWidth = .6; ctx.stroke(); }
      for (const offset of offsets) {
        ctx.strokeStyle = offset === 0 ? "#94ddd4c0" : "#94ddd43a"; ctx.lineWidth = offset === 0 ? 1.4 : 1;
        for (let axis = 0; axis < 3; axis++) for (const a of [-.5, .5]) for (const b of [-.5, .5]) {
          const start = [0, offset, 0], end = [0, offset, 0]; start[axis] -= .5; end[axis] += .5; start[(axis + 1) % 3] += a; end[(axis + 1) % 3] += a; start[(axis + 2) % 3] += b; end[(axis + 2) % 3] += b;
          path([rotate(start as unknown as Vec3), rotate(end as unknown as Vec3)]); ctx.stroke();
        }
      }
      ctx.fillStyle = "#a9c8d0"; ctx.font = `${Math.max(11, size * .024)}px sans-serif`;ctx.fillText(periodic ? "y + 1 · 周期副本" : "单位立方体 · 相对面连接", 16, 27);
      ctx.fillStyle = "#f4bd85"; ctx.fillText("金色只画界面 · 不画周期端盖", 16, size - 18);
    });
  }, [volume, shape, periodic, view]);
  useEffect(() => {
    const canvas = sliceRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    const size = 200; canvas.width = size; canvas.height = size;
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const inside = torusContains([(x + .5) / size - .5, .5 - (y + .5) / size, slice], volume, shape);
      const color = inside ? [139, 212, 196] : [15, 24, 39], index = (y * size + x) * 4;
      pixels.data.set([...color, 255], index);
    }
    ctx.putImageData(pixels, 0, 0);
  }, [volume, shape, slice]);
  return <>
    <div className="mahler-view-toolbar"><span>拖动或用方向键旋转 · 图外滑动页面</span><button onClick={() => setView({ yaw: -.55, pitch: .4 })}>复位视角</button></div>
    <figure className="research-stage"><canvas className="torus-model" ref={modelRef} tabIndex={0} role="img" aria-label="三维平坦环面的周期界面模型，可拖动或用方向键旋转"
      onPointerDown={(e) => { if (!e.isPrimary || e.button !== 0) return; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); }}
      onPointerMove={(e) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; turn((e.clientX - d.x) * .01, (e.clientY - d.y) * .01); d.x = e.clientX; d.y = e.clientY; }}
      onPointerUp={(e) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={(e) => { const keys: Record<string, [number, number]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }; if (keys[e.key]) { e.preventDefault(); turn(...keys[e.key]); } }} />
      <figcaption>{periodic ? "沿 y 方向显示三个相邻单元，中间是基本单元。其他两组相对面也按周期连接。" : "线框是一张基本单元的展开图，不是有壁容器。"}圆管沿 y 方向贯穿，薄层沿 y、z 方向延续。图中只画界面；体积占据范围见剖面。</figcaption></figure>
    <figure className="torus-slice"><canvas ref={sliceRef} role="img" aria-label={`z=${slice.toFixed(2)}的截面，青色是所选区域，深色是空域`} /><figcaption><b>z = {slice.toFixed(2)} 的剖面</b><p>青色：所选区域 · 深色：空域</p><p>{volume > .5 ? "正在展示补集：球洞、管洞或薄层的补区域；界面保持相同。" : "横向 x，纵向 y。左右、上下相对边分别连接。"}</p></figcaption></figure>
  </>;
}
