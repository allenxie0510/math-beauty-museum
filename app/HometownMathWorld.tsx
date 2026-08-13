"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEFAULT_HOMETOWN_MANIFEST } from "./hometown-math/domain/default-manifest";
import type { HometownSceneManifest, OverlayGeometry } from "./hometown-math/domain/types";

type Props = {
  slug?: string | null;
  previewManifest?: HometownSceneManifest | null;
  onOpenStudio: () => void;
  onExploreDemo: (demoId: string, exhibitId: string) => void;
  onDetailChange?: (open: boolean) => void;
};

const allExhibits = (manifest: HometownSceneManifest) => manifest.zones.flatMap((zone) => zone.exhibits);

function Overlay({ overlay, accent }: { overlay: OverlayGeometry; accent: string }) {
  const line = { stroke: accent, strokeWidth: 2, fill: "none", vectorEffect: "non-scaling-stroke" as const };
  if (overlay.type === "axis") return <svg viewBox="0 0 100 100"><line x1="50" y1="12" x2="50" y2="89" {...line} strokeDasharray="4 3"/><path d="M42 25L50 18L58 25M42 75L50 82L58 75" {...line}/></svg>;
  if (overlay.type === "radial") return <svg viewBox="0 0 100 100">{Array.from({ length: overlay.spacing ?? 8 }, (_, index) => <line key={index} x1="50" y1="50" x2="50" y2="15" transform={`rotate(${index * 360 / (overlay.spacing ?? 8)} 50 50)`} {...line}/>)}</svg>;
  if (overlay.type === "nested") return <svg viewBox="0 0 100 100">{[0, 1, 2, 3].map((index) => <rect key={index} x={12 + index * 9} y={14 + index * 9} width={76 - index * 18} height={70 - index * 18} rx="4" {...line}/>)}</svg>;
  if (overlay.type === "repeat") return <svg viewBox="0 0 100 100">{Array.from({ length: 6 }, (_, index) => <g key={index} transform={`translate(${10 + index * 15} 0)`}><path d="M0 34L12 50L0 66" {...line}/></g>)}</svg>;
  if (overlay.type === "arch") return <svg viewBox="0 0 100 100"><path d="M12 78C18 20 82 20 88 78" {...line}/><path d="M20 78C26 34 74 34 80 78" {...line}/><line x1="8" y1="78" x2="92" y2="78" {...line}/></svg>;
  if (overlay.type === "hexgrid") return <svg viewBox="0 0 100 100">{[[28,30],[50,30],[72,30],[17,49],[39,49],[61,49],[83,49],[28,68],[50,68],[72,68]].map(([x,y], index) => <polygon key={index} points={`${x-10},${y} ${x-5},${y-9} ${x+5},${y-9} ${x+10},${y} ${x+5},${y+9} ${x-5},${y+9}`} {...line}/>)}</svg>;
  if (overlay.type === "spiral") return <svg viewBox="0 0 100 100"><path d="M50 50C54 44 62 47 62 54C62 65 45 70 36 59C23 42 40 20 61 25C86 31 89 64 68 78" {...line}/><circle cx="50" cy="50" r="3" fill={accent}/></svg>;
  return <svg viewBox="0 0 100 100"><path d="M5 52C16 28 27 76 39 52S62 28 73 52S89 76 98 52" {...line}/><path d="M5 64C16 40 27 88 39 64S62 40 73 64S89 88 98 64" {...line} opacity=".5"/></svg>;
}

