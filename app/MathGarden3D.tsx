"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type GardenId = "flower" | "tree" | "butterfly" | "vine" | "building" | "pond" | "shell" | "mobius";
type GardenSettings = Record<string, number>;

type GardenItem = {
  id: GardenId;
  icon: string;
  name: string;
  english: string;
  formula: string;
  discovery: string;
  explanation: string;
  color: string;
  controls: Array<{ key: string; label: string; min: number; max: number; step: number; suffix?: string }>;
};

const GARDEN_ITEMS: GardenItem[] = [
  {
    id: "flower", icon: "✿", name: "黄金比例花", english: "Golden Ratio Flower", formula: "φ ≈ 1.618",
    discovery: "你发现了一朵数学花！", explanation: "它的花瓣沿着黄金角依次展开，彼此错开，争取到最充足的阳光。",
    color: "#f277bd", controls: [
      { key: "flowerPetals", label: "花瓣数量", min: 8, max: 30, step: 1 },
      { key: "flowerAngle", label: "旋转角度", min: 90, max: 170, step: 0.5, suffix: "°" },
      { key: "flowerRatio", label: "生长比例", min: 1.1, max: 2, step: 0.001 },
    ],
  },
  {
    id: "tree", icon: "♧", name: "分形树", english: "Fractal Tree", formula: "Lₙ = L₀ · rⁿ",
    discovery: "你发现了一棵会复制自己的树！", explanation: "每一根枝条都重复相同规则。简单的递归，慢慢长成复杂的生命。",
    color: "#8fd052", controls: [
      { key: "treeDepth", label: "递归层级", min: 2, max: 5, step: 1 },
      { key: "treeAngle", label: "分枝角度", min: 14, max: 42, step: 1, suffix: "°" },
      { key: "treeRatio", label: "枝条比例", min: 0.58, max: 0.78, step: 0.01 },
    ],
  },
  {
    id: "butterfly", icon: "◒", name: "对称蝴蝶", english: "Symmetry Butterfly", formula: "f(-x) = f(x)",
    discovery: "你发现了一双镜像翅膀！", explanation: "蝴蝶的左右两翼互为镜像。对称让形态稳定，也让美更容易被看见。",
    color: "#8d73e8", controls: [
      { key: "butterflyWing", label: "张翅角度", min: 12, max: 68, step: 1, suffix: "°" },
      { key: "butterflyScale", label: "翅膀大小", min: 0.7, max: 1.35, step: 0.01 },
      { key: "butterflyGap", label: "镜像距离", min: 0.35, max: 0.85, step: 0.01 },
    ],
  },
  {
    id: "vine", icon: "⌇", name: "螺旋藤蔓", english: "Spiral Vine", formula: "r = aeᵇᶿ",
    discovery: "你发现了一条旋转生长的藤蔓！", explanation: "半径随着角度不断增长，同一条螺旋也藏在贝壳、台风和银河里。",
    color: "#8fcf45", controls: [
      { key: "vineTurns", label: "螺旋圈数", min: 2, max: 7, step: 0.1 },
      { key: "vineRadius", label: "展开半径", min: 0.35, max: 0.95, step: 0.01 },
      { key: "vineHeight", label: "生长高度", min: 1.8, max: 4, step: 0.05 },
    ],
  },
  {
    id: "building", icon: "△", name: "几何建筑", english: "Geometry Pavilion", formula: "V = ⅓Bh",
    discovery: "你发现了一座由多边形撑起的建筑！", explanation: "相同的边围成稳定结构。改变边数和高度，就能看见几何如何塑造空间。",
    color: "#ff9c63", controls: [
      { key: "buildingSides", label: "立面数量", min: 3, max: 9, step: 1 },
      { key: "buildingHeight", label: "建筑高度", min: 0.8, max: 2.2, step: 0.05 },
      { key: "buildingRadius", label: "空间半径", min: 0.65, max: 1.25, step: 0.01 },
    ],
  },
  {
    id: "pond", icon: "∿", name: "音乐水池", english: "Musical Pond", formula: "y = A sin(2πft)",
    discovery: "你发现了看得见的声音！", explanation: "每一道水波都是振动留下的轨迹。频率决定节奏，振幅决定波纹的力量。",
    color: "#47c9e7", controls: [
      { key: "pondFrequency", label: "波纹频率", min: 2, max: 8, step: 1 },
      { key: "pondAmplitude", label: "波纹振幅", min: 0.35, max: 1.2, step: 0.01 },
      { key: "pondSpeed", label: "传播速度", min: 0.4, max: 1.8, step: 0.05 },
    ],
  },
  {
    id: "shell", icon: "◉", name: "斐波那契贝壳", english: "Fibonacci Shell", formula: "Fₙ = Fₙ₋₁ + Fₙ₋₂",
    discovery: "你发现了一枚会数数的贝壳！", explanation: "每一段生长都接续前两段的尺度，数列变成了可以触摸的自然曲线。",
    color: "#ffc46f", controls: [
      { key: "shellTurns", label: "螺旋圈数", min: 2.5, max: 6, step: 0.1 },
      { key: "shellGrowth", label: "增长速度", min: 0.12, max: 0.32, step: 0.01 },
      { key: "shellTube", label: "贝壳厚度", min: 0.08, max: 0.24, step: 0.01 },
    ],
  },
  {
    id: "mobius", icon: "∞", name: "莫比乌斯环", english: "Möbius Ribbon", formula: "只有一个面",
    discovery: "你发现了一条没有正反面的丝带！", explanation: "沿着它一直走，会回到起点却抵达原本的背面。它把两个世界连成一个。",
    color: "#7587ef", controls: [
      { key: "mobiusTwist", label: "扭转次数", min: 1, max: 3, step: 1 },
      { key: "mobiusWidth", label: "丝带宽度", min: 0.25, max: 0.62, step: 0.01 },
      { key: "mobiusRadius", label: "环形半径", min: 0.75, max: 1.35, step: 0.01 },
    ],
  },
];

