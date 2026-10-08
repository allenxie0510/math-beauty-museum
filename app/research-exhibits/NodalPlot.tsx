"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { observeElementSize } from "../viewport";
import { nodalPaths, type NodalParameters } from "./nodal-lines";

/** The amplitude is a separate raster layer; zero contours never enter this canvas. */
function paintAmplitude(tile: HTMLCanvasElement, parameters: NodalParameters) {
  const context = tile.getContext("2d");
  if (!context) return;
  const size = tile.width, pixels = context.createImageData(size, size);
  const { m, n, mix, phase } = parameters, beta = mix * Math.PI / 180;
  const a = Math.cos(beta), b = Math.sin(beta), tau = 2 * Math.PI;
  // Separable cosine formula avoids trigonometry in the per-pixel inner loop.
  const xTerms = Array.from({ length: size }, (_, x) => {
    const q = (x + .5) / size;
    return [a * Math.cos(tau * m * q), a * Math.sin(tau * m * q), b * Math.cos(tau * n * q), b * Math.sin(tau * n * q)];
  });
  for (let py = 0; py < size; py++) {
    const y = 1 - (py + .5) / size;
    const c1 = Math.cos(tau * n * y), s1 = Math.sin(tau * n * y);
    const c2 = Math.cos(-tau * m * y + phase * Math.PI / 180), s2 = Math.sin(-tau * m * y + phase * Math.PI / 180);
    for (let px = 0; px < size; px++) {
      const x = xTerms[px], value = x[0] * c1 - x[1] * s1 + x[2] * c2 - x[3] * s2;
      const amount = .18 + Math.min(1, Math.abs(value) / Math.SQRT2) * .62;
      const index = (py * size + px) * 4;
      pixels.data[index] = 15 + (value > 0 ? 222 : 103) * amount;
      pixels.data[index + 1] = 15 + (value > 0 ? 161 : 138) * amount;
      pixels.data[index + 2] = 15 + (value > 0 ? 100 : 209) * amount;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
}

export default function NodalPlot({ parameters, tiled }: { parameters: NodalParameters; tiled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), pathId = useId();
  const count = tiled ? 3 : 1, offset = tiled ? 1000 : 0;
  const path = useMemo(() => nodalPaths(parameters).map((points) => points.map(([x, y], i) => `${i ? "L" : "M"}${(x * 1000).toFixed(4)},${((1 - y) * 1000).toFixed(4)}`).join("")).join(""), [parameters]);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const tile = document.createElement("canvas");
    let previousSize = 0, frame = 0;
    const stop = observeElementSize(canvas, () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = canvas.getBoundingClientRect().width;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        // Cap only the soft amplitude layer, never the SVG line resolution.
        const tileSize = Math.max(64, Math.min(tiled ? 1024 : 1536, Math.ceil(width * scale / count)));
        if (tileSize === previousSize) return;
        previousSize = tileSize;
        tile.width = tile.height = tileSize;
        paintAmplitude(tile, parameters);
        canvas.width = canvas.height = tileSize * count;
        context.fillStyle = "#080f1c"; context.fillRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < count; row++) for (let column = 0; column < count; column++) {
          context.globalAlpha = tiled && (row !== 1 || column !== 1) ? .55 : 1;
          context.drawImage(tile, column * tileSize, row * tileSize);
        }
        context.globalAlpha = 1;
      });
    });
    return () => { stop(); cancelAnimationFrame(frame); };
  }, [parameters, count, tiled]);
  return <div className="nodal-plot">
    <canvas ref={ref} aria-hidden="true" />
    <svg viewBox={`0 0 ${count * 1000} ${count * 1000}`} role="img" aria-label={tiled ? "平坦环面节点线的九宫格周期拼接，中央格为基本单元；白色矢量线为零等值线" : "平坦环面展开基本单元，白色矢量线为零等值线，相同颜色的边彼此连接"}>
      <defs><path id={pathId} d={path} fill="none" stroke="#fff4d9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></defs>
      {Array.from({ length: count * count }, (_, i) => {
        const row = Math.floor(i / count), column = i % count;
        return <use key={i} href={`#${pathId}`} transform={`translate(${column * 1000} ${row * 1000})`} opacity={tiled && (row !== 1 || column !== 1) ? .55 : 1} />;
      })}
      <g fill="none" strokeWidth="3">
        <path d={`M${offset},${offset}v1000 M${offset + 1000},${offset}v1000`} stroke="#8bd4c4" vectorEffect="non-scaling-stroke" />
        <path d={`M${offset},${offset}h1000 M${offset},${offset + 1000}h1000`} stroke="#c09ef7" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  </div>;
}
