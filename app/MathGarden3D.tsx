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
    id: "building", icon: "△", name: "分形光塔", english: "Sierpiński Light Sculpture", formula: "Nₙ = 4ⁿ",
    discovery: "你发现了一座会自我复制的光塔！", explanation: "每个四面体都分裂成四个更小的自己。重复同一条规则，空隙与实体共同长成一座分形雕塑。",
    color: "#ff9c63", controls: [
      { key: "buildingSides", label: "分形层级", min: 1, max: 3, step: 1 },
      { key: "buildingHeight", label: "纵向伸展", min: 0.8, max: 2.2, step: 0.05 },
      { key: "buildingRadius", label: "结构尺度", min: 0.65, max: 1.25, step: 0.01 },
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
    id: "shell", icon: "◉", name: "斐波那契蜗牛", english: "Fibonacci Snail", formula: "Fₙ = Fₙ₋₁ + Fₙ₋₂",
    discovery: "你发现了一只背着数列的蜗牛！", explanation: "它背上的立体螺旋壳沿着斐波那契节奏生长，身体、触角与壳共同组成一只真正的数学蜗牛。",
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
  buildingSides: 2, buildingHeight: 1.5, buildingRadius: 1.08,
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
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if(!material)return;
        const textured=material as THREE.Material&{map?:THREE.Texture|null;bumpMap?:THREE.Texture|null;roughnessMap?:THREE.Texture|null};
        const textures=new Set([textured.map,textured.bumpMap,textured.roughnessMap].filter(Boolean));
        textures.forEach(texture=>texture?.dispose());
        material.dispose();
      });
    }
  });
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

function makePetalGeometry(_radialSegments=20,_heightSegments=18) {
  const shape=new THREE.Shape();shape.moveTo(0,-.52);shape.bezierCurveTo(-.3,-.42,-.42,-.08,-.34,.22);shape.bezierCurveTo(-.28,.46,-.12,.56,0,.57);shape.bezierCurveTo(.12,.56,.28,.46,.34,.22);shape.bezierCurveTo(.42,-.08,.3,-.42,0,-.52);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.052,bevelEnabled:true,bevelSize:.035,bevelThickness:.018,bevelSegments:3,curveSegments:18});geometry.translate(0,0,-.026);geometry.computeVertexNormals();return geometry;
}

function orientAlong(object:THREE.Object3D,direction:THREE.Vector3) {
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
}

function cylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: string) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const branchTip=new THREE.Color(color).lerp(new THREE.Color("#d9efb1"),.34).getStyle();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, direction.length(), 12), makeOrganicMaterial([color,branchTip],{roughness:.58,clearcoat:.04}));
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
  const bloom=new THREE.Group();bloom.name="petals";bloom.position.y=1.92;
  const count=Math.round(s.flowerPetals),petalGeometry=makePetalGeometry(24,18);
  const petalMaterial=makeOrganicMaterial(["#55d1c5","#c6eef0","#ef9fca","#ffcfdf"],{roughness:.3,clearcoat:.28});
  for(let i=0;i<count;i++){
    const theta=THREE.MathUtils.degToRad(i*s.flowerAngle),progress=i/Math.max(1,count-1);
    const ring=.1+Math.sqrt(i)*.09*s.flowerRatio;const direction=new THREE.Vector3(Math.cos(theta)*(1.2-progress*.35),.35+progress*.72,Math.sin(theta)*(1.2-progress*.35)).normalize();
    const petal=new THREE.Mesh(petalGeometry,petalMaterial);petal.scale.set(.38-progress*.065,.62-progress*.14,.72);petal.position.set(Math.cos(theta)*ring,.02+progress*.24,Math.sin(theta)*ring);orientAlong(petal,direction);petal.castShadow=true;bloom.add(petal);
  }
  const seedMaterial=makeOrganicMaterial(["#f8cb5c","#ff8f8a"],{roughness:.4,clearcoat:.16});
  for(let i=0;i<34;i++){const theta=i*2.39996,r=.055*Math.sqrt(i);const seed=new THREE.Mesh(new THREE.IcosahedronGeometry(.038,1),seedMaterial);seed.position.set(Math.cos(theta)*r,.23+Math.max(0,.16-r*.32),Math.sin(theta)*r);seed.castShadow=true;bloom.add(seed)}
  group.add(bloom);
}

