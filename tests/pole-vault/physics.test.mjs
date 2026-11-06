import {corrected} from './helpers/motion-strategy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const P = await import('../../public/games/pole-vault/physics.mjs').catch(() => ({}));
function api() { assert.equal(typeof P.fresh, 'function', 'pole-vault simulation is implemented'); }
const NONE=[false,false,false,false];
function run(strategy, limit=45) {
  const s=P.fresh(), trace=[];
  for(let i=0;i<limit/P.DT && s.phase!=='done';i++) {
    P.step(s,strategy(s,i),P.DT);
    for(const event of s.events) trace.push({event,t:s.t,height:s.maxHeight});
    assert.ok(Number.isFinite(s.y)&&Number.isFinite(s.lean));
    for(const k of ['energy','charge','grip','plantQuality','releaseQuality','progress']) assert.ok(s[k]>=0&&s[k]<=1, `${k} stays normalized`);
  }
  return {s,trace};
}
function runway(s) {
  const beat=Math.floor(s.t/.28), active=s.t% .28<.10;
  return [true,true,active&&beat%2===0,active&&beat%2===1];
}
function skill(s) {
  if(s.phase==='run')return runway(s);
  if(s.phase==='plant')return s.charge<.82?[true,true,false,false]:NONE;
  if(s.phase==='air') {return corrected(s);}
  return NONE;
}
function launchAt(charge=.82) {
  const s=P.fresh();
  for(let i=0;i<1500 && s.phase!=='air' && s.phase!=='done';i++)
    P.step(s,s.phase==='run'?runway(s):s.charge<charge?[true,true,false,false]:NONE,P.DT);
  return s;
}