const DEFAULT_SETTINGS: GardenSettings = {
  flowerPetals: 21, flowerAngle: 137.5, flowerRatio: 1.618,
  treeDepth: 4, treeAngle: 27, treeRatio: 0.68,
  butterflyWing: 38, butterflyScale: 1, butterflyGap: 0.55,
  vineTurns: 4.5, vineRadius: 0.62, vineHeight: 3,
  buildingSides: 6, buildingHeight: 1.35, buildingRadius: 0.9,
  pondFrequency: 5, pondAmplitude: 0.72, pondSpeed: 1,
  shellTurns: 4.2, shellGrowth: 0.22, shellTube: 0.15,
  mobiusTwist: 1, mobiusWidth: 0.42, mobiusRadius: 1,
};

const POSITIONS: Record<GardenId, [number, number, number]> = {
  flower: [-4.2, 0, 1.3], tree: [-2.1, 0, -3.7], butterfly: [1.7, 1.1, -3.6], vine: [4.5, 0, -1.1],
  building: [3.6, 0, 3.2], pond: [0.3, 0.05, 4.4], shell: [-3.5, 0.5, 3.7], mobius: [0.2, 1.8, -0.1],
};

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material?.dispose());
    }
  });
  while (object.children.length) object.remove(object.children[0]);
}

function makeMaterial(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04, ...options });
}

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: string) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .78, radius, direction.length(), 8), makeMaterial(color));
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}

function buildFlower(group: THREE.Group, s: GardenSettings) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 1.75, 12), makeMaterial("#79b858"));
  stem.position.y = .88; stem.castShadow = true; group.add(stem);
  const petalGroup = new THREE.Group(); petalGroup.name = "petals"; petalGroup.position.y = 1.8;
  const count = Math.round(s.flowerPetals);
  for (let i = 0; i < count; i++) {
    const theta = THREE.MathUtils.degToRad(i * s.flowerAngle);
    const ring = .24 + Math.sqrt(i) * .065 * s.flowerRatio;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(.28, 18, 12), makeMaterial(i % 2 ? "#f493c9" : "#ffc2db"));
    petal.scale.set(.72, 1.55, .34);
    petal.position.set(Math.cos(theta) * ring, .02 + i * .009, Math.sin(theta) * ring);
    petal.rotation.set(.34, -theta, theta * .08); petal.castShadow = true; petalGroup.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(.34, 20, 16), makeMaterial("#ffd766", { roughness: .3 }));
  center.position.y = .16; center.castShadow = true; petalGroup.add(center); group.add(petalGroup);
}