function buildTree(group: THREE.Group, s: GardenSettings) {
  const angle = THREE.MathUtils.degToRad(s.treeAngle);
  const maxDepth = Math.round(s.treeDepth);
  const leafGeometry=makePetalGeometry(16,12);const leafMaterials=[makeOrganicMaterial(["#188b4d","#58c765","#b7ea69"],{roughness:.52}),makeOrganicMaterial(["#246f3f","#72d271","#d0ef82"],{roughness:.48})];
  const branch = (start: THREE.Vector3, length: number, theta: number, depth: number, zBias: number) => {
    const end = start.clone().add(new THREE.Vector3(Math.sin(theta)*length,Math.cos(theta)*length,zBias*length));
    const color=depth<=2?"#39a95d":"#247544";group.add(cylinderBetween(start,end,.035+depth*.02,color));
    if (depth <= 0) {
      for(let i=0;i<5;i++){const leaf=new THREE.Mesh(leafGeometry,leafMaterials[i%2]);const turn=i*Math.PI*.6+end.x;leaf.scale.set(.19,.35,1);leaf.position.copy(end).add(new THREE.Vector3(Math.cos(turn)*.11,i*.026,Math.sin(turn)*.11));orientAlong(leaf,new THREE.Vector3(Math.cos(turn),.5,Math.sin(turn)));leaf.castShadow=true;group.add(leaf)}return;
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
      const spot=new THREE.Mesh(new THREE.SphereGeometry(index?.11:.14,18,12),makeOrganicMaterial(index?["#ffe59b","#ef91bd"]:["#6455af","#98e7de"],{roughness:.26}));spot.scale.set(1,.55,.14);spot.position.set(side*(index?.62:.82),index?-.56:.58,.075);wingRoot.add(spot)});
    const veinMaterial=makeMaterial("#75508e",{roughness:.5,transparent:true,opacity:.55});[[.94,.72],[.84,.18],[.72,-.56]].forEach(([x,y],index)=>{const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,.08),new THREE.Vector3(side*x*.45,y*.55,.09),new THREE.Vector3(side*x,y,.08));const vein=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.012-index*.001,5,false),veinMaterial);wingRoot.add(vein)});group.add(wingRoot)});
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
  const place=(center:THREE.Vector3,size:number,level:number)=>{if(level<=0){const cell=new THREE.Mesh(tetraGeometry,glass);cell.position.copy(center);cell.scale.set(size,size*height,size);cell.castShadow=true;group.add(cell);const edges=new THREE.LineSegments(edgeGeometry,edgeMaterial);edges.position.copy(center);edges.scale.copy(cell.scale);group.add(edges);return}const d=size*.43;[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].forEach(offset=>place(center.clone().add(new THREE.Vector3(offset[0]*d,offset[1]*d*height,offset[2]*d)),size*.5,level-1))};
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
  [[-.7,.1],[.66,-.35]].forEach(([x,z],index)=>{const pad=new THREE.Mesh(new THREE.CircleGeometry(.28-index*.03,40),makeOrganicMaterial(["#68c99b","#d7ed7b"],{side:THREE.DoubleSide,roughness:.48}));pad.rotation.x=-Math.PI/2;pad.position.set(x,.16,z);group.add(pad)});
  const lotus=new THREE.Group();lotus.position.set(-.66,.2,.1);const lotusPetal=makePetalGeometry(14,10),lotusMaterial=makeOrganicMaterial(["#fff0f1","#f2a3ca","#d18ce1"],{roughness:.3});for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const petal=new THREE.Mesh(lotusPetal,lotusMaterial);petal.scale.set(.09,.25,.07);petal.position.set(Math.cos(a)*.13,.08,Math.sin(a)*.13);orientAlong(petal,new THREE.Vector3(Math.cos(a),.55,Math.sin(a)));lotus.add(petal)}group.add(lotus);
  [0,1,2].forEach(i=>{const note=new THREE.Mesh(new THREE.TorusGeometry(.08+i*.018,.014,8,32),makeOrganicMaterial(i===1?["#f7aad0","#9f78dc"]:["#8fe7e2","#6c73d9"],{roughness:.18,clearcoat:.55}));note.position.set(-.45+i*.45,.65+i*.24,.12-i*.12);note.rotation.set(.35+i*.28,.4-i*.16,.2+i*.36);note.userData.float=i;note.castShadow=true;group.add(note)});
  group.userData.pondSpeed=s.pondSpeed;
}

