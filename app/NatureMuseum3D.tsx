"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type NatureId = "golden" | "fractal" | "fibonacci";
type NatureSettings = {
  goldenPetals: number;
  goldenAngle: number;
  goldenLift: number;
  fractalDepth: number;
  fractalAngle: number;
  fractalRatio: number;
  fibonacciSeeds: number;
  fibonacciAngle: number;
  fibonacciBloom: number;
};

type NatureItem = {
  id: NatureId;
  index: string;
  icon: string;
  name: string;
  english: string;
  formula: string;
  color: string;
  discovery: string;
  explanation: string;
  controls: Array<{ key: keyof NatureSettings; label: string; min: number; max: number; step: number; suffix?: string }>;
};

const NATURE_ITEMS: NatureItem[] = [
  {
    id: "golden", index: "01", icon: "φ", name: "黄金比例花", english: "Golden Ratio Flower", formula: "φ ≈ 1.618",
    color: "#ef79b7", discovery: "一朵花，正在寻找最舒展的排列。",
    explanation: "花瓣依次转过黄金角，彼此错开，让每一片都更容易得到阳光。数学并没有限制生命，而是在帮它生长。",
    controls: [
      { key: "goldenPetals", label: "花瓣数量", min: 8, max: 34, step: 1 },
      { key: "goldenAngle", label: "旋转角度", min: 110, max: 155, step: .1, suffix: "°" },
      { key: "goldenLift", label: "花冠弧度", min: .08, max: .72, step: .01 },
    ],
  },
  {
    id: "fractal", index: "02", icon: "⌘", name: "分形生长", english: "Fractal Growth", formula: "Lₙ = L₀ · rⁿ",
    color: "#83c957", discovery: "一条简单规则，长成了一棵复杂的树。",
    explanation: "每根枝条都缩短一点、转动一点，再复制自己。重复不是单调，它能从很少的信息里创造丰富生命。",
    controls: [
      { key: "fractalDepth", label: "生长层级", min: 2, max: 5, step: 1 },
      { key: "fractalAngle", label: "分枝角度", min: 14, max: 42, step: 1, suffix: "°" },
      { key: "fractalRatio", label: "枝条比例", min: .58, max: .76, step: .01 },
    ],
  },
  {
    id: "fibonacci", index: "03", icon: "∞", name: "斐波那契花盘", english: "Fibonacci Phyllotaxis", formula: "1, 1, 2, 3, 5, 8…",
    color: "#eaa54d", discovery: "小小种子，也懂得怎样装满一个圆。",
    explanation: "每颗种子沿着固定角度生长，会自然形成两组反向螺旋。向日葵用数列，把有限空间安排得井井有条。",
    controls: [
      { key: "fibonacciSeeds", label: "种子数量", min: 34, max: 144, step: 1 },
      { key: "fibonacciAngle", label: "生长角度", min: 128, max: 145, step: .1, suffix: "°" },
      { key: "fibonacciBloom", label: "花盘大小", min: .72, max: 1.3, step: .01 },
    ],
  },
];

const DEFAULT_SETTINGS: NatureSettings = {
  goldenPetals: 21,
  goldenAngle: 137.5,
  goldenLift: .42,
  fractalDepth: 4,
  fractalAngle: 27,
  fractalRatio: .67,
  fibonacciSeeds: 89,
  fibonacciAngle: 137.5,
  fibonacciBloom: 1,
};

function material(color: string, options: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: .4, metalness: .01, clearcoat: .2, clearcoatRoughness: .38, ...options });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Line)) return;
    child.geometry?.dispose();
    const list = Array.isArray(child.material) ? child.material : [child.material];
    list.forEach((entry) => {
      const mapped = entry as THREE.Material & { map?: THREE.Texture | null };
      mapped.map?.dispose();
      entry.dispose();
    });
  });
  while (object.children.length) object.remove(object.children[0]);
}

function tag(group: THREE.Object3D, id: NatureId) {
  group.traverse((child) => { child.userData.natureId = id; });
  group.userData.natureId = id;
}

