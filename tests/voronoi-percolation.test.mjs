import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source = await readFile(new URL('../app/research-exhibits/voronoi-percolation.ts',import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {sampleSites,colorMarks,voronoiCells,crossing,percolationState}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
const area=poly=>Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-p[1]*q[0]},0))/2;

test('Voronoi cells partition the square and satisfy all nearest-site inequalities',()=>{
  for(const n of [2,32,64,160]) for(const seed of [0,224,123456,4294967295]) {
    const sites=sampleSites(n,seed),cells=voronoiCells(sites);
    near(cells.reduce((sum,c)=>sum+area(c.polygon),0),1);
    cells.forEach((cell,i)=>{
      assert.ok(area(cell.polygon)>0);
      for(const [x,y] of cell.polygon) {
        assert.ok(x>=-1e-9 && x<=1+1e-9 && y>=-1e-9 && y<=1+1e-9);
        const own=(x-cell.site[0])**2+(y-cell.site[1])**2;
        for(const site of sites) assert.ok(own<=(x-site[0])**2+(y-site[1])**2+1e-9);
      }
      for(const j of cell.neighbors) { assert.ok(j!==i);assert.ok(cells[j].neighbors.includes(i)); }
    });
    const all=crossing(cells,cells.map(()=>true));assert.equal(all.reached.size,n);assert.equal(all.crosses,true);
    assert.equal(crossing(cells,cells.map(()=>false)).crosses,false);
  }
});

test('positive-length adjacency excludes diagonal vertex contacts',()=>{
  const cells=voronoiCells([[.25,.25],[.75,.25],[.25,.75],[.75,.75]]);
  cells.forEach(c=>near(area(c.polygon),.25));
  assert.deepEqual(cells.map(c=>c.neighbors),[[1,2],[0,3],[0,3],[1,2]]);
  assert.equal(crossing(cells,[true,false,false,true]).crosses,false);
  assert.equal(crossing(cells,[true,true,false,false]).crosses,true);
  const vertical=voronoiCells([[.25,.5],[.75,.5]]);
  assert.deepEqual(vertical.map(c=>[c.left,c.right]),[[true,false],[false,true]]);
  const horizontal=voronoiCells([[.5,.25],[.5,.75]]);
  assert.ok(horizontal.every(c=>c.left&&c.right));
});

test('pivotal detection handles both opening a bridge and destroying a crossing',()=>{
  const cells=voronoiCells([[.15,.5],[.5,.5],[.85,.5]]);
  const closedBridge=percolationState(cells,[.1,.8,.2],.5);
  assert.equal(closedBridge.crosses,false);assert.deepEqual(closedBridge.pivotal,[1]);
  const openBridge=percolationState(cells,[.1,.8,.2],.9);
  assert.equal(openBridge.crosses,true);assert.deepEqual(openBridge.path,[0,1,2]);assert.deepEqual(openBridge.pivotal,[0,1,2]);
  assert.deepEqual(percolationState(cells,[.1,.8,.2],0).pivotal,[]);
  // Two disjoint crossing rows: no single color flip can destroy both.
  const twoRows=voronoiCells([[.25,.25],[.75,.25],[.25,.75],[.75,.75]]);
  assert.deepEqual(percolationState(twoRows,[.1,.2,.3,.4],1).pivotal,[]);
});

test('monotone coupling, deterministic seeds, path validity and square crossing duality',()=>{
  assert.deepEqual(sampleSites(64,224),sampleSites(64,224));
  assert.notDeepEqual(sampleSites(64,224),sampleSites(64,225));
  assert.deepEqual(colorMarks(64,2026),colorMarks(64,2026));
  assert.notDeepEqual(colorMarks(64,2026),colorMarks(64,2027));
  for(const seed of [0,1,224,2026]) {
    const sites=sampleSites(32,seed),cells=voronoiCells(sites),transposed=voronoiCells(sites.map(([x,y])=>[y,x])),marks=colorMarks(32,seed+77);
    let hasCrossed=false,previous=new Set();
    for(let i=0;i<=40;i++) {
      const result=percolationState(cells,marks,i/40);
      for(const old of previous) assert.ok(result.reached.has(old));previous=result.reached;
      if(hasCrossed) assert.ok(result.crosses);hasCrossed=result.crosses;
      assert.notEqual(result.crosses,crossing(transposed,result.open.map(v=>!v)).crosses,'open LR versus closed TB must be complementary');
      if(result.crosses) {
        assert.ok(cells[result.path[0]].left && cells[result.path.at(-1)].right);
        result.path.forEach((id,j)=>{assert.ok(result.open[id]);if(j)assert.ok(cells[id].neighbors.includes(result.path[j-1]));});
      }
    }
  }
});

test('nearby sites remain valid, bad inputs reject, and maximum budget is measured',()=>{
  const close=voronoiCells([[.5,.5],[.50000001,.5],[.2,.2],[.8,.8]]);
  near(close.reduce((sum,c)=>sum+area(c.polygon),0),1);
  assert.throws(()=>voronoiCells([[.5,.5],[.5,.5]]),RangeError);
  assert.throws(()=>voronoiCells([[2,0]]),RangeError);
  assert.throws(()=>sampleSites(161,2),RangeError);
  assert.throws(()=>sampleSites(32,-1),RangeError);
  const cells=voronoiCells(sampleSites(32,224));
  assert.throws(()=>percolationState(cells,colorMarks(32,2026),NaN),RangeError);
  assert.throws(()=>percolationState(cells,[0],.5),RangeError);
  const start=performance.now(),big=voronoiCells(sampleSites(160,224)),geometryMs=performance.now()-start;
  const colorsStart=performance.now();percolationState(big,colorMarks(160,2026),.5);
  console.log({maxPointCount:160,geometryMs,pivotalSearchMs:performance.now()-colorsStart});
});