function buildShell(group: THREE.Group, s: GardenSettings) {
  const bodyMaterial=makeOrganicMaterial(["#35a982","#78d8a0","#d0ed7a"],{roughness:.46,clearcoat:.12});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.18,1.15,10,20),bodyMaterial);body.rotation.z=Math.PI/2;body.position.set(.25,.2,0);body.scale.z=.68;body.castShadow=true;group.add(body);
  const foot=new THREE.Mesh(new THREE.CapsuleGeometry(.09,1.2,8,18),makeOrganicMaterial(["#247a64","#69c994"],{roughness:.58}));foot.rotation.z=Math.PI/2;foot.position.set(.18,.05,0);foot.scale.set(1,.75,.82);group.add(foot);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,28,22),bodyMaterial);head.position.set(.95,.31,0);head.scale.set(1,.92,.88);head.castShadow=true;group.add(head);
  const stalkMaterial=makeOrganicMaterial(["#2d896d","#9adb8b"],{roughness:.5});
  [-1,1].forEach(side=>{const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(1.02,.45,side*.1),new THREE.Vector3(1.12,.67,side*.14),new THREE.Vector3(1.22,.83,side*.2)]);const stalk=new THREE.Mesh(new THREE.TubeGeometry(curve,22,.025,8,false),stalkMaterial);stalk.castShadow=true;group.add(stalk);const eye=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),makeMaterial("#263237",{roughness:.22,clearcoat:.5}));eye.position.set(1.22,.83,side*.2);group.add(eye)});
  const smileCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(1.17,.25,-.18),new THREE.Vector3(1.25,.19,0),new THREE.Vector3(1.17,.25,.18));const smile=new THREE.Mesh(new THREE.TubeGeometry(smileCurve,18,.012,6,false),makeMaterial("#276753",{roughness:.5}));group.add(smile);
  const shellScale=.9+(s.shellTube-.08)/.16*.22;const shellCenter=new THREE.Vector3(-.18,.9,0);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(.72,48,36),makeOrganicMaterial(["#ffe38f","#f3a1bf","#9c83e4","#74dcd2"],{roughness:.24,clearcoat:.42}));shell.position.copy(shellCenter);shell.scale.set(shellScale,shellScale,shellScale*.62);shell.castShadow=true;group.add(shell);
  const visualTurns=1.55+(s.shellTurns-2.5)/3.5*1.25,spiralPoints:THREE.Vector3[]=[];for(let i=0;i<=120;i++){const t=i/120,theta=t*Math.PI*2*visualTurns,r=.035+.54*Math.pow(t,.78+s.shellGrowth);spiralPoints.push(new THREE.Vector3(shellCenter.x+Math.cos(theta)*r*shellScale,shellCenter.y+Math.sin(theta)*r*shellScale,.46*shellScale))}const spiral=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints),140,.018+s.shellTube*.035,8,false),makeOrganicMaterial(["#fff8d2","#ef8fbd","#72d8d0"],{roughness:.18,clearcoat:.5}));spiral.castShadow=true;group.add(spiral);
  const spiralCore=new THREE.Mesh(new THREE.SphereGeometry(.09,20,16),makeOrganicMaterial(["#fff4bd","#f49cc5"],{roughness:.18,clearcoat:.55}));spiralCore.position.set(shellCenter.x,shellCenter.y,.47*shellScale);group.add(spiralCore);
}

