"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCompatibleAudioContext, resumeAudioContext } from "./audio";

type GardenId = "flower" | "tree" | "butterfly" | "vine" | "building" | "pond" | "shell" | "mobius" | "euler";
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
      { key: "flowerRatio", label: "生长比例 φ", min: 1.1, max: 2, step: 0.001 },
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
    id: "building", icon: "△", name: "分形光塔", english: "Sierpiński Light Sculpture", formula: "Nₙ = 4ⁿ",
    discovery: "你发现了一座会自我复制的光塔！", explanation: "每个四面体都分裂成四个更小的自己。重复同一条规则，空隙与实体共同长成一座分形雕塑。",
    color: "#ff9c63", controls: [
      { key: "buildingSides", label: "分形层级", min: 1, max: 3, step: 1 },
      { key: "buildingHeight", label: "纵向伸展", min: 0.8, max: 2.2, step: 0.05 },
      { key: "buildingRadius", label: "结构尺度", min: 0.65, max: 1.25, step: 0.01 },
    ],
  },
  {
    id: "pond", icon: "∿", name: "音乐喷泉", english: "Audio-Reactive Fountain", formula: "h(t) ∝ |A(f,t)|",
    discovery: "你发现了会跟着音乐呼吸的喷泉！", explanation: "音乐的低、中、高频被实时拆解：低音推动中央水柱，中高音控制四周喷泉，整体响度让声波圆环同步扩散。",
    color: "#47c9e7", controls: [
      { key: "pondFrequency", label: "波纹频率", min: 2, max: 8, step: 1 },
      { key: "pondAmplitude", label: "波纹振幅", min: 0.35, max: 1.2, step: 0.01 },
      { key: "pondSpeed", label: "传播速度", min: 0.4, max: 1.8, step: 0.05 },
    ],
  },
  {
    id: "shell", icon: "φ", name: "黄金螺旋", english: "Golden Spiral", formula: "r(θ) = a · φ²ᶿ⁄π",
    discovery: "你发现了一条不断生长的黄金螺旋！", explanation: "它每旋转四分之一圈，半径就按黄金比例 φ 增长。花朵、贝壳与星系都能看到这种由小到大的优雅节奏。",
    color: "#ffc46f", controls: [
      { key: "shellTurns", label: "螺旋圈数", min: 2.5, max: 6, step: 0.1 },
      { key: "shellGrowth", label: "增长比例", min: 1.45, max: 1.78, step: 0.01 },
      { key: "shellTube", label: "线条粗细", min: 0.035, max: 0.11, step: 0.005 },
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
  {
    id: "euler", icon: "eⁱπ", name: "欧拉恒等式", english: "Euler Identity Sculpture", formula: "eⁱπ + 1 = 0",
    discovery: "你发现了数学中最美的等式！", explanation: "欧拉恒等式把 0、1、π、e 和虚数 i 连接在一起。旋转向量沿单位圆前进，当角度到达 π 时，它恰好落在 −1。",
    color: "#e56fae", controls: [
      { key: "eulerPhase", label: "复平面角度 θ", min: 0, max: 6.28, step: 0.01 },
      { key: "eulerRadius", label: "单位圆半径", min: 0.7, max: 1.3, step: 0.01 },
      { key: "eulerWaves", label: "指数波动层数", min: 1, max: 5, step: 1 },
    ],
  },
];

const DEFAULT_SETTINGS: GardenSettings = {
  flowerPetals: 21, flowerAngle: 137.5, flowerRatio: 1.618,
  treeDepth: 4, treeAngle: 27, treeRatio: 0.68,
  butterflyWing: 38, butterflyScale: 1, butterflyGap: 0.55,
  vineTurns: 4.5, vineRadius: 0.62, vineHeight: 3,
  buildingSides: 2, buildingHeight: 1.5, buildingRadius: 1.08,
  pondFrequency: 5, pondAmplitude: 0.72, pondSpeed: 1,
  shellTurns: 3.6, shellGrowth: 1.618, shellTube: 0.065,
  mobiusTwist: 1, mobiusWidth: 0.42, mobiusRadius: 1,
  eulerPhase: 3.14, eulerRadius: 1, eulerWaves: 3,
};

const POSITIONS: Record<GardenId, [number, number, number]> = {
  flower: [-4.2, 0, 1.3], tree: [-2.1, 0, -3.7], butterfly: [1.7, 1.85, -3.6], vine: [4.5, 0, -1.1],
  building: [3.6, 0, 3.2], pond: [0.3, 0.05, 4.4], shell: [-3.5, 0.5, 3.7], mobius: [0.2, 1.8, -0.1], euler: [5.3, .15, -4.3],
};

function disposeObject(object: THREE.Object3D) {
  const geometries=new Set<THREE.BufferGeometry>();
  const materials=new Set<THREE.Material>();
  const textures=new Set<THREE.Texture>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      if(child.geometry)geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      childMaterials.forEach((material) => {
        if(!material)return;
        materials.add(material);
        const textured=material as THREE.Material&{map?:THREE.Texture|null;bumpMap?:THREE.Texture|null;roughnessMap?:THREE.Texture|null};
        [textured.map,textured.bumpMap,textured.roughnessMap].forEach(texture=>{if(texture)textures.add(texture)});
      });
    }
  });
  geometries.forEach(geometry=>geometry.dispose());
  textures.forEach(texture=>texture.dispose());
  materials.forEach(material=>material.dispose());
  while (object.children.length) object.remove(object.children[0]);
}

function makeGradientTexture(colors:string[], grain=.035) {
  const canvas=document.createElement("canvas");canvas.width=48;canvas.height=256;
  const context=canvas.getContext("2d")!;const gradient=context.createLinearGradient(0,0,0,256);
  colors.forEach((color,index)=>gradient.addColorStop(index/Math.max(1,colors.length-1),color));
  context.fillStyle=gradient;context.fillRect(0,0,48,256);
  if(grain>0){const image=context.getImageData(0,0,48,256);for(let i=0;i<image.data.length;i+=4){const noise=(Math.random()-.5)*255*grain;image.data[i]+=noise;image.data[i+1]+=noise;image.data[i+2]+=noise}context.putImageData(image,0,0)}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.repeat.set(2,1);texture.anisotropy=4;return texture;
}

