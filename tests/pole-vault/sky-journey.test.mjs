import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../../public/games/pole-vault/sky-journey.mjs').catch(()=>({}));
const scene=(altitude,more={})=>({phase:'air',altitude,maxHeight:altitude,t:80,airTime:75,...more});
const journey=s=>{assert.equal(typeof module.skyJourney,'function','height-driven sky journey exists');return module.skyJourney(s);};

test('high atmosphere fills the former 45–100 km gap with a visible subject and horizon',()=>{
 for(const h of [45000,60000,85000,100000]){const v=journey(scene(h));assert.ok(v.horizon>.3);assert.ok(v.items.some(x=>x.weight>.2));assert.equal(v.fantasy,0);}
});
test('height advances distinct orbital, lunar and deep-space subjects without imaginary real milestones',()=>{
 const ids=[200000,6000000,300000000,4000000000].map(h=>journey(scene(h)).main.id);
 assert.equal(new Set(ids).size,4);
 for(const h of [0,3000,60000,400000,384400000]){const j=journey(scene(h));assert.equal(j.fantasy,0);assert.ok(j.items.every(x=>!x.fantasy));}
 assert.ok(journey(scene(1e12)).fantasy>0);
});
test('finish uses its frozen altitude and selection never depends on elapsed time or history',()=>{
 const s=scene(60000),v=journey(s);assert.deepEqual(journey({...s,t:999,airTime:900}),v);
 assert.deepEqual(journey(scene(1e12,{phase:'finish',finishAltitude:60000})),v);
 assert.equal(s.altitude,60000);
});
test('all boundaries and extreme finite heights remain smooth, finite and bounded',()=>{
 for(const h of [0,1500,24000,45000,100000,180000,2e6,8e7,8e8,3e10,1e12,1e50,1e149]){
  const j=journey(scene(h));assert.ok(j.items.length<=2);assert.ok([j.clouds,j.horizon,j.moon,j.earth,j.fantasy].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  for(const x of j.items)assert.ok([x.weight,x.progress].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
 for(const h of [45000,100000,180000,2e6,8e7,8e8,3e10,1e12]){
  const a=journey(scene(h*.999999)),b=journey(scene(h*1.000001));
  for(const key of ['clouds','horizon','moon','earth','fantasy'])assert.ok(Math.abs(a[key]-b[key])<.0001,key);
 }
});