function buildMobius(group: THREE.Group, s: GardenSettings) {
  const segments=128,widthSegments=16,vertices:number[]=[],indices:number[]=[],colors:number[]=[];
  const palette=[new THREE.Color("#75e0de"),new THREE.Color("#8b78e3"),new THREE.Color("#ef8fbd"),new THREE.Color("#ffd078")];
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
  const ribbon=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.22,metalness:.04,clearcoat:.55,clearcoatRoughness:.2,sheen:.4,sheenColor:new THREE.Color("#e8b7ef")}));ribbon.castShadow=true;group.add(ribbon);
  [-1,1].forEach(edge=>{const points:THREE.Vector3[]=[];for(let i=0;i<=segments;i++){const u=i/segments*Math.PI*2,v=edge*s.mobiusWidth,twist=s.mobiusTwist*u/2,radius=s.mobiusRadius;points.push(new THREE.Vector3((radius+v*Math.cos(twist))*Math.cos(u),v*Math.sin(twist),(radius+v*Math.cos(twist))*Math.sin(u)))}const trim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),segments,.018,6,true),makeMaterial(edge>0?"#fff2b1":"#c7fbf0",{emissive:edge>0?"#c98044":"#4b9d9d",emissiveIntensity:.35,roughness:.18}));group.add(trim)});
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));renderer.setSize(container.clientWidth,container.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.domElement.setAttribute("aria-label","可旋转和缩放的数学花园三维空间");renderer.domElement.setAttribute("role","img");container.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#7ed7ef");scene.fog=new THREE.FogExp2("#a6e2ec",.024);
    const camera=new THREE.PerspectiveCamera(45,container.clientWidth/container.clientHeight,.1,80);camera.position.set(0,7.2,12.5);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.minDistance=6.5;controls.maxDistance=17;controls.minPolarAngle=.55;controls.maxPolarAngle=1.36;controls.autoRotate=true;controls.autoRotateSpeed=.22;controls.target.set(0,1,0);
    scene.add(new THREE.HemisphereLight("#fffaf0","#d46ca7",1.42));const sun=new THREE.DirectionalLight("#fff0cc",2.65);sun.position.set(-6,11,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-11;sun.shadow.camera.right=11;sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;scene.add(sun);const fill=new THREE.PointLight("#9c75ec",10,18);fill.position.set(4,5,-3);scene.add(fill);const rimLight=new THREE.PointLight("#36e0c1",8,16);rimLight.position.set(-6,3,3);scene.add(rimLight);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(12.5,96),makeOrganicMaterial(["#f58ab8","#ffc269","#59d6b7"],{roughness:.68,clearcoat:.05}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
    const path=new THREE.Mesh(new THREE.TorusGeometry(5.1,.5,24,128),makeOrganicMaterial(["#fffdf5","#dfc1ff","#91ede2"],{roughness:.52,clearcoat:.16}));path.rotation.x=Math.PI/2;path.scale.z=.7;path.position.y=.015;path.receiveShadow=true;scene.add(path);
    [[-7,-3,2.4,"#bca3ff"],[7,-4,3,"#ff9fca"],[-8,4,2.6,"#83e5ed"],[8,5,3.5,"#bde960"]].forEach(([x,z,scale,color],index)=>{const secondary=index%2?"#ffbfda":"#72dfcf";const hill=new THREE.Mesh(new THREE.SphereGeometry(1.8,36,24),makeOrganicMaterial([color as string,secondary],{roughness:.58,clearcoat:.1}));hill.position.set(x as number,-.45,z as number);hill.scale.set(scale as number,1,1.2);hill.receiveShadow=true;scene.add(hill)});
    const pineTrunkGeometry=new THREE.CylinderGeometry(.075,.11,.72,10),pineConeGeometry=new THREE.ConeGeometry(.62,.92,20),pineTrunkMaterial=makeOrganicMaterial(["#6f5845","#b1855f"],{roughness:.66}),pineMaterials=[makeOrganicMaterial(["#0d7042","#39b95b"],{roughness:.58}),makeOrganicMaterial(["#16884a","#75d969"],{roughness:.55})];for(let i=0;i<7;i++){const angle=.35+i*.91,radius=10.2+(i%2)*1.05,scale=.82+(i%3)*.16,pine=new THREE.Group();pine.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);const trunk=new THREE.Mesh(pineTrunkGeometry,pineTrunkMaterial);trunk.position.y=.36*scale;trunk.scale.setScalar(scale);trunk.castShadow=true;pine.add(trunk);for(let tier=0;tier<3;tier++){const crown=new THREE.Mesh(pineConeGeometry,pineMaterials[(i+tier)%2]);crown.position.y=(.72+tier*.48)*scale;crown.scale.set((1-tier*.15)*scale,(1-tier*.08)*scale,(1-tier*.15)*scale);crown.castShadow=true;pine.add(crown)}scene.add(pine)}
    GARDEN_ITEMS.forEach(item=>{const group=new THREE.Group();group.position.set(...POSITIONS[item.id]);group.userData.gardenId=item.id;buildItem(group,item.id,settingsRef.current);scene.add(group);groups.current.set(item.id,group)});
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart={x:0,y:0};
    const down=(e:PointerEvent)=>{pointerStart={x:e.clientX,y:e.clientY};controls.autoRotate=false};
    const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...groups.current.values()],true)[0];if(!hit)return;let object:THREE.Object3D|null=hit.object;while(object&&!object.userData.gardenId)object=object.parent;const id=object?.userData.gardenId as GardenId|undefined;if(id){onSelectRef.current(id);focus.current.copy(groups.current.get(id)?.position??new THREE.Vector3()).setY(1)}};
    renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",up);
    let frame=0;const timer=new THREE.Timer();timer.connect(document);
    const animate=(timestamp?:number)=>{frame=requestAnimationFrame(animate);timer.update(timestamp);const t=timer.getElapsed();controls.target.lerp(focus.current,.035);controls.update();const flower=groups.current.get("flower");if(flower)flower.rotation.y=t*.12;const vine=groups.current.get("vine");if(vine)vine.rotation.y=Math.sin(t*.35)*.18;const butterfly=groups.current.get("butterfly");if(butterfly){const base=butterfly.userData.wingAngle??.6;const pulse=Math.sin(t*3)*.12;const left=butterfly.getObjectByName("wing-left"),right=butterfly.getObjectByName("wing-right");if(left)left.rotation.y=base*.35+pulse;if(right)right.rotation.y=-base*.35-pulse}const pond=groups.current.get("pond");if(pond){const speed=pond.userData.pondSpeed??1;pond.children.forEach(child=>{if(child.userData.ringIndex!==undefined){const scale=child.userData.baseScale*(1+Math.sin(t*speed*2-child.userData.ringIndex*.7)*.06);child.scale.setScalar(scale)}if(child.userData.float!==undefined)child.position.y=.65+child.userData.float*.25+Math.sin(t*1.5+child.userData.float)*.08})}const shell=groups.current.get("shell");if(shell)shell.rotation.y=t*.1;const mobius=groups.current.get("mobius");if(mobius)mobius.rotation.y=t*.16;renderer.render(scene,camera);if(container.dataset.webglReady!=="true")container.dataset.webglReady="true"};animate();
    const resize=()=>{if(!container.clientWidth||!container.clientHeight)return;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(container);
    return()=>{cancelAnimationFrame(frame);timer.dispose();observer.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);controls.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();delete container.dataset.webglReady;groups.current.clear()};
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
  const pondAudio=useRef<HTMLAudioElement|null>(null);
  const selected=useMemo(()=>GARDEN_ITEMS.find(item=>item.id===selectedId)??null,[selectedId]);
  const count=discoveries.size,seeds=count,stars=count*2,badges=(count>=3?1:0)+(count>=5?1:0)+(count===8?1:0);
  useEffect(()=>onProgress(count),[count,onProgress]);
  const select=useCallback((id:GardenId)=>{setSelectedId(id);setDiscoveries(prev=>{const next=new Set(prev);next.add(id);return next})},[]);
  const togglePondSound=async()=>{
    if(pondPlaying){if(pondAudio.current){pondAudio.current.pause();pondAudio.current.currentTime=0}setPondPlaying(false);return;}
    if(!pondAudio.current){const audio=new Audio("/audio/mozart-garden.mp3");audio.loop=true;audio.volume=.48;audio.preload="auto";pondAudio.current=audio}
    try{await pondAudio.current.play();setPondPlaying(true)}catch(error){console.error("Garden music playback failed",error);setPondPlaying(false)}
  };
  useEffect(()=>()=>{if(pondAudio.current){pondAudio.current.pause();pondAudio.current.src=""}},[]);

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
        {selected.id==="pond"&&<button className={`pond-sound-button ${pondPlaying?"playing":""}`} onClick={togglePondSound}><i>{pondPlaying?"Ⅱ":"▶"}</i><span>{pondPlaying?"暂停钢琴旋律":"聆听音乐水池"}<small>莫扎特钢琴协奏曲 · 真实演奏片段</small></span></button>}
        <div className="garden-reward"><span>🌱 +1 数学种子</span><span>⭐ +2 美学星星</span></div>
      </aside>}
    </section>
  );
}
