import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as s from '../public/games/sprint-100m/race.mjs';import * as f from '../public/games/run-400m/race.mjs';
import {profiles,simulate} from './rival-tiers/simulation.mjs';
import {BOARD_METRICS,resultToSubmission} from '../public/games/shared/leaderboard-metrics.mjs';
import {validateSubmission} from '../worker/leaderboard/index.mjs';
import {RECORD_KEY,LEGACY_KEY,saveRecord,readRecords} from '../public/games/sprint-100m/records.mjs';
const manifest=JSON.parse(readFileSync(new URL('../docs/sprint-rival-tiers/MANIFEST.json',import.meta.url)));
const parent=async path=>import('data:text/javascript;base64,'+Buffer.from(manifest.files.find(x=>x.path===path).beforeText).toString('base64'));
for(const [game,engine,path] of [['100m',s,'public/games/sprint-100m/race.mjs'],['400m',f,'public/games/run-400m/race.mjs']]){
 test(game+' exact player trajectory/finish remain unchanged across pace, start delay and control cases',async()=>{
  const old=await parent(path);
  for(const seed of [1,42,199])for(const profile of profiles[game])for(const reaction of [.15,.5]){
   const a=simulate(old,game,profile,seed,{traceEvery:1,reaction}),b=simulate(engine,game,profile,seed,{traceEvery:1,reaction});
   assert.equal(b.trace,a.trace,`${game}/${profile.name}/${seed}/${reaction}`);assert.deepEqual(b.player,a.player);
  }
  if(game==='400m'){const a=simulate(old,game,profiles[game][1],42,{traceEvery:1,steer:false}),b=simulate(engine,game,profiles[game][1],42,{traceEvery:1,steer:false});assert.ok(b.player.falls>0);assert.equal(a.trace,b.trace);}
 });
 test(game+' has distinct rival tiers and a learning player can compete without changed abilities',()=>{
  for(let seed=1;seed<=50;seed++){
   const r=simulate(engine,game,profiles[game][2],seed),[,strong,middle,weak]=r.times;
   assert.ok(Number.isFinite(strong)&&Number.isFinite(middle)&&Number.isFinite(weak));
   assert.ok(strong<middle&&middle<weak);assert.ok(r.rank===2||r.rank===3);
   for(const ai of r.race.runners.slice(1)){assert.ok((ai.ai?.mistakes??ai.aiErrors??0)<=1);assert.equal(ai.falls,0);}
  }
 });
 test(game+' all rivals finish within the original result cutoff for every measured player pace',()=>{
  for(const profile of profiles[game])for(let seed=1;seed<=200;seed++){
   const result=simulate(engine,game,profile,seed);
   assert.ok(result.times.every(Number.isFinite),`${game}/${profile.name}/${seed}: rival missed result cutoff`);
  }
 });
 test(game+' seeded races reproduce exactly and pause cannot advance any runner',()=>{
  const a=simulate(engine,game,profiles[game][1],123),b=simulate(engine,game,profiles[game][1],123);assert.deepEqual(a.player,b.player);assert.deepEqual(a.times,b.times);
  const r=engine.createRace(7);r.phase='race';r.paused=true;const before=JSON.stringify(r);engine.step(r,1/60);assert.equal(JSON.stringify(r),before);
 });
}
test('100m opponents no longer change tactics according to the player lead',()=>{
 const run=ahead=>{const r=s.createRace(12);r.phase='race';for(let i=0;i<10*120;i++){r.runners[0].x=ahead?r.runners[1].x+3:-100;s.step(r,1/120);}return r.runners.slice(1);};assert.deepEqual(run(true),run(false));
});
test('existing 100m local bests and legacy records are preserved under unchanged score semantics',()=>{
 assert.equal(RECORD_KEY,'pf-sprint-record-v4');const old=JSON.stringify({version:4,best:12,runs:2}),legacy=JSON.stringify({best:10}),map=new Map([[RECORD_KEY,old],[LEGACY_KEY,legacy]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const result=saveRecord(storage,13);assert.equal(result.best,12);assert.equal(result.runs,3);assert.equal(map.get(LEGACY_KEY),legacy);assert.equal(readRecords(storage).current.best,12);
});
test('400m record rules and QA backend stay compatible because score physics is identical',()=>{
 assert.equal(f.RULES_VERSION,'400m-prototype-v3');assert.equal(BOARD_METRICS['run-400m'].rules,f.RULES_VERSION);
 const round={phase:'done',finished:true,ruleset:f.RULES_VERSION,scoreSnapshot:{ruleset:f.RULES_VERSION,seconds:50}};
 assert.deepEqual(resultToSubmission('run-400m',round),{score:50,status:'done'});
 assert.doesNotThrow(()=>validateSubmission({game:'run-400m',rules:f.RULES_VERSION,unit:'s',status:'done',score:50,nickname:'玩家',deviceId:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002'},'qa'));
 assert.equal(f.addRecord([{event:'400m',rulesVersion:f.RULES_VERSION,valid:true,seconds:49}],{event:'400m',rulesVersion:f.RULES_VERSION,valid:true,seconds:50})[0].seconds,49);
});

test('100m rapid legal inputs still leave time for every rival to finish',()=>{for(let seed=1;seed<=2000;seed++){const result=simulate(s,'100m',{gap:.11},seed,{reaction:.05});assert.ok(result.times.every(Number.isFinite),'rapid player seed '+seed);}});
