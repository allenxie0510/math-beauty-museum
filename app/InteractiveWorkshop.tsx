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
  { color: "#c94838", title: "剪纸", subtitle: "PAPER CUT", position: [-1.88, 1.22, -4.05], radius: .96, active: true },
  { color: "#c58952", title: "", subtitle: "", position: [.18, 1.22, -4.08], radius: .72 },
  { color: "#298f98", title: "", subtitle: "", position: [2.16, 1.22, -4.08], radius: .78 },
  { color: "#c74e77", title: "", subtitle: "", position: [4.12, 1.22, -4.08], radius: .66 },
  { color: "#71804a", title: "", subtitle: "", position: [-1.88, -1.28, -4.08], radius: .72 },
  { color: "#91718f", title: "", subtitle: "", position: [.18, -1.28, -4.08], radius: .82 },
  { color: "#599d97", title: "", subtitle: "", position: [2.16, -1.28, -4.08], radius: .7 },
  { color: "#c9a83b", title: "", subtitle: "", position: [4.12, -1.28, -4.08], radius: .8 },
];

function panelTexture(panel: GalleryPanel) {
  const canvas = document.createElement("canvas");
  const textureSize = 1024;
  canvas.width = textureSize;
  canvas.height = textureSize;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = panel.color;
  context.fillRect(0, 0, textureSize, textureSize);
  if (panel.active) {
    context.save();
    context.translate(512, 390);
    context.globalCompositeOperation = "destination-out";

    // A high-resolution, genuinely cut-out floral rosette: petals, leaves and
    // small bridge openings read as paper craft rather than a generic icon.
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      context.save();
      context.rotate(angle);
      context.beginPath();
      context.moveTo(0, -72);
      context.bezierCurveTo(-38, -116, -32, -190, 0, -238);
      context.bezierCurveTo(32, -190, 38, -116, 0, -72);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(30, -256);
      context.quadraticCurveTo(77, -298, 119, -261);
      context.quadraticCurveTo(73, -230, 30, -256);
      context.closePath();
      context.fill();
      context.restore();
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
      context.save();
      context.rotate(angle);
      context.beginPath();
      context.moveTo(0, -28);
      context.quadraticCurveTo(-34, -61, 0, -106);
      context.quadraticCurveTo(34, -61, 0, -28);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.beginPath();
    for (let point = 0; point < 16; point += 1) {
      const angle = point / 16 * Math.PI * 2 - Math.PI / 2;
      const radius = point % 2 === 0 ? 56 : 25;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.restore();

    context.fillStyle = "#f7f8fa";
    context.textAlign = "center";
    context.font = "650 94px sans-serif";
    context.fillText(panel.title, 512, 772);
    context.font = "700 28px sans-serif";
    context.letterSpacing = "10px";
    context.fillText(panel.subtitle, 512, 834);
    context.font = "400 24px sans-serif";
    context.letterSpacing = "6px";
    context.fillText("折叠 · 重复 · 对称", 512, 891);
  } else {
    context.fillStyle = "rgba(20,23,27,.66)";
    context.textAlign = "center";
    context.font = "650 25px sans-serif";
    context.letterSpacing = "8px";
    context.fillText("COMING SOON", 512, 526);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
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
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-label", "浅色互动工坊虚拟展厅，墙上设有圆形互动入口");
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d9dde2");
    scene.fog = new THREE.Fog("#d9dde2", 16, 31);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 70);
    camera.position.set(1.15, .18, 9.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(1.12, -.08, -4.18);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minAzimuthAngle = -.16;
    controls.maxAzimuthAngle = .16;
    controls.minPolarAngle = Math.PI * .47;
    controls.maxPolarAngle = Math.PI * .53;

    scene.add(new THREE.HemisphereLight("#ffffff", "#77808b", 1.7));
    const keyLight = new THREE.DirectionalLight("#fffdf8", 2.6);
    keyLight.position.set(-4.5, 7.5, 6.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -.00035;
    keyLight.shadow.normalBias = .025;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);

    const galleryFill = new THREE.RectAreaLight("#d9e8f5", 7.5, 6.5, 4.2);
    galleryFill.position.set(4.2, .7, 3.5);
    galleryFill.lookAt(1.2, 0, -4.2);
    scene.add(galleryFill);
    const warmFill = new THREE.RectAreaLight("#fff8ed", 5.8, 4.8, 3.4);
    warmFill.position.set(-3.8, 1.2, 2.8);
    warmFill.lookAt(-.8, .4, -4.2);
    scene.add(warmFill);

    const wallMaterial = new THREE.MeshPhysicalMaterial({ color: "#e7e9ec", roughness: .9, metalness: 0, clearcoat: .02 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(18.2, 8.2), wallMaterial);
    backWall.position.set(1.12, 0, -4.5);
    backWall.receiveShadow = true;
    scene.add(backWall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), new THREE.MeshPhysicalMaterial({ color: "#c9ced4", roughness: .54, metalness: 0, clearcoat: .08, clearcoatRoughness: .72 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(1.1, -3.18, -.4);
    floor.receiveShadow = true;
    scene.add(floor);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), new THREE.MeshPhysicalMaterial({ color: "#e9ebee", roughness: .94 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(1.1, 3.75, -.4);
    scene.add(ceiling);

    // Subtle architectural wall bays replace the former black grid. Their
    // shallow relief catches the real lights without drawing attention away.
    const bayXs = [-1.88, .18, 2.16, 4.12];
    bayXs.forEach((x, index) => {
      const bay = new THREE.Mesh(
        new THREE.BoxGeometry(1.78, 5.65, .13),
        new THREE.MeshPhysicalMaterial({ color: index % 2 ? "#eff0f2" : "#f4f5f6", roughness: .88, clearcoat: .025 }),
      );
      bay.position.set(x, -.02, -4.39);
      bay.receiveShadow = true;
      scene.add(bay);
      const cove = new THREE.Mesh(
        new THREE.BoxGeometry(1.28, .045, .08),
        new THREE.MeshStandardMaterial({ color: "#f8f9fa", emissive: "#f8f9fa", emissiveIntensity: .4, roughness: .82 }),
      );
      cove.position.set(x, 3.04, -4.16);
      scene.add(cove);
    });

    const activeSpot = new THREE.SpotLight("#fff8ef", 52, 16, .31, .82, 2);
    activeSpot.position.set(-2.65, 4.1, 3.1);
    activeSpot.target.position.set(-1.88, .7, -4.05);
    activeSpot.castShadow = true;
    activeSpot.shadow.mapSize.set(2048, 2048);
    activeSpot.shadow.bias = -.00025;
    activeSpot.shadow.normalBias = .02;
    activeSpot.shadow.radius = 4;
    scene.add(activeSpot, activeSpot.target);
    for (const [x, color] of [[.18, "#f5f6f7"], [2.16, "#eef7f7"], [4.12, "#fff7ed"]] as Array<[number, string]>) {
      const spot = new THREE.SpotLight(color, 22, 15, .27, .86, 2);
      spot.position.set(x - .35, 4.2, 2.1);
      spot.target.position.set(x, .25, -4.05);
      scene.add(spot, spot.target);
    }

    const panelGroups: THREE.Group[] = [];
    const hitTargets: THREE.Object3D[] = [];
    const textures: THREE.Texture[] = [];
    PANELS.forEach((panel, index) => {
      const group = new THREE.Group();
      group.position.set(...panel.position);
      group.userData.phase = index * .71;
      const mountingDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(panel.radius * 1.075, panel.radius * 1.075, .12, 96),
        new THREE.MeshPhysicalMaterial({ color: "#c9cdd2", roughness: .36, metalness: .3 }),
      );
      mountingDisk.rotation.x = Math.PI / 2;
      mountingDisk.position.z = -.055;
      mountingDisk.castShadow = true;
      mountingDisk.receiveShadow = true;
      group.add(mountingDisk);
      const depth = new THREE.Mesh(new THREE.CylinderGeometry(panel.radius, panel.radius, .24, 96), new THREE.MeshPhysicalMaterial({ color: "#dadde0", roughness: .3, metalness: .28 }));
      depth.rotation.x = Math.PI / 2;
      depth.castShadow = true;
      group.add(depth);
      const texture = panelTexture(panel);
      textures.push(texture);
      const face = new THREE.Mesh(new THREE.CircleGeometry(panel.radius * .96, 96), new THREE.MeshPhysicalMaterial({ map: texture, roughness: .68, metalness: 0, clearcoat: .06, clearcoatRoughness: .68, transparent: true, alphaTest: .08 }));
      face.position.z = .126;
      face.castShadow = true;
      face.userData.active = !!panel.active;
      face.userData.panelIndex = index;
      group.add(face);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(panel.radius * .985, .035, 16, 96),
        new THREE.MeshPhysicalMaterial({ color: "#eceef0", roughness: .27, metalness: .48 }),
      );
      rim.position.z = .143;
      rim.castShadow = true;
      group.add(rim);
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
    let activeFlip: { group: THREE.Group; startedAt: number } | null = null;
    const beginPanelFlip = () => {
      if (activeFlip) return;
      activeFlip = { group: panelGroups[0], startedAt: performance.now() };
      renderer.domElement.style.cursor = "wait";
    };
    const handlePointerUp = (event: PointerEvent) => {
      const tolerance = event.pointerType === "touch" ? 18 : 7;
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > tolerance) return;
      if (updatePointer(event).some((hit) => hit.object.userData.active)) beginPanelFlip();
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
      panelGroups.forEach((group, index) => {
        if (activeFlip?.group === group) return;
        group.rotation.y = Math.sin(elapsed * .42 + Number(group.userData.phase)) * (index === 0 ? .012 : .007);
      });
      if (activeFlip) {
        const progress = Math.min(1, (performance.now() - activeFlip.startedAt) / 860);
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        activeFlip.group.rotation.y = eased * Math.PI * 2;
        activeFlip.group.position.z = Math.sin(progress * Math.PI) * .48;
        const pulse = 1 + Math.sin(progress * Math.PI) * .055;
        activeFlip.group.scale.setScalar(pulse);
        if (progress >= 1) {
          activeFlip.group.rotation.y = 0;
          activeFlip.group.position.z = 0;
          activeFlip.group.scale.setScalar(1);
          activeFlip = null;
          openRef.current();
        }
      }
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
      camera.position.z = width < 720 ? 11.5 : 9.2;
      camera.position.x = width < 720 ? 1.2 : 1.15;
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
  const halfAngle = Math.PI / repeat;
  if (unfolded) return { centerX, centerY: height / 2, radius: Math.min(width, height) * .42, halfAngle };
  const radius = Math.min(width * .62, height * .64);
  const visibleCenterY = height * .54;
  const centerY = visibleCenterY + Math.cos(halfAngle) * radius / 2;
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

function drawUnfoldedPaper(canvas: HTMLCanvasElement, repeat: number, cuts: CutShape[], progress: number, rotationDegrees: number) {
  const prepared = preparePaperCanvas(canvas);
  if (!prepared) return;
  const { context, width, height } = prepared;
  const finalGeometry = paperGeometry(width, height, repeat, true);
  const editGeometry = paperGeometry(width, height, repeat, false);
  const easedProgress = 1 - Math.pow(1 - Math.min(1, progress), 3);
  for (let index = 0; index < repeat; index += 1) {
    const delay = index / Math.max(1, repeat - 1) * .16;
    const localProgress = Math.max(0, Math.min(1, (easedProgress - delay) / (1 - delay)));
    const rotation = rotationDegrees * Math.PI / 180 + index * Math.PI * 2 / repeat * localProgress;
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
  const rotationPointer = useRef<number | null>(null);
  const rotationDrag = useRef({ startX: 0, startValue: 0 });
  const [repeat, setRepeat] = useState(8);
  const [cuts, setCuts] = useState<CutShape[]>([]);
  const [stage, setStage] = useState<PaperCutStage>("cutting");
  const [unfoldProgress, setUnfoldProgress] = useState(0);
  const [rotationDegrees, setRotationDegrees] = useState(0);
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
    const render = () => stage === "cutting"
      ? drawFoldedPaper(canvas, repeat, cuts)
      : drawUnfoldedPaper(canvas, repeat, cuts, stage === "unfolded" ? 1 : unfoldProgress, stage === "unfolded" ? rotationDegrees : 0);
    render();
    if (!("ResizeObserver" in window)) {
      window.addEventListener("resize", render, { passive: true });
      return () => window.removeEventListener("resize", render);
    }
    const observer = new ResizeObserver(render);
    observer.observe(canvas.parentElement ?? canvas);
    return () => observer.disconnect();
  }, [cuts, repeat, rotationDegrees, stage, unfoldProgress]);

  const pointFromClient = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (clientX - bounds.left) / bounds.width, y: (clientY - bounds.top) / bounds.height };
  };
  const beginCut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage === "unfolded") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      rotationPointer.current = event.pointerId;
      rotationDrag.current = { startX: event.clientX, startValue: rotationDegrees };
      return;
    }
    if (stage !== "cutting") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const point = pointFromClient(event.currentTarget, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setCuts((current) => [...current.filter((shape) => shape.closed), { points: [point], closed: false }]);
  };
  const continueCut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage === "unfolded" && rotationPointer.current === event.pointerId) {
      event.preventDefault();
      const width = Math.max(1, event.currentTarget.getBoundingClientRect().width);
      const nextRotation = rotationDrag.current.startValue + (event.clientX - rotationDrag.current.startX) / width * 360;
      setRotationDegrees(Math.max(0, Math.min(360, nextRotation)));
      return;
    }
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
    if (rotationPointer.current === event.pointerId) {
      rotationPointer.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
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
    setRotationDegrees(0);
  };
  const reset = () => { setCuts([]); setStage("cutting"); setUnfoldProgress(0); setRotationDegrees(0); };
  const unfold = () => { if (hasCuts && !isDrawing) { activePointer.current = null; setRotationDegrees(0); setUnfoldProgress(0); setStage("unfolding"); } };
  const rotateBy = (amount: number) => setRotationDegrees((current) => Math.max(0, Math.min(360, current + amount)));

  return (
    <div className="papercut-backdrop" role="dialog" aria-modal="true" aria-labelledby="papercut-title">
      <div className="papercut-shell">
        <button className="papercut-close" onClick={close} aria-label="关闭剪纸互动">×</button>
        <header><span>PAPER CUT · 旋转与对称</span><h2 id="papercut-title">圈出形状，剪掉区域，<br />看看图案怎样重复</h2><p>按住鼠标或触摸屏描画轮廓，松开后轮廓会自动闭合，内部区域将被准确剪掉。</p></header>
        <section className={`papercut-preview-stage ${stage}`}>
          <div className="papercut-canvas-wrap">
            <div className="papercut-stage-label"><span>{stage === "cutting" ? "FOLDED PAPER · 折叠状态" : "UNFOLDING · 展开状态"}</span><b>{stage === "cutting" ? `1 / ${repeat} 片` : `${repeat} 次重复`}</b></div>
            <canvas ref={canvasRef} onPointerDown={beginCut} onPointerMove={continueCut} onPointerUp={endCut} onPointerCancel={endCut} onLostPointerCapture={endCut} aria-label={stage === "cutting" ? "剪纸画布，用鼠标或手指描画封闭轮廓，松开后剪掉内部区域" : stage === "unfolded" ? "展开后的完整剪纸图案，可左右拖动旋转，最大旋转三百六十度" : "正在展开的完整剪纸图案"} />
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
          {stage === "unfolded" && <div className="papercut-rotation-control"><div><span>旋转欣赏</span><strong>{Math.round(rotationDegrees)}° <small>/ 360°</small></strong></div><div><button onClick={() => rotateBy(-15)} disabled={rotationDegrees <= 0} aria-label="逆时针旋转十五度">−15°</button><button onClick={() => setRotationDegrees(0)}>归零</button><button onClick={() => rotateBy(15)} disabled={rotationDegrees >= 360} aria-label="顺时针旋转十五度">+15°</button></div><small>也可以在展开的图案上左右拖动</small></div>}
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
