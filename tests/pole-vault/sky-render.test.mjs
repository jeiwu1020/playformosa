import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld} from '../../public/games/pole-vault/render.mjs';
import {fresh} from '../../public/games/pole-vault/physics.mjs';
import {sceneHost} from './helpers/scene-harness.mjs';
import * as THREE from '../../public/games/pole-vault/vendor/three.module.min.js';
const state=(h,t=80)=>Object.assign(fresh(),{phase:'air',x:18.5,y:h+1,altitude:h,maxHeight:h,barHeight:h,airTime:t,t,vy:30,rising:true});
const snapshot=w=>{const a=[];w.scene.updateMatrixWorld(true);w.scene.traverse(o=>{if(o.name.startsWith('sky-'))a.push({name:o.name,visible:o.visible,m:o.matrixWorld.toArray()});});return a;};
for(const [width,height] of [[1000,550],[390,600],[844,390]])test(`sky scene shows progressive geometry and preserves state at ${width}x${height}`,()=>{
 const env=sceneHost(width,height);try{const w=createWorld(env.host);for(const [h,id] of [[5000,'cloud-near'],[60000,'airglow'],[400000,'station'],[6000000,'probe'],[4e9,'comet'],[1e11,'boba'],[2e12,'pineapple'],[8e13,'market']]){
  const s=state(h),before=structuredClone(s);w.render(s);const g=w.scene.getObjectByName('sky-'+id);assert.ok(g?.visible,`${id} visibly fills this journey band`);assert.deepEqual(s,before);
 }
 const groups=snapshot(w);assert.ok(groups.length>=8);
 let total=0;w.scene.getObjectByName('sky-journey-root').traverse(o=>{if(o.isMesh)total++;});assert.ok(total<160,`fixed pool: ${total}`);
 for(let i=0;i<40;i++)w.render(state(10**(3+i*3.5)));
 let later=0;w.scene.getObjectByName('sky-journey-root').traverse(o=>{if(o.isMesh)later++;assert.ok([...o.position,...o.scale].every(Number.isFinite));});assert.equal(later,total);
 }finally{env.restore();}
});
test('sky capture, resize and historical frames restore the original composition',()=>{
 const env=sceneHost(390,600);try{const w=createWorld(env.host),s=state(6000000);w.render(s);const before=snapshot(w);assert.ok(before.length>0);
 w.render(state(1e13));w.render(s);assert.deepEqual(snapshot(w),before);
 w.capture(state(3e8));assert.deepEqual(snapshot(w),before);
 for(let i=0;i<3;i++)w.render(s);assert.deepEqual(snapshot(w),before);
 }finally{env.restore();}
});
test('portrait subjects fit inside their side lanes without cropped silhouettes',()=>{
 const env=sceneHost(390,600);try{const w=createWorld(env.host);for(const[h,id]of[[400000,'station'],[6000000,'probe'],[1e11,'boba'],[2e12,'pineapple'],[8e13,'market']]){
  w.render(state(h));const box=new THREE.Box3().setFromObject(w.scene.getObjectByName('sky-'+id)),points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(w.camera));
  assert.ok(points.every(p=>p.x>-.99&&p.x<.99&&p.y>-.85&&p.y<.85),`${id} stays inside the portrait viewport`);
 }
 }finally{env.restore();}
});