function buildTree(group: THREE.Group, s: GardenSettings) {
  const angle = THREE.MathUtils.degToRad(s.treeAngle);
  const maxDepth = Math.round(s.treeDepth);
  const branch = (start: THREE.Vector3, length: number, theta: number, depth: number, zBias: number) => {
    const end = start.clone().add(new THREE.Vector3(Math.sin(theta) * length, Math.cos(theta) * length, zBias * length));
    const color = depth <= 2 ? "#9bd35b" : "#9f72c8";
    group.add(cylinderBetween(start, end, .035 + depth * .018, color));
    if (depth <= 0) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), makeMaterial(depth % 2 ? "#cced75" : "#83d471"));
      leaf.scale.set(.75, 1.35, .55); leaf.position.copy(end); leaf.castShadow = true; group.add(leaf); return;
    }
    branch(end, length * s.treeRatio, theta - angle, depth - 1, -.10 + zBias * .45);
    branch(end, length * s.treeRatio, theta + angle, depth - 1, .10 + zBias * .45);
  };
  branch(new THREE.Vector3(0,0,0), .86, 0, maxDepth, 0);
}

function buildButterfly(group: THREE.Group, s: GardenSettings) {
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .72, 6, 12), makeMaterial("#514363"));
  body.rotation.z = Math.PI / 2; body.castShadow = true; group.add(body);
  const gap = s.butterflyGap, scale = s.butterflyScale, wingAngle = THREE.MathUtils.degToRad(s.butterflyWing);
  [-1, 1].forEach((side) => {
    const wingRoot = new THREE.Group(); wingRoot.name = side < 0 ? "wing-left" : "wing-right"; wingRoot.position.x = side * gap;
    wingRoot.rotation.y = side * wingAngle * .35;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(.56, 18, 14), makeMaterial(side < 0 ? "#a98cf0" : "#8ddaf0", { side: THREE.DoubleSide }));
    upper.scale.set(.95 * scale, 1.3 * scale, .12); upper.position.set(side * .32, .34, 0); upper.rotation.z = side * .42; upper.castShadow = true;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(.42, 18, 14), makeMaterial(side < 0 ? "#f29ac9" : "#bd9bea"));
    lower.scale.set(.82 * scale, 1.1 * scale, .11); lower.position.set(side * .28, -.38, 0); lower.rotation.z = -side * .35; lower.castShadow = true;
    wingRoot.add(upper, lower); group.add(wingRoot);
  });
  group.userData.wingAngle = wingAngle;
}

function buildVine(group: THREE.Group, s: GardenSettings) {
  const points: THREE.Vector3[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, theta = t * Math.PI * 2 * s.vineTurns;
    const r = (.12 + t * s.vineRadius);
    points.push(new THREE.Vector3(Math.cos(theta) * r, t * s.vineHeight, Math.sin(theta) * r));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .055, 8, false), makeMaterial("#8acc55")); tube.castShadow = true; group.add(tube);
  for (let i = 10; i < steps; i += 12) {
    const p = points[i], theta = (i / steps) * Math.PI * 2 * s.vineTurns;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), makeMaterial(i % 24 ? "#d8ef70" : "#f39ac9"));
    leaf.scale.set(.55, 1.35, .2); leaf.position.copy(p).add(new THREE.Vector3(Math.cos(theta)*.17,0,Math.sin(theta)*.17)); leaf.rotation.z = theta; leaf.castShadow = true; group.add(leaf);
  }
}

