"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { observeElementSize } from "../viewport";
import type { Point3, SolidMesh } from "./mahler-polar";

export type SolidView = { yaw: number; pitch: number };
export const DEFAULT_SOLID_VIEW: SolidView = { yaw: -.55, pitch: .35 };

export default function MahlerSolidPlot({ mesh, polar, view, onRotate }: { mesh: SolidMesh; polar?: boolean; view: SolidView; onRotate: (yaw: number, pitch: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    return observeElementSize(canvas, () => {
      const size = canvas.getBoundingClientRect().width;
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      const scale = size * .19, center = size / 2;
      const rotate = ([x, y, z]: Point3): Point3 => {
        const u = x * Math.cos(view.yaw) + z * Math.sin(view.yaw), w = -x * Math.sin(view.yaw) + z * Math.cos(view.yaw);
        return [u, y * Math.cos(view.pitch) - w * Math.sin(view.pitch), y * Math.sin(view.pitch) + w * Math.cos(view.pitch)];
      };
      const project = ([x, y]: Point3) => [center + x * scale, center - y * scale];
      const points = mesh.vertices.map(rotate);
      // Orthographic projection with one fixed scale for both solids, all p and all shears.
      context.strokeStyle = "#ffffff0c"; context.lineWidth = 1;
      for (let i = 1; i < 8; i++) { context.beginPath(); context.moveTo(i * size / 8, 12); context.lineTo(i * size / 8, size - 12); context.moveTo(12, i * size / 8); context.lineTo(size - 12, i * size / 8); context.stroke(); }
      const halo = context.createRadialGradient(center, center, 0, center, center, size * .48);
      halo.addColorStop(0, polar ? "#8bd4c410" : "#f4bd8510"); halo.addColorStop(1, "transparent");
      context.fillStyle = halo; context.fillRect(0, 0, size, size);
      const axes: Point3[] = [[1.85, 0, 0], [0, 1.85, 0], [0, 0, 1.85]];
      context.font = `${Math.max(10, size * .029)}px sans-serif`;
      axes.forEach((axis, i) => {
        const [x, y] = project(rotate(axis));
        context.strokeStyle = ["#e8aa8770", "#8bd4c470", "#baa6ed70"][i]; context.beginPath(); context.moveTo(center, center); context.lineTo(x, y); context.stroke();
        context.fillStyle = ["#e8aa87", "#8bd4c4", "#baa6ed"][i]; context.fillText(["x", "y", "z"][i], x + 4, y - 4);
      });
      const faces = mesh.faces.map((face) => {
        const vertices = face.map((i) => points[i]), [a, b, c] = vertices;
        const u = b.map((v, i) => v - a[i]), v = c.map((w, i) => w - a[i]);
        const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const length = Math.hypot(...normal);
        return { vertices, depth: vertices.reduce((sum, p) => sum + p[2], 0) / vertices.length, normal, length };
      }).filter((face) => face.length > 1e-12 && face.normal[2] > 0).sort((a, b) => a.depth - b.depth);
      for (const face of faces) {
        const illumination = .43 + .57 * Math.max(0, (-.35 * face.normal[0] + .5 * face.normal[1] + .79 * face.normal[2]) / face.length);
        const rgb = (polar ? [139, 212, 196] : [244, 189, 133]).map((v) => Math.round(v * illumination));
        context.beginPath();
        face.vertices.forEach((vertex, i) => { const [x, y] = project(vertex); if (i) context.lineTo(x, y); else context.moveTo(x, y); });
        context.closePath(); context.fillStyle = `rgb(${rgb.join(",")})`; context.fill();
        // Cover antialias cracks on smooth meshes; emphasize the exact polyhedron edges.
        context.strokeStyle = mesh.faces.length <= 8 ? (polar ? "#bbf8e7" : "#ffddb3") : context.fillStyle;
        context.lineWidth = mesh.faces.length <= 8 ? 1.2 : .65; context.stroke();
      }
      context.fillStyle = "#b4bfce"; context.font = `${Math.max(10, size * .025)}px sans-serif`;
      context.fillText("1", size * .12 + scale / 2 - 3, size * .91 - 7);
      context.strokeStyle = "#b4bfce80"; context.lineWidth = 1; context.beginPath();
      context.moveTo(size * .12, size * .91); context.lineTo(size * .12 + scale, size * .91); context.stroke();
    });
  }, [mesh, polar, view]);
  const release = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <canvas ref={ref} className="mahler-solid" tabIndex={0} role="img" aria-label={`${polar ? "极对偶" : "原形"}三维模型，可拖动或用方向键同步旋转两个模型`} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
    onPointerDown={(event) => { if (!event.isPrimary || event.button !== 0) return; drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); }}
    onPointerMove={(event) => { const current = drag.current; if (!current || current.id !== event.pointerId) return; onRotate((event.clientX - current.x) * .012, (event.clientY - current.y) * .012); current.x = event.clientX; current.y = event.clientY; }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={(event) => { const change: Record<string, [number, number]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }; if (change[event.key]) { event.preventDefault(); onRotate(...change[event.key]); } }} />;
}