function makeMaterial(color: string, options: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness:.38, metalness:.025, clearcoat:.12, clearcoatRoughness:.45, ...options });
}

function makeOrganicMaterial(colors:string[], options:Partial<THREE.MeshPhysicalMaterialParameters>={}) {
  const map=makeGradientTexture(colors);
  return new THREE.MeshPhysicalMaterial({color:"#ffffff",map,bumpMap:map,bumpScale:.012,roughness:.34,metalness:.015,clearcoat:.22,clearcoatRoughness:.38,sheen:.3,sheenColor:new THREE.Color(colors[0]),...options});
}

function makePetalGeometry(radialSegments=24,heightSegments=16) {
  const geometry=new THREE.SphereGeometry(.5,radialSegments,heightSegments);
  geometry.scale(.72,1.18,.16);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTreeLeafGeometry() {
  const geometry=new THREE.SphereGeometry(.5,20,12);
  geometry.scale(.5,.9,.05);
  geometry.computeVertexNormals();
  return geometry;
}

function orientAlong(object:THREE.Object3D,direction:THREE.Vector3) {
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
}

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material, radialSegments=12) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, direction.length(), radialSegments), material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  orientAlong(mesh,direction);
  mesh.castShadow = true;
  return mesh;
}

function buildFlower(group: THREE.Group, s: GardenSettings) {
  const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.08,.65,.03),new THREE.Vector3(.08,1.28,-.04),new THREE.Vector3(0,1.86,0)]);
  const stem=new THREE.Mesh(new THREE.TubeGeometry(stemCurve,40,.09,12,false),makeOrganicMaterial(["#438b62","#a9df78"],{roughness:.55}));stem.castShadow=true;group.add(stem);
  const leafGeometry=makePetalGeometry(18,14),leafMaterial=makeOrganicMaterial(["#4dbf9c","#bce878","#f7c0d8"],{roughness:.46});
  [[-.08,.54,.2,.72],[.08,1.06,-.2,.58]].forEach(([x,y,z,scale],index)=>{const leaf=new THREE.Mesh(leafGeometry,leafMaterial);leaf.scale.set(.32,scale,1.05);leaf.position.set(x,y,z);orientAlong(leaf,new THREE.Vector3(index?1:-1,.24,index?-1:1));leaf.castShadow=true;group.add(leaf)});
  const ovary=new THREE.Mesh(new THREE.SphereGeometry(.2,28,20),makeOrganicMaterial(["#2f8a56","#8fcd67","#f1c56c"],{roughness:.48,clearcoat:.12}));ovary.position.y=1.88;ovary.scale.set(1.25,.72,1.25);ovary.castShadow=true;group.add(ovary);
  const bloom=new THREE.Group();bloom.name="petals";bloom.position.y=1.92;
  const count=Math.round(s.flowerPetals),petalGeometry=makePetalGeometry(24,18);
  const petalMaterial=makeOrganicMaterial(["#55d1c5","#c6eef0","#ef9fca","#ffcfdf"],{roughness:.3,clearcoat:.28});
  for(let i=0;i<count;i++){
    const theta=THREE.MathUtils.degToRad(i*s.flowerAngle),progress=i/Math.max(1,count-1);
    const ring=.1+Math.sqrt(i)*.09*s.flowerRatio;
    const tangent=new THREE.Vector3(-Math.sin(theta),0,Math.cos(theta));
    const radial=new THREE.Vector3(Math.cos(theta),.3+progress*.18,Math.sin(theta)).normalize();
    const normal=tangent.clone().cross(radial).normalize();
    const alignedRadial=normal.clone().cross(tangent).normalize();
    const petal=new THREE.Mesh(petalGeometry,petalMaterial);petal.scale.set(.38-progress*.065,.62-progress*.14,.34);petal.position.set(Math.cos(theta)*ring,.015+progress*.08+ring*.08,Math.sin(theta)*ring);petal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,alignedRadial,normal));petal.castShadow=true;bloom.add(petal);
  }
  const seedGeometry=new THREE.IcosahedronGeometry(.038,1),seedMaterial=makeOrganicMaterial(["#f8cb5c","#ff8f8a"],{roughness:.4,clearcoat:.16});
  for(let i=0;i<34;i++){const theta=i*2.39996,r=.055*Math.sqrt(i);const seed=new THREE.Mesh(seedGeometry,seedMaterial);seed.position.set(Math.cos(theta)*r,.23+Math.max(0,.16-r*.32),Math.sin(theta)*r);seed.castShadow=true;bloom.add(seed)}
  group.add(bloom);
}

function buildFibonacciFlower(group:THREE.Group,petalCount:number,seedCount:number,petalColors:string[]) {
  const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.06,.55,.03),new THREE.Vector3(-.04,1.05,0),new THREE.Vector3(0,1.45,0)]);
  const stem=new THREE.Mesh(new THREE.TubeGeometry(stemCurve,32,.055,10,false),makeOrganicMaterial(["#2f8050","#88cb66"],{roughness:.58}));stem.castShadow=true;group.add(stem);
  const leafGeometry=makeTreeLeafGeometry(),leafMaterial=makeOrganicMaterial(["#258354","#67c56c","#c5e875"],{roughness:.54,clearcoat:.08});
  [[-.03,.48,-1,.28,.2],[.02,.87,1,.34,-.16]].forEach(([x,y,side,scale,z])=>{const direction=new THREE.Vector3(side,.22,z).normalize(),leaf=new THREE.Mesh(leafGeometry,leafMaterial);leaf.position.set(x,y,0);leaf.scale.set(scale,scale*1.25,scale);orientAlong(leaf,direction);leaf.rotateY(side*.18);leaf.castShadow=true;group.add(leaf)});
  const ovary=new THREE.Mesh(new THREE.SphereGeometry(.14,20,14),makeOrganicMaterial(["#2f8050","#8dcc68","#e8c75f"],{roughness:.48}));ovary.position.y=1.44;ovary.scale.set(1.25,.72,1.25);ovary.castShadow=true;group.add(ovary);
  const bloom=new THREE.Group();bloom.position.y=1.46;const petalGeometry=makePetalGeometry(18,12),petalMaterial=makeOrganicMaterial(petalColors,{roughness:.36,clearcoat:.2});
  for(let i=0;i<petalCount;i++){const theta=i*Math.PI*2/petalCount,tangent=new THREE.Vector3(-Math.sin(theta),0,Math.cos(theta)),radial=new THREE.Vector3(Math.cos(theta),.42,Math.sin(theta)).normalize(),normal=tangent.clone().cross(radial).normalize(),aligned=normal.clone().cross(tangent).normalize();const petal=new THREE.Mesh(petalGeometry,petalMaterial);petal.scale.set(.32,.58,.28);petal.position.set(Math.cos(theta)*.4,.09,Math.sin(theta)*.4);petal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,aligned,normal));petal.castShadow=true;bloom.add(petal)}
  const seedGeometry=new THREE.SphereGeometry(.028,10,8),seedMaterial=makeOrganicMaterial(["#573b2d","#9a5a29","#f0b63d"],{roughness:.5});for(let i=0;i<seedCount;i++){const theta=i*2.399963,r=.038*Math.sqrt(i);const seed=new THREE.Mesh(seedGeometry,seedMaterial);seed.position.set(Math.cos(theta)*r,.13+Math.max(0,.08-r*.18),Math.sin(theta)*r);seed.castShadow=true;bloom.add(seed)}group.add(bloom);
}

