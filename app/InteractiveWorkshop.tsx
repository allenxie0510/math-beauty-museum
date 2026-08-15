"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeElementSize, observeElementVisibility } from "./viewport";

type GalleryPanel = {
  color: string;
  title: string;
  subtitle: string;
  position: [number, number, number];
  radius: number;
  active?: boolean;
};

const PANELS: GalleryPanel[] = [
  { color: "#d7513c", title: "剪纸", subtitle: "PAPER CUT", position: [-3.75, 1.18, -4.12], radius: 1.02, active: true },
  { color: "#e69d52", title: "", subtitle: "", position: [-1.28, 1.18, -4.15], radius: .76 },
  { color: "#15a7b0", title: "", subtitle: "", position: [1.25, 1.18, -4.15], radius: .82 },
  { color: "#ef427a", title: "", subtitle: "", position: [3.75, 1.18, -4.15], radius: .68 },
  { color: "#6f7f32", title: "", subtitle: "", position: [-3.78, -1.4, -4.15], radius: .74 },
  { color: "#a977a4", title: "", subtitle: "", position: [-1.27, -1.4, -4.15], radius: .88 },
  { color: "#6bbdb5", title: "", subtitle: "", position: [1.28, -1.4, -4.15], radius: .72 },
  { color: "#e5bd39", title: "", subtitle: "", position: [3.76, -1.4, -4.15], radius: .84 },
];

