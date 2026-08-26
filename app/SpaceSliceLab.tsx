"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeElementSize } from "./viewport";
import { computeSection, planeBasis, SectionResult, SPACE_SLICE_DIMENSIONS, SliceShapeId } from "./space-slice/geometry";
import { observeMathAction } from "./math-observer-events";

type SceneHandle = {
  reveal: () => SectionResult | null;
  continueEditing: () => void;
  reset: () => void;
  setOffset: (value: number) => void;
  rotate: (yaw: number, pitch: number) => void;
};

type PlaneSnapshot = { normal: [number, number, number]; offset: number; limit: number };

const SHAPES: Array<{ id: SliceShapeId; name: string; english: string; symbol: string; secrets: Array<[string, string]> }> = [
  { id: "cube", name: "立方体", english: "CUBE", symbol: "◇", secrets: [["triangle", "△"], ["square", "□"], ["pentagon", "⬠"], ["hexagon", "⬡"]] },
  { id: "sphere", name: "球体", english: "SPHERE", symbol: "○", secrets: [["circle", "○"], ["great-circle", "◉"]] },
  { id: "cylinder", name: "圆柱", english: "CYLINDER", symbol: "◫", secrets: [["circle", "○"], ["ellipse", "⬭"], ["rectangle", "▭"]] },
  { id: "cone", name: "双圆锥", english: "CONIC", symbol: "⋈", secrets: [["circle", "○"], ["ellipse", "⬭"], ["parabola", "⌒"], ["hyperbola", ")("]] },
];

const CHALLENGES: Record<SliceShapeId, Array<{ target: string; title: string; hint: string }>> = {
  cube: [{ target: "hexagon", title: "立方体里，能藏着六边形吗？", hint: "试试让光片靠近中心，并同时穿过更多个面。" }],
  sphere: [{ target: "great-circle", title: "你能找到球体最大的截面吗？", hint: "最大的圆出现时，光片会经过球心。" }],
  cylinder: [
    { target: "circle", title: "先找到一个圆形截面", hint: "让光片与圆柱的轴垂直。" },
    { target: "ellipse", title: "再从圆柱里找到椭圆", hint: "轻轻倾斜光片，但别让它碰到底面。" },
    { target: "rectangle", title: "最后找出一个矩形", hint: "让光片几乎竖直穿过圆柱。" },
  ],
  cone: [
    { target: "circle", title: "从双圆锥里找到圆", hint: "先让光片与圆锥轴垂直。" },
    { target: "ellipse", title: "让圆慢慢变成椭圆", hint: "倾斜光片，但先只穿过一个锥面。" },
    { target: "parabola", title: "找到那条临界的抛物线", hint: "让光片逐渐接近平行圆锥侧面的角度。" },
    { target: "hyperbola", title: "让光片同时穿过两个圆锥", hint: "继续倾斜，直到上下两个锥面都留下切痕。" },
  ],
};

const DEFAULT_NORMALS: Record<SliceShapeId, THREE.Vector3> = {
  cube: new THREE.Vector3(.22, .84, 1).normalize(),
  sphere: new THREE.Vector3(.38, .82, .28).normalize(),
  cylinder: new THREE.Vector3(.08, 1, .03).normalize(),
  cone: new THREE.Vector3(.08, 1, .02).normalize(),
};

const DEFAULT_OFFSETS: Record<SliceShapeId, number> = { cube: .18, sphere: .5, cylinder: .12, cone: .42 };
const OFFSET_LIMITS: Record<SliceShapeId, number> = { cube: 1.45, sphere: 1.42, cylinder: 1.7, cone: 1.75 };

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  (Array.isArray(material) ? material : [material]).forEach((entry) => entry.dispose());
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments || child instanceof THREE.LineLoop) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  });
}