function buildTree(group: THREE.Group, s: GardenSettings) {
  const angle = THREE.MathUtils.degToRad(s.treeAngle);
  const maxDepth = Math.round(s.treeDepth);
  const leafGeometry=makeTreeLeafGeometry();const leafMaterials=[makeOrganicMaterial(["#197a3f","#50b95c","#a6db5e"],{roughness:.58,clearcoat:.08}),makeOrganicMaterial(["#246f3f","#6fc466","#c5e879"],{roughness:.56,clearcoat:.08})];
  const branchMaterials=[makeOrganicMaterial(["#39a95d","#6fc96d","#d9efb1"],{roughness:.58,clearcoat:.04}),makeOrganicMaterial(["#247544","#4aa65c","#b9dd8d"],{roughness:.58,clearcoat:.04})];
  const branch = (start: THREE.Vector3, length: number, theta: number, depth: number, zBias: number) => {
    const end = start.clone().add(new THREE.Vector3(Math.sin(theta)*length,Math.cos(theta)*length,zBias*length));
    group.add(cylinderBetween(start,end,.035+depth*.02,branchMaterials[depth<=2?0:1]));
    if (depth <= 0) {
      const branchDirection=new THREE.Vector3(Math.sin(theta),Math.cos(theta),zBias).normalize();
      const sideDirection=new THREE.Vector3(Math.cos(theta),0,-Math.sin(theta)).normalize();
      const centerDirection=new THREE.Vector3(branchDirection.x*.42,.96,branchDirection.z*.42).normalize();
      const leafDirections=[centerDirection,centerDirection.clone().multiplyScalar(.58).add(sideDirection.clone().multiplyScalar(.82)).normalize(),centerDirection.clone().multiplyScalar(.58).add(sideDirection.clone().multiplyScalar(-.82)).normalize()];
      leafDirections.forEach((direction,index)=>{const leaf=new THREE.Mesh(leafGeometry,leafMaterials[index%2]);const scale=index===0?.37:.33;leaf.scale.setScalar(scale);leaf.position.copy(end).add(direction.clone().multiplyScalar(index===0?.14:.12));orientAlong(leaf,direction);leaf.rotateY(index===0?0:index===1?.22:-.22);leaf.castShadow=true;group.add(leaf)});return;
    }
    branch(end, length * s.treeRatio, theta - angle, depth - 1, -.10 + zBias * .45);
    branch(end, length * s.treeRatio, theta + angle, depth - 1, .10 + zBias * .45);
  };
  branch(new THREE.Vector3(0,0,0),.9,0,maxDepth,0);
}

function buildButterfly(group: THREE.Group, s: GardenSettings) {
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.7,8,16),makeOrganicMaterial(["#382947","#8a5f99"],{roughness:.46}));body.castShadow=true;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.14,20,16),makeOrganicMaterial(["#35263f","#74517f"]));head.position.y=.48;head.castShadow=true;group.add(head);
  [-1,1].forEach(side=>{const antennaCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.05,.53,0),new THREE.Vector3(side*.18,.72,.02),new THREE.Vector3(side*.32,.82,.05)]);const antenna=new THREE.Mesh(new THREE.TubeGeometry(antennaCurve,18,.012,6,false),makeMaterial("#4a3454",{roughness:.5}));group.add(antenna);const tip=new THREE.Mesh(new THREE.SphereGeometry(.027,10,8),makeMaterial("#ef92c3"));tip.position.set(side*.32,.82,.05);group.add(tip)});
  const makeWing=(upper:boolean)=>{const shape=new THREE.Shape();shape.moveTo(0,0);if(upper){shape.bezierCurveTo(.2,.65,.72,1.18,1.16,.96);shape.bezierCurveTo(1.42,.72,1.22,.18,.48,-.02)}else{shape.bezierCurveTo(.28,-.08,.86,-.2,1.02,-.63);shape.bezierCurveTo(.96,-1.02,.42,-.98,.08,-.35)}shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.035,bevelThickness:.018,bevelSegments:3,curveSegments:24})};
  const upperGeometry=makeWing(true),lowerGeometry=makeWing(false);const wingMaterial=makeOrganicMaterial(["#86e4e2","#a994ef","#f296c4","#f5cc88"],{transparent:true,opacity:.9,roughness:.27,clearcoat:.32,side:THREE.DoubleSide});
  const gap=s.butterflyGap*.12,scale=s.butterflyScale,wingAngle=THREE.MathUtils.degToRad(s.butterflyWing);
  [-1,1].forEach(side=>{const wingRoot=new THREE.Group();wingRoot.name=side<0?"wing-left":"wing-right";wingRoot.position.x=side*gap;wingRoot.rotation.y=side*wingAngle*.35;
    [upperGeometry,lowerGeometry].forEach((geometry,index)=>{const wing=new THREE.Mesh(geometry,wingMaterial);wing.scale.set(side*scale,scale,1);wing.castShadow=true;wingRoot.add(wing);
      const spot=new THREE.Mesh(new THREE.SphereGeometry(index?.11:.17,18,12),makeOrganicMaterial(index?["#ffe59b","#ef91bd"]:["#6455af","#98e7de"],{roughness:.26}));spot.scale.set(scale,scale*.55,.14);spot.position.set(side*(index?.62:.82)*scale,(index?-.56:.58)*scale,.075);wingRoot.add(spot)});
    group.add(wingRoot)});
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
  const curve=new THREE.CatmullRomCurve3(points);const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,160,.065,12,false),makeOrganicMaterial(["#497f69","#8cd36c","#d9ee71"],{roughness:.52}));tube.castShadow=true;group.add(tube);
  const leafGeometry=makePetalGeometry(16,12),leafMaterial=makeOrganicMaterial(["#44b98e","#cce970","#f4a5cb"],{roughness:.42});
  for (let i = 10; i < steps; i += 12) {
    const p = points[i], theta = (i / steps) * Math.PI * 2 * s.vineTurns;
    const outward=new THREE.Vector3(Math.cos(theta),.32,Math.sin(theta));const leaf=new THREE.Mesh(leafGeometry,leafMaterial);leaf.scale.set(.13,.38,.075);leaf.position.copy(p).add(outward.clone().multiplyScalar(.18));orientAlong(leaf,outward);leaf.castShadow=true;group.add(leaf);
    if(i%24===10){const bell=new THREE.Mesh(new THREE.ConeGeometry(.22,.48,24,1,true),makeOrganicMaterial(["#f6bd8f","#ec88bd","#a889e5"],{side:THREE.DoubleSide,roughness:.35}));bell.position.copy(p).add(outward.clone().multiplyScalar(.34));orientAlong(bell,outward);bell.castShadow=true;group.add(bell)}
  }
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.14,18,14),makeOrganicMaterial(["#dff076","#ee91c4"]));tip.position.copy(points[steps]);tip.scale.set(.7,1.45,.7);group.add(tip);
}

