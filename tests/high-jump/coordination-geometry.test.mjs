import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../public/games/high-jump/physics.mjs';
import * as THREE from '../../public/games/high-jump/vendor/three.module.min.js';
import {createCharacter} from '../../public/games/high-jump/character.mjs';
import {launchAuto,clearanceTrace} from './helpers/coordination-trace.mjs';

test('actual character hands, feet and torso follow the collision skeleton through coordinated and failed flights',()=>{
 const c=createCharacter(THREE,new THREE.Scene());
 for(const options of [{},{legs:'early'},{hands:'none'},{hands:'one'}]){
  const trace=clearanceTrace(launchAuto({charge:.8}),options);
  for(let n=0;n<trace.history.length;n+=12){
   const s=trace.history[n],p=P.pose(s);c.update(p,{...s,lean:p.lean});
   for(let i=0;i<2;i++){
    for(const [mesh,joint]of [['hand-','hand'],['shoe-','foot']]){
     const actual=c.group.getObjectByName(mesh+i).position,expected=p[joint+i];
     assert.ok(Math.abs(actual.x-expected.x)<1e-10);assert.ok(Math.abs(actual.y-expected.y)<1e-10);
     assert.ok(Math.abs(actual.z-(expected.z+(i===0?.205:-.205)))<1e-10);
    }
    for(const [a,b,length]of [['hip','knee'+i,.55],['knee'+i,'foot'+i,.55],['shoulder','elbow'+i,.34],['elbow'+i,'hand'+i,.32]]){
     assert.ok(Math.abs(Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y,(p[a].z||0)-(p[b].z||0))-length)<1e-9,'limb length must stay anatomical');
    }
   }
   const axis=new THREE.Vector3(0,1,0).applyQuaternion(c.group.getObjectByName('body').quaternion);
   const expected=new THREE.Vector3(p.shoulder.x-p.hip.x,p.shoulder.y-p.hip.y,0).normalize();
   assert.ok(axis.distanceTo(expected)<1e-9,'visible torso must follow the actual arch');
  }
 }
});

test('coordinated body passes head then hips then feet and the successful feet clear the same visible bar',()=>{
 const trace=clearanceTrace(launchAuto({charge:.8}));assert.equal(trace.state.success,true);
 const crossed={};
 for(const s of trace.history){if(s.phase!=='air')continue;const p=P.pose(s);for(const name of ['head','hip','foot0','foot1'])if(crossed[name]===undefined&&p[name].x>=0)crossed[name]=s.air;
  assert.equal(P.barContact(s),null,'a successful body must never overlap the bar');
 }
 assert.ok(crossed.head<crossed.hip);assert.ok(crossed.hip<crossed.foot0);assert.ok(crossed.hip<crossed.foot1);
});

// Test rendered surfaces, not only their anatomical endpoints. Include the slightly
// larger painted stripe so a scored clear cannot clip either visible bar surface.
function meshBarIntersections(character,s){
 const p=P.pose(s);character.update(p,{...s,lean:p.lean});character.group.position.z=s.z;character.group.updateMatrixWorld(true);
 const h=P.visibleBarHeight(s),box=new THREE.Box3(new THREE.Vector3(-.042,h-.042,-1.375),new THREE.Vector3(.042,h+.042,1.375));
 const hits=[],triangle=new THREE.Triangle();
 character.group.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const bounds=new THREE.Box3().setFromObject(mesh);if(!bounds.intersectsBox(box))return;
  const pos=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:pos.count;
  for(let n=0;n<count;n+=3){
   for(let j=0;j<3;j++)triangle[['a','b','c'][j]].fromBufferAttribute(pos,index?index.getX(n+j):n+j).applyMatrix4(mesh.matrixWorld);
   if(box.intersectsTriangle(triangle)){hits.push(mesh.name);break;}
  }
 });return hits;
}

test('visible hip and clothing contact cannot be scored as a clear',()=>{
 const c=createCharacter(THREE,new THREE.Scene()),trace=clearanceTrace(launchAuto({charge:.8,cadence:.18,aim:-1.8}));
 const frame=trace.history.find(s=>s.air>=1.058333333333331),fixed={...frame,autoHeight:false,target:10.7};
 assert.ok(meshBarIntersections(c,fixed).includes('shorts'),'reproducer must intersect real shorts triangles');
 assert.ok(P.barContact(fixed),'visible shorts overlap must produce a physical contact');
 const early=clearanceTrace(launchAuto({charge:.6,cadence:.2,aim:-2.3}),{legs:'early'});
 const singlet={...early.history.find(s=>s.air>=.8874999999999981),autoHeight:false,target:6.3};
 assert.ok(meshBarIntersections(c,singlet).includes('singlet'),'reproducer must intersect real singlet triangles');
 assert.ok(P.barContact(singlet),'visible torso overlap must produce a physical contact');
});

test('successful coordinated flights have no rendered body or clothing intersection with the visible bar',()=>{
 const c=createCharacter(THREE,new THREE.Scene());
 for(const charge of [.4,.6,.65,.8])for(const cadence of [.16,.18,.2])for(const options of [{},{legs:'early'},{hands:'none'},{legs:'none'}]){
  const trace=clearanceTrace(launchAuto({charge,cadence,aim:-1.8}),options);if(!trace.state.success)continue;
  for(const s of trace.history){
   if(s.phase!=='air'||Math.abs(s.x)>1.6)continue;
   assert.deepEqual(meshBarIntersections(c,s),[],`charge=${charge}, cadence=${cadence}, t=${s.air}`);
  }
 }
});