function petalGeometry() {
  const geometry = new THREE.SphereGeometry(.5, 24, 16);
  geometry.scale(.65, 1.18, .16);
  geometry.computeVertexNormals();
  return geometry;
}

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: string) {
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, direction.length(), 10), material(color, { roughness: .58 }));
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function addLeaf(group: THREE.Group, position: THREE.Vector3, rotation: THREE.Euler, scale = 1) {
  const leaf = new THREE.Mesh(petalGeometry(), material("#73c870", { roughness: .52, clearcoat: .08 }));
  leaf.position.copy(position);
  leaf.rotation.copy(rotation);
  leaf.scale.set(.48 * scale, .72 * scale, .5 * scale);
  leaf.castShadow = true;
  group.add(leaf);
}

function buildGoldenFlower(group: THREE.Group, settings: NatureSettings) {
  disposeObject(group);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.11, .16, 2.8, 18), material("#4e9e62", { roughness: .58 }));
  stem.position.y = 1.4;
  stem.castShadow = true;
  group.add(stem);
  addLeaf(group, new THREE.Vector3(-.22, .86, .04), new THREE.Euler(.15, 0, .9), .9);
  addLeaf(group, new THREE.Vector3(.2, 1.45, -.04), new THREE.Euler(-.2, 0, -1), .72);
  const ovary = new THREE.Mesh(new THREE.SphereGeometry(.32, 28, 20), material("#8cc769"));
  ovary.position.y = 2.82;
  ovary.scale.set(1.15, .65, 1.15);
  group.add(ovary);
  const petals = Math.round(settings.goldenPetals);
  const geometry = petalGeometry();
  const palette = ["#f7a7ca", "#d8b9f3", "#94ded4", "#fff0dc"];
  const materials = palette.map((color) => material(color, { roughness: .31, clearcoat: .3 }));
  for (let i = 0; i < petals; i++) {
    const theta = THREE.MathUtils.degToRad(i * settings.goldenAngle);
    const p = i / Math.max(1, petals - 1);
    const radius = .25 + Math.sqrt(i) * .18;
    const petal = new THREE.Mesh(geometry, materials[i % materials.length]);
    petal.position.set(Math.cos(theta) * radius, 2.91 + settings.goldenLift * radius + p * .05, Math.sin(theta) * radius);
    petal.scale.set(.5 - p * .08, .86 - p * .16, .55);
    const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
    const radial = new THREE.Vector3(Math.cos(theta), .3 + settings.goldenLift, Math.sin(theta)).normalize();
    const normal = tangent.clone().cross(radial).normalize();
    petal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, normal.clone().cross(tangent).normalize(), normal));
    petal.castShadow = true;
    group.add(petal);
  }
  const seedMaterial = material("#eab34e", { roughness: .5 });
  for (let i = 0; i < 34; i++) {
    const theta = i * 2.399963, r = .062 * Math.sqrt(i);
    const seed = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), seedMaterial);
    seed.position.set(Math.cos(theta) * r, 3.28 - r * .08, Math.sin(theta) * r);
    group.add(seed);
  }
  tag(group, "golden");
}

function buildFractalTree(group: THREE.Group, settings: NatureSettings) {
  disposeObject(group);
  const maxDepth = Math.round(settings.fractalDepth);
  const angle = THREE.MathUtils.degToRad(settings.fractalAngle);
  const leafGeometry = petalGeometry();
  const leaves = [material("#75c95c", { roughness: .58 }), material("#a8db68", { roughness: .58 }), material("#4bab61", { roughness: .58 })];
  const branch = (start: THREE.Vector3, length: number, theta: number, depth: number, z: number) => {
    const end = start.clone().add(new THREE.Vector3(Math.sin(theta) * length, Math.cos(theta) * length, z * length));
    group.add(cylinderBetween(start, end, .035 + depth * .018, depth < 2 ? "#60aa54" : "#795946"));
    if (depth <= 0) {
      [-.32, 0, .32].forEach((offset, index) => {
        const leaf = new THREE.Mesh(leafGeometry, leaves[index]);
        leaf.position.copy(end).add(new THREE.Vector3(offset * .22, index === 1 ? .15 : .04, (index - 1) * .08));
        leaf.scale.set(.26, .44, .24);
        leaf.rotation.set(index === 1 ? .08 : -.18, offset * 1.2, -theta + offset);
        leaf.castShadow = true;
        group.add(leaf);
      });
      return;
    }
    branch(end, length * settings.fractalRatio, theta - angle, depth - 1, z * .4 - .08);
    branch(end, length * settings.fractalRatio, theta + angle, depth - 1, z * .4 + .08);
  };
  branch(new THREE.Vector3(0, 0, 0), 1.18, 0, maxDepth, 0);
  tag(group, "fractal");
}