function buildBuilding(group: THREE.Group, s: GardenSettings) {
  const depth=Math.round(s.buildingSides),height=s.buildingHeight,radius=s.buildingRadius;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(radius*1.25,radius*1.38,.16,48),makeOrganicMaterial(["#efc3b4","#cba4ea","#8edee4"],{roughness:.34,clearcoat:.28}));base.position.y=.08;base.castShadow=true;group.add(base);
  const tetraGeometry=new THREE.TetrahedronGeometry(1,0),edgeGeometry=new THREE.EdgesGeometry(tetraGeometry);
  const glass=makeOrganicMaterial(["#81e2df","#a58ce9","#f091bd","#ffd27e"],{transparent:true,opacity:.72,roughness:.18,metalness:.06,clearcoat:.5,side:THREE.DoubleSide});
  const edgeMaterial=new THREE.LineBasicMaterial({color:"#fff5df",transparent:true,opacity:.78});
  const place=(center:THREE.Vector3,size:number,level:number)=>{if(level<=0){const cell=new THREE.Mesh(tetraGeometry,glass);cell.position.copy(center);cell.scale.set(size,size*height,size);cell.castShadow=true;group.add(cell);const edges=new THREE.LineSegments(edgeGeometry,edgeMaterial);edges.position.copy(center);edges.scale.copy(cell.scale);group.add(edges);return}const d=size/(2*Math.sqrt(3));[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].forEach(offset=>place(center.clone().add(new THREE.Vector3(offset[0]*d,offset[1]*d*height,offset[2]*d)),size*.5,level-1))};
  place(new THREE.Vector3(0,radius*1.05*height+.18,0),radius,depth);
  const helixPoints:THREE.Vector3[]=[];for(let i=0;i<=100;i++){const t=i/100,a=t*Math.PI*6;helixPoints.push(new THREE.Vector3(Math.cos(a)*radius*.22,.2+t*radius*2.1*height,Math.sin(a)*radius*.22))}const helix=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPoints),120,.025,8,false),makeMaterial("#fff3a6",{emissive:"#ffcf73",emissiveIntensity:.8,roughness:.22}));group.add(helix);
}

function buildPond(group: THREE.Group, s: GardenSettings) {
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.42,.13,18,72),makeOrganicMaterial(["#d8f5ec","#a9dff1","#c9afea"],{roughness:.32,clearcoat:.35}));rim.rotation.x=Math.PI/2;rim.position.y=.04;rim.castShadow=true;group.add(rim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,.12,72),makeOrganicMaterial(["#b8f4ed","#65d4e8","#8c8ce7"],{transparent:true,opacity:.68,roughness:.08,clearcoat:.8,clearcoatRoughness:.08}));water.position.y=.02;water.receiveShadow=true;group.add(water);
  const ringCount=Math.round(s.pondFrequency);
  for(let i=0;i<ringCount;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.22+i*.17,.018,10,64),makeOrganicMaterial(i%2?["#ffffff","#9ceaf0"]:["#78e4df","#8b8ce9"],{emissive:i%2?"#dffaff":"#26778e",emissiveIntensity:.25,roughness:.14}));
    ring.rotation.x=Math.PI/2;ring.position.y=.13+i*.008;ring.userData.ringIndex=i;ring.userData.baseScale=s.pondAmplitude;group.add(ring);
  }
  const jetMaterial=makeOrganicMaterial(["#d9ffff","#59ddec","#8c8ce7"],{transparent:true,opacity:.74,roughness:.08,clearcoat:.8,emissive:"#4dcfe5",emissiveIntensity:.18});
  [[0,0,0],[-.48,.1,1],[.48,.1,2],[0,-.48,3],[0,.48,4]].forEach(([x,z,band])=>{const baseHeight=band===0?1.18:.74;const jet=new THREE.Mesh(new THREE.CylinderGeometry(.025,.06,1,14),jetMaterial);jet.position.set(x,.16+baseHeight*.5,z);jet.userData.fountainJet=band;jet.userData.baseHeight=baseHeight;jet.scale.y=baseHeight;jet.castShadow=true;group.add(jet);const crown=new THREE.Mesh(new THREE.TorusGeometry(band===0?.13:.095,.016,8,36),makeOrganicMaterial(band%2?["#f59ac8","#806dd9"]:["#c9ffff","#54cedd"],{roughness:.16,clearcoat:.6,emissive:band%2?"#a94f87":"#3ebdcc",emissiveIntensity:.32}));crown.position.set(x,.2+baseHeight,z);crown.rotation.x=Math.PI/2;crown.userData.fountainRing=band;crown.userData.baseHeight=baseHeight;crown.scale.setScalar(.8);crown.castShadow=true;group.add(crown)});
  [[-.7,.1],[.66,-.35]].forEach(([x,z],index)=>{const pad=new THREE.Mesh(new THREE.CircleGeometry(.28-index*.03,40),makeOrganicMaterial(["#68c99b","#d7ed7b"],{side:THREE.DoubleSide,roughness:.48}));pad.rotation.x=-Math.PI/2;pad.position.set(x,.16,z);group.add(pad)});
  const lotus=new THREE.Group();lotus.position.set(-.66,.2,.1);const lotusPetal=makePetalGeometry(14,10),lotusMaterial=makeOrganicMaterial(["#fff0f1","#f2a3ca","#d18ce1"],{roughness:.3});for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const petal=new THREE.Mesh(lotusPetal,lotusMaterial);petal.scale.set(.09,.25,.07);petal.position.set(Math.cos(a)*.13,.08,Math.sin(a)*.13);orientAlong(petal,new THREE.Vector3(Math.cos(a),.55,Math.sin(a)));lotus.add(petal)}group.add(lotus);
  group.userData.pondSpeed=s.pondSpeed;
}