function HometownCanvas({ manifest, onPick, onError }: { manifest: HometownSceneManifest; onPick: (id: string) => void; onError: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const pickRef = useRef(onPick);

  useEffect(() => { pickRef.current = onPick; }, [onPick]);

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
    renderer.domElement.setAttribute("aria-label", "我的家乡数学馆三维展厅，可点击发光展板探索");
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#d8e5d6", "#0b1114", 1.2));
    const warm = new THREE.DirectionalLight(manifest.environment.light, 2.2);
    warm.position.set(-5, 11, 7);
    scene.add(warm);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 100), new THREE.MeshPhysicalMaterial({ color: manifest.environment.floor, roughness: .37, metalness: .18, clearcoat: .22 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.3, -27);
    scene.add(floor);

    const interactives: THREE.Mesh[] = [];
    manifest.zones.forEach((zone, zoneIndex) => {
      const z = -zoneIndex * 13 - 5;
      const left = zoneIndex % 2 === 0;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(11.2, 7.8, .25), new THREE.MeshPhysicalMaterial({ color: left ? "#182421" : "#162126", roughness: .76, metalness: .05 }));
      wall.position.set(left ? -6.4 : 6.4, 2.4, z);
      scene.add(wall);
      const beam = new THREE.PointLight(zone.accent, 9, 17, 2);
      beam.position.set(left ? -3.1 : 3.1, 3.6, z + 1.4);
      scene.add(beam);
      zone.exhibits.forEach((exhibit, index) => {
        const panelMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(zone.accent).multiplyScalar(.38), transparent: true, opacity: .82 });
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.25), panelMaterial);
        panel.position.set((left ? -8.7 : 4.1) + index * 3.55, 2.55, z + (left ? .15 : -.15));
        if (!left) panel.rotation.y = Math.PI;
        panel.userData.exhibitId = exhibit.id;
        interactives.push(panel);
        scene.add(panel);
        new THREE.TextureLoader().load(exhibit.thumbnailUrl, (texture) => {
          if (!running) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          panelMaterial.map = texture;
          panelMaterial.color.set("#ffffff");
          panelMaterial.needsUpdate = true;
        });
        const frame = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({ color: zone.accent, transparent: true, opacity: .85 }));
        panel.add(frame);
      });
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

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const click = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height * 2 - 1));
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactives, false)[0];
      if (hit?.object.userData.exhibitId) pickRef.current(hit.object.userData.exhibitId);
    };
    renderer.domElement.addEventListener("pointerup", click);
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
      renderer.domElement.removeEventListener("pointerup", click);
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) { object.geometry.dispose(); const material = object.material; const disposeMaterial = (item: THREE.Material) => { const mapped = item as THREE.Material & { map?: THREE.Texture | null }; mapped.map?.dispose(); item.dispose(); }; if (Array.isArray(material)) material.forEach(disposeMaterial); else disposeMaterial(material); } });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [manifest, onError]);

  return <div className="hometown-webgl" ref={mount} />;
}