function buildFibonacciBloom(group: THREE.Group, settings: NatureSettings) {
  disposeObject(group);
  const scale = settings.fibonacciBloom;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.75, .95, .28, 40), material("#e8cfd9", { roughness: .3, clearcoat: .4 }));
  stand.position.y = .14;
  stand.castShadow = true;
  stand.receiveShadow = true;
  group.add(stand);
  const bloom = new THREE.Group();
  bloom.position.y = 1.5;
  bloom.rotation.x = -.24;
  bloom.scale.setScalar(scale);
  const petalMaterial = material("#ffd46f", { roughness: .38, clearcoat: .18 });
  const petalGeo = petalGeometry();
  for (let i = 0; i < 21; i++) {
    const theta = i / 21 * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMaterial);
    petal.scale.set(.42, .74, .42);
    petal.position.set(Math.cos(theta) * .9, Math.sin(theta) * .9, -.03);
    petal.rotation.z = theta - Math.PI / 2;
    bloom.add(petal);
  }
  const count = Math.round(settings.fibonacciSeeds);
  const seedMaterials = [material("#67453a", { roughness: .62 }), material("#9a673c", { roughness: .62 }), material("#d29a43", { roughness: .58 })];
  for (let i = 0; i < count; i++) {
    const theta = THREE.MathUtils.degToRad(i * settings.fibonacciAngle);
    const radius = .07 * Math.sqrt(i);
    const seed = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), seedMaterials[i % 3]);
    seed.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius, .08 + Math.max(0, .28 - radius * .3));
    seed.scale.setScalar(.8 + i / count * .28);
    bloom.add(seed);
  }
  group.add(bloom);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.09, .14, 1.55, 16), material("#5a9f55", { roughness: .6 }));
  stem.position.y = .8;
  group.add(stem);
  addLeaf(group, new THREE.Vector3(.2, .72, 0), new THREE.Euler(.1, 0, -1), .78);
  tag(group, "fibonacci");
}

function makeBoardTexture(item: NatureItem) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fbf8f3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `${item.color}3a`);
  gradient.addColorStop(.56, "rgba(255,255,255,.15)");
  gradient.addColorStop(1, "#dff4ed");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2d2530";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText(`NATURE / ${item.index}`, 52, 72);
  ctx.font = "700 62px Arial, sans-serif";
  ctx.fillText(item.name, 52, 175);
  ctx.fillStyle = "#766e76";
  ctx.font = "500 25px Arial, sans-serif";
  ctx.fillText(item.english.toUpperCase(), 52, 216);
  ctx.strokeStyle = "rgba(45,37,48,.16)";
  ctx.beginPath(); ctx.moveTo(52, 264); ctx.lineTo(716, 264); ctx.stroke();
  ctx.fillStyle = item.color;
  ctx.font = "italic 82px Georgia, serif";
  ctx.fillText(item.formula, 52, 390);
  ctx.fillStyle = "#443944";
  ctx.font = "500 29px Arial, sans-serif";
  ctx.fillText(item.discovery.slice(0, 13), 52, 485);
  ctx.fillText(item.discovery.slice(13), 52, 526);
  ctx.fillStyle = item.color;
  ctx.beginPath(); ctx.arc(630, 850, 72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "600 58px Arial, sans-serif";
  ctx.fillText("↗", 596, 870);
  ctx.fillStyle = "#4d444d";
  ctx.font = "600 24px Arial, sans-serif";
  ctx.fillText("点击探索规律", 52, 902);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addBoard(scene: THREE.Scene, item: NatureItem, position: THREE.Vector3, rotationY: number) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.35, 3.15, .12), material("#ffffff", { roughness: .3, clearcoat: .35 }));
  frame.castShadow = true;
  group.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 2.82), new THREE.MeshBasicMaterial({ map: makeBoardTexture(item) }));
  face.position.z = .066;
  group.add(face);
  group.position.copy(position);
  group.rotation.y = rotationY;
  tag(group, item.id);
  scene.add(group);
}