function buildGoldenSpiral(group: THREE.Group, s: GardenSettings) {
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.05,.18,48),makeOrganicMaterial(["#ffd77e","#f09bbd","#9a83e6"],{roughness:.34,clearcoat:.26}));pedestal.position.y=.09;pedestal.castShadow=true;group.add(pedestal);
  const points:THREE.Vector3[]=[];const maxTheta=s.shellTurns*Math.PI*2;const growth=Math.log(s.shellGrowth)/(Math.PI/2);
  for(let i=0;i<=220;i++){const t=i/220,theta=t*maxTheta,r=1.12*Math.exp(growth*(theta-maxTheta));points.push(new THREE.Vector3(Math.cos(theta)*r,1.15+Math.sin(theta)*r,(t-.5)*.72))}
  const spiralMaterial=makeOrganicMaterial(["#fff5a8","#ffb254","#f381b9","#826fe5","#55d8cf"],{roughness:.16,clearcoat:.62,emissive:"#ef8d75",emissiveIntensity:.16,side:THREE.DoubleSide});
  const spiral=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),260,s.shellTube,14,false),spiralMaterial);spiral.castShadow=true;group.add(spiral);
  [points[0],points[points.length-1]].forEach(point=>{const cap=new THREE.Mesh(new THREE.SphereGeometry(s.shellTube*1.025,18,12),spiralMaterial);cap.position.copy(point);cap.castShadow=true;group.add(cap)});
  const haloPoints=points.map(point=>point.clone().add(new THREE.Vector3(0,0,-.09)));const halo=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(haloPoints),260,s.shellTube*1.9,12,false),makeMaterial("#ffe3a0",{transparent:true,opacity:.15,emissive:"#ffad63",emissiveIntensity:.9,roughness:.2}));group.add(halo);
}

function buildEuler(group:THREE.Group,s:GardenSettings) {
  const radius=s.eulerRadius,center=new THREE.Vector3(0,1.25,0),phase=s.eulerPhase;
  const layerColors=["#ff78b5","#ffd166","#69ded2","#8f7cf2","#ff9668"];
  for(let layer=1;layer<=Math.round(s.eulerWaves);layer++){const wavePoints:THREE.Vector3[]=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2;wavePoints.push(new THREE.Vector3(Math.cos(a)*radius,center.y+Math.sin(a)*radius,Math.sin(a*layer+phase)*.045*layer))}const color=layerColors[layer-1];const wave=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wavePoints,true),144,.021,7,true),makeMaterial(color,{transparent:true,opacity:.92,emissive:color,emissiveIntensity:.38,roughness:.2,clearcoat:.4}));wave.castShadow=true;group.add(wave)}
}

function buildMobius(group: THREE.Group, s: GardenSettings) {
  const segments=128,widthSegments=16,vertices:number[]=[],indices:number[]=[],colors:number[]=[];
  const palette=[new THREE.Color("#75e0de"),new THREE.Color("#8b78e3"),new THREE.Color("#ef8fbd"),new THREE.Color("#ffd078"),new THREE.Color("#75e0de")];
  for(let i=0;i<=segments;i++){
    const u=i/segments*Math.PI*2;
    for(let j=0;j<=widthSegments;j++){
      const v=(j/widthSegments-.5)*2*s.mobiusWidth;
      const twist=s.mobiusTwist*u/2, radius=s.mobiusRadius;
      vertices.push((radius+v*Math.cos(twist))*Math.cos(u),v*Math.sin(twist),(radius+v*Math.cos(twist))*Math.sin(u));
      const p=i/segments*(palette.length-1),a=Math.floor(p),color=palette[a].clone().lerp(palette[Math.min(a+1,palette.length-1)],p-a);colors.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<widthSegments;j++){const a=i*(widthSegments+1)+j,b=a+widthSegments+1;indices.push(a,b,a+1,b,b+1,a+1)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const ribbon=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.34,metalness:.025,clearcoat:.34,clearcoatRoughness:.32,sheen:.3,sheenColor:new THREE.Color("#e8b7ef")}));ribbon.castShadow=true;group.add(ribbon);
}

function buildItem(group: THREE.Group, id: GardenId, settings: GardenSettings) {
  disposeObject(group);
  if(id==="flower")buildFlower(group,settings);
  if(id==="tree")buildTree(group,settings);
  if(id==="butterfly")buildButterfly(group,settings);
  if(id==="vine")buildVine(group,settings);
  if(id==="building")buildBuilding(group,settings);
  if(id==="pond")buildPond(group,settings);
  if(id==="shell")buildGoldenSpiral(group,settings);
  if(id==="mobius")buildMobius(group,settings);
  if(id==="euler")buildEuler(group,settings);
  if(id==="butterfly"){
    group.scale.setScalar(.8);
    group.rotation.set(.84,Math.PI,-.16);
  }
  group.traverse(child=>{child.userData.gardenId=id});
}

