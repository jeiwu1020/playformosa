import test from 'node:test';import assert from 'node:assert/strict';import * as api from '../../public/games/high-jump/physics.mjs';
const {createRound,advance,pose}=api;
const sim=(s,t)=>advance(s,t);
test('engine exists',()=>assert.equal(typeof createRound,'function'));
test('countdown and pause do not consume game time',()=>{const s=createRound();s.paused=true;sim(s,4);assert.equal(s.t,0);s.paused=false;sim(s,3);assert.equal(s.phase,'run');});
test('bar contact is geometric, not a hidden timing grade',()=>{const s=createRound(2);s.phase='air';s.y=2;s.x=0;s.air=0;s.apexTime=1;assert.equal(api.touchesBar(s),true);s.x=4;assert.equal(api.touchesBar(s),false)});
test('head and shoe silhouettes grazing bar collide',()=>{const s=createRound(2);const p={};for(const k of['head','shoulder','hip','knee0','knee1','foot0','foot1','elbow0','elbow1','hand0','hand1'])p[k]={x:5,y:5};p.head={x:.31,y:2};assert.equal(api.touchesBar(s,p),true);p.head={x:5,y:5};p.foot0={x:.19,y:2};assert.equal(api.touchesBar(s,p),true);});