function NatureMuseumCanvas({ selectedId, settings, onSelect }: { selectedId: NatureId | null; settings: NatureSettings; onSelect: (id: NatureId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const groups = useRef(new Map<NatureId, THREE.Group>());
  const onSelectRef = useRef(onSelect);
  const settingsRef = useRef(settings);
  const selectedRef = useRef<NatureId | null>(selectedId);
  onSelectRef.current = onSelect;
  settingsRef.current = settings;
  selectedRef.current = selectedId;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.dataset.webglReady = "false";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
      console.error("Nature museum WebGL initialization failed", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "可进入并点击探索的自然数学馆三维空间");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d7f2f4");
    scene.fog = new THREE.Fog("#d7f2f4", 14, 35);
    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / container.clientHeight, .1, 70);
    camera.position.set(0, 4.15, 11.8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.minDistance = 5.3;
    controls.maxDistance = 13.5;
    controls.minPolarAngle = .78;
    controls.maxPolarAngle = 1.46;
    controls.target.set(0, 1.75, 0);

    scene.add(new THREE.HemisphereLight("#fff9ed", "#af82c8", 1.8));
    const sun = new THREE.DirectionalLight("#fff5d6", 3.1);
    sun.position.set(-6, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10;
    scene.add(sun);
    const pink = new THREE.PointLight("#ff8bc5", 22, 15);
    pink.position.set(-5, 4, 1);
    scene.add(pink);
    const mint = new THREE.PointLight("#72e3cc", 18, 15);
    mint.position.set(5, 3, 0);
    scene.add(mint);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 30), material("#eee8d3", { roughness: .78 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 28), material("#d8b7dd", { roughness: .72 }));
    runner.rotation.x = -Math.PI / 2;
    runner.position.y = .008;
    runner.receiveShadow = true;
    scene.add(runner);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(20, 7.8, .25), material("#f7f1ea", { roughness: .74 }));
    backWall.position.set(0, 3.9, -5.7);
    backWall.receiveShadow = true;
    scene.add(backWall);
    [-9.8, 9.8].forEach((x) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(.22, 7.8, 12), material(x < 0 ? "#d8e9db" : "#f1d7df", { roughness: .72 }));
      wall.position.set(x, 3.9, 0);
      wall.receiveShadow = true;
      scene.add(wall);
    });
    for (let i = -4; i <= 4; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, 12), material("#b9a6b9", { roughness: .5 }));
      beam.position.set(i * 2.2, 7.4, -.1);
      scene.add(beam);
    }
    for (let i = 0; i < 6; i++) {
      const lamp = new THREE.PointLight(i % 2 ? "#ffe8b8" : "#e2d2ff", 7, 7);
      lamp.position.set(-7.2 + i * 2.9, 6.9, .2);
      scene.add(lamp);
    }
    const archMaterial = material("#ffffff", { roughness: .34 });
    [-8.1, 8.1].forEach((x) => {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 6.8, 24), archMaterial);
      column.position.set(x, 3.4, -4.7);
      column.castShadow = true;
      scene.add(column);
    });

    addBoard(scene, NATURE_ITEMS[1], new THREE.Vector3(-6.25, 2.45, -4.95), .12);
    addBoard(scene, NATURE_ITEMS[0], new THREE.Vector3(0, 2.45, -5.43), 0);
    addBoard(scene, NATURE_ITEMS[2], new THREE.Vector3(6.25, 2.45, -4.95), -.12);

    const golden = new THREE.Group();
    golden.position.set(0, 0, .2);
    buildGoldenFlower(golden, settingsRef.current);
    scene.add(golden);
    groups.current.set("golden", golden);
    const fractal = new THREE.Group();
    fractal.position.set(-4.45, 0, -.45);
    buildFractalTree(fractal, settingsRef.current);
    scene.add(fractal);
    groups.current.set("fractal", fractal);
    const fibonacci = new THREE.Group();
    fibonacci.position.set(4.45, 0, -.2);
    buildFibonacciBloom(fibonacci, settingsRef.current);
    scene.add(fibonacci);
    groups.current.set("fibonacci", fibonacci);

    [[-7.1, .45, 1.1, "#b5db72"], [7.2, .55, 1.25, "#f6a6c9"], [-6.9, .65, 4.2, "#77d7cb"], [7, .45, 4.4, "#d2b4ee"]].forEach(([x, y, z, color], index) => {
      const sculpture = new THREE.Mesh(new THREE.SphereGeometry(.55, 24, 18), material(color as string, { roughness: .34, clearcoat: .28 }));
      sculpture.position.set(x as number, y as number, z as number);
      sculpture.scale.set(1.5, index % 2 ? .8 : 1.3, .82);
      sculpture.castShadow = true;
      scene.add(sculpture);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(scene.children, true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.natureId) object = object.parent;
      const id = object?.userData.natureId as NatureId | undefined;
      if (id) onSelectRef.current(id);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);

    const focusTarget = new THREE.Vector3(0, 1.75, 0);
    const desiredCamera = new THREE.Vector3(0, 4.15, 11.8);
    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const selected = selectedRef.current;
      const targets: Record<NatureId, THREE.Vector3> = {
        golden: new THREE.Vector3(0, 2.2, .1), fractal: new THREE.Vector3(-4.2, 2.15, -.5), fibonacci: new THREE.Vector3(4.2, 1.65, -.25),
      };
      const cameras: Record<NatureId, THREE.Vector3> = {
        golden: new THREE.Vector3(0, 3.4, 7.1), fractal: new THREE.Vector3(-3.8, 3.05, 6.6), fibonacci: new THREE.Vector3(3.9, 2.8, 6.4),
      };
      focusTarget.lerp(selected ? targets[selected] : new THREE.Vector3(0, 1.75, 0), .035);
      desiredCamera.lerp(selected ? cameras[selected] : new THREE.Vector3(0, 4.15, 11.8), .028);
      camera.position.lerp(desiredCamera, .018);
      controls.target.lerp(focusTarget, .04);
      controls.update();
      golden.rotation.y = Math.sin(time * .26) * .08;
      fibonacci.rotation.y = Math.sin(time * .2) * .05;
      renderer.render(scene, camera);
      if (container.dataset.webglReady !== "true") container.dataset.webglReady = "true";
    };
    animate();

    const resize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      groups.current.clear();
      delete container.dataset.webglReady;
    };
  }, []);

  useEffect(() => {
    const group = selectedId ? groups.current.get(selectedId) : null;
    if (!group || !selectedId) return;
    if (selectedId === "golden") buildGoldenFlower(group, settings);
    if (selectedId === "fractal") buildFractalTree(group, settings);
    if (selectedId === "fibonacci") buildFibonacciBloom(group, settings);
  }, [settings, selectedId]);

  return <div className="nature-museum-webgl" ref={host}><div className="nature-webgl-fallback"><b>自然数学馆需要 WebGL</b><span>请开启浏览器图形加速后重新进入。</span></div></div>;
}

