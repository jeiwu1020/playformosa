import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {sampleTimeline} from '../../public/games/fast-hands/three3d/timeline.mjs';
import {sampleForRun} from '../../public/games/fast-hands/three3d/game-motion.mjs';
import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';
import {TRACK,newRun,arm,move,release,snapshot,noteDropPx} from '../../public/games/fast-hands/shuttle.mjs';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';

const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
const near=(a,b,eps=1e-8)=>a.forEach((v,i)=>close(v,b[i],eps));
const run=(phase,x,dropPx=0,extra={})=>({phase,x,controlX:x,dropPx,startAt:0,pickupAt:phase==='returning'||phase==='success'?20:null,elapsedMs:0,...extra});
const withWorld=fn=>{const world=createDemoWorld(THREE);try{return fn(world);}finally{world.dispose();}};
const finiteTree=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);};
const vector=o=>new THREE.Vector3(...o);
function inspectAnatomy(result){
 for(const arm of result.anatomy.arms){
  close(vector(arm.shoulder).distanceTo(vector(arm.elbow)),.35);
  close(vector(arm.elbow).distanceTo(vector(arm.wrist)),.34);
  near(arm.upperScale,[1,1,1]);near(arm.lowerScale,[1,1,1]);
 }
 for(const attachment of result.contacts.attachments)if(attachment.attached)near(attachment.anchor,attachment.contact);
}

test('idle and armed keep the approved ready pose without consuming physics time',()=>{
 const original=sampleTimeline(0);
 for(const phase of ['idle','armed']){
  const state=Object.freeze(run(phase,.1,0,{startAt:null,elapsedMs:999999}));
  assert.deepEqual(sampleForRun(state),original);
 }
});

test('supplied live samples move the actual rig, while numeric demo sampling is unchanged',()=>withWorld(world=>{
 const live=sampleForRun(run('outbound',TRACK.far,141.5));
 const actual=world.update(live);
 near(actual.anatomy.arms[0].wrist,live.hand.wrist);
 close(world.objects.bill.position.y,1.193);
 const demonstration=world.update(2.5);
 assert.deepEqual(demonstration.hand,sampleTimeline(2.5).hand);
}));

test('outgoing motion follows the control gate, not elapsed time, and releases only the note',()=>{
 const a=sampleForRun(run('outbound',TRACK.home));
 const b=sampleForRun(run('outbound',TRACK.far));
 near(a.hand.wrist,[.18,1.21,.28]);
 assert.ok(b.hand.wrist[0]>a.hand.wrist[0]);assert.ok(b.hand.wrist[1]<a.hand.wrist[1]);
 assert.equal(a.bill.attached,false);assert.equal(b.duck.attached,false);
 assert.deepEqual(sampleForRun(run('outbound',.5,15,{elapsedMs:1})).hand,sampleForRun(run('outbound',.5,250,{elapsedMs:1700})).hand);
});

test('free note follows authoritative drop monotonically and touches the table at 283 px',()=>withWorld(world=>{
 let last=Infinity;
 for(let drop=0;drop<=283;drop++){
  const sample=sampleForRun(run('outbound',.5,drop));
  close(sample.bill.freePoint[1],1.332-.278*drop/283);
  assert.ok(sample.bill.freePoint[1]<=last);last=sample.bill.freePoint[1];
 }
 world.update(sampleForRun(run('failed',.5,283)));
 const paper=world.scene.getObjectByName('banknote-paper');
 close(new THREE.Box3().setFromObject(paper).min.y,.85,1e-8);
}));

test('far-gate attachment is continuous and the same right hand carries the duck on reversals',()=>withWorld(world=>{
 const before=world.update(sampleForRun(run('outbound',TRACK.far,100)));
 const duckBefore=world.objects.duck.position.toArray();
 const after=world.update(sampleForRun(run('returning',TRACK.far,100)));
 near(before.hand.wrist,after.hand.wrist);near(before.hand.quaternion,after.hand.quaternion);
 near(duckBefore,world.objects.duck.position.toArray());
 for(const x of [1,.95,.82,.65,.4,.6,.82,.3,.18]){
  const result=world.update(sampleForRun(run('returning',x,100)));
  assert.equal(result.activeHand,'right');assert.equal(result.duck.attached,true);assert.equal(result.bill.attached,false);
  inspectAnatomy(result);
 }
}));

