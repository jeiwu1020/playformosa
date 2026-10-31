import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../public/games/long-jump/replay.mjs').catch(()=>({}));
const sample=(t,phase='air')=>({t,phase,origin:9000000,x:2,j:[t,0],wind:{push:1},firstMark:phase==='air'?Infinity:9000002});
test('bounded recorder retains five seconds before exact first contact and full settling tail',()=>{
 assert.equal(typeof api.createLandingReplay,'function');
 const r=api.createLandingReplay();
 for(let i=0;i<=120*600;i++)r.record(sample(i/120));
 assert.ok(r.size<=602);r.record(sample(600.01,'land'));
 for(let i=1;i<=121;i++)r.record(sample(600.01+i/120,i===121?'done':'land'));
 assert.ok(r.size<=740);assert.equal(r.contactTime,600.01);assert.ok(r.firstTime>=595);assert.ok(r.firstTime<=595.02);
 assert.equal(r.ready,true);assert.equal(r.start(),true);assert.equal(r.current.state.origin,9000000);assert.equal(r.current.state.x,2);
 r.advance(100);assert.equal(r.active,false);assert.equal(r.current.state.phase,'done');
});
test('recorded snapshots and result remain independent; replay pause close and repeat never rewrite them',()=>{
 const r=api.createLandingReplay(),s=sample(0);r.record(s);s.j[0]=99;r.record(sample(1,'land'));const end=sample(2,'done');r.record(end);
 r.start();assert.equal(r.current.state.j[0],0);r.setPaused(true);r.advance(20);assert.equal(r.time,0);r.setPaused(false);r.advance(.2);assert.equal(r.time,.2);
 r.stop();assert.equal(r.active,false);r.start();assert.equal(r.time,0);assert.deepEqual(end,sample(2,'done'));r.reset();assert.equal(r.ready,false);assert.equal(r.size,0);
});
test('clock is normal until contact neighborhood, then 0.45x and returns to normal',()=>{
 const r=api.createLandingReplay();for(let i=0;i<=600;i++)r.record(sample(i/120));r.record(sample(5.01,'land'));r.record(sample(6.1,'done'));r.start();
 r.advance(4-r.time);assert.equal(r.time,4);r.advance(.81);assert.ok(Math.abs(r.time-4.81)<1e-9);r.advance(.2);assert.ok(Math.abs(r.time-4.90)<1e-9);
 r.setPaused(true);const t=r.time;r.advance(9);assert.equal(r.time,t);r.setPaused(false);r.advance(20);assert.equal(r.active,false);
});
test('tail has an absolute memory bound and cannot overwrite first contact',()=>{
 const r=api.createLandingReplay();r.record(sample(0));r.record(sample(1,'land'));for(let i=0;i<10000;i++)r.record(sample(1+i/120,'land'));r.record(sample(100,'done'));
 assert.ok(r.size<=1000);assert.equal(r.contactTime,1);r.start();r.advance(1);assert.ok(r.current.state.t<=1);assert.equal(r.ready,true);
});

import {trial} from './v8-scenarios.mjs';
import {result} from '../../public/games/long-jump/physics.mjs';
import * as THREE from '../../public/games/long-jump/vendor/three.module.min.js';
test('real long flight and settling replay preserve physics result, first contact and rebased local coordinates',()=>{
 const r=api.createLandingReplay();let first=null;
 const final=trial({flightSeconds:309.175,maxSeconds:330,onStep:s=>{r.record(s);if(first===null&&s.phase==='land')first=structuredClone(s);}});
 assert.equal(final.phase,'done');assert.ok(final.rebaseCount>0);assert.ok(r.size<800);assert.equal(r.contactTime,first.t);
 const frozen=structuredClone(final),score=structuredClone(result(final));r.start();
 r.advance(Math.max(0,r.contactTime-.2-r.firstTime)+(r.contactTime-Math.max(r.firstTime,r.contactTime-.2))/.45);
 assert.deepEqual(r.current.state,first);assert.ok(Math.abs(r.current.state.x)<=512);r.advance(100);assert.deepEqual(r.current.state,frozen);assert.deepEqual(result(final),score);assert.deepEqual(final,frozen);
});
test('visual snapshots restore transforms and visibility with no mesh or live-array ownership',()=>{
 const object=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({opacity:.4}));object.position.set(2,3,4);object.scale.setScalar(.5);object.userData.kind='head';
 const view=api.captureReplayObjects([object]);object.position.set(20,30,40);object.visible=false;object.userData.kind='body';api.restoreReplayObjects([object],view);
 assert.deepEqual(object.position.toArray(),[2,3,4]);assert.equal(object.visible,true);assert.equal(object.userData.kind,'head');object.position.x=99;assert.equal(view[0].position[0],2);object.geometry.dispose();object.material.dispose();
});