function makeSolid(shape: SliceShapeId) {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const material = () => new THREE.MeshPhysicalMaterial({
    color: shape === "cone" ? "#9c8bea" : "#75cbd4",
    transparent: true,
    opacity: .25,
    roughness: .26,
    metalness: .03,
    transmission: .08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const add = (geometry: THREE.BufferGeometry, transform?: (mesh: THREE.Mesh) => void) => {
    const mesh = new THREE.Mesh(geometry, material());
    transform?.(mesh);
    mesh.renderOrder = 1;
    group.add(mesh);
    meshes.push(mesh);
    const edgeGeometry = shape === "sphere" ? new THREE.WireframeGeometry(geometry) : new THREE.EdgesGeometry(geometry, 16);
    const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: shape === "cone" ? "#6654bb" : "#287f91", transparent: true, opacity: shape === "sphere" ? .1 : .54 }));
    transform?.(edges as unknown as THREE.Mesh);
    edges.renderOrder = 2;
    group.add(edges);
  };
  if (shape === "cube") add(new THREE.BoxGeometry(2.5, 2.5, 2.5));
  if (shape === "sphere") add(new THREE.SphereGeometry(SPACE_SLICE_DIMENSIONS.sphereRadius, 56, 28));
  if (shape === "cylinder") add(new THREE.CylinderGeometry(SPACE_SLICE_DIMENSIONS.cylinderRadius, SPACE_SLICE_DIMENSIONS.cylinderRadius, SPACE_SLICE_DIMENSIONS.cylinderHeight, 64, 1, false));
  if (shape === "cone") {
    const { coneRadius, coneHeight } = SPACE_SLICE_DIMENSIONS;
    add(new THREE.ConeGeometry(coneRadius, coneHeight, 64, 1, true), (mesh) => { mesh.rotation.x = Math.PI; mesh.position.y = coneHeight / 2; });
    add(new THREE.ConeGeometry(coneRadius, coneHeight, 64, 1, true), (mesh) => { mesh.position.y = -coneHeight / 2; });
  }
  return { group, meshes };
}

function clearGroup(group: THREE.Group) {
  [...group.children].forEach((child) => { group.remove(child); disposeObject(child); });
}

