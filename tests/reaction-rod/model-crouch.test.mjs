import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/reaction-rod/vendor/three.module.min.js';
import {createScene} from '../../public/games/reaction-rod/scene.mjs';
import {makeWorld} from '../../public/games/reaction-rod/physics.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('visible neck separates chin from singlet while standing palms remain fixed',()=>{
 const w=makeWorld(),v=createScene();v.update(w,0);v.scene.updateMatrixWorld(true);
 const shirt=new THREE.Box3().setFromObject(v.scene.getObjectByName('hero-singlet'));
 const face=new THREE.Box3().setFromObject(v.scene.getObjectByName('hero-face'));
 assert.ok(face.min.y-shirt.max.y>=.035,'at least 3.5 cm visible neck');
 for(let i=0;i<2;i++){near(v.hands[i].position.y,1.8);near(v.hands[i].position.x,w.hands[i].x);}
});
test('equal fixed-length thighs and calves replace the long-thigh silhouette',()=>{
 const v=createScene(),w=makeWorld();v.update(w,0);
 for(let i=0;i<2;i++)for(const part of ['thigh','calf']){
  const segment=v.scene.getObjectByName(`hero-${part}-${i}`);
  assert.ok(segment,`named ${part} segment`);near(segment.scale.y,.445);
 }
});
test('rendered limb endpoints match shared physical anchors throughout movement and recovery',async()=>{
 const {start,aim,advance,shoulder,legPose}=await import('../../public/games/reaction-rod/physics.mjs');const w=makeWorld(31),v=createScene();start(w);w.wait=100;
 for(let frame=0;frame<720;frame++){
  aim(w,Math.sin(frame/27)*.63,frame%180<100?1.2:1.95);advance(w,1/60);v.update(w,0);v.scene.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const h=w.hands[i],s=shoulder(w,h.side),leg=legPose(w,h.side);
   const endpoints=o=>[-.5,.5].map(y=>new THREE.Vector3(0,y,0).applyMatrix4(o.matrixWorld));
   const [a,elbow]=endpoints(v.arms[i].upper),[e,palm]=endpoints(v.arms[i].lower);
   for(const k of ['x','y','z']){near(a[k],s[k]);near(elbow[k],e[k]);near(palm[k],k==='z'?.20:h[k]);}
   near(a.distanceTo(elbow),.36);near(e.distanceTo(palm),.36);
   for(const [part,p,q]of [['upper',leg.hip,leg.knee],['lower',leg.knee,leg.ankle]]){
    const [a,b]=endpoints(v.legs[i][part]);for(const k of ['x','y','z']){near(a[k],p[k]);near(b[k],q[k]);}near(a.distanceTo(b),.445);
   }
   near(v.feet[i].position.x,leg.ankle.x);near(v.hands[i].position.y,h.y);
  }
 }
});
test('shoulder and knee joint geometry prevents detached limb appearance',()=>{const v=createScene(),w=makeWorld();v.update(w,0);v.scene.updateMatrixWorld(true);for(let i=0;i<2;i++){const joint=v.scene.getObjectByName('hero-shoulder-'+i);assert.ok(joint,'visible shoulder bridge');const shirt=new THREE.Box3().setFromObject(v.scene.getObjectByName('hero-singlet'));assert.ok(shirt.intersectsBox(new THREE.Box3().setFromObject(joint)));assert.ok(v.scene.getObjectByName('hero-knee-'+i));assert.ok(v.scene.getObjectByName('hero-elbow-'+i));}});