export function NatureMuseumWorld({ onEnterGarden }: { onEnterGarden: () => void }) {
  const [selectedId, setSelectedId] = useState<NatureId | null>(null);
  const [settings, setSettings] = useState<NatureSettings>(DEFAULT_SETTINGS);
  const [discoveries, setDiscoveries] = useState<Set<NatureId>>(() => new Set());
  const selected = useMemo(() => NATURE_ITEMS.find((item) => item.id === selectedId) ?? null, [selectedId]);
  const select = useCallback((id: NatureId) => {
    setSelectedId(id);
    setDiscoveries((previous) => new Set(previous).add(id));
  }, []);
  const resetSelected = () => {
    if (!selected) return;
    setSettings((previous) => {
      const next = { ...previous };
      selected.controls.forEach((control) => { next[control.key] = DEFAULT_SETTINGS[control.key]; });
      return next;
    });
  };

  return (
    <section className="nature-museum" id="hall" aria-label="自然数学馆 WebGL 原型">
      <NatureMuseumCanvas selectedId={selectedId} settings={settings} onSelect={select} />
      <div className="nature-museum-shade" aria-hidden="true" />
      <div className="nature-museum-title">
        <span>NATURE MATHEMATICS HALL · 01</span>
        <h2>自然把数学<br /><em>长成生命。</em></h2>
        <p>拖动视角 · 点击展板或装置 · 调整参数</p>
      </div>
      <div className="nature-progress" aria-label={`已经发现 ${discoveries.size} 个自然数学规律`}>
        <span>{discoveries.size}<small>/ 3</small></span>
        <p>自然规律<br /><b>{discoveries.size === 3 ? "全部发现" : "等待探索"}</b></p>
      </div>
      <div className="nature-room-dock" aria-label="自然数学馆展品地图">
        {NATURE_ITEMS.map((item) => (
          <button key={item.id} className={`${selectedId === item.id ? "active" : ""} ${discoveries.has(item.id) ? "found" : ""}`} onClick={() => select(item.id)} style={{ "--nature-color": item.color } as React.CSSProperties}>
            <i>{item.icon}</i><span><b>{item.index}</b>{item.name}<small>{item.english}</small></span><em>{discoveries.has(item.id) ? "✓" : "+"}</em>
          </button>
        ))}
        <button className="nature-garden-exit" onClick={onEnterGarden}><i>↗</i><span><b>EXIT</b>数学花园<small>继续自由探索</small></span></button>
      </div>
      {selected && (
        <aside className="nature-explore-panel" style={{ "--nature-color": selected.color } as React.CSSProperties} aria-label={`${selected.name}探索面板`}>
          <button className="nature-panel-close" onClick={() => setSelectedId(null)} aria-label="关闭探索面板">×</button>
          <span className="nature-panel-index">DISCOVERY {selected.index} · NATURE</span>
          <div className="nature-panel-heading"><i>{selected.icon}</i><div><h3>{selected.name}</h3><p>{selected.english}</p></div></div>
          <div className="nature-formula"><span>隐藏规律</span><strong>{selected.formula}</strong></div>
          <p className="nature-discovery">{selected.discovery}</p>
          <p className="nature-explanation">{selected.explanation}</p>
          <div className="nature-try-title"><span>试试看改变它</span><button onClick={resetSelected}>恢复自然状态</button></div>
          {selected.controls.map((control) => {
            const value = settings[control.key];
            const decimals = control.step < .1 ? 2 : control.step < 1 ? 1 : 0;
            const isGoldenTarget = (control.key === "goldenAngle" || control.key === "fibonacciAngle") && Math.abs(value - 137.5) < .051;
            return <label className="nature-control" key={control.key}><span>{control.label}<b>{value.toFixed(decimals)}{control.suffix}</b></span><input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={value} onChange={(event) => setSettings((previous) => ({ ...previous, [control.key]: Number(event.target.value) }))}/>{(control.key === "goldenAngle" || control.key === "fibonacciAngle") && <small className={isGoldenTarget ? "reached" : ""}>黄金角 137.5° {isGoldenTarget ? "· 已对准" : "· 试着对准它"}</small>}</label>;
          })}
          <div className="nature-reward"><span>🌱 数学种子 +1</span><b>发现已收藏 ✓</b></div>
        </aside>
      )}
    </section>
  );
}