function buildBuilding(group: THREE.Group, s: GardenSettings) {
  const sides = Math.round(s.buildingSides), height = s.buildingHeight, radius = s.buildingRadius;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius*1.12,radius*1.23,.2,sides), makeMaterial("#ffc38d")); base.position.y=.1; base.castShadow=true; group.add(base);
  for(let i=0;i<sides;i++){
    const theta=i*Math.PI*2/sides;
    const column=new THREE.Mesh(new THREE.CylinderGeometry(.07,.085,height,10),makeMaterial(i%2?"#f49ac2":"#8cdcef"));
    column.position.set(Math.cos(theta)*radius*.82,height/2+.2,Math.sin(theta)*radius*.82);column.castShadow=true;group.add(column);
  }
  const roof=new THREE.Mesh(new THREE.ConeGeometry(radius*1.12,height*.62,sides),makeMaterial("#9a7de4",{transparent:true,opacity:.88}));roof.position.y=height+.2+height*.3;roof.castShadow=true;group.add(roof);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),makeMaterial("#d8ef70"));top.position.y=height+.2+height*.65;group.add(top);
}

function buildPond(group: THREE.Group, s: GardenSettings) {
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.48,.14,48), makeMaterial("#9deaf3", { transparent:true, opacity:.78, roughness:.22 })); water.position.y=.02; water.receiveShadow=true; group.add(water);
  const ringCount=Math.round(s.pondFrequency);
  for(let i=0;i<ringCount;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.22+i*.17,.022,8,48),makeMaterial(i%2?"#ffffff":"#56cce5",{emissive:i%2?"#dffaff":"#0a7288",emissiveIntensity:.18}));
    ring.rotation.x=Math.PI/2;ring.position.y=.13+i*.008;ring.userData.ringIndex=i;ring.userData.baseScale=s.pondAmplitude;group.add(ring);
  }
  [0,1,2].forEach((i)=>{const note=new THREE.Mesh(new THREE.SphereGeometry(.09+i*.018,12,10),makeMaterial(i===1?"#f48fc6":"#8d74e8"));note.position.set(-.5+i*.5,.65+i*.25,.1-i*.12);note.userData.float=i;group.add(note)});
  group.userData.pondSpeed=s.pondSpeed;
}

function buildShell(group: THREE.Group, s: GardenSettings) {
  const points:THREE.Vector3[]=[];const steps=130;
  for(let i=0;i<=steps;i++){const t=i/steps,theta=t*Math.PI*2*s.shellTurns,r=.05+Math.exp(theta*s.shellGrowth/(Math.PI*2))*.07;points.push(new THREE.Vector3(Math.cos(theta)*r,t*.7,Math.sin(theta)*r));}
  const curve=new THREE.CatmullRomCurve3(points);const shell=new THREE.Mesh(new THREE.TubeGeometry(curve,160,s.shellTube,10,false),makeMaterial("#ffc66d",{roughness:.3}));shell.rotation.z=Math.PI/2;shell.castShadow=true;group.add(shell);
  const pearl=new THREE.Mesh(new THREE.SphereGeometry(.26,20,16),makeMaterial("#fff1d2",{roughness:.18}));pearl.position.set(.1,.1,0);pearl.castShadow=true;group.add(pearl);
}