/* Manifest images are immutable R2 WebP assets (or bundled SVG demo art), already sized for their role. */
/* eslint-disable @next/next/no-img-element */
export function HometownMathWorld({ slug, previewManifest, onOpenStudio, onExploreDemo, onDetailChange }: Props) {
  const [manifest, setManifest] = useState(DEFAULT_HOMETOWN_MANIFEST);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const handleWebglError = useCallback(() => setWebglFailed(true), []);
  const exhibits = useMemo(() => allExhibits(manifest), [manifest]);
  const selected = exhibits.find((item) => item.id === selectedId) ?? null;
  const selectedZone = selected ? manifest.zones.find((zone) => zone.id === selected.zoneId) : null;
  const select = useCallback((id: string) => { setSelectedId(id); setRevealStep(0); }, []);
  const close = useCallback(() => { setSelectedId(null); setTouring(false); }, []);

  useEffect(() => {
    if (previewManifest) { const timer = window.setTimeout(() => setManifest(previewManifest), 0); return () => window.clearTimeout(timer); }
    if (!slug) return;
    fetch(`/api/hometown/public/${encodeURIComponent(slug)}`).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setManifest(payload.manifest)).catch(() => setManifest(DEFAULT_HOMETOWN_MANIFEST));
  }, [previewManifest, slug]);

  useEffect(() => { onDetailChange?.(Boolean(selected)); document.body.classList.toggle("hometown-detail-mode", Boolean(selected)); return () => document.body.classList.remove("hometown-detail-mode"); }, [selected, onDetailChange]);

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
      {!webglFailed ? <HometownCanvas manifest={manifest} onPick={select} onError={handleWebglError}/> : <div className="hometown-2d-fallback" role="status"><b>当前设备使用轻量参观模式</b><span>所有照片、数学显影与讲解仍可正常探索</span></div>}
      <header className="hometown-hero-copy">
        <span>DISCOVER BEAUTY · 发现美</span>
        <h2>我的家乡<br/>是一座数学馆</h2>
        <p>从一片叶、一座桥和一圈水纹出发，<br/>看见乡土生活里一直存在的数学。</p>
        <div><button onClick={startTour}>开始导览 <i>→</i></button><button onClick={onOpenStudio}>教师策展台</button></div>
      </header>
      <aside className="hometown-zone-rail" aria-label="家乡数学展分区">
        {manifest.zones.map((zone) => <button key={zone.id} onClick={() => select(zone.exhibits[0]?.id)}><i style={{ background: zone.accent }}/><span>{zone.name}<small>{zone.subtitle}</small></span><b>{String(zone.exhibits.length).padStart(2, "0")}</b></button>)}
      </aside>
      <div className="hometown-curator-note"><span>OUR HOMETOWN EXHIBITION</span><b>{manifest.schoolClass || "乡村少年共同策展"}</b><small>{manifest.locationLabel}</small></div>
      {webglFailed && <div className="hometown-fallback-grid">{exhibits.map((item) => <button key={item.id} onClick={() => select(item.id)}><img src={item.thumbnailUrl} alt=""/><span>{item.title}</span></button>)}</div>}

      {selected && selectedZone && (
        <div className="hometown-reveal" role="dialog" aria-modal="true" aria-label={`${selected.title} 数学显影`}>
          <button className="hometown-close" onClick={close} aria-label="关闭并返回家乡数学馆">×</button>
          <div className="hometown-photo-stage" style={{ "--hometown-accent": selectedZone.accent } as React.CSSProperties}>
            <img src={selected.imageUrl} alt={selected.title}/>
            <div className={`hometown-overlay step-${revealStep}`}><Overlay overlay={selected.overlay} accent={selectedZone.accent}/></div>
            <div className="hometown-evidence-marker" style={{ opacity: revealStep >= 2 ? 1 : 0 }}><i/><span>{selected.evidence}</span></div>
            <div className="hometown-reveal-steps" aria-label="数学显影步骤">
              {["原照片", "显现结构", "寻找证据", "读懂数学"].map((label, index) => <button key={label} className={revealStep === index ? "active" : ""} onClick={() => setRevealStep(index)}><i>{index + 1}</i><span>{label}</span></button>)}
            </div>
          </div>
          <aside className="hometown-story-card" style={{ "--hometown-accent": selectedZone.accent } as React.CSSProperties}>
            <span>{selectedZone.name} · {selected.conceptLabel}</span>
            <h3>{selected.title}</h3>
            <p>{selected.interpretation}</p>
            <div><b>我们看见的证据</b><p>{selected.evidence}</p></div>
            <button onClick={() => { const exhibitId = selected.id; close(); onExploreDemo(selected.interactiveDemoId, exhibitId); }}>去互动实验里试一试 <i>↗</i></button>
            {touring && <nav aria-label="课堂导览控制"><button disabled={tourIndex === 0} onClick={() => nextTour(-1)}>← 上一站</button><span>{tourIndex + 1} / {manifest.tourPath.length}</span><button disabled={tourIndex === manifest.tourPath.length - 1} onClick={() => nextTour(1)}>下一站 →</button></nav>}
          </aside>
        </div>
      )}
    </section>
  );
}