test('inactive attempt ends without phantom height or launch',()=>{
  api();const {s,trace}=run(()=>NONE,20);
  assert.equal(s.phase,'done');assert.ok(s.t<=20);assert.equal(s.maxHeight,0);
  assert.ok(!trace.some(e=>e.event==='jump'));assert.ok(s.reason);
});
test('holding every key cannot replace alternating steps or run forever',()=>{
  api();const {s}=run(()=>[true,true,true,true],35);
  assert.equal(s.phase,'done');assert.ok(s.t<=35);assert.ok(s.maxHeight<10);
});
test('steady grip plants when tip enters box before body reaches visible zone',()=>{
  api();const s=P.fresh();let stepped=0;
  while(s.phase==='run'&&s.t<10){P.step(s,runway(s),P.DT);if(s.events.includes('step'))stepped++;if(s.x+4.25<P.PLANT_X+.25)assert.equal(s.phase,'run');}
  assert.equal(s.phase,'plant');assert.ok(s.x<P.PLANT_X-P.PLANT_WINDOW/2);assert.ok(Math.abs(s.x+4.25-(P.PLANT_X+.25))<1e-9);
  assert.ok(stepped>8);assert.ok(s.plantQuality>.75);assert.ok(s.grip>.8);
});
test('green release launches better than an early release',()=>{
  api();const good=launchAt(.82),early=launchAt(.15);
  assert.equal(good.phase,'air');assert.equal(early.phase,'air');
  assert.ok(good.releaseQuality>.9);assert.ok(good.vy>early.vy*1.5);
  assert.ok(good.events.includes('jump'));assert.ok(good.events.includes('flight'));
});
test('overholding the pole ends safely instead of automatically launching',()=>{
  api();const {s,trace}=run(s=>s.phase==='run'?runway(s):[true,true,false,false],20);
  assert.equal(s.phase,'done');assert.ok(!trace.some(e=>e.event==='jump'));assert.ok(s.reason);
});
test('pause cancellation does not synthesize a release launch',()=>{
  api();const s=P.fresh();while(s.phase==='run')P.step(s,runway(s),P.DT);
  while(s.charge<.8)P.step(s,[true,true,false,false],P.DT);
  P.cancelMotion(s);P.step(s,NONE,P.DT);
  assert.notEqual(s.phase,'air');assert.ok(!s.events.includes('jump'));
  for(let i=0;i<30;i++)P.step(s,NONE,P.DT);
  assert.notEqual(s.phase,'air');
});
test('a launch with no further input returns promptly from the air',()=>{
  api();const {s}=run(s=>s.phase==='run'?runway(s):s.phase==='plant'&&s.charge<.82?[true,true,false,false]:NONE,25);
  assert.equal(s.phase,'done');assert.ok(s.maxHeight>1&&s.maxHeight<10);assert.ok(s.t<25);
});
test('coordinated limb movement clears the expanded skyline while spam cannot',()=>{
  api();const good=run(skill,105);
  const spam=run((s,i)=>s.phase==='run'?runway(s):s.phase==='plant'?(s.charge<.82?[true,true,false,false]:NONE):[s.lean>.06,s.lean<-.06,i%8<2,i%8>=4&&i%8<6],45);
  assert.equal(good.s.phase,'air');assert.equal(good.s.falling,false);assert.ok(good.s.maxHeight>=829.8,`skilled height ${good.s.maxHeight}`);
  assert.ok(good.s.t>=104);assert.equal(spam.s.phase,'done');assert.ok(good.s.maxHeight>spam.s.maxHeight*100);
  assert.ok(good.trace.some(e=>e.event==='milestone'));assert.ok(!good.trace.some(e=>e.event==='land'));
  console.log('Strategy results:',JSON.stringify({skill:{height:good.s.maxHeight,time:good.s.t},spam:{height:spam.s.maxHeight,time:spam.s.t}}));
});
test('four independently controlled limbs preserve the original endpoint rig',()=>{
  api();const s=launchAt();const initial=P.pose(s);
  for(let i=0;i<24;i++)P.step(s,[true,false,true,false],P.DT);
  const p=P.pose(s);
  assert.notDeepEqual(initial.elbow0,p.elbow0);assert.notDeepEqual(initial.knee0,p.knee0);
  const lengths=[['shoulder','elbow0',.34],['elbow0','hand0',.32],['hip','knee0',.55],['knee0','foot0',.55],['shoulder','elbow1',.34],['elbow1','hand1',.32],['hip','knee1',.55],['knee1','foot1',.55]];
  for(const [a,b,length]of lengths){assert.ok(p[a]&&p[b]);assert.ok(Math.abs(Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y,(p[a].z||0)-(p[b].z||0))-length)<1e-8);}
});
test('the recorded height measures feet, not the head, and survives landing',()=>{
  api();const s=launchAt();let best=0;
  while(s.phase!=='done'&&s.t<30){P.step(s,NONE,P.DT);const p=P.pose(s);if(!s.scoreLocked||s.events.includes('score-lock'))best=Math.max(best,Math.min(p.foot0.y,p.foot1.y)-.08);assert.ok(s.maxHeight>=0);}
  assert.equal(s.phase,'done');assert.ok(Math.abs(s.maxHeight-best)<.02);
  const before=s.maxHeight;P.step(s,[true,true,true,true],P.DT);assert.equal(s.maxHeight,before);
});
test('simulation is deterministic and result labels handle astronomical height',()=>{
  api();const a=run(skill).s,b=run(skill).s;assert.deepEqual(a,b);
  const result=P.verdict(a);for(const key of ['title','subtitle','detail','badge'])assert.equal(typeof result[key],'string');
  assert.match(P.formatHeight(12.34),/m/);assert.match(P.formatHeight(123400),/km/);
  assert.ok(!P.formatHeight(NaN).includes('NaN'));
});

test('zero-height verdict diagnoses no run, slow run, missed plant, and overhold separately',()=>{
  api();
  const norun=run(()=>NONE).s;
  const slow=run(s=>[true,true,s.t%1<.10,false]).s;
  const missed=run(s=>{const keys=runway(s);keys[0]=false;keys[1]=false;return keys;}).s;
  const overheld=run(s=>s.phase==='run'?runway(s):[true,true,false,false]).s;
  const results=[norun,slow,missed,overheld].map(s=>{assert.equal(s.maxHeight,0);assert.equal(s.phase,'done');return P.verdict(s);});
  assert.equal(new Set(results.map(v=>v.title)).size,4,'each recoverable mistake deserves its own diagnosis');
  assert.match(results[0].subtitle,/A.*S/);
  assert.match(results[1].subtitle,/交替|輪流|節奏/);
  assert.match(results[2].subtitle,/J.*K/);
  assert.match(results[3].subtitle,/放開|放手/);
});
