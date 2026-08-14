"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { HometownMathOverlay } from "./HometownMathOverlay";
import { DEFAULT_HOMETOWN_MANIFEST } from "./hometown-math/domain/default-manifest";
import { buildLearningContent } from "./hometown-math/domain/registry";
import type { HometownSceneManifest } from "./hometown-math/domain/types";

type Props = {
  slug?: string | null;
  previewManifest?: HometownSceneManifest | null;
  onOpenStudio: () => void;
  onExploreDemo: (demoId: string, exhibitId: string) => void;
  onDetailChange?: (open: boolean) => void;
};

const allExhibits = (manifest: HometownSceneManifest) => manifest.zones.flatMap((zone) => zone.exhibits);
const completeManifest = (manifest: HometownSceneManifest): HometownSceneManifest => ({ ...manifest, zones: manifest.zones.map((zone) => ({ ...zone, exhibits: zone.exhibits.map((item) => ({ ...item, learning: item.learning?.formula ? item.learning : buildLearningContent(item.conceptId, item.overlay, item.interpretation) })) })) });

function HometownCanvas({ manifest, onError }: { manifest: HometownSceneManifest; onError: () => void }) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;
    const lowPower = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(manifest.environment.sky);
    scene.fog = new THREE.FogExp2(manifest.environment.sky, .025);
    const camera = new THREE.PerspectiveCamera(54, 1, .1, 120);
    camera.position.set(0, 3.7, 14);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: lowPower ? "low-power" : "high-performance" }); }
    catch { onError(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.2 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "我的家乡数学馆沉浸式空间背景");
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#d8e5d6", "#0b1114", 1.2));
    const warm = new THREE.DirectionalLight(manifest.environment.light, 2.2);
    warm.position.set(-5, 11, 7);
    scene.add(warm);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 100), new THREE.MeshPhysicalMaterial({ color: manifest.environment.floor, roughness: .37, metalness: .18, clearcoat: .22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.3, -27);
    scene.add(floor);

    manifest.zones.forEach((zone, zoneIndex) => {
      const z = -zoneIndex * 13 - 5;
      const left = zoneIndex % 2 === 0;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(11.2, 7.8, .25), new THREE.MeshPhysicalMaterial({ color: left ? "#182421" : "#162126", roughness: .76, metalness: .05 }));
      wall.position.set(left ? -6.4 : 6.4, 2.4, z);
      scene.add(wall);
      const beam = new THREE.PointLight(zone.accent, 9, 17, 2);
      beam.position.set(left ? -3.1 : 3.1, 3.6, z + 1.4);
      scene.add(beam);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(3.6, .045, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: zone.accent, transparent: true, opacity: .42 }));
      arch.position.set(0, 2.2, z - 5.1);
      arch.rotation.z = Math.PI;
      scene.add(arch);
    });

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array((lowPower ? 90 : 190) * 3);
    for (let i = 0; i < dust.length; i += 3) { dust[i] = (Math.random() - .5) * 21; dust[i + 1] = Math.random() * 8; dust[i + 2] = -Math.random() * 58 + 6; }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: "#f0d49e", size: .035, transparent: true, opacity: .45 })));

    let visible = true;
    let running = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .08 });
    observer.observe(container);
    const resize = () => { const { width, height } = container.getBoundingClientRect(); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const started = performance.now();
    const animate = (now: number) => {
      if (!running) return;
      requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      const t = (now - started) / 1000;
      camera.position.x = Math.sin(t * .08) * 1.1;
      camera.lookAt(0, 1.5, -22);
      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);
    return () => {
      running = false;
      observer.disconnect();
      resizeObserver.disconnect();
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) { object.geometry.dispose(); const material = object.material; const disposeMaterial = (item: THREE.Material) => { const mapped = item as THREE.Material & { map?: THREE.Texture | null }; mapped.map?.dispose(); item.dispose(); }; if (Array.isArray(material)) material.forEach(disposeMaterial); else disposeMaterial(material); } });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [manifest, onError]);

  return <div className="hometown-webgl" ref={mount} />;
}