test('catch targets the actual note height and has no jump into the approved finish',()=>withWorld(world=>{
 for(const drop of [0,50,150,282.999]){
  const before=world.update(sampleForRun(run('returning',TRACK.home,drop)));
  const noteBefore=world.objects.bill.position.toArray(),duckBefore=world.objects.duck.position.toArray();
  const after=world.update(sampleForRun(run('success',TRACK.home-.1,drop),0));
  near(before.hand.wrist,after.hand.wrist);near(before.hand.quaternion,after.hand.quaternion);
  near(before.restHand.wrist,after.restHand.wrist);
  near(noteBefore,world.objects.bill.position.toArray());near(duckBefore,world.objects.duck.position.toArray());
  assert.equal(after.bill.attached,true);assert.equal(after.duck.attached,true);
  inspectAnatomy(after);
 }
}));

test('finishing preserves the approved regrip and dual-hand finger-gun pose without changing score',()=>withWorld(world=>{
 const state=Object.freeze(run('success',.1,282.999,{elapsedMs:1722.6,catchAt:1722.6}));
 const original=structuredClone(state);
 let prior;
 for(let age=0;age<=4000;age+=10){
  const result=world.update(sampleForRun(state,age));inspectAnatomy(result);
  const paper=world.scene.getObjectByName('banknote-paper');
  assert.ok(new THREE.Box3().setFromObject(paper).min.y>=.85-1e-6,`paper below table at ${age}`);
  assert.ok(new THREE.Box3().setFromObject(world.objects.duck).min.y>=.85-1e-6,`duck below table at ${age}`);
  if(prior)assert.ok(vector(result.hand.wrist).distanceTo(vector(prior.hand.wrist))<.02);
  prior=result;
 }
 const end=sampleForRun(state,5000),approved=sampleTimeline(7);
 assert.deepEqual(end.hand,approved.hand);assert.deepEqual(end.restHand,approved.restHand);
 assert.equal(end.poseStage,'signature');assert.deepEqual(state,original);
 for(const contact of world.update(end).contacts.tableHands)close(contact.gap,0,1e-8);
}));

test('timeout and release freeze the last valid motion and do not replay a success',()=>{
 for(const pickupAt of [null,30]){
  const motion=pickupAt===null?'outbound':'returning';
  const active=sampleForRun(run(motion,.55,200,{pickupAt}));
  for(const phase of ['failed','cancelled']){
   const stopped=run(phase,.55,200,{pickupAt});
   assert.deepEqual(sampleForRun(stopped,0),sampleForRun(stopped,9000));
   assert.deepEqual(sampleForRun(stopped).hand,active.hand);
   assert.equal(sampleForRun(stopped).duck.attached,pickupAt!==null);
   assert.equal(sampleForRun(stopped).bill.attached,false);
  }
 }
 const armed=arm(newRun(),{x:.1,at:0,id:1});
 assert.deepEqual(sampleForRun(snapshot(release(armed,{at:100,id:1}),100)).hand,sampleTimeline(0).hand);
});

test('overshooting and malformed presentation values cannot create NaNs or unreachable bones',()=>withWorld(world=>{
 const values=[undefined,null,NaN,Infinity,-Infinity,-10,0,.18,.5,.82,1,10];
 for(const phase of ['idle','armed','outbound','returning','success','failed','cancelled','invalid'])for(const x of values){
  const sample=sampleForRun(run(phase,x,x,{elapsedMs:x,startAt:0,pickupAt:phase==='returning'?1:null}),x);
  finiteTree(sample);inspectAnatomy(world.update(sample));
 }
 for(const state of [null,undefined,{},42])finiteTree(sampleForRun(state));
 assert.deepEqual(sampleForRun(run('outbound',1.5)).hand,sampleForRun(run('outbound',.82)).hand);
 assert.deepEqual(sampleForRun(run('returning',-.5)).hand,sampleForRun(run('returning',.18)).hand);
}));