function buildMobius(group: THREE.Group, s: GardenSettings) {
  const segments=96, widthSegments=10, vertices:number[]=[], indices:number[]=[];
  for(let i=0;i<=segments;i++){
    const u=i/segments*Math.PI*2;
    for(let j=0;j<=widthSegments;j++){
      const v=(j/widthSegments-.5)*2*s.mobiusWidth;
      const twist=s.mobiusTwist*u/2, radius=s.mobiusRadius;
      vertices.push((radius+v*Math.cos(twist))*Math.cos(u),v*Math.sin(twist),(radius+v*Math.cos(twist))*Math.sin(u));
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<widthSegments;j++){const a=i*(widthSegments+1)+j,b=a+widthSegments+1;indices.push(a,b,a+1,b,b+1,a+1)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ribbon=new THREE.Mesh(geometry,makeMaterial("#8d7ae8",{side:THREE.DoubleSide,roughness:.3,metalness:.08}));ribbon.castShadow=true;group.add(ribbon);
}

function buildItem(group: THREE.Group, id: GardenId, settings: GardenSettings) {
  disposeObject(group);
  if(id==="flower")buildFlower(group,settings);
  if(id==="tree")buildTree(group,settings);
  if(id==="butterfly")buildButterfly(group,settings);
  if(id==="vine")buildVine(group,settings);
  if(id==="building")buildBuilding(group,settings);
  if(id==="pond")buildPond(group,settings);
  if(id==="shell")buildShell(group,settings);
  if(id==="mobius")buildMobius(group,settings);
  group.traverse(child=>{child.userData.gardenId=id});
}

function MathGardenCanvas({ selectedId, onSelect, settings }: { selectedId: GardenId | null; onSelect: (id:GardenId)=>void; settings: GardenSettings }) {
  const host = useRef<HTMLDivElement>(null);
  const groups = useRef(new Map<GardenId, THREE.Group>());
  const focus = useRef(new THREE.Vector3(0,1,0));
  const onSelectRef = useRef(onSelect);
  const settingsRef = useRef(settings);
  onSelectRef.current=onSelect; settingsRef.current=settings;

  useEffect(()=>{
    const container=host.current;if(!container)return;
    container.dataset.webglReady="false";
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});}catch(error){console.error("Math garden WebGL initialization failed",error);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));renderer.setSize(container.clientWidth,container.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.setAttribute("aria-label","可旋转和缩放的数学花园三维空间");renderer.domElement.setAttribute("role","img");container.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#d9ecfb");scene.fog=new THREE.Fog("#d9ecfb",11,24);
    const camera=new THREE.PerspectiveCamera(45,container.clientWidth/container.clientHeight,.1,80);camera.position.set(0,7.2,12.5);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=6.5;controls.maxDistance=17;controls.minPolarAngle=.55;controls.maxPolarAngle=1.36;controls.autoRotate=true;controls.autoRotateSpeed=.22;controls.target.set(0,1,0);
    scene.add(new THREE.HemisphereLight("#ffffff","#d58fc0",2.45));const sun=new THREE.DirectionalLight("#fff8e8",3.1);sun.position.set(-5,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);const fill=new THREE.PointLight("#b29bff",22,16);fill.position.set(4,4,-2);scene.add(fill);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(12.5,64),makeMaterial("#f6cbe1",{roughness:.78}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
    const path=new THREE.Mesh(new THREE.TorusGeometry(5.1,.5,20,96),makeMaterial("#f7e9ff",{roughness:.65}));path.rotation.x=Math.PI/2;path.scale.z=.7;path.position.y=.015;path.receiveShadow=true;scene.add(path);
    [[-7,-3,2.4,"#d9c7ff"],[7,-4,3,"#ffc1d9"],[-8,4,2.6,"#b5e7f2"],[8,5,3.5,"#d5ed93"]].forEach(([x,z,scale,color])=>{const hill=new THREE.Mesh(new THREE.SphereGeometry(1.8,24,16),makeMaterial(color as string,{roughness:.7}));hill.position.set(x as number,-.45,z as number);hill.scale.set(scale as number,1,1.2);hill.receiveShadow=true;scene.add(hill)});
    GARDEN_ITEMS.forEach(item=>{const group=new THREE.Group();group.position.set(...POSITIONS[item.id]);group.userData.gardenId=item.id;buildItem(group,item.id,settingsRef.current);scene.add(group);groups.current.set(item.id,group)});
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart={x:0,y:0};
    const down=(e:PointerEvent)=>{pointerStart={x:e.clientX,y:e.clientY};controls.autoRotate=false};
    const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...groups.current.values()],true)[0];if(!hit)return;let object:THREE.Object3D|null=hit.object;while(object&&!object.userData.gardenId)object=object.parent;const id=object?.userData.gardenId as GardenId|undefined;if(id){onSelectRef.current(id);focus.current.copy(groups.current.get(id)?.position??new THREE.Vector3()).setY(1)}};
    renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",up);
    let frame=0;const timer=new THREE.Timer();timer.connect(document);
    const animate=(timestamp?:number)=>{frame=requestAnimationFrame(animate);timer.update(timestamp);const t=timer.getElapsed();controls.target.lerp(focus.current,.035);controls.update();const flower=groups.current.get("flower");if(flower)flower.rotation.y=t*.12;const vine=groups.current.get("vine");if(vine)vine.rotation.y=Math.sin(t*.35)*.18;const butterfly=groups.current.get("butterfly");if(butterfly){const base=butterfly.userData.wingAngle??.6;const pulse=Math.sin(t*3)*.12;const left=butterfly.getObjectByName("wing-left"),right=butterfly.getObjectByName("wing-right");if(left)left.rotation.y=base*.35+pulse;if(right)right.rotation.y=-base*.35-pulse}const pond=groups.current.get("pond");if(pond){const speed=pond.userData.pondSpeed??1;pond.children.forEach(child=>{if(child.userData.ringIndex!==undefined){const scale=child.userData.baseScale*(1+Math.sin(t*speed*2-child.userData.ringIndex*.7)*.06);child.scale.setScalar(scale)}if(child.userData.float!==undefined)child.position.y=.65+child.userData.float*.25+Math.sin(t*1.5+child.userData.float)*.08})}const shell=groups.current.get("shell");if(shell)shell.rotation.y=t*.1;const mobius=groups.current.get("mobius");if(mobius)mobius.rotation.y=t*.16;renderer.render(scene,camera);if(container.dataset.webglReady!=="true")container.dataset.webglReady="true"};animate();
    const resize=()=>{if(!container.clientWidth||!container.clientHeight)return;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(container);
    return()=>{cancelAnimationFrame(frame);timer.dispose();observer.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);controls.dispose();scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry?.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m?.dispose())}});renderer.dispose();renderer.domElement.remove();delete container.dataset.webglReady;groups.current.clear()};
  },[]);

  useEffect(()=>{if(!selectedId)return;const group=groups.current.get(selectedId);if(!group)return;buildItem(group,selectedId,settings);focus.current.copy(group.position).setY(Math.max(1,group.position.y+.7));},[settings,selectedId]);
  useEffect(()=>{if(!selectedId)return;const group=groups.current.get(selectedId);if(group)focus.current.copy(group.position).setY(Math.max(1,group.position.y+.7));},[selectedId]);
  return <div className="garden-webgl" ref={host}><div className="webgl-fallback">你的浏览器暂时无法开启 3D 花园，请尝试更新浏览器或开启图形加速。</div></div>;
}