const SpaceSliceScene = forwardRef<SceneHandle, {
  shape: SliceShapeId;
  onPlaneChange: (value: PlaneSnapshot) => void;
  onError: () => void;
}>(({ shape, onPlaneChange, onError }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef(shape);
  const planeCallbackRef = useRef(onPlaneChange);
  const changeShapeRef = useRef<(shape: SliceShapeId) => void>(() => undefined);
  const revealRef = useRef<() => SectionResult | null>(() => null);
  const continueRef = useRef<() => void>(() => undefined);
  const resetRef = useRef<() => void>(() => undefined);
  const setOffsetRef = useRef<(value: number) => void>(() => undefined);
  const rotateRef = useRef<(yaw: number, pitch: number) => void>(() => undefined);
  useEffect(() => { planeCallbackRef.current = onPlaneChange; }, [onPlaneChange]);

  useImperativeHandle(ref, () => ({
    reveal: () => revealRef.current(),
    continueEditing: () => continueRef.current(),
    reset: () => resetRef.current(),
    setOffset: (value) => setOffsetRef.current(value),
    rotate: (yaw, pitch) => rotateRef.current(yaw, pitch),
  }), []);

  useEffect(() => { shapeRef.current = shape; changeShapeRef.current(shape); }, [shape]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      window.setTimeout(onError, 0);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-label", "空间切片三维实验：拖动中央光点移动切片，拖动光环旋转切片，拖动空白处观察立体");
    renderer.domElement.setAttribute("tabindex", "0");
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eaf1f5");
    scene.fog = new THREE.Fog("#eaf1f5", 8, 18);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 40);
    camera.position.set(4.6, 3.4, 6.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.enablePan = false;
    controls.minDistance = 4.2;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff", "#9aaabb", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 3.1);
    key.position.set(4, 7, 5);
    scene.add(key);
    const floor = new THREE.GridHelper(12, 24, "#b6c9d2", "#d4dfe4");
    floor.position.y = -2.05;
    (floor.material as THREE.Material).transparent = true;
    (floor.material as THREE.Material).opacity = .48;
    scene.add(floor);

    const solidRoot = new THREE.Group();
    const sectionRoot = new THREE.Group();
    scene.add(solidRoot, sectionRoot);
    let solidMeshes: THREE.Mesh[] = [];
    let currentShape = shapeRef.current;
    let normal = DEFAULT_NORMALS[currentShape].clone();
    const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    let offset = DEFAULT_OFFSETS[currentShape];
    let revealed = false;
    let sectionDirty = true;
    let lastSectionUpdate = 0;
    let currentResult: SectionResult | null = null;

    const planeGroup = new THREE.Group();
    const planeMaterial = new THREE.MeshBasicMaterial({ color: "#50c8ed", transparent: true, opacity: .19, side: THREE.DoubleSide, depthWrite: false });
    const planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 4.25), planeMaterial);
    planeMesh.renderOrder = 3;
    planeGroup.add(planeMesh);
    const borderPoints = [[-2.12, -2.12, 0], [2.12, -2.12, 0], [2.12, 2.12, 0], [-2.12, 2.12, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(borderPoints), new THREE.LineBasicMaterial({ color: "#19a9d8", transparent: true, opacity: .76 }));
    planeGroup.add(border);
    const centerHandle = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#ffffff", emissive: "#3dcaf1", emissiveIntensity: .7, roughness: .18, clearcoat: .7 }));
    centerHandle.userData.handle = "move";
    planeGroup.add(centerHandle);
    const hitHandle = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hitHandle.userData.handle = "move";
    planeGroup.add(hitHandle);
    const ringMaterialA = new THREE.MeshBasicMaterial({ color: "#706bd7", transparent: true, opacity: .54, depthWrite: false });
    const ringMaterialB = new THREE.MeshBasicMaterial({ color: "#28aeca", transparent: true, opacity: .54, depthWrite: false });
    const ringX = new THREE.Mesh(new THREE.TorusGeometry(1.52, .018, 10, 92), ringMaterialA);
    ringX.rotation.y = Math.PI / 2;
    const ringY = new THREE.Mesh(new THREE.TorusGeometry(1.72, .018, 10, 92), ringMaterialB);
    ringY.rotation.x = Math.PI / 2;
    const ringXActive = new THREE.Mesh(new THREE.TorusGeometry(1.52, .052, 12, 92), new THREE.MeshBasicMaterial({ color: "#6254cf", transparent: true, opacity: .94, depthTest: false, depthWrite: false }));
    ringXActive.rotation.y = Math.PI / 2;
    ringXActive.visible = false;
    ringXActive.renderOrder = 8;
    const ringYActive = new THREE.Mesh(new THREE.TorusGeometry(1.72, .052, 12, 92), new THREE.MeshBasicMaterial({ color: "#159fbd", transparent: true, opacity: .94, depthTest: false, depthWrite: false }));
    ringYActive.rotation.x = Math.PI / 2;
    ringYActive.visible = false;
    ringYActive.renderOrder = 8;
    const ringHitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const ringHitX = new THREE.Mesh(new THREE.TorusGeometry(1.52, .14, 8, 72), ringHitMaterial);
    ringHitX.rotation.y = Math.PI / 2;
    ringHitX.userData.handle = "rotate";
    ringHitX.userData.axis = "x";
    const ringHitY = new THREE.Mesh(new THREE.TorusGeometry(1.72, .14, 8, 72), ringHitMaterial.clone());
    ringHitY.rotation.x = Math.PI / 2;
    ringHitY.userData.handle = "rotate";
    ringHitY.userData.axis = "y";
    planeGroup.add(ringX, ringY, ringXActive, ringYActive, ringHitX, ringHitY);
    scene.add(planeGroup);

    const updatePlaneTransform = () => {
      planeGroup.quaternion.copy(orientation);
      planeGroup.position.copy(normal).multiplyScalar(offset);
      const limit = OFFSET_LIMITS[currentShape];
      planeCallbackRef.current({ normal: [normal.x, normal.y, normal.z], offset, limit });
      sectionDirty = true;
    };

    const renderSection = (result: SectionResult, isReveal: boolean) => {
      clearGroup(sectionRoot);
      const { n, u, v, origin } = planeBasis(result.normal, result.offset);
      result.contours.forEach((contour) => {
        if (contour.points2D.length > 2) {
          // Open conics come from the finite double cone's uncapped side mesh.
          // ShapeGeometry closes their endpoints with the corresponding base
          // chord, which is the actual filled section of the finite solid.
          const shape2D = new THREE.Shape(contour.points2D);
          const coneSection = currentShape === "cone";
          const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape2D), new THREE.MeshBasicMaterial({
            color: coneSection ? (isReveal ? "#6d5abc" : "#9184d4") : (isReveal ? "#176d82" : "#3b94a7"),
            transparent: true,
            opacity: isReveal ? .55 : .28,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
          }));
          fill.position.copy(origin).addScaledVector(n, .003);
          const matrix = new THREE.Matrix4().makeBasis(u, v, n);
          fill.quaternion.setFromRotationMatrix(matrix);
          fill.renderOrder = 5;
          sectionRoot.add(fill);
        }
      });
    };

    const calculate = (isReveal: boolean) => {
      try {
        currentResult = computeSection(currentShape, solidMeshes, normal, offset);
        renderSection(currentResult, isReveal);
        return currentResult;
      } catch (error) {
        console.error("Space slice section calculation failed", error);
        return null;
      }
    };

    const loadShape = (nextShape: SliceShapeId) => {
      clearGroup(solidRoot);
      const solid = makeSolid(nextShape);
      solidRoot.add(solid.group);
      solidMeshes = solid.meshes;
      currentShape = nextShape;
      normal = DEFAULT_NORMALS[nextShape].clone();
      orientation.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      offset = DEFAULT_OFFSETS[nextShape];
      revealed = false;
      clearGroup(sectionRoot);
      controls.reset();
      updatePlaneTransform();
    };

    const setOffset = (value: number) => {
      offset = THREE.MathUtils.clamp(value, -OFFSET_LIMITS[currentShape], OFFSET_LIMITS[currentShape]);
      revealed = false;
      updatePlaneTransform();
    };
    const rotate = (yaw: number, pitch: number) => {
      orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
      const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(cameraRight, pitch)).normalize();
      normal.set(0, 0, 1).applyQuaternion(orientation).normalize();
      revealed = false;
      updatePlaneTransform();
    };

    changeShapeRef.current = loadShape;
    revealRef.current = () => { revealed = true; return calculate(true); };
    continueRef.current = () => { revealed = false; sectionDirty = true; };
    resetRef.current = () => {
      normal = DEFAULT_NORMALS[currentShape].clone();
      orientation.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      offset = DEFAULT_OFFSETS[currentShape];
      revealed = false;
      controls.reset();
      clearGroup(sectionRoot);
      updatePlaneTransform();
    };
    setOffsetRef.current = setOffset;
    rotateRef.current = rotate;
    loadShape(currentShape);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    type RingAxis = "x" | "y";
    type DragState =
      | { mode: "move"; x: number; y: number; offset: number; moved: boolean }
      | { mode: "rotate"; axis: RingAxis; axisWorld: THREE.Vector3; center: THREE.Vector3; plane: THREE.Plane; startVector: THREE.Vector3; orientation: THREE.Quaternion; moved: boolean };
    let drag: DragState | null = null;
    const setRingHighlight = (axis: RingAxis | null) => {
      ringXActive.visible = axis === "x";
      ringYActive.visible = axis === "y";
    };
    const updatePointerRay = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
    };
    const pointerHits = (event: PointerEvent) => {
      updatePointerRay(event);
      return raycaster.intersectObjects([hitHandle, ringHitX, ringHitY], false);
    };
    const applyPointerFeedback = (hit?: THREE.Intersection<THREE.Object3D>) => {
      const axis = hit?.object.userData.axis as RingAxis | undefined;
      setRingHighlight(axis ?? null);
      renderer.domElement.style.cursor = hit?.object.userData.handle === "move" ? "ns-resize" : hit ? "grab" : "default";
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (revealed || (event.pointerType === "mouse" && event.button !== 0)) return;
      const hit = pointerHits(event)[0];
      if (!hit) return;
      event.preventDefault();
      renderer.domElement.setPointerCapture(event.pointerId);
      const mode = hit.object.userData.handle as "move" | "rotate";
      if (mode === "move") {
        drag = { mode, x: event.clientX, y: event.clientY, offset, moved: false };
        setRingHighlight(null);
      } else {
        const axis = hit.object.userData.axis as RingAxis;
        const axisWorld = new THREE.Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, 0).applyQuaternion(orientation).normalize();
        const center = planeGroup.position.clone();
        const startVector = hit.point.clone().sub(center).projectOnPlane(axisWorld).normalize();
        drag = {
          mode,
          axis,
          axisWorld,
          center,
          plane: new THREE.Plane().setFromNormalAndCoplanarPoint(axisWorld, center),
          startVector,
          orientation: orientation.clone(),
          moved: false,
        };
        setRingHighlight(axis);
      }
      controls.enabled = false;
      renderer.domElement.style.cursor = "grabbing";
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!drag) {
        applyPointerFeedback(!revealed ? pointerHits(event)[0] : undefined);
        return;
      }
      event.preventDefault();
      if (drag.mode === "move") {
        const bounds = renderer.domElement.getBoundingClientRect();
        const delta = -(event.clientY - drag.y) / Math.max(1, bounds.height) * 4.6 + (event.clientX - drag.x) / Math.max(1, bounds.width) * .55;
        if (Math.abs(delta) > .01) drag.moved = true;
        offset = THREE.MathUtils.clamp(drag.offset + delta, -OFFSET_LIMITS[currentShape], OFFSET_LIMITS[currentShape]);
      } else {
        updatePointerRay(event);
        const point = raycaster.ray.intersectPlane(drag.plane, new THREE.Vector3());
        if (!point) return;
        const currentVector = point.sub(drag.center).projectOnPlane(drag.axisWorld).normalize();
        const sine = drag.axisWorld.dot(drag.startVector.clone().cross(currentVector));
        const cosine = THREE.MathUtils.clamp(drag.startVector.dot(currentVector), -1, 1);
        const angle = Math.atan2(sine, cosine);
        if (Math.abs(angle) > .01) drag.moved = true;
        const rotation = new THREE.Quaternion().setFromAxisAngle(drag.axisWorld, angle);
        orientation.copy(drag.orientation).premultiply(rotation).normalize();
        normal.set(0, 0, 1).applyQuaternion(orientation).normalize();
      }
      updatePlaneTransform();
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!drag) return;
      const completedMode = drag.mode;
      const completedAxis = drag.mode === "rotate" ? drag.axis : undefined;
      const completedMove = drag.moved;
      drag = null;
      controls.enabled = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      applyPointerFeedback(!revealed ? pointerHits(event)[0] : undefined);
      if (completedMove) observeMathAction(completedMode === "rotate"
        ? {
            id: "slice-first-rotation",
            scene: "space-slice",
            action: "slice_plane_rotated",
            outcome: "exploring",
            importance: .6,
            suggestedCue: "你改变了光片的方向。先看截面边缘怎样变化。",
            once: true,
            context: { shape: currentShape, axis: completedAxis ?? "unknown" },
          }
        : {
            id: "slice-first-move",
            scene: "space-slice",
            action: "slice_plane_moved",
            outcome: "exploring",
            importance: .6,
            suggestedCue: "你改变了光片的位置。方向没变，截面也可能变化。",
            once: true,
            context: { shape: currentShape, offset: Number(offset.toFixed(2)) },
          });
    };
    const handlePointerLeave = () => {
      if (drag) return;
      setRingHighlight(null);
      renderer.domElement.style.cursor = "default";
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault(); setOffset(offset + (event.key === "ArrowUp" ? .08 : -.08));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); rotate((event.key === "ArrowLeft" ? -1 : 1) * THREE.MathUtils.degToRad(event.shiftKey ? 2 : 5), event.shiftKey ? THREE.MathUtils.degToRad(3) : 0);
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("keydown", handleKeyDown);
    const contextLoss = (event: Event) => { event.preventDefault(); onError(); };
    renderer.domElement.addEventListener("webglcontextlost", contextLoss);

    const stopSize = observeElementSize(mount, () => {
      const width = Math.max(1, mount.clientWidth), height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    let animationFrame = 0;
    const render = (now: number) => {
      controls.update();
      if (sectionDirty && !revealed && now - lastSectionUpdate > 32) {
        calculate(false);
        sectionDirty = false;
        lastSectionUpdate = now;
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      stopSize();
      window.cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("keydown", handleKeyDown);
      renderer.domElement.removeEventListener("webglcontextlost", contextLoss);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      changeShapeRef.current = () => undefined;
    };
  }, [onError]);

  return <div className="space-slice-scene" ref={mountRef} />;
});
SpaceSliceScene.displayName = "SpaceSliceScene";