function panelTexture(panel: GalleryPanel) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = panel.color;
  context.fillRect(0, 0, 512, 512);
  if (panel.active) {
    context.save();
    context.translate(256, 205);
    context.fillStyle = "rgba(247,248,250,.9)";
    for (let ring = 0; ring < 3; ring += 1) {
      const count = 7 + ring * 3;
      for (let index = 0; index < count; index += 1) {
        const angle = index / count * Math.PI * 2 + ring * .22;
        const radius = 48 + ring * 44;
        context.beginPath();
        context.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius, 10 + ring * 2, 5 + ring, angle, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
    context.fillStyle = "#171a20";
    context.textAlign = "center";
    context.font = "700 56px sans-serif";
    context.fillText(panel.title, 256, 374);
    context.font = "700 19px sans-serif";
    context.letterSpacing = "5px";
    context.fillText(panel.subtitle, 256, 411);
    context.font = "500 15px sans-serif";
    context.letterSpacing = "2px";
    context.fillText("旋转 · 重复 · 对称", 256, 448);
  } else {
    context.fillStyle = "rgba(15,16,16,.72)";
    context.textAlign = "center";
    context.font = "700 17px sans-serif";
    context.letterSpacing = "4px";
    context.fillText("COMING SOON", 256, 266);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function WorkshopGallery3D({ openPaperCut, reportError }: { openPaperCut: () => void; reportError: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(openPaperCut);
  useEffect(() => { openRef.current = openPaperCut; }, [openPaperCut]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      window.setTimeout(reportError, 0);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-label", "浅色互动工坊虚拟展厅，墙上设有圆形互动入口");
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dfe2e7");
    scene.fog = new THREE.Fog("#dfe2e7", 13, 24);
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 60);
    camera.position.set(0, .15, 8.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -.08, -4.2);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minAzimuthAngle = -.16;
    controls.maxAzimuthAngle = .16;
    controls.minPolarAngle = Math.PI * .47;
    controls.maxPolarAngle = Math.PI * .53;

    scene.add(new THREE.HemisphereLight("#ffffff", "#59606b", 2.2));
    const keyLight = new THREE.DirectionalLight("#ffffff", 3.4);
    keyLight.position.set(-3.5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight("#cfe8ff", 12, 20, 2);
    fillLight.position.set(5, 1, 4);
    scene.add(fillLight);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: "#f1f2f4", roughness: .82, metalness: 0 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(15.8, 7.7), wallMaterial);
    backWall.position.set(0, 0, -4.5);
    backWall.receiveShadow = true;
    scene.add(backWall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(19, 18), new THREE.MeshStandardMaterial({ color: "#c9cdd3", roughness: .72 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.28, -.5);
    floor.receiveShadow = true;
    scene.add(floor);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(19, 18), new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: .9 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.52, -.5);
    scene.add(ceiling);

    const gridMaterial = new THREE.MeshStandardMaterial({ color: "#252728", roughness: .65 });
    for (const x of [-5.3, -2.65, 0, 2.65, 5.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(.055, 7.7, .075), gridMaterial);
      rail.position.set(x, 0, -4.37);
      scene.add(rail);
    }
    for (const y of [-2.7, 0, 2.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(15.8, .055, .075), gridMaterial);
      rail.position.set(0, y, -4.37);
      scene.add(rail);
    }

    const panelGroups: THREE.Group[] = [];
    const hitTargets: THREE.Object3D[] = [];
    const textures: THREE.Texture[] = [];
    PANELS.forEach((panel, index) => {
      const group = new THREE.Group();
      group.position.set(...panel.position);
      group.userData.baseY = panel.position[1];
      group.userData.phase = index * .71;
      const depth = new THREE.Mesh(new THREE.CylinderGeometry(panel.radius, panel.radius, .18, 64), new THREE.MeshStandardMaterial({ color: "#202221", roughness: .66 }));
      depth.rotation.x = Math.PI / 2;
      depth.castShadow = true;
      group.add(depth);
      const texture = panelTexture(panel);
      textures.push(texture);
      const face = new THREE.Mesh(new THREE.CircleGeometry(panel.radius * .96, 64), new THREE.MeshStandardMaterial({ map: texture, roughness: .7, metalness: 0 }));
      face.position.z = .1;
      face.castShadow = true;
      face.userData.active = !!panel.active;
      face.userData.panelIndex = index;
      group.add(face);
      if (panel.active) hitTargets.push(face);
      panelGroups.push(group);
      scene.add(group);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };
    const updatePointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      pointer.y = -(event.clientY - bounds.top) / bounds.height * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(hitTargets, false);
    };
    const handlePointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
    const handlePointerMove = (event: PointerEvent) => {
      const hits = updatePointer(event);
      renderer.domElement.style.cursor = hits.length ? "pointer" : "grab";
    };
    const handlePointerUp = (event: PointerEvent) => {
      const tolerance = event.pointerType === "touch" ? 18 : 7;
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > tolerance) return;
      if (updatePointer(event).some((hit) => hit.object.userData.active)) openRef.current();
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    const handleContextLoss = (event: Event) => { event.preventDefault(); reportError(); };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLoss);

    let visible = true;
    let animationFrame = 0;
    const timer = new THREE.Timer();
    timer.connect(document);
    const render = (timestamp?: number) => {
      animationFrame = 0;
      if (!visible) return;
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      panelGroups.forEach((group) => {
        group.rotation.y = Math.sin(elapsed * .55 + Number(group.userData.phase)) * .028;
        group.position.y = Number(group.userData.baseY) + Math.sin(elapsed * .7 + Number(group.userData.phase)) * .025;
      });
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    const stopVisibility = observeElementVisibility(mount, (nextVisible) => {
      visible = nextVisible;
      if (visible && !animationFrame) animationFrame = window.requestAnimationFrame(render);
      if (!visible && animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
    });
    const stopSize = observeElementSize(mount, () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 720 ? 10.8 : 8.2;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });

    return () => {
      stopVisibility();
      stopSize();
      window.cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLoss);
      controls.dispose();
      timer.dispose();
      textures.forEach((texture) => texture.dispose());
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reportError]);

  return <div className="workshop-gallery-webgl" ref={mountRef} />;
}

type CutPoint = { x: number; y: number };
type CutShape = { points: CutPoint[]; closed: boolean };
type PaperCutStage = "cutting" | "unfolding" | "unfolded";

function paperGeometry(width: number, height: number, repeat: number, unfolded: boolean) {
  const centerX = width / 2;
  const centerY = unfolded ? height / 2 : height * .88;
  const radius = unfolded ? Math.min(width, height) * .42 : Math.min(width * .42, height * .76);
  const halfAngle = Math.PI / repeat;
  return { centerX, centerY, radius, halfAngle };
}

function wedgePath(centerX: number, centerY: number, radius: number, halfAngle: number) {
  const path = new Path2D();
  path.moveTo(centerX, centerY);
  path.lineTo(centerX + Math.cos(-Math.PI / 2 - halfAngle) * radius, centerY + Math.sin(-Math.PI / 2 - halfAngle) * radius);
  path.arc(centerX, centerY, radius, -Math.PI / 2 - halfAngle, -Math.PI / 2 + halfAngle);
  path.closePath();
  return path;
}

function preparePaperCanvas(canvas: HTMLCanvasElement) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function mappedCutPath(shape: CutShape, width: number, height: number, editGeometry: ReturnType<typeof paperGeometry>, finalRadius: number, close: boolean) {
  const path = new Path2D();
  shape.points.forEach((point, index) => {
    const sourceX = point.x * width - editGeometry.centerX;
    const sourceY = point.y * height - editGeometry.centerY;
    const x = sourceX / editGeometry.radius * finalRadius;
    const y = sourceY / editGeometry.radius * finalRadius;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  if (close && shape.points.length > 2) path.closePath();
  return path;
}

function polygonArea(points: CutPoint[]) {
  if (points.length < 3) return 0;
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });
  return Math.abs(area) / 2;
}

function carveCuts(context: CanvasRenderingContext2D, cuts: CutShape[], width: number, height: number, editGeometry: ReturnType<typeof paperGeometry>, finalRadius: number) {
  context.globalCompositeOperation = "destination-out";
  cuts.forEach((shape) => {
    if (!shape.closed || shape.points.length < 3) return;
    context.fill(mappedCutPath(shape, width, height, editGeometry, finalRadius, true), "evenodd");
  });
}

function previewCut(context: CanvasRenderingContext2D, cuts: CutShape[], width: number, height: number, editGeometry: ReturnType<typeof paperGeometry>, finalRadius: number) {
  const shape = cuts[cuts.length - 1];
  if (!shape || shape.closed || shape.points.length < 2) return;
  const path = mappedCutPath(shape, width, height, editGeometry, finalRadius, true);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(247,248,250,.5)";
  context.fill(path, "evenodd");
  context.strokeStyle = "#762d23";
  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.setLineDash([]);
  context.stroke(path);
}

function drawFoldedPaper(canvas: HTMLCanvasElement, repeat: number, cuts: CutShape[]) {
  const prepared = preparePaperCanvas(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  const geometry = paperGeometry(width, height, repeat, false);
  const path = wedgePath(geometry.centerX, geometry.centerY, geometry.radius, geometry.halfAngle);
  context.save();
  context.shadowColor = "rgba(12,15,20,.25)";
  context.shadowBlur = 24;
  context.shadowOffsetX = 12;
  context.shadowOffsetY = 17;
  context.fillStyle = "#c94f3b";
  context.fill(path);
  context.restore();
  context.save();
  context.clip(path);
  const gradient = context.createLinearGradient(geometry.centerX - geometry.radius * .45, 0, geometry.centerX + geometry.radius * .45, 0);
  gradient.addColorStop(0, "rgba(255,255,255,.2)");
  gradient.addColorStop(.42, "rgba(255,255,255,0)");
  gradient.addColorStop(1, "rgba(49,5,1,.15)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.translate(geometry.centerX, geometry.centerY);
  carveCuts(context, cuts, width, height, geometry, geometry.radius);
  previewCut(context, cuts, width, height, geometry, geometry.radius);
  context.restore();
  context.strokeStyle = "rgba(91,28,20,.35)";
  context.lineWidth = 1;
  context.stroke(path);
}

function drawUnfoldedPaper(canvas: HTMLCanvasElement, repeat: number, cuts: CutShape[], progress: number) {
  const prepared = preparePaperCanvas(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  const finalGeometry = paperGeometry(width, height, repeat, true);
  const editGeometry = paperGeometry(width, height, repeat, false);
  const easedProgress = 1 - Math.pow(1 - Math.min(1, progress), 3);
  for (let index = 0; index < repeat; index += 1) {
    const delay = index / Math.max(1, repeat - 1) * .16;
    const localProgress = Math.max(0, Math.min(1, (easedProgress - delay) / (1 - delay)));
    const rotation = index * Math.PI * 2 / repeat * localProgress;
    context.save();
    context.translate(finalGeometry.centerX, finalGeometry.centerY);
    context.rotate(rotation);
    if (index % 2) context.scale(-1, 1);
    const path = wedgePath(0, 0, finalGeometry.radius, finalGeometry.halfAngle);
    context.shadowColor = progress < 1 ? "rgba(16,18,24,.2)" : "rgba(16,18,24,.08)";
    context.shadowBlur = progress < 1 ? 12 : 4;
    context.fillStyle = index % 2 ? "#c14937" : "#cf5540";
    context.fill(path);
    context.clip(path);
    carveCuts(context, cuts, width, height, editGeometry, finalGeometry.radius);
    context.restore();
  }
  context.save();
  context.translate(finalGeometry.centerX, finalGeometry.centerY);
  context.fillStyle = "#b43d2d";
  context.beginPath();
  context.arc(0, 0, Math.max(5, finalGeometry.radius * .025), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function PaperCutPreview({ close }: { close: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const [repeat, setRepeat] = useState(8);
  const [cuts, setCuts] = useState<CutShape[]>([]);
  const [stage, setStage] = useState<PaperCutStage>("cutting");
  const [unfoldProgress, setUnfoldProgress] = useState(0);
  const hasCuts = cuts.some((shape) => shape.closed && shape.points.length > 2);
  const isDrawing = cuts.some((shape) => !shape.closed);

  useEffect(() => {
    document.body.classList.add("workshop-detail-mode");
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("workshop-detail-mode");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  useEffect(() => {
    if (stage !== "unfolding") return;
    let frame = 0;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const next = reduceMotion ? 1 : Math.min(1, (now - startedAt) / 1350);
      setUnfoldProgress(next);
      if (next < 1) frame = window.requestAnimationFrame(animate);
      else setStage("unfolded");
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => stage === "cutting" ? drawFoldedPaper(canvas, repeat, cuts) : drawUnfoldedPaper(canvas, repeat, cuts, stage === "unfolded" ? 1 : unfoldProgress);
    render();
    if (!("ResizeObserver" in window)) {
      window.addEventListener("resize", render, { passive: true });
      return () => window.removeEventListener("resize", render);
    }
    const observer = new ResizeObserver(render);
    observer.observe(canvas.parentElement ?? canvas);
    return () => observer.disconnect();
  }, [cuts, repeat, stage, unfoldProgress]);

  const pointFromClient = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (clientX - bounds.left) / bounds.width, y: (clientY - bounds.top) / bounds.height };
  };
  const beginCut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage !== "cutting") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const point = pointFromClient(event.currentTarget, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setCuts((current) => [...current.filter((shape) => shape.closed), { points: [point], closed: false }]);
  };
  const continueCut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId || stage !== "cutting") return;
    event.preventDefault();
    const nativeEvents = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    const points = nativeEvents.map((sample) => pointFromClient(event.currentTarget, sample.clientX, sample.clientY));
    setCuts((current) => {
      if (!current.length) return current;
      const next = current.slice();
      const shape = next[next.length - 1];
      if (shape.closed) return current;
      const shapePoints = [...shape.points];
      points.forEach((point) => {
        const previous = shapePoints[shapePoints.length - 1];
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= .0005) shapePoints.push(point);
      });
      if (shapePoints.length === shape.points.length) return current;
      next[next.length - 1] = { ...shape, points: shapePoints };
      return next;
    });
  };
  const endCut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const finalPoint = pointFromClient(event.currentTarget, event.clientX, event.clientY);
    setCuts((current) => {
      const shape = current[current.length - 1];
      if (!shape || shape.closed) return current;
      const points = [...shape.points];
      const previous = points[points.length - 1];
      if (!previous || Math.hypot(finalPoint.x - previous.x, finalPoint.y - previous.y) >= .0005) points.push(finalPoint);
      if (points.length < 3 || polygonArea(points) < .0000001) return current.slice(0, -1);
      return [...current.slice(0, -1), { points, closed: true }];
    });
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const chooseRepeat = (count: number) => {
    setRepeat(count);
    setCuts([]);
    setStage("cutting");
    setUnfoldProgress(0);
  };
  const reset = () => { setCuts([]); setStage("cutting"); setUnfoldProgress(0); };
  const unfold = () => { if (hasCuts && !isDrawing) { activePointer.current = null; setUnfoldProgress(0); setStage("unfolding"); } };

  return (
    <div className="papercut-backdrop" role="dialog" aria-modal="true" aria-labelledby="papercut-title">
      <div className="papercut-shell">
        <button className="papercut-close" onClick={close} aria-label="关闭剪纸互动">×</button>
        <header><span>PAPER CUT · 旋转与对称</span><h2 id="papercut-title">圈出形状，剪掉区域，<br />看看图案怎样重复</h2><p>按住鼠标或触摸屏描画轮廓，松开后轮廓会自动闭合，内部区域将被准确剪掉。</p></header>
        <section className={`papercut-preview-stage ${stage}`}>
          <div className="papercut-canvas-wrap">
            <div className="papercut-stage-label"><span>{stage === "cutting" ? "FOLDED PAPER · 折叠状态" : "UNFOLDING · 展开状态"}</span><b>{stage === "cutting" ? `1 / ${repeat} 片` : `${repeat} 次重复`}</b></div>
            <canvas ref={canvasRef} onPointerDown={beginCut} onPointerMove={continueCut} onPointerUp={endCut} onPointerCancel={endCut} onLostPointerCapture={endCut} aria-label={stage === "cutting" ? "剪纸画布，用鼠标或手指描画封闭轮廓，松开后剪掉内部区域" : "展开后的完整剪纸图案"} />
            {!hasCuts && !isDrawing && stage === "cutting" && <div className="papercut-draw-hint"><i>✂</i><span>按住描画一个封闭轮廓<br />松开后剪掉内部</span></div>}
            {isDrawing && stage === "cutting" && <div className="papercut-cut-confirmation drawing" role="status"><i />正在圈选 · 松开完成剪裁</div>}
            {hasCuts && !isDrawing && stage === "cutting" && <div className="papercut-cut-confirmation" role="status"><i />区域已剪掉 · 可以继续圈选</div>}
            {stage === "unfolding" && <div className="papercut-unfold-status" role="status">纸张正在一层层展开…</div>}
          </div>
        </section>
        <aside>
          <span>{stage === "cutting" ? "01 · 选择重复次数" : "02 · 发现重复与对称"}</span>
          <div className="papercut-repeat-options">{[4, 6, 8, 12].map((count) => <button key={count} className={repeat === count ? "active" : ""} onClick={() => chooseRepeat(count)} disabled={stage === "unfolding"}><b>{count}</b><small>重复</small></button>)}</div>
          <p>完整一圈是 360°。重复 {repeat} 次，每一片会旋转 <b>360° ÷ {repeat} = {360 / repeat}°</b>。</p>
          {stage === "cutting" ? <><div className="papercut-edit-actions"><button onClick={() => setCuts((current) => current.filter((shape) => shape.closed).slice(0, -1))} disabled={!hasCuts || isDrawing}>撤销一个区域</button><button onClick={reset} disabled={!hasCuts || isDrawing}>重新剪</button></div><button className="papercut-start" onClick={unfold} disabled={!hasCuts || isDrawing}>展开我的剪纸 <i>→</i></button></> : <button className="papercut-start" onClick={reset} disabled={stage === "unfolding"}>{stage === "unfolding" ? "正在展开…" : "再剪一张"}<i>↻</i></button>}
        </aside>
      </div>
    </div>
  );
}

export function InteractiveWorkshop() {
  const [paperCutOpen, setPaperCutOpen] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const openPaperCut = useCallback(() => setPaperCutOpen(true), []);
  const closePaperCut = useCallback(() => setPaperCutOpen(false), []);
  const reportWebglError = useCallback(() => setWebglError(true), []);
  return (
    <section className="workshop-world workshop-gallery" id="workshop" aria-labelledby="workshop-title">
      {!webglError && <WorkshopGallery3D key={retryKey} openPaperCut={openPaperCut} reportError={reportWebglError} />}
      {webglError && <div className="workshop-gallery-fallback"><div className="workshop-fallback-grid">{PANELS.map((panel, index) => <button key={index} className={panel.active ? "active" : ""} style={{ "--panel-color": panel.color } as React.CSSProperties} onClick={() => panel.active && openPaperCut()} disabled={!panel.active}>{panel.active ? "剪纸" : "即将开放"}</button>)}</div><button className="workshop-webgl-retry" onClick={() => { setWebglError(false); setRetryKey((value) => value + 1); }}>重新开启 3D 展厅</button></div>}
      <div className="workshop-gallery-shade" aria-hidden="true" />
      <header className="workshop-gallery-title"><span>MAKE WITH MATHEMATICS · INTERACTIVE WORKSHOP</span><h2 id="workshop-title">互动工坊</h2><p>走近墙上的圆形展板，选择一种数学手艺</p></header>
      <button className="workshop-paper-entry" onClick={openPaperCut}><span>当前开放</span><b>进入剪纸工坊</b><i>↗</i></button>
      <div className="workshop-gallery-hint"><i>◎</i><span>拖动视角探索空间 · 点击红色展板进入</span></div>
      {paperCutOpen && <PaperCutPreview close={closePaperCut} />}
    </section>
  );
}
