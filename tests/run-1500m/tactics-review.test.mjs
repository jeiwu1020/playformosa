import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../../public/games/run-1500m/race.mjs';
import {cameraFor,drawMinimap} from '../../public/games/run-1500m/render.mjs';
import * as THREE from '../../public/games/run-1500m/vendor/three.module.min.js';

const tap=(r,key,id=0)=>{e.input(r,key,true,id);e.input(r,key,false,id)};
const ready=()=>{const r=e.createRace();e.startRace(r);e.step(r,3.5);return r};
const signedArea=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y},0)/2;

test('the world oval runs counterclockwise when viewed from above',()=>{
  const points=Array.from({length:400},(_,s)=>{const p=e.trackPoint(s);return{x:p.x,y:p.z}});
  assert.ok(signedArea(points)<-9000,'the actual world geometry must turn left, not just mirror the minimap');
});

test('track tangents and outer-lane normals stay consistent around the entire oval',()=>{
  for(let s=.25;s<400;s+=.5){
    const p=e.trackPoint(s),q=e.trackPoint(s+.001),outer=e.trackPoint(s,1);
    const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
    assert.ok((dx*p.tx+dz*p.tz)/d>.99999,`forward tangent at ${s}`);
    assert.ok(Math.abs(Math.hypot(outer.x-p.x,outer.z-p.z)-1.45)<1e-8,`lane width at ${s}`);
    assert.ok(Math.abs(p.nx*p.tx+p.nz*p.tz)<1e-8,`orthogonal normal at ${s}`);
    assert.ok(p.tx*(outer.z-p.z)-p.tz*(outer.x-p.x)>1.4,`outer lane is to the runner's right at ${s}`);
  }
});

test('the rear camera places the inner lane on the left and outer lane on the right',()=>{
  const r=e.createRace();
  for(const distance of [0,50,100,150,200,250,300,350]){
    r.runners[0].s=distance;r.runners[0].lane=1;
    const camera=cameraFor(r,1100,620),inner=e.trackPoint(100+distance,0),outer=e.trackPoint(100+distance,2);
    const a=new THREE.Vector3(inner.x,.1,inner.z).project(camera),b=new THREE.Vector3(outer.x,.1,outer.z).project(camera);
    assert.ok(a.x<b.x,`J inward must move left at distance ${distance}`);
  }
});

test('minimap runner positions travel counterclockwise using the same world route',()=>{
  // Record the real renderer's player marker commands; canvas rasterization is not under test.
  const arcs=[],ctx={clearRect(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillRect(){},strokeRect(){},fillText(){},arc(x,y,r){if(r===8)arcs.push({x,y})}};
  const canvas={width:320,height:160,getContext:()=>ctx},r=e.createRace();
  for(let distance=0;distance<400;distance+=2){r.runners[0].s=distance;drawMinimap(canvas,r)}
  assert.equal(arcs.length,200,'one player marker per frame');
  assert.ok(signedArea(arcs)<-1000,'screen-space player trajectory must be counterclockwise');
});

test('tactical effort consumes a useful reserve without stretching normal race duration',()=>{
  const r=ready(),p=r.runners[0];r.supplies=[];p.lane=p.targetLane=0;
  for(const q of r.runners.slice(1))q.finished=1;
  let next=0,n=0;
  for(let i=0;i<150*120&&p.finished===null;i++){
    if(r.time>=next){tap(r,n++%2?'s':'a');next=r.time+.43}
    e.step(r,1/120);
  }
  assert.ok(p.finished>=120&&p.finished<=150,`comfortable 1500m finish: ${p.finished}`);
  assert.ok(p.energy>=10&&p.energy<=65,`cruising without supplies should leave a meaningful but usable reserve: ${p.energy}`);
  const result=e.resultOf(r);
  assert.equal(result.timeBasis,'actual-game-seconds');
  assert.equal(result.arcadeScale,1.9);
  assert.equal(result.elapsed,Math.round(p.finishRaceTime*1000)/1000);
});

test('ten seconds of active drafting saves meaningful energy at cruising cadence',()=>{
  const run=drafting=>{
    const r=ready(),p=r.runners[0],leader=r.runners[1];r.supplies=[];
    p.energy=60;p.lane=p.targetLane=0;
    leader.aiNext=leader.aiLook=Infinity;leader.lane=leader.targetLane=drafting?0:1;
    for(const q of r.runners.slice(2))q.finished=1;
    let next=0,n=0;
    for(let i=0;i<10*120;i++){
      leader.s=p.s+2;leader.v=14;
      if(r.time>=next){tap(r,n++%2?'s':'a');next=r.time+.43}
      e.step(r,1/120);
    }
    return p;
  };
  const alone=run(false),drafting=run(true);
  assert.ok(drafting.slipSeconds>8,`active wake seconds ${drafting.slipSeconds}`);
  assert.ok(drafting.energy-alone.energy>=1,`energy saved in 10s: ${drafting.energy-alone.energy}`);
});

test('identical inputs reproduce AI strategy and final results exactly',()=>{
  const run=()=>{
    const r=ready();let next=0,n=0;
    for(let i=0;i<35*120;i++){
      if(r.time>=next){tap(r,n++%2?'s':'a');next=r.time+.43}
      e.step(r,1/120);
    }
    return r;
  };
  assert.deepEqual(run(),run());
});

test('a cruising AI can pass a clearly slower leader after its actual speed has been collision-capped',()=>{
  const r=ready(),leader=r.runners[0],follower=r.runners[2];r.time=10;r.supplies=[];
  for(const p of [leader,follower]){
    p.started=true;p.lane=p.targetLane=0;p.v=8;p.energy=70;p.lastStep=r.time;p.lastLeg=0;
  }
  leader.s=502;leader.cadence=.70;follower.s=501.02;follower.cadence=.38;follower.aiLook=follower.aiNext=0;
  for(const p of [r.runners[1],r.runners[3]])p.finished=1;
  let next=r.time,n=0;
  for(let i=0;i<12*120;i++){
    if(r.time>=next){tap(r,n++%2?'a':'s');next=r.time+.70}
    e.step(r,1/120);
  }
  assert.ok(follower.laneChanges>=1,'a clear outer lane should be used rather than remaining trapped at the leader speed');
  assert.ok(follower.s>leader.s+1,`the faster AI should complete the legal pass: follower ${follower.s}, leader ${leader.s}`);
});

test('an AI waits for clear space before returning to the inside lane',()=>{
  const r=ready(),leader=r.runners[0],follower=r.runners[2];r.time=10;r.supplies=[];
  leader.s=503;leader.lane=leader.targetLane=0;
  follower.s=500;follower.lane=follower.targetLane=1;follower.aiLook=0;follower.aiNext=Infinity;
  for(const p of [r.runners[1],r.runners[3]])p.finished=1;
  e.step(r,1/120);
  assert.equal(follower.targetLane,1,'a 3m gap must not permit a surprise cut-in');
  leader.s=505;follower.aiLook=0;e.step(r,1/120);
  assert.equal(follower.targetLane,0,'the shorter line becomes available once the other runner is clearly separated');
});

test('AI planned cadence never changes solely because the player is far ahead or behind',()=>{
  const run=playerDistance=>{
    const r=ready();r.time=10;r.runners[0].s=playerDistance;
    const p=r.runners[2];p.s=800;p.energy=60;p.slip=0;
    return e.aiPlan(r,p);
  };
  assert.deepEqual(run(0),run(1490));
});