function SectionView({ result, revealing, shape }: { result: SectionResult | null; revealing: boolean; shape: SliceShapeId }) {
  const drawing = useMemo(() => {
    if (!result?.contours.length) return null;
    const all = result.contours.flatMap((contour) => contour.points2D);
    const minX = Math.min(...all.map((point) => point.x)), maxX = Math.max(...all.map((point) => point.x));
    const minY = Math.min(...all.map((point) => point.y)), maxY = Math.max(...all.map((point) => point.y));
    const width = Math.max(.2, maxX - minX), height = Math.max(.2, maxY - minY);
    const extent = Math.max(width, height);
    const size = extent * 1.46;
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const viewBox = `${centerX - size / 2} ${-centerY - size / 2} ${size} ${size}`;
    const paths = result.contours.map((contour) => {
      const points = contour.points2D.map((point) => `${point.x.toFixed(4)},${(-point.y).toFixed(4)}`).join(" L ");
      return { d: `M ${points} Z`, closed: contour.closed };
    });
    return { viewBox, paths };
  }, [result]);
  return (
    <div className={`section-view section-view-${shape} ${result ? "has-result" : ""} ${revealing ? "is-revealing" : ""}`}>
      <div className="section-view-top"><span>截面镜</span><small>SECTION VIEW</small></div>
      <div className="section-view-canvas">
        {!drawing ? <span className="section-question">?</span> : <svg viewBox={drawing.viewBox} role="img" aria-label={`二维截面：${result?.classification.label}`} preserveAspectRatio="xMidYMid meet">{drawing.paths.map((path, index) => <path key={index} d={path.d} className={`section-path ${path.closed ? "closed" : "open"}`} pathLength="1" />)}</svg>}
      </div>
      <strong>{result?.classification.label ?? "等待切开"}</strong>
    </div>
  );
}