export function MathGardenWorld({ onProgress }: { onProgress:(count:number)=>void }) {
  const [selectedId,setSelectedId]=useState<GardenId|null>(null);
  const [discoveries,setDiscoveries]=useState<Set<GardenId>>(()=>new Set());
  const [settings,setSettings]=useState<GardenSettings>(DEFAULT_SETTINGS);
  const [pondPlaying,setPondPlaying]=useState(false);
  const pondAudio=useRef<{context:AudioContext;oscillators:OscillatorNode[]}|null>(null);
  const selected=useMemo(()=>GARDEN_ITEMS.find(item=>item.id===selectedId)??null,[selectedId]);
  const count=discoveries.size,seeds=count,stars=count*2,badges=(count>=3?1:0)+(count>=5?1:0)+(count===8?1:0);
  useEffect(()=>onProgress(count),[count,onProgress]);
  const select=useCallback((id:GardenId)=>{setSelectedId(id);setDiscoveries(prev=>{const next=new Set(prev);next.add(id);return next})},[]);
  const togglePondSound=async()=>{
    if(pondPlaying){pondAudio.current?.oscillators.forEach(osc=>{try{osc.stop()}catch{}});pondAudio.current=null;setPondPlaying(false);return;}
    const context=new AudioContext();await context.resume();const master=context.createGain();master.gain.value=.045;master.connect(context.destination);
    const oscillators=[0,1,2].map((index)=>{const osc=context.createOscillator(),gain=context.createGain();osc.type=index===0?"sine":"triangle";osc.frequency.value=110+settings.pondFrequency*22*(index+1);gain.gain.value=.55/(index+1);osc.connect(gain).connect(master);osc.start();return osc});
    pondAudio.current={context,oscillators};setPondPlaying(true);
  };
  useEffect(()=>{pondAudio.current?.oscillators.forEach((osc,index)=>osc.frequency.setTargetAtTime(110+settings.pondFrequency*22*(index+1),pondAudio.current?.context.currentTime??0,.04))},[settings.pondFrequency]);
  useEffect(()=>()=>{pondAudio.current?.oscillators.forEach(osc=>{try{osc.stop()}catch{}});void pondAudio.current?.context.close()},[]);

  return (
    <section className="garden-world" id="garden">
      <MathGardenCanvas selectedId={selectedId} onSelect={select} settings={settings}/>
      <div className="garden-sky-title"><span>THE MATHEMATICAL GARDEN</span><h2>数学探索花园</h2><p>拖动探索 · 双指缩放 · 点击发现</p></div>
      <div className="explorer-hud" aria-label="数学探险家奖励">
        <div><i>🌱</i><span>{seeds}<small>数学种子</small></span></div>
        <div><i>⭐</i><span>{stars}<small>美学星星</small></span></div>
        <div><i>🏆</i><span>{badges}<small>荣誉徽章</small></span></div>
      </div>
      <div className="garden-guide"><i>↔</i><span>转动花园寻找发光的数学生命体<small>{count}/8 已发现 · 完成 5 个即可获得证书</small></span></div>

      <div className="garden-dock" aria-label="数学花园地图">
        {GARDEN_ITEMS.map(item=><button key={item.id} className={`${selectedId===item.id?"active":""} ${discoveries.has(item.id)?"found":""}`} onClick={()=>select(item.id)} style={{"--item-color":item.color} as React.CSSProperties}><i>{item.icon}</i><span>{item.name}</span><b>{discoveries.has(item.id)?"✓":"+"}</b></button>)}
      </div>

      {selected&&<aside className="garden-info-panel" style={{"--item-color":selected.color} as React.CSSProperties}>
        <button className="garden-panel-close" onClick={()=>setSelectedId(null)} aria-label="关闭发现窗口">×</button>
        <span className="garden-panel-index">DISCOVERY {String(GARDEN_ITEMS.findIndex(i=>i.id===selected.id)+1).padStart(2,"0")}</span>
        <div className="garden-panel-icon">{selected.icon}</div>
        <h3>{selected.discovery}</h3><p className="garden-object-name">{selected.name}<small>{selected.english}</small></p>
        <div className="garden-formula"><span>隐藏规律</span><strong>{selected.formula}</strong></div>
        <p className="garden-explanation">{selected.explanation}</p>
        <div className="garden-try-title"><span>试试看改变它</span><i>参数会实时作用于 3D 物体</i></div>
        {selected.controls.map(control=><label className="garden-control" key={control.key}><span>{control.label}<b>{Number(settings[control.key]).toFixed(control.step<.1?2:control.step<1?1:0)}{control.suffix}</b></span><input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={settings[control.key]} onChange={e=>setSettings(prev=>({...prev,[control.key]:Number(e.target.value)}))}/></label>)}
        {selected.id==="pond"&&<button className={`pond-sound-button ${pondPlaying?"playing":""}`} onClick={togglePondSound}><i>{pondPlaying?"Ⅱ":"▶"}</i><span>{pondPlaying?"暂停音乐水池":"听听水波的声音"}<small>频率会跟随参数实时改变</small></span></button>}
        <div className="garden-reward"><span>🌱 +1 数学种子</span><span>⭐ +2 美学星星</span></div>
      </aside>}
    </section>
  );
}