function MathGardenCanvas({ selectedId, onSelect, settings, audioAnalyserRef, pondPlayingRef }: { selectedId: GardenId | null; onSelect: (id:GardenId)=>void; settings: GardenSettings; audioAnalyserRef:{current:AnalyserNode|null}; pondPlayingRef:{current:boolean} }) {
  const host = useRef<HTMLDivElement>(null);
  const groups = useRef(new Map<GardenId, THREE.Group>());
  const focus = useRef(new THREE.Vector3(0,1,0));
  const onSelectRef = useRef(onSelect);
  const settingsRef = useRef(settings);
  useEffect(()=>{onSelectRef.current=onSelect},[onSelect]);
  useEffect(()=>{settingsRef.current=settings},[settings]);

  useEffect(()=>{
    const container=host.current;if(!container)return;
    const sceneGroups=groups.current;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower=(navigator.hardwareConcurrency??8)<=4||window.innerWidth<700||window.matchMedia("(pointer: coarse)").matches;
    container.dataset.webglReady="false";
    container.dataset.quality=lowPower?"eco":"standard";
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:!lowPower,alpha:false,powerPreference:lowPower?"low-power":"high-performance"});}catch(error){console.error("Math garden WebGL initialization failed",error);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,lowPower?1:1.8));renderer.setSize(container.clientWidth,container.clientHeight);renderer.shadowMap.enabled=!lowPower;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.domElement.setAttribute("aria-label","可旋转和缩放的数学花园三维空间");renderer.domElement.setAttribute("role","img");container.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#7ed7ef");scene.fog=new THREE.FogExp2("#a6e2ec",.024);
    const camera=new THREE.PerspectiveCamera(45,container.clientWidth/container.clientHeight,.1,80);camera.position.set(0,7.2,12.5);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=6.5;controls.maxDistance=17;controls.minPolarAngle=.55;controls.maxPolarAngle=1.36;controls.autoRotate=!reducedMotion;controls.autoRotateSpeed=.22;controls.target.set(0,1,0);
    scene.add(new THREE.HemisphereLight("#fffaf0","#d46ca7",1.42));const sun=new THREE.DirectionalLight("#fff0cc",2.65);sun.position.set(-6,11,8);sun.castShadow=!lowPower;sun.shadow.mapSize.set(lowPower?512:2048,lowPower?512:2048);sun.shadow.camera.left=-11;sun.shadow.camera.right=11;sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;scene.add(sun);const fill=new THREE.PointLight("#9c75ec",10,18);fill.position.set(4,5,-3);scene.add(fill);const rimLight=new THREE.PointLight("#36e0c1",8,16);rimLight.position.set(-6,3,3);scene.add(rimLight);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(30,lowPower?64:128),makeOrganicMaterial(["#f58ab8","#ffc269","#59d6b7"],{roughness:.68,clearcoat:.05}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
    [[-7,-3,2.4,"#bca3ff"],[7,-4,3,"#ff9fca"],[-8,4,2.6,"#83e5ed"],[8,5,3.5,"#bde960"]].forEach(([x,z,scale,color],index)=>{const secondary=index%2?"#ffbfda":"#72dfcf";const hill=new THREE.Mesh(new THREE.SphereGeometry(1.8,lowPower?22:36,lowPower?14:24),makeOrganicMaterial([color as string,secondary],{roughness:.58,clearcoat:.1}));hill.position.set(x as number,-.45,z as number);hill.scale.set(scale as number,1,1.2);hill.receiveShadow=true;scene.add(hill)});
    const pineTrunkGeometry=new THREE.CylinderGeometry(.075,.11,.72,lowPower?8:10),pineConeGeometry=new THREE.ConeGeometry(.62,.92,lowPower?12:20),pineTrunkMaterial=makeOrganicMaterial(["#6f5845","#b1855f"],{roughness:.66}),pineMaterials=[makeOrganicMaterial(["#0d7042","#39b95b"],{roughness:.58}),makeOrganicMaterial(["#16884a","#75d969"],{roughness:.55})],allPinePositions:[number,number][]=[[-8.3,.4],[-5.7,7.2],[-.8,9],[.8,-9],[6.2,.3],[8.4,1.3],[-5.6,-6.8]],pinePositions=lowPower?allPinePositions.filter((_,index)=>index%2===0):allPinePositions;pinePositions.forEach(([x,z],i)=>{const scale=.82+(i%3)*.16,pine=new THREE.Group();pine.position.set(x,0,z);const trunk=new THREE.Mesh(pineTrunkGeometry,pineTrunkMaterial);trunk.position.y=.36*scale;trunk.scale.setScalar(scale);trunk.castShadow=true;pine.add(trunk);for(let tier=0;tier<3;tier++){const crown=new THREE.Mesh(pineConeGeometry,pineMaterials[(i+tier)%2]);crown.position.y=(.72+tier*.48)*scale;crown.scale.set((1-tier*.15)*scale,(1-tier*.08)*scale,(1-tier*.15)*scale);crown.castShadow=true;pine.add(crown)}scene.add(pine)});
    const fibonacciFlowerA=new THREE.Group();fibonacciFlowerA.position.set(-6.1,0,4.9);fibonacciFlowerA.scale.setScalar(.82);buildFibonacciFlower(fibonacciFlowerA,lowPower?9:13,lowPower?21:34,["#ffe26d","#ffad46","#e9789f"]);scene.add(fibonacciFlowerA);const fibonacciFlowerB=new THREE.Group();fibonacciFlowerB.position.set(1.75,0,-4.35);fibonacciFlowerB.scale.setScalar(.72);buildFibonacciFlower(fibonacciFlowerB,lowPower?13:21,lowPower?34:55,["#f598cf","#b983e6","#72ddd1"]);scene.add(fibonacciFlowerB);
    GARDEN_ITEMS.forEach(item=>{const group=new THREE.Group();group.position.set(...POSITIONS[item.id]);group.userData.gardenId=item.id;buildItem(group,item.id,settingsRef.current);scene.add(group);groups.current.set(item.id,group)});
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart={x:0,y:0};
    const down=(e:PointerEvent)=>{pointerStart={x:e.clientX,y:e.clientY};controls.autoRotate=false};
    const up=(e:PointerEvent)=>{const tapTolerance=e.pointerType==="touch"?18:7;if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>tapTolerance)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...groups.current.values()],true)[0];if(!hit)return;let object:THREE.Object3D|null=hit.object;while(object&&!object.userData.gardenId)object=object.parent;const id=object?.userData.gardenId as GardenId|undefined;if(id){onSelectRef.current(id);focus.current.copy(groups.current.get(id)?.position??new THREE.Vector3()).setY(1)}};
    const contextLost=(event:Event)=>{event.preventDefault();container.dataset.webglReady="false"};const contextRestored=()=>{container.dataset.webglReady="true"};
    renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("webglcontextlost",contextLost);renderer.domElement.addEventListener("webglcontextrestored",contextRestored);
    let frame=0;const timer=new THREE.Timer();timer.connect(document);const spectrum=new Uint8Array(256);let smoothLow=0,smoothMid=0,smoothHigh=0,smoothOverall=0;
    const bandAverage=(from:number,to:number)=>{let total=0;for(let i=from;i<to;i++)total+=spectrum[i]??0;return total/Math.max(1,to-from)/255};
    let isSceneVisible=true;const visibilityObserver=new IntersectionObserver(([entry])=>{isSceneVisible=entry.isIntersecting&&entry.intersectionRatio>0},{threshold:.01});visibilityObserver.observe(container);
    const animate=(timestamp?:number)=>{frame=requestAnimationFrame(animate);if(!isSceneVisible||document.hidden)return;timer.update(timestamp);const t=timer.getElapsed();const analyser=audioAnalyserRef.current;if(analyser&&pondPlayingRef.current){analyser.getByteFrequencyData(spectrum);smoothLow=THREE.MathUtils.lerp(smoothLow,bandAverage(2,24),.24);smoothMid=THREE.MathUtils.lerp(smoothMid,bandAverage(24,78),.2);smoothHigh=THREE.MathUtils.lerp(smoothHigh,bandAverage(78,150),.18);smoothOverall=THREE.MathUtils.lerp(smoothOverall,bandAverage(2,150),.2)}else{smoothLow*=.92;smoothMid*=.92;smoothHigh*=.92;smoothOverall*=.92}controls.target.lerp(focus.current,.035);controls.update();const vine=groups.current.get("vine");if(vine)vine.rotation.y=Math.sin(t*.35)*.18;const butterfly=groups.current.get("butterfly");if(butterfly){const base=butterfly.userData.wingAngle??.6;const pulse=Math.sin(t*3)*.12;const left=butterfly.getObjectByName("wing-left"),right=butterfly.getObjectByName("wing-right");if(left)left.rotation.y=base*.35+pulse;if(right)right.rotation.y=-base*.35-pulse;butterfly.position.y=POSITIONS.butterfly[1]+Math.sin(t*1.15)*.07;butterfly.rotation.z=-.16+Math.sin(t*.82)*.05}const pond=groups.current.get("pond");if(pond){const speed=pond.userData.pondSpeed??1;pond.children.forEach(child=>{if(child.userData.ringIndex!==undefined){const phase=Math.sin(t*speed*3.2-child.userData.ringIndex*.72);const scale=child.userData.baseScale*(.86+smoothOverall*.9+phase*(.018+smoothOverall*.12));child.scale.setScalar(scale)}if(child.userData.fountainJet!==undefined){const band=child.userData.fountainJet===0?smoothLow:child.userData.fountainJet<3?smoothMid:smoothHigh;const height=Math.max(.2,child.userData.baseHeight*(.28+band*2.25));child.scale.y=height;child.position.y=.16+height*.5}if(child.userData.fountainRing!==undefined){const ringBand=child.userData.fountainRing,energy=ringBand===0?smoothLow:ringBand<3?smoothMid:smoothHigh,delayedEnergy=Math.max(0,energy+Math.sin(t*speed*2.4-ringBand*.42)*(.025+energy*.08)),targetHeight=Math.max(.2,child.userData.baseHeight*(.28+delayedEnergy*2.25)),lag=.075+ringBand*.012;child.position.y=THREE.MathUtils.lerp(child.position.y,.2+targetHeight,lag);const ringScale=.72+delayedEnergy*1.3;child.scale.lerp(new THREE.Vector3(ringScale,ringScale,ringScale),lag*.9);child.rotation.x=Math.PI/2+Math.sin(t*1.2-ringBand*.35)*.08;child.rotation.z=Math.cos(t*.9-ringBand*.27)*.12}})}const shell=groups.current.get("shell");if(shell)shell.rotation.y=Math.sin(t*.34)*.2;const mobius=groups.current.get("mobius");if(mobius)mobius.rotation.y=t*.16;renderer.render(scene,camera);if(container.dataset.webglReady!=="true")container.dataset.webglReady="true"};animate();
    const resize=()=>{if(!container.clientWidth||!container.clientHeight)return;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio,lowPower?1:1.8));renderer.setSize(container.clientWidth,container.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(container);
    return()=>{cancelAnimationFrame(frame);timer.dispose();observer.disconnect();visibilityObserver.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("webglcontextlost",contextLost);renderer.domElement.removeEventListener("webglcontextrestored",contextRestored);controls.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();delete container.dataset.webglReady;delete container.dataset.quality;sceneGroups.clear()};
  },[audioAnalyserRef,pondPlayingRef]);

  useEffect(()=>{if(!selectedId)return;const group=groups.current.get(selectedId);if(!group)return;buildItem(group,selectedId,settings);focus.current.copy(group.position).setY(Math.max(1,group.position.y+.7));},[settings,selectedId]);
  useEffect(()=>{if(!selectedId)return;const group=groups.current.get(selectedId);if(group)focus.current.copy(group.position).setY(Math.max(1,group.position.y+.7));},[selectedId]);
  return <div className="garden-webgl" ref={host}><div className="webgl-fallback">你的浏览器暂时无法开启 3D 花园，请尝试更新浏览器或开启图形加速。</div></div>;
}