/* Manifest images are immutable remote WebP assets (or bundled SVG demo art), already sized for their role. */
/* eslint-disable @next/next/no-img-element */
export function HometownMathWorld({ slug, previewManifest, onOpenStudio, onExploreDemo, onDetailChange }: Props) {
  const [manifest, setManifest] = useState(DEFAULT_HOMETOWN_MANIFEST);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const handleWebglError = useCallback(() => setWebglFailed(true), []);
  const exhibits = useMemo(() => allExhibits(manifest), [manifest]);
  const selected = exhibits.find((item) => item.id === selectedId) ?? null;
  const selectedZone = selected ? manifest.zones.find((zone) => zone.id === selected.zoneId) : null;
  const select = useCallback((id: string) => { setSelectedId(id); setRevealStep(0); }, []);
  const close = useCallback(() => { setSelectedId(null); setTouring(false); }, []);

  useEffect(() => {
    if (previewManifest) { const timer = window.setTimeout(() => setManifest(completeManifest(previewManifest)), 0); return () => window.clearTimeout(timer); }
    if (!slug) return;
    fetch(`/api/hometown/public/${encodeURIComponent(slug)}`).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setManifest(completeManifest(payload.manifest))).catch(() => setManifest(DEFAULT_HOMETOWN_MANIFEST));
  }, [previewManifest, slug]);

  useEffect(() => { onDetailChange?.(Boolean(selected)); document.body.classList.toggle("hometown-detail-mode", Boolean(selected)); return () => document.body.classList.remove("hometown-detail-mode"); }, [selected, onDetailChange]);

  useEffect(() => {
    if (carouselPaused || selected || exhibits.length < 2) return;
    const timer = window.setInterval(() => setCarouselIndex((index) => (index + 1) % exhibits.length), 4200);
    return () => window.clearInterval(timer);
  }, [carouselPaused, exhibits.length, selected]);

  useEffect(() => {
    const reopen = (event: Event) => {
      const exhibitId = (event as CustomEvent<{ exhibitId?: string }>).detail?.exhibitId;
      if (exhibitId && exhibits.some((item) => item.id === exhibitId)) select(exhibitId);
    };
    window.addEventListener("open-hometown-exhibit", reopen);
    return () => window.removeEventListener("open-hometown-exhibit", reopen);
  }, [exhibits, select]);

  const nextTour = useCallback((direction: number) => {
    const next = Math.min(manifest.tourPath.length - 1, Math.max(0, tourIndex + direction));
    setTourIndex(next);
    select(manifest.tourPath[next]);
  }, [manifest.tourPath, select, tourIndex]);
  const startTour = () => { setTouring(true); setTourIndex(0); select(manifest.tourPath[0]); };

  return (
    <section className="hometown-world" id="hometown" aria-label="我的家乡数学馆">
      <div className="hometown-ambient" aria-hidden="true"><i/><i/><i/></div>
      {!webglFailed ? <HometownCanvas manifest={manifest} onError={handleWebglError}/> : <div className="hometown-2d-fallback" role="status"><b>当前设备使用轻量参观模式</b><span>所有照片、数学显影与讲解仍可正常探索</span></div>}
      <header className="hometown-hero-copy">
        <span>DISCOVER BEAUTY · 发现美</span>
        <h2>我的家乡<br/>是一座数学馆</h2>
        <p>从一片叶、一座桥和一圈水纹出发，<br/>看见乡土生活里一直存在的数学。</p>
        <div><button onClick={startTour}>开始导览 <i>→</i></button><button onClick={onOpenStudio}>教师策展台</button></div>
      </header>
      <div className="hometown-photo-carousel" aria-label="家乡数学照片轮播" onPointerEnter={() => setCarouselPaused(true)} onPointerLeave={() => setCarouselPaused(false)} onFocus={() => setCarouselPaused(true)} onBlur={() => setCarouselPaused(false)}>
        <div className="hometown-carousel-window">
          {exhibits.map((item, index) => {
            const total = exhibits.length;
            const zone = manifest.zones.find((candidate) => candidate.id === item.zoneId);
            let offset = index - carouselIndex;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;
            return <button key={item.id} className={`${offset === 0 ? "active" : ""} ${Math.abs(offset) > 2 ? "is-hidden" : ""}`} style={{ "--carousel-offset": Math.max(-2, Math.min(2, offset)), "--carousel-accent": zone?.accent || "#9ad8bd" } as React.CSSProperties} onClick={() => offset === 0 ? select(item.id) : setCarouselIndex(index)} aria-label={`${item.title}${offset === 0 ? "，打开展品" : "，切换到这张照片"}`}><img src={item.thumbnailUrl} alt=""/><span><small>{zone?.name || "家乡数学"}</small><b>{item.title}</b></span></button>;
          })}
        </div>
        <button className="hometown-carousel-arrow previous" onClick={() => setCarouselIndex((index) => (index - 1 + exhibits.length) % exhibits.length)} aria-label="上一张照片">←</button>
        <button className="hometown-carousel-arrow next" onClick={() => setCarouselIndex((index) => (index + 1) % exhibits.length)} aria-label="下一张照片">→</button>
        <div className="hometown-carousel-dots">{exhibits.map((item, index) => <button key={item.id} className={index === carouselIndex ? "active" : ""} onClick={() => setCarouselIndex(index)} aria-label={`第 ${index + 1} 张：${item.title}`}/>)}</div>
      </div>

      {selected && selectedZone && (
        <div className="hometown-reveal" role="dialog" aria-modal="true" aria-label={`${selected.title} 数学显影`}>
          <button className="hometown-close" onClick={close} aria-label="关闭并返回家乡数学馆">×</button>
          <div className="hometown-photo-stage" style={{ "--hometown-accent": selectedZone.accent } as React.CSSProperties}>
            <div className="hometown-photo-frame" style={{ "--photo-ratio": (selected.imageWidth || 4) / (selected.imageHeight || 3), aspectRatio: `${selected.imageWidth || 4}/${selected.imageHeight || 3}` } as React.CSSProperties}>
              <img src={selected.imageUrl} alt={selected.title} width={selected.imageWidth || 800} height={selected.imageHeight || 600}/>
              <div className={`hometown-overlay step-${revealStep}`}><HometownMathOverlay overlay={selected.overlay} aspectRatio={(selected.imageWidth || 4) / (selected.imageHeight || 3)}/></div>
            </div>
            <div className="hometown-evidence-marker" style={{ opacity: revealStep >= 2 ? 1 : 0 }}><i/><span>{selected.learning.measurementDetail}</span></div>
            <div className="hometown-reveal-steps" aria-label="数学显影步骤">
              {["原照片", "显现结构", "寻找证据", "读懂数学"].map((label, index) => <button key={label} className={revealStep === index ? "active" : ""} onClick={() => setRevealStep(index)}><i>{index + 1}</i><span>{label}</span></button>)}
            </div>
          </div>
          <aside className="hometown-story-card" style={{ "--hometown-accent": selectedZone.accent } as React.CSSProperties}>
            <span>{selectedZone.name} · {selected.conceptLabel}</span>
            <h3>{selected.title}</h3>
            <p>{selected.learning.observation || selected.interpretation}</p>
            <section className={`hometown-math-reading ${revealStep >= 3 ? "is-visible" : ""}`} aria-live="polite">
              <header><span>核心测量</span><strong>{selected.learning.measurementValue}</strong><small>{selected.learning.measurementDetail}</small></header>
              <div className="hometown-formula-card"><span>数学表达式</span><strong>{selected.learning.formula}</strong><p>{selected.learning.formulaMeaning}</p></div>
              <ol>{selected.learning.reasoning.map((line, index) => <li key={line}><i>{index + 1}</i><span>{line}</span></li>)}</ol>
              <dl>{selected.learning.variables.map((variable) => <div key={variable.symbol}><dt>{variable.symbol}</dt><dd>{variable.meaning}</dd></div>)}</dl>
              <div className="hometown-why"><b>为什么这种结构很美？</b><p>{selected.learning.whyItMatters}</p></div>
              <div className="hometown-applications"><b>生活中的应用</b><p>{selected.learning.applications.map((application) => <span key={application}>{application}</span>)}</p></div>
              <div className="hometown-explore-prompt"><b>你也可以这样探索</b><p>{selected.learning.explorePrompt}</p></div>
            </section>
            <button onClick={() => { const exhibitId = selected.id; close(); onExploreDemo(selected.interactiveDemoId, exhibitId); }}>去互动实验里试一试 <i>↗</i></button>
            {touring && <nav aria-label="课堂导览控制"><button disabled={tourIndex === 0} onClick={() => nextTour(-1)}>← 上一站</button><span>{tourIndex + 1} / {manifest.tourPath.length}</span><button disabled={tourIndex === manifest.tourPath.length - 1} onClick={() => nextTour(1)}>下一站 →</button></nav>}
          </aside>
        </div>
      )}
    </section>
  );
}