function readDiscoveries() {
  const empty: Record<SliceShapeId, string[]> = { cube: [], sphere: [], cylinder: [], cone: [] };
  if (typeof window === "undefined") return empty;
  try { return { ...empty, ...JSON.parse(sessionStorage.getItem("space-slice-discoveries") ?? "{}") }; } catch { return empty; }
}

export function SpaceSliceLab({ close }: { close: () => void }) {
  const sceneRef = useRef<SceneHandle>(null);
  const revealTimers = useRef<number[]>([]);
  const attemptsRef = useRef<Record<string, number>>({});
  const [shape, setShape] = useState<SliceShapeId>("cube");
  const [mode, setMode] = useState<"editing" | "revealing" | "result">("editing");
  const [result, setResult] = useState<SectionResult | null>(null);
  const [pendingResult, setPendingResult] = useState<SectionResult | null>(null);
  const [discoveries, setDiscoveries] = useState<Record<SliceShapeId, string[]>>(readDiscoveries);
  const [plane, setPlane] = useState<PlaneSnapshot>({ normal: [0, 0, 1], offset: DEFAULT_OFFSETS.cube, limit: OFFSET_LIMITS.cube });
  const [whyOpen, setWhyOpen] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const reportSceneError = useCallback(() => setWebglError(true), []);

  const challenge = useMemo(() => CHALLENGES[shape].find((entry) => !discoveries[shape].includes(entry.target)) ?? CHALLENGES[shape][CHALLENGES[shape].length - 1], [discoveries, shape]);
  const challengeSuccess = !!result && (result.classification.type === challenge.target || (challenge.target === "circle" && result.classification.type === "great-circle"));
  const shapeInfo = SHAPES.find((item) => item.id === shape)!;
  const tilt = Math.round(THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(Math.abs(plane.normal[1]), 0, 1))));

  useEffect(() => {
    document.body.classList.add("workshop-detail-mode");
    const activeTimers = revealTimers.current;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.classList.remove("workshop-detail-mode");
      window.removeEventListener("keydown", keydown);
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [close]);

  useEffect(() => { try { sessionStorage.setItem("space-slice-discoveries", JSON.stringify(discoveries)); } catch { /* Session storage can be unavailable in private browsing. */ } }, [discoveries]);

  const chooseShape = (next: SliceShapeId) => {
    if (mode === "revealing") return;
    setShape(next); setMode("editing"); setResult(null); setPendingResult(null); setWhyOpen(false);
    const cue: Record<SliceShapeId, string> = {
      cube: "立方体里不只有正方形。试试让光片穿过更多个面。",
      sphere: "球体的截面总是圆。问题是，什么时候圆最大？",
      cylinder: "先改变方向，再看圆怎样变成椭圆。",
      cone: "注意光片有没有同时穿过上下两个锥面。",
    };
    observeMathAction({
      id: `slice-shape-${next}`,
      scene: "space-slice",
      action: "solid_selected",
      outcome: "neutral",
      importance: .52,
      suggestedCue: cue[next],
      once: true,
      context: { shape: next, target: CHALLENGES[next][0].target },
    });
  };
  const reveal = () => {
    if (mode !== "editing") return;
    const attemptKey = `${shape}:${challenge.target}`;
    const attempt = (attemptsRef.current[attemptKey] ?? 0) + 1;
    attemptsRef.current[attemptKey] = attempt;
    setMode("revealing"); setResult(null); setWhyOpen(false);
    const freezeTimer = window.setTimeout(() => {
      const next = sceneRef.current?.reveal() ?? null;
      setPendingResult(next);
      const resultTimer = window.setTimeout(() => {
        setResult(next); setMode("result");
        const type = next?.classification.type ?? "none";
        const hitTarget = !!next && (type === challenge.target || (challenge.target === "circle" && type === "great-circle"));
        const suggestedCue = type === "none"
          ? "这次没有切到立体。把光片向中心移一点。"
          : type === "special"
            ? "你碰到了边或顶点。移动一点，会更容易看清。"
            : hitTarget
              ? `找到了，${next?.classification.label}。记住光片现在的方向。`
              : `这是${next?.classification.label}。换一个角度，看看它怎样变化。`;
        observeMathAction({
          id: `slice-result-${shape}-${type}-${challenge.target}`,
          scene: "space-slice",
          action: "slice_revealed",
          outcome: hitTarget ? "success" : type === "none" || type === "special" || attempt >= 3 ? "stuck" : "discovery",
          importance: hitTarget ? .92 : type === "none" || type === "special" ? .82 : .7,
          attempt,
          suggestedCue,
          context: {
            shape,
            target: challenge.target,
            section: type,
            label: next?.classification.label ?? "未切中",
            matchedTarget: hitTarget,
            tilt,
            offset: Number(plane.offset.toFixed(2)),
          },
        });
        if (next && next.classification.type !== "none" && next.classification.type !== "special") {
          const discovery = next.classification.type === "great-circle" ? "great-circle" : next.classification.type;
          setDiscoveries((current) => current[shape].includes(discovery) ? current : { ...current, [shape]: [...current[shape], discovery] });
        }
      }, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 30 : 720);
      revealTimers.current.push(resultTimer);
    }, 140);
    revealTimers.current.push(freezeTimer);
  };
  const continueSlice = () => { sceneRef.current?.continueEditing(); setMode("editing"); setResult(null); setPendingResult(null); setWhyOpen(false); };
  const reset = () => {
    sceneRef.current?.reset(); setMode("editing"); setResult(null); setPendingResult(null); setWhyOpen(false);
    observeMathAction({ id: `slice-reset-${shape}`, scene: "space-slice", action: "slice_reset", outcome: "exploring", importance: .22, context: { shape } });
  };
  const quickRotate = (direction: "left" | "right") => {
    sceneRef.current?.rotate(direction === "left" ? -THREE.MathUtils.degToRad(4) : THREE.MathUtils.degToRad(4), direction === "right" ? THREE.MathUtils.degToRad(1.5) : 0);
    observeMathAction({
      id: "slice-first-quick-rotation",
      scene: "space-slice",
      action: "slice_plane_rotated",
      outcome: "exploring",
      importance: .6,
      suggestedCue: "角度改变了。停一下，看看实时截面和刚才有什么不同。",
      once: true,
      context: { shape, control: direction },
    });
  };
  const finishOffsetAdjustment = () => observeMathAction({
    id: "slice-first-quick-move",
    scene: "space-slice",
    action: "slice_plane_moved",
    outcome: "exploring",
    importance: .6,
    suggestedCue: "方向没有变，光片的位置变了。看看截面大小怎样变化。",
    once: true,
    context: { shape, offset: Number(plane.offset.toFixed(2)) },
  });
  const tabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + SHAPES.length) % SHAPES.length;
    chooseShape(SHAPES[next].id);
  };

  return (
    <div className="space-slice-backdrop" role="dialog" aria-modal="true" aria-labelledby="space-slice-title">
      <article className="space-slice-lab">
        <button className="space-slice-close" onClick={close} aria-label="关闭空间切片实验室">×</button>
        <header className="space-slice-header">
          <div><span>SPACE SLICE LAB · 空间几何</span><h2 id="space-slice-title">空间切片实验室</h2><p>一刀切开，里面藏着什么形状？</p></div>
          <div className="space-slice-shape-tabs" role="tablist" aria-label="选择立体">
            {SHAPES.map((item, index) => <button key={item.id} role="tab" aria-selected={shape === item.id} className={shape === item.id ? "active" : ""} onClick={() => chooseShape(item.id)} onKeyDown={(event) => tabKeyDown(event, index)} disabled={mode === "revealing"}><i>{item.symbol}</i><span>{item.name}<small>{item.english}</small></span></button>)}
          </div>
        </header>
        <div className="space-slice-body">
          <section className="space-slice-stage" aria-label="三维切片操作区">
            {!webglError ? <SpaceSliceScene ref={sceneRef} shape={shape} onPlaneChange={setPlane} onError={reportSceneError} /> : <div className="space-slice-webgl-error"><span>◌</span><b>你的浏览器暂时无法运行这个 3D 实验</b><p>建议使用最新版 Chrome、Safari 或 Edge。</p></div>}
            {!webglError && <>
              <div className="slice-scene-status"><span className={mode}>{mode === "editing" ? "正在摆放光片" : mode === "revealing" ? "正在切开…" : "截面已经显现"}</span><small>倾角 {tilt}° · 距离 {plane.offset.toFixed(2)}</small></div>
              {mode === "editing" && <div className="slice-scene-hint"><i>◎</i><span>拖中央光点移动 · 拖光环旋转<br />拖空白处观察 · 滚轮缩放</span></div>}
              <div className="slice-quick-controls" aria-label="光片精细控制">
                <button onClick={() => quickRotate("left")} aria-label="向左旋转光片" disabled={mode !== "editing"}>↶</button>
                <label><span>光片距离</span><input type="range" min={-plane.limit} max={plane.limit} step="0.02" value={plane.offset} onChange={(event) => sceneRef.current?.setOffset(Number(event.target.value))} onPointerUp={finishOffsetAdjustment} onKeyUp={finishOffsetAdjustment} disabled={mode !== "editing"} aria-label="光片距离" /></label>
                <button onClick={() => quickRotate("right")} aria-label="向右倾斜光片" disabled={mode !== "editing"}>↷</button>
              </div>
            </>}
          </section>
          <aside className="space-slice-panel">
            <section className={`slice-challenge ${challengeSuccess ? "complete" : ""}`}>
              <div className="slice-panel-kicker"><span>当前挑战</span><small>CHALLENGE</small></div>
              <h3>{challengeSuccess ? `发现：${result?.classification.label}` : challenge.title}</h3>
              <p>{challengeSuccess ? "找到了。把这个形状收藏进立体的秘密里。" : "移动和旋转光片，找到你认为正确的位置，再切开验证。"}</p>
              <div className="challenge-target"><i className={challengeSuccess ? "done" : ""}>{challengeSuccess ? "✓" : "○"}</i><span>目标 · {CHALLENGES[shape].find((entry) => entry.target === challenge.target)?.title.replace(/^.*?(找到|找出|藏着)/, "") || challenge.target}</span></div>
            </section>
            <SectionView result={mode === "result" ? result : mode === "revealing" ? pendingResult : null} revealing={mode === "revealing"} shape={shape} />
            <section className="slice-discoveries">
              <div className="slice-panel-kicker"><span>{shapeInfo.name}的秘密</span><small>DISCOVERIES</small></div>
              <div>{shapeInfo.secrets.map(([id, icon]) => <span key={id} className={discoveries[shape].includes(id) ? "found" : ""} aria-label={discoveries[shape].includes(id) ? `已发现 ${id}` : `尚未发现 ${id}`}>{discoveries[shape].includes(id) ? icon : "?"}</span>)}</div>
            </section>
            {mode === "result" && result && <section className={`slice-insight ${challengeSuccess ? "success" : ""}`} role="status"><span>{challengeSuccess ? "MATHEMATICAL DISCOVERY" : "这次切出了"}</span><h3>{result.classification.label}</h3><p>{result.classification.insight}</p>{result.classification.formula && <small>{result.classification.formula}</small>}<button onClick={() => setWhyOpen((value) => !value)}>{whyOpen ? "收起解释" : "为什么？"}</button>{whyOpen && <div>截面不是贴在立体表面的图案，而是无限平面和立体表面所有交点共同围成的二维形状。</div>}</section>}
          </aside>
        </div>
        <footer className="space-slice-actions">
          <button className="slice-reset" onClick={reset} disabled={mode === "revealing"}>↺ <span>重新摆放</span></button>
          <p>{mode === "editing" ? "先猜一猜，再让截面显现" : mode === "revealing" ? "光片正在穿过立体…" : challengeSuccess ? "一项新的空间秘密被发现" : challenge.hint}</p>
          {mode === "result" ? <button className="slice-reveal-button" onClick={continueSlice}>继续切 <i>→</i></button> : <button className="slice-reveal-button" onClick={reveal} disabled={mode !== "editing" || webglError}>{mode === "revealing" ? "正在切开…" : "切开看看"}<i>✦</i></button>}
        </footer>
      </article>
    </div>
  );
}
