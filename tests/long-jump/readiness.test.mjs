import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from '../../public/games/long-jump/vendor/three.module.min.js';
import {fresh,step,pose,BOARD,cameraCenter} from '../../public/games/long-jump/physics.mjs';
test('CPU projection keeps athlete and local ground in portrait, landscape and short desktop; board visible on approach',()=>{
 for(const [w,h] of [[360,380],[844,310],[1300,320],[1200,620]]){
  const camera=new THREE.OrthographicCamera(),aspect=w/h,hw=Math.max(5.6,aspect*4),hh=hw/aspect;
  Object.assign(camera,{left:-hw,right:hw,top:hh,bottom:-hh,near:.1,far:140});camera.updateProjectionMatrix();
  const s=fresh();let crouch=false,released=false,maxY=0;
  while(s.phase!=='done'){
   if(s.x>6.5)crouch=true;if(crouch&&s.crouch>.65)released=true;const a=Math.floor(s.t/.23)%2;
   step(s,released?[0,0,s.phase==='air',s.phase==='air']:crouch?[0,0,1,1]:[1-a,a,a,1-a]);
   const cx=cameraCenter(s.x);camera.position.set(cx,5.5,15);camera.lookAt(cx,1.3,0);camera.updateMatrixWorld();
   for(const p of [...Object.values(pose(s)),{x:s.x,y:0}]){const v=new THREE.Vector3(p.x,p.y+.32,.25).project(camera);assert.ok(Math.abs(v.x)<.94,`horizontal clip ${w}x${h}`);assert.ok(Math.abs(v.y)<.94,`vertical clip ${w}x${h}: ${v.y}`);maxY=Math.max(maxY,v.y);}
   if(s.phase==='run'&&s.x>5){const v=new THREE.Vector3(BOARD,0,0).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1,'approach board clipped');}
  }
  console.log(`Projection ${w}×${h}: athlete+ground+approach board PASS; top NDC ${maxY.toFixed(3)}`);
 }
});
test('v0.3 boosted trajectory, nearest mark and touchdown ground fit four viewports',()=>{
 for(const [w,h]of [[360,380],[844,310],[1300,320],[1200,620]]){
  const aspect=w/h,hw=Math.max(5.6,aspect*4),camera=new THREE.OrthographicCamera(-hw,hw,hw/aspect,-hw/aspect,.1,140);camera.updateProjectionMatrix();
  const s=fresh();let ct=null,at=null;
  while(s.phase!=='done'){
   if(s.x>=5.75&&ct===null)ct=s.t;const a=Math.floor(s.t/.3)%2;let input;
   if(at!==null){const t=s.t-at,b=Math.floor(t/.22)%2;input=t>.90?[0,0,1,1]:[1-b,b,b,1-b];}else input=ct!==null?(s.t-ct<.425?[0,0,1,1]:[0,0,0,0]):[1-a,a,a,1-a];
   const old=s.phase;step(s,input);if(old==='run'&&s.phase==='air')at=s.t;
   const cx=cameraCenter(s.x);camera.position.set(cx,5.5,15);camera.lookAt(cx,1.3,0);camera.updateMatrixWorld();
   const pts=[...Object.values(pose(s)),{x:s.x,y:0}];if(Number.isFinite(s.mark))pts.push({x:s.mark,y:0});
   for(const p of pts){const v=new THREE.Vector3(p.x,p.y+.32,.25).project(camera);assert.ok(Math.abs(v.x)<.94&&Math.abs(v.y)<.94,`boosted clip ${w}x${h}`);}
  }assert.equal(s.airBoosts,2);
 }
});
test('full flip, extended limbs and nearest landing line stay framed without zooming out',()=>{for(const [w,h]of [[360,310],[844,250],[1300,320],[1200,620]]){const aspect=w/h,hw=Math.max(5.6,aspect*4),camera=new THREE.OrthographicCamera(-hw,hw,hw/aspect,-hw/aspect,.1,140);camera.updateProjectionMatrix();const s=fresh();let ct=null,at=null,braking=false,finished=false;while(s.phase!=='done'){if(s.x>=5.25&&ct===null)ct=s.t;const a=Math.floor(s.t/.33)%2;let input;if(at!==null){if(s.airRotation>4.3)braking=true;if(braking&&s.spin<=.5)finished=true;input=finished?[0,0,1,1]:braking?[0,1,0,1]:[1,0,1,0];}else input=ct!==null?(s.t-ct<.425?[0,0,1,1]:[0,0,0,0]):[1-a,a,a,1-a];const old=s.phase;step(s,input);if(old==='run'&&s.phase==='air')at=s.t;const cx=cameraCenter(s.x);camera.position.set(cx,5.5,15);camera.lookAt(cx,1.3,0);camera.updateMatrixWorld();const pts=[...Object.values(pose(s)),{x:s.x,y:0}];if(Number.isFinite(s.mark))pts.push({x:s.mark,y:0});for(const p of pts)for(const margin of [-.32,.32]){const v=new THREE.Vector3(p.x,p.y+margin,.25).project(camera);assert.ok(Math.abs(v.x)<.94&&Math.abs(v.y)<.94,`flip clipping ${w}x${h}`);}}assert.equal(s.flips,1);}});
test('render wiring uses shared camera, extended sand and current km/h without deleted statistics',()=>{const source=fs.readFileSync(new URL('../../public/games/long-jump/game.mjs',import.meta.url),'utf8');for(const str of ['cameraCenter(state.x)','toKmh(state.vx)','toKmh(state.takeoffSpeed)','PIT_END-PIT','m.userData.restLength=len+2*r'])assert.ok(source.includes(str),str);});
