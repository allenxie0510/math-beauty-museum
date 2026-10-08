import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
async function module(name) {
  const source = await readFile(new URL(`../app/research-exhibits/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const torus = await module("torus-isoperimetric"), gaussian = await module("gaussian-moat");
const near = (a,b,e=1e-10) => assert.ok(Math.abs(a-b)<e, `${a} versus ${b} (tolerance ${e})`);
const distance2 = (a,b) => (a[0]-b[0])**2+(a[1]-b[1])**2;

test("torus candidate transitions, ties and complement symmetry", () => {
  for (let i=1; i<1000; i++) {
    const V=i/1000, a=torus.torusCandidates(V), b=torus.torusCandidates(1-V);
    near(a.minimum,b.minimum);
    for(const shape of torus.TORUS_SHAPES) near(a.areas[shape],b.areas[shape]);
    assert.deepEqual(a.winners,b.winners);
    assert.ok(a.ballRadius < .5 && a.tubeRadius < .5);
  }
  const [a,b]=torus.TORUS_TRANSITIONS;
  assert.deepEqual(torus.torusCandidates(a).winners,["ball","tube"]);
  assert.deepEqual(torus.torusCandidates(b).winners,["tube","slab"]);
  for(const [v,before,after] of [[a,"ball","tube"],[b,"tube","slab"]]) {
    assert.deepEqual(torus.torusCandidates(v-1e-5).winners,[before]);
    assert.deepEqual(torus.torusCandidates(v+1e-5).winners,[after]);
  }
  for(const v of [0,1,NaN,Infinity,-.1]) assert.throws(()=>torus.torusCandidates(v),RangeError);
});

test("torus interfaces exclude periodic caps and their mesh areas match analytic areas", () => {
  function triangleArea(a,b,c) {
    const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);
    return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
  }
  for(const V of [.08,.22,.42,.78]) for(const shape of torus.TORUS_SHAPES) {
    const faces=torus.torusBoundary(V,shape);
    const area=faces.reduce((sum,face)=>sum+face.slice(2).reduce((n,p,i)=>n+triangleArea(face[0],face[i+1],p),0),0);
    const analytic=torus.torusCandidates(V).areas[shape];
    assert.ok(Math.abs(area/analytic-1)<.009, `${shape} mesh area ${area} vs ${analytic}`);
    if(shape==="slab") { assert.equal(faces.length,2);near(area,2); }
    if(shape==="tube") { assert.equal(faces.length,48);assert.ok(faces.every(face=>new Set(face.map(p=>p[1])).size===2),"no cap face"); }
    assert.deepEqual(faces,torus.torusBoundary(V,shape));
  }
});

test("torus occupancy has requested volume, periodicity and complementary slices", () => {
  const N=48;
  for(const V of [.08,.22,.42,.78]) for(const shape of torus.TORUS_SHAPES) {
    let occupied=0;
    for(let x=0;x<N;x++) for(let y=0;y<N;y++) for(let z=0;z<N;z++) {
      occupied+=Number(torus.torusContains([(x+.5)/N-.5,(y+.5)/N-.5,(z+.5)/N-.5],V,shape));
    }
    near(occupied/N**3,V,shape==="slab"?1/N:.006);
    for(const p of [[.13,.21,-.07],[-.48,.34,.32],[0,0,0]]) {
      assert.equal(torus.torusContains(p,V,shape),torus.torusContains(p.map((x,i)=>x+[2,-3,1][i]),V,shape));
      assert.notEqual(torus.torusContains(p,V,shape),torus.torusContains(p,1-V,shape));
    }
  }
});

test("Gaussian primality agrees with independent Gaussian integer factorization", () => {
  function irreducible(a,b) {
    const norm=a*a+b*b;
    if(norm<=1) return false;
    const limit=Math.floor(Math.sqrt(norm));
    for(let c=-limit;c<=limit;c++) for(let d=-limit;d<=limit;d++) {
      const divisorNorm=c*c+d*d;
      if(divisorNorm>1 && divisorNorm<norm && (a*c+b*d)%divisorNorm===0 && (b*c-a*d)%divisorNorm===0) return false;
    }
    return true;
  }
  for(let a=-12;a<=12;a++) for(let b=-12;b<=12;b++) assert.equal(gaussian.isGaussianPrime(a,b),irreducible(a,b),`${a}+${b}i`);
  for(const p of [[0,0],[1,0],[0,-1],[2,0],[5,0],[2,2]]) assert.equal(gaussian.isGaussianPrime(...p),false);
  for(const p of [[1,1],[2,1],[3,0],[0,-7],[8,3]]) assert.equal(gaussian.isGaussianPrime(...p),true);
});

test("Gaussian reachability matches all-pairs graph and exhaustive outer-shell check", () => {
  const R=8,points=gaussian.gaussianWindow(R),outer=gaussian.gaussianWindow(R+6).filter(p=>Math.max(...p.map(Math.abs))>R);
  for(const M of [0,1,2,4,5,9,36]) for(const seed of [[1,1],[3,0],[8,3]]) {
    const expected=new Set([gaussian.gaussianKey(seed)]), queue=[seed];
    for(let i=0;i<queue.length;i++) for(const p of points) if(distance2(queue[i],p)<=M && !expected.has(gaussian.gaussianKey(p))) { expected.add(gaussian.gaussianKey(p));queue.push(p); }
    const actual=gaussian.gaussianComponent(points,R,M,seed);
    assert.deepEqual([...actual.visited].sort(),[...expected].sort());
    assert.equal(actual.tree.length,actual.visited.size-1);
    for(const [a,b] of actual.tree) assert.ok(distance2(a,b)>0 && distance2(a,b)<=M && expected.has(gaussian.gaussianKey(a)) && expected.has(gaussian.gaussianKey(b)));
    const escapes=queue.some(p=>outer.some(q=>distance2(p,q)<=M));
    assert.equal(Boolean(actual.escapingEdge),escapes);
    if(escapes) { const [a,b]=actual.escapingEdge;assert.ok(distance2(a,b)<=M && expected.has(gaussian.gaussianKey(a)) && Math.max(...b.map(Math.abs))>R && gaussian.isGaussianPrime(...b)); }
  }
});

test("Gaussian reachability is monotone with step and window, and maximum budget is bounded", () => {
  let previous=new Set();
  for(let M=0;M<=36;M++) {
    const graph=gaussian.gaussianComponent(gaussian.gaussianWindow(12),12,M,[1,1]);
    for(const key of previous) assert.ok(graph.visited.has(key));
    previous=graph.visited;
  }
  previous=new Set();
  for(const R of [12,24,40,60]) {
    const time=performance.now(),points=gaussian.gaussianWindow(R),graph=gaussian.gaussianComponent(points,R,36,[1,1]);
    for(const key of previous) assert.ok(graph.visited.has(key));
    previous=graph.visited;
    console.log({gaussianRadius:R,pointCount:points.length,elapsedMs:performance.now()-time,escaping:Boolean(graph.escapingEdge)});
  }
  assert.equal(gaussian.gaussianComponent(gaussian.gaussianWindow(12),12,0,[1,1]).escapingEdge,null);
  assert.throws(()=>gaussian.gaussianWindow(61),RangeError);
  assert.throws(()=>gaussian.gaussianComponent([],12,2,[1,1]),RangeError);
  assert.throws(()=>gaussian.gaussianComponent(gaussian.gaussianWindow(12),12,37,[1,1]),RangeError);
});
