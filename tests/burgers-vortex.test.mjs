import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../app/entrance/burgers-vortex.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const v = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const near = (a,b,tol) => assert.ok(Math.abs(a-b)<tol, `${a} vs ${b}`);

test('Burgers velocity is smooth on the axis and incompressible, with the analytic curl', () => {
  const p = v.DEFAULT_VORTEX;
  v.vortexVelocity([0,0,0],p).forEach((value)=>near(value,0,1e-14));
  near(v.vortexAngularSpeed(1e-14,p), p.circulation*p.strain/(8*Math.PI*p.viscosity),1e-10);
  for (const x of [0,.05,.6,2]) for (const y of [0,.13,1]) {
    const q=[x,y,.4], h=1e-5;
    const d=Array.from({length:3},(_,axis)=>{
      const a=[...q],b=[...q]; a[axis]+=h;b[axis]-=h;
      const va=v.vortexVelocity(a,p),vb=v.vortexVelocity(b,p);
      return va.map((value,i)=>(value-vb[i])/(2*h));
    });
    near(d[0][0]+d[1][1]+d[2][2],0,1e-8);
    near(d[0][1]-d[1][0],v.vortexVorticity(Math.hypot(x,y),p),1e-8);
    near(d[1][2]-d[2][1],0,1e-8);near(d[2][0]-d[0][2],0,1e-8);
  }
});

test('steady Navier–Stokes momentum balances convection, pressure and viscosity', () => {
  let worst=0;
  for (const strain of [.3,.75,1.2]) for (const viscosity of [.06,.16,.4]) for (const circulation of [-24,0,20]) {
    const p={strain,viscosity,circulation};
    for (const q of [[0,0,.3],[.015,.03,-.2],[.3,.45,.7],[1,2,-1]]) {
      const u=v.vortexVelocity(q,p),pressure=v.vortexPressureGradient(q,p),h=1e-4;
      const advection=[0,0,0],laplacian=[0,0,0];
      for(let axis=0;axis<3;axis++) {
        const a=[...q],b=[...q];a[axis]+=h;b[axis]-=h;
        const va=v.vortexVelocity(a,p),vb=v.vortexVelocity(b,p);
        for(let component=0;component<3;component++) {
          advection[component]+=u[axis]*(va[component]-vb[component])/(2*h);
          laplacian[component]+=(va[component]-2*u[component]+vb[component])/(h*h);
        }
      }
      for(let i=0;i<3;i++) { const residual=Math.abs(advection[i]+pressure[i]-viscosity*laplacian[i]);worst=Math.max(worst,residual);assert.ok(residual<1e-4); }
    }
  }
  console.log({burgersMaxMomentumResidual:worst});
});

test('tracers follow the velocity with exact radial contraction and axial stretching', () => {
  const p=v.DEFAULT_VORTEX, seed=[1.8,.2,.05],duration=2,steps=512;
  const path=v.vortexTrajectory(seed,duration,steps,p),dt=duration/steps;
  for(let i=0;i<=steps;i++) {
    const t=i*dt,[x,y,z]=path[i];
    near(Math.hypot(x,y),Math.hypot(seed[0],seed[1])*Math.exp(-p.strain*t/2),1e-12);
    near(z,seed[2]*Math.exp(p.strain*t),1e-12);
    if(i>0&&i<steps) v.vortexVelocity(path[i],p).forEach((speed,j)=>near((path[i+1][j]-path[i-1][j])/(2*dt),speed,1e-4));
  }
  assert.throws(()=>v.vortexTrajectory(seed,2,512,{...p,viscosity:0}),RangeError);
  assert.throws(()=>v.vortexTrajectory(seed,2,10000,p),RangeError);
});

test('circulation reverses spin independently of contraction; viscosity and strain set the core width', () => {
  const p=v.DEFAULT_VORTEX,q=[.7,.2,.3];
  const forward=v.vortexVelocity(q,p),reverse=v.vortexVelocity(q,{...p,circulation:-p.circulation}),zero=v.vortexVelocity(q,{...p,circulation:0});
  for(let i=0;i<3;i++) near((forward[i]+reverse[i])/2,zero[i],1e-12);
  near(zero[0],-p.strain*q[0]/2,1e-12);near(zero[2],p.strain*q[2],1e-12);
  const core=v.vortexCoreRadius(p);
  near(v.vortexVorticity(core,p)/v.vortexVorticity(0,p),1/Math.E,1e-12);
  near(v.vortexCoreRadius({...p,viscosity:p.viscosity*2})/core,Math.sqrt(2),1e-12);
  near(v.vortexCoreRadius({...p,strain:p.strain*2})/core,1/Math.sqrt(2),1e-12);
  const seed=[2,0,.05];
  const a=v.vortexTrajectory(seed,2,512,p),b=v.vortexTrajectory(seed,2,512,{...p,circulation:-p.circulation});
  a.forEach((point,i)=>{near(point[0],b[i][0],1e-12);near(point[1],-b[i][1],1e-12);near(point[2],b[i][2],1e-12);});
});

test('rendered tracer heads move, keep finite tails, and avoid bridging the inlet reset', async () => {
  const rendererSource = await readFile(new URL('../app/entrance/VortexSculpture.ts', import.meta.url), 'utf8');
  const rendererJs = ts.transpileModule(rendererSource, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
    .replace('"three"',JSON.stringify(import.meta.resolve('three')))
    .replace('"three/examples/jsm/utils/BufferGeometryUtils.js"',JSON.stringify(import.meta.resolve('three/examples/jsm/utils/BufferGeometryUtils.js')))
    .replace('"./burgers-vortex"',JSON.stringify(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`));
  const {makeVortexSculpture}=await import(`data:text/javascript;base64,${Buffer.from(rendererJs).toString('base64')}`);
  for(const circulation of [-24,0,24]) {
    const scene=makeVortexSculpture({...v.DEFAULT_VORTEX,circulation},true);
    const heads=scene.group.children.find(n=>n.isInstancedMesh),tails=scene.group.children.find(n=>n.isLineSegments);
    const initial=[...heads.instanceMatrix.array];
    scene.update(.5);
    assert.notDeepEqual([...heads.instanceMatrix.array],initial);
    for(const time of [0,.5,20,1000]) {
      scene.update(time);
      assert.ok([...heads.instanceMatrix.array,...tails.geometry.attributes.position.array].every(Number.isFinite));
      const p=tails.geometry.attributes.position.array;
      for(let i=0;i<p.length;i+=6) assert.ok(Math.hypot(p[i]-p[i+3],p[i+1]-p[i+4],p[i+2]-p[i+5])<.5,'tail must not bridge an outlet to inlet');
    }
    scene.group.traverse(n=>{if(n.isInstancedMesh)n.dispose();n.geometry?.dispose();n.material?.dispose();});
  }
});
