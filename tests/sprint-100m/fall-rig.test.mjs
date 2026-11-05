import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/sprint-100m/vendor/three.module.min.js';
import {createRace,input,step,chest} from '../../public/games/sprint-100m/race.mjs';
import {sprintPose} from '../../public/games/sprint-100m/pose3d.mjs';
import {createSprintScene,torsoFront} from '../../public/games/sprint-100m/render3d.mjs';
import {cameraPlan} from '../../public/games/sprint-100m/camera.mjs';

// Catches independently flattened head endpoints with an unrotated torso/neck.
function assertConnected(character,label){
 const body=character.group.getObjectByName('body'),head=character.group.getObjectByName('head');
 const crown=body.localToWorld(new THREE.Vector3(0,.98,0)),actual=head.getWorldPosition(new THREE.Vector3());
 assert.ok(crown.distanceTo(actual)<.025,`${label}: head detached from rigid neck by ${crown.distanceTo(actual).toFixed(3)}m`);
 const neck=character.group.getObjectByName('neck').getWorldPosition(new THREE.Vector3());
 assert.ok(neck.distanceTo(actual)<.31,`${label}: face and neck must overlap`);
}
function fallRace(){const race=createRace(2);race.phase='race';const r=race.runners[0];r.started=true;r.v=8;for(let i=0;i<8&&r.fall===0;i++){step(race,.05);step(race,.05);step(race,.05);input(race,0,2,true);input(race,0,2,false);}assert.ok(r.fall>0,'real repeated-leg input triggers the fall');return race;}

test('actual repeated-leg fall keeps head attached through recovery without mutating race',()=>{
 const race=fallRace(),world=createSprintScene();let samples=0;
 while(race.runners[0].fall>0){const before=JSON.stringify(race);world.update(race);assertConnected(world.characters[0],`fall=${race.runners[0].fall}`);assert.equal(JSON.stringify(race),before);assert.ok(Math.abs(torsoFront(world.characters[0])-chest(race.runners[0]))<1e-9);step(race,1/120);samples++;}
 world.update(race);assertConnected(world.characters[0],'recovered');assert.ok(samples>100);
});

test('all runners retain a rigid head and torso through fall phases and finish lean',()=>{
 const race=createRace(2),world=createSprintScene();race.phase='race';
 for(const fall of [1.15,.6,.32,.24,.16,.08,.001,0])for(const lean of [0,.5,1])for(const time of [0,.17,.43,.71]){
  race.time=time;for(const r of race.runners)Object.assign(r,{started:true,x:50,v:8,fall,lean,imbalance:.8});world.update(race);
  for(const c of world.characters)assertConnected(c,`runner ${c.group.name} fall ${fall}`);
 }
});

test('recovery reaches the normal running pose without a last-frame head snap',()=>{
 const r=createRace(2).runners[0];Object.assign(r,{started:true,x:30,v:4,lean:.7,fall:1e-7});
 const nearly=sprintPose(r,.4,'race');r.fall=0;const recovered=sprintPose(r,.4,'race');
 for(const name of Object.keys(nearly.points))assert.ok(Math.hypot(nearly.points[name].x-recovered.points[name].x,nearly.points[name].y-recovered.points[name].y)<.001,`${name} jumps on recovery`);
 assert.ok(Math.abs(nearly.state.lean-recovered.state.lean)<.001,'torso angle jumps on recovery');
});

test('fallen and recovering rigs stay in mobile and desktop camera frames',()=>{
 for(const [width,height] of [[390,500],[844,290],[1366,600]])for(const fall of [1.15,.32,.16,.001,0]){
  const race=createRace(2);race.phase='race';for(const r of race.runners)Object.assign(r,{started:true,x:50,v:4,fall});const world=createSprintScene();world.update(race);
  const v=cameraPlan(race,width,height),camera=new THREE.OrthographicCamera(-v.viewWidth/2,v.viewWidth/2,v.viewHeight/2,-v.viewHeight/2,.1,120);camera.position.set(v.targetX+v.offset.x,v.offset.y,v.targetZ+v.offset.z);camera.lookAt(v.targetX,v.targetY,v.targetZ);camera.updateMatrixWorld(true);
  for(const rig of world.characters){const b=rig.bounds();for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`${width}x${height} fall=${fall}`);}}
 }
});
