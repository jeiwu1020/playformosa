import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene} from '../../public/games/reaction-rod/scene.mjs';
import {makeWorld} from '../../public/games/reaction-rod/physics.mjs';

function view(){const v=createScene();assert.equal(typeof v.captureVisual,'function','particle snapshot boundary exists');assert.equal(typeof v.restoreVisual,'function','particle restore boundary exists');return v;}
const pose=v=>[v.torso,...v.hands,...v.feet,...v.rods].map(x=>({position:x.position.toArray(),rotation:x.rotation.toArray(),scale:x.scale.toArray(),visible:x.visible}));

// Reference aliases or missing velocities would make restored particles drift or lose their original trajectory.
test('particle capture is detached and restore reproduces the exact visible state and subsequent motion',()=>{
 const a=view(),b=view(),world=makeWorld();a.burst({x:.3,handY:1.8});a.update(world,.1);const snapshot=a.captureVisual(),saved=structuredClone(snapshot);
 assert.equal(snapshot.effects.length,10);a.update(world,.08);assert.deepEqual(snapshot,saved);
 b.restoreVisual(snapshot);assert.deepEqual(b.captureVisual(),saved);a.restoreVisual(snapshot);a.update(world,.02);b.update(world,.02);assert.deepEqual(b.captureVisual(),a.captureVisual());
});

// Replay redraws at zero elapsed time must neither animate particles nor duplicate or leak scene objects.
test('repeated zero-time replay rendering freezes particles and reuses shared resources without growing the scene',()=>{
 const v=view(),world=makeWorld();v.update(world,0);const baseCount=v.scene.children.length;v.burst({x:.3,handY:1.8});v.update(world,.1);const snapshot=v.captureVisual();
 const originalParticles=v.scene.children.slice(baseCount),geometry=originalParticles[0].geometry,materials=new Set(originalParticles.map(x=>x.material));
 for(let i=0;i<100;i++){v.update(world,0,[.2,0]);v.restoreVisual(snapshot);assert.deepEqual(v.captureVisual(),snapshot);assert.equal(v.scene.children.length,baseCount+10);}
 for(const particle of v.scene.children.slice(baseCount)){assert.equal(particle.geometry,geometry);assert.ok(materials.has(particle.material));}
 assert.equal(v.hands[0].children[1].rotation.x,-.9);v.clear();assert.equal(v.captureVisual().effects.length,0);assert.equal(v.scene.children.length,baseCount);
});

// Particle restore must not replace the physical character pose or mutate recorded input data.
test('restoring particles preserves the rendered physical pose and snapshot data',()=>{
 const v=view(),world=makeWorld();world.body.phase='sitting';world.body.fallTime=.25;world.body.angle=.1;v.update(world,0,[0,.2]);const before=pose(v);
 const snapshot={effects:[{x:.2,y:1.9,z:.25,scale:.5,age:.2,vx:.1,vy:.3,color:2}]},original=structuredClone(snapshot);v.restoreVisual(snapshot);assert.deepEqual(pose(v),before);assert.deepEqual(snapshot,original);assert.deepEqual(v.captureVisual(),original);
});

// Malformed snapshots must not inject unbounded meshes, invalid coordinates or retained expired effects.
test('invalid and oversized visual snapshots fail safely and keep effect allocation bounded',()=>{
 const v=view(),world=makeWorld();v.update(world,0);const baseCount=v.scene.children.length;
 for(const snapshot of [null,{}, {effects:'bad'},{effects:[{x:NaN,y:1,z:.25,scale:1,age:0,vx:0,vy:0,color:0}]},{effects:[{x:0,y:1,z:.25,scale:1,age:1,vx:0,vy:0,color:0}]}]){assert.doesNotThrow(()=>v.restoreVisual(snapshot));assert.equal(v.scene.children.length,baseCount);}
 const effect={x:0,y:1,z:.25,scale:1,age:0,vx:0,vy:0,color:0};assert.doesNotThrow(()=>v.restoreVisual({effects:Array.from({length:10000},()=>({...effect}))}));assert.ok(v.scene.children.length-baseCount<=100,'bounded effect count even for invalid external data');
});

// Missing render fields or replay-driven simulation would disagree with the live poses and effects at recorded times.
test('all retained replay snapshots render the same real character pose, fists and particles as the live round',async()=>{
 const P=await import('../../public/games/reaction-rod/physics.mjs'),{createRoundReplay}=await import('../../public/games/reaction-rod/replay.mjs');
 const v=view(),world=P.makeWorld(31),replay=createRoundReplay({fps:30,maxFrames:100}),history=[],held=[0,0],expected=new Map();
 const fullPose=()=>{
  const nodes=[v.torso,...v.hands,...v.feet,...v.rods,...v.arms.flatMap(x=>[x.upper,x.lower,x.elbow]),...v.legs.flatMap(x=>[x.upper,x.lower,x.knee])];
  return{pose:nodes.map(x=>({position:x.position.toArray(),rotation:x.rotation.toArray(),scale:x.scale.toArray(),visible:x.visible})),fists:v.hands.map(h=>h.children.slice(1,5).map(f=>f.rotation.x)),visual:v.captureVisual()};
 };
 const capture=force=>{replay.record(world,{held,history,visual:v.captureVisual()},{force});expected.set(world.time,fullPose());};
 P.start(world);v.update(world,0,held);capture(true);
 for(let i=0;i<3000&&world.state!=='done';i++){
  P.aim(world,i<80?.63:(world.rod?.x??0),i<80?1.95:1.7);P.advance(world,1/60);const force=world.events.length>0;
  for(const e of world.events){if(e.type==='catch'){held[e.handIndex]=.24;v.burst(e);history.push('caught');}else if(e.type==='miss')history.push('missed');}
  world.events.length=0;for(let h=0;h<2;h++)held[h]=Math.max(0,held[h]-1/60);v.update(world,1/60,held);capture(force);
 }
 assert.equal(world.state,'done');assert.ok(world.body.falls>0);assert.ok(world.caught>0);const live=structuredClone(world);assert.equal(replay.finish(),true);assert.equal(replay.start(),true);
 let previous=null,checked=0;
 while(replay.active){const frame=replay.current;if(frame!==previous){v.update(frame.world,0,frame.presentation.held);v.restoreVisual(frame.presentation.visual);assert.deepEqual(fullPose(),expected.get(frame.world.time));previous=frame;checked++;}replay.advance(.001);}
 const last=replay.current;v.update(last.world,0,last.presentation.held);v.restoreVisual(last.presentation.visual);assert.deepEqual(fullPose(),expected.get(last.world.time));assert.deepEqual(world,live);assert.ok(checked>20);
});