test('real shuttle snapshots preserve fast catches and the exact physical timeout',()=>withWorld(world=>{
 for(const duration of [.01,25,500,NOTE_FLOOR_MS-1e-5]){
  let s=arm(newRun(),{x:.1,at:0,id:1});
  s=move(s,{x:1,at:10,id:1});
  s=move(s,{x:.18,at:10+duration,id:1});
  assert.equal(s.phase,'success');
  const actual=snapshot(s,s.lastAt);
  close(actual.dropPx,noteDropPx(duration),1e-8);
  inspectAnatomy(world.update(sampleForRun(actual)));
  close(s.elapsedMs,duration,1e-8);
 }
 let waiting=arm(newRun(),{x:.1,at:0,id:1});waiting=move(waiting,{x:.5,at:10,id:1});
 const stopped=snapshot(waiting,10+NOTE_FLOOR_MS);
 assert.equal(stopped.phase,'failed');close(stopped.dropPx,283);
 close(world.update(sampleForRun(stopped)).bill.freePoint[1]-.204,.85);
 assert.equal(waiting.phase,'outbound');
}));

test('invalid control falls back to raw input and missing drop uses the original physical model',()=>{
 const raw=sampleForRun(run('outbound',.5,0,{controlX:NaN,dropPx:undefined,elapsedMs:700}));
 const explicit=sampleForRun(run('outbound',.5,noteDropPx(700),{elapsedMs:700}));
 assert.deepEqual(raw,explicit);
 close(sampleForRun(run('outbound',.5,Infinity,{elapsedMs:700})).bill.freePoint[1],explicit.bill.freePoint[1]);
 assert.equal(sampleForRun(run('outbound',.5,0,{elapsedMs:-100})).time,0);
});

test('actual hand and prop mesh vertices clear the table throughout every drop height',()=>withWorld(world=>{
 const point=new THREE.Vector3();
 const checkVertices=(object,context)=>object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
   assert.ok(point.y>=.85-1e-7,`${context}: ${mesh.name} vertex ${i} is below table at ${point.y}`);
  }
 });
 for(const drop of [0,70.75,141.5,212.25,283])for(const phase of ['outbound','returning','success'])for(let step=0;step<=32;step++){
  const result=world.update(sampleForRun(run(phase,.18+.64*step/32,drop),phase==='success'?step*4000/32:0));
  inspectAnatomy(result);
  const context=`${phase}, drop ${drop}, step ${step}`;
  for(const hand of world.actor.hands)checkVertices(hand.group,context);
  checkVertices(world.objects.bill,context);checkVertices(world.objects.duck,context);
 }
}));

test('reversing before pickup never attaches the duck or catches the note early',()=>withWorld(world=>{
 let state=arm(newRun(),{x:.1,at:0,id:1});
 for(const [at,x] of [[10,.6],[110,.12],[210,.7]]){
  state=move(state,{x,at,id:1});
  const model=snapshot(state,at),result=world.update(sampleForRun(model));
  assert.equal(state.phase,'outbound');assert.equal(state.pickupAt,null);
  assert.equal(result.bill.attached,false);assert.equal(result.duck.attached,false);
  near(world.objects.duck.position.toArray(),[.48,.90,.25]);inspectAnatomy(result);
  if(x<.18)near(result.hand.wrist,[.18,1.21,.28]);
 }
 for(const [at,x] of [[310,.95],[410,.6],[510,1]]){
  state=move(state,{x,at,id:1});
  const result=world.update(sampleForRun(snapshot(state,at)));
  assert.equal(state.phase,'returning');assert.equal(result.duck.attached,true);assert.equal(result.bill.attached,false);
  inspectAnatomy(result);
 }
 state=move(state,{x:.1,at:610,id:1});
 const frozen=snapshot(state,610),result=world.update(sampleForRun(frozen));
 assert.equal(state.phase,'success');assert.equal(result.duck.attached,true);assert.equal(result.bill.attached,true);
 close(world.objects.bill.position.y,1.332-.278*frozen.dropPx/283);
}));

test('successful hands reach the approved final pose in 700ms without changing the score',()=>{const state=Object.freeze(run('success',.1,200,{elapsedMs:900}));const end=sampleForRun(state,700),approved=sampleTimeline(7);assert.deepEqual(end.hand,approved.hand);assert.deepEqual(end.restHand,approved.restHand);assert.equal(end.poseStage,'signature');assert.equal(state.elapsedMs,900);});