export function MathGardenWorld({ onProgress }: { onProgress:(count:number)=>void }) {
  const gardenSection=useRef<HTMLElement>(null);
  const [gardenCanvasReady,setGardenCanvasReady]=useState(false);
  const [selectedId,setSelectedId]=useState<GardenId|null>(null);
  const [discoveries,setDiscoveries]=useState<Set<GardenId>>(()=>new Set());
  const [settings,setSettings]=useState<GardenSettings>(DEFAULT_SETTINGS);
  const [pondPlaying,setPondPlaying]=useState(false);
  const pondAudio=useRef<HTMLAudioElement|null>(null);
  const pondAudioContext=useRef<AudioContext|null>(null);
  const pondAudioSource=useRef<MediaElementAudioSourceNode|null>(null);
  const pondAnalyser=useRef<AnalyserNode|null>(null);
  const pondPlayingRef=useRef(false);
  useEffect(()=>{pondPlayingRef.current=pondPlaying},[pondPlaying]);
  const selected=useMemo(()=>GARDEN_ITEMS.find(item=>item.id===selectedId)??null,[selectedId]);
  const count=discoveries.size,seeds=count,stars=count*2,badges=(count>=3?1:0)+(count>=5?1:0)+(count===GARDEN_ITEMS.length?1:0);
  useEffect(()=>onProgress(count),[count,onProgress]);
  useEffect(()=>{
    const section=gardenSection.current;if(!section||gardenCanvasReady)return;
    if(!("IntersectionObserver" in window)){const timer=window.setTimeout(()=>setGardenCanvasReady(true),0);return()=>window.clearTimeout(timer)}
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting&&entry.intersectionRatio>=.01){setGardenCanvasReady(true);observer.disconnect()}},{threshold:.01});
    observer.observe(section);return()=>observer.disconnect();
  },[gardenCanvasReady]);
  const select=useCallback((id:GardenId)=>{setSelectedId(id);setDiscoveries(prev=>{const next=new Set(prev);next.add(id);return next})},[]);
  const togglePondSound=async()=>{
    if(pondPlaying){if(pondAudio.current){pondAudio.current.pause();pondAudio.current.currentTime=0}setPondPlaying(false);return;}
    if(!pondAudio.current){const audio=new Audio("/audio/mozart-garden.mp3");audio.loop=true;audio.volume=.48;audio.preload="auto";pondAudio.current=audio}
    if(!pondAudioContext.current){const context=createCompatibleAudioContext();const analyser=context.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.72;const source=context.createMediaElementSource(pondAudio.current);source.connect(analyser);analyser.connect(context.destination);pondAudioContext.current=context;pondAudioSource.current=source;pondAnalyser.current=analyser}
    try{await resumeAudioContext(pondAudioContext.current);await pondAudio.current.play();setPondPlaying(true)}catch(error){console.error("Garden music playback failed",error);setPondPlaying(false)}
  };
  useEffect(()=>{const pauseWhenHidden=()=>{if(!document.hidden)return;pondAudio.current?.pause();void pondAudioContext.current?.suspend();setPondPlaying(false)};document.addEventListener("visibilitychange",pauseWhenHidden);return()=>document.removeEventListener("visibilitychange",pauseWhenHidden)},[]);
  useEffect(()=>()=>{if(pondAudio.current){pondAudio.current.pause();pondAudio.current.src=""}pondAudioSource.current?.disconnect();pondAnalyser.current?.disconnect();void pondAudioContext.current?.close()},[]);

  return (
    <section className="garden-world" id="garden" ref={gardenSection}>
      {gardenCanvasReady
        ? <MathGardenCanvas selectedId={selectedId} onSelect={select} settings={settings} audioAnalyserRef={pondAnalyser} pondPlayingRef={pondPlayingRef}/>
        : <div className="garden-webgl garden-webgl-loading" aria-live="polite"><div className="webgl-fallback">数学花园将在抵达时开启 · MATHEMATICAL GARDEN</div></div>}
      <div className="garden-sky-title"><span>THE MATHEMATICAL GARDEN</span><h2>数学探索花园</h2><p>拖动探索 · 双指缩放 · 点击发现</p></div>
      <div className="explorer-hud" aria-label="数学探险家奖励">
        <div><i>🌱</i><span>{seeds}<small>数学种子</small></span></div>
        <div><i>⭐</i><span>{stars}<small>美学星星</small></span></div>
        <div><i>🏆</i><span>{badges}<small>荣誉徽章</small></span></div>
      </div>
      <div className="garden-guide"><i>↔</i><span>转动花园寻找发光的数学生命体<small>{count}/{GARDEN_ITEMS.length} 已发现 · 完成 5 个即可获得证书</small></span></div>

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
        {selected.controls.map(control=>{const value=Number(settings[control.key]);const isGoldenRatio=control.key==="flowerRatio";const atGoldenRatio=isGoldenRatio&&Math.abs(value-1.618)<.0005;return <label className="garden-control" key={control.key}><span>{control.label}<b>{value.toFixed(control.step<.01?3:control.step<.1?2:control.step<1?1:0)}{control.suffix}</b></span><input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={value} onChange={e=>setSettings(prev=>({...prev,[control.key]:Number(e.target.value)}))}/>{isGoldenRatio&&<small className={`golden-ratio-target ${atGoldenRatio?"reached":""}`}><i>目标值 φ = 1.618</i><strong>{atGoldenRatio?"✓ 已达到黄金比例":"拖动滑杆对准目标值"}</strong></small>}</label>})}
        {selected.id==="pond"&&<button className={`pond-sound-button ${pondPlaying?"playing":""}`} onClick={togglePondSound}><i>{pondPlaying?"Ⅱ":"▶"}</i><span>{pondPlaying?"音乐正在驱动喷泉":"启动音乐可视化"}<small>实时频谱控制水柱高度与声波圆环</small></span></button>}
        <div className="garden-reward"><span>🌱 +1 数学种子</span><span>⭐ +2 美学星星</span></div>
      </aside>}
    </section>
  );
}
