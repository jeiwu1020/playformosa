import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../public/games/high-jump/physics.mjs';
import {launchAuto,clearanceTrace} from './helpers/coordination-trace.mjs';

test('releasing both hands after the arch does not unwind earned body rotation',()=>{
 const s=launchAuto({charge:.65});for(const k of P.KEYS)P.setLimb(s,k,true);
 P.advance(s,s.apexTime-s.air);const before=P.pose(s).lean;
 P.setLimb(s,'J',false);P.setLimb(s,'K',false);P.advance(s,.15);
 assert.ok(P.pose(s).lean>=before-.06,`earned turn unwound ${before-P.pose(s).lean} rad`);
});

test('marginal takeoff rewards hands leading and legs after the hips over all-held input',()=>{
 const initial=launchAuto({charge:.7});
 const good=clearanceTrace(initial),early=clearanceTrace(initial,{legs:'early'}),noHands=clearanceTrace(initial,{hands:'none'});
 assert.equal(good.state.success,true,'the reference sequence remains reachable');
 assert.equal(early.state.success,false,'early full tuck must not be a universal best pose');
 assert.equal(noHands.state.success,false,'hands must improve a genuinely marginal clearance');
 assert.deepEqual(early.trajectory,good.trajectory);assert.deepEqual(noHands.trajectory,good.trajectory);
 assert.equal(early.state.target,good.state.target);assert.equal(noHands.state.target,good.state.target);
});

test('forgiving clearance does not require any hand press',()=>{
 const initial=launchAuto({charge:.4}),result=clearanceTrace(initial,{hands:'none',legs:'early'});
 assert.equal(result.state.success,true);assert.ok(result.state.height>0);
});

test('coordinated range stays reachable while no-hands, early tuck and no-legs are not universal solutions',()=>{
 const totals={coordinated:0,early:0,noHands:0,noLegs:0};let count=0;
 for(const charge of [.4,.6,.8])for(const cadence of [.16,.18,.2])for(const aim of [-2.3,-1.8,-1.3]){
  const initial=launchAuto({charge,cadence,aim});count++;
  const good=clearanceTrace(initial);totals.coordinated+=Number(good.state.success);
  for(const [mode,options]of [['early',{legs:'early'}],['noHands',{hands:'none'}],['noLegs',{legs:'none'}]]){
   const other=clearanceTrace(initial,options);totals[mode]+=Number(other.state.success);
   assert.deepEqual(other.trajectory,good.trajectory,'airborne inputs must not add lift or horizontal power');
   assert.equal(other.state.target,good.state.target,'bar may not adapt to actual player mistakes');
  }
 }
 assert.equal(totals.coordinated,count);
 for(const mode of ['early','noHands','noLegs'])assert.ok(totals[mode]>0&&totals[mode]<count,`${mode}: ${totals[mode]}/${count}`);
});

test('late hands and never tucking cause real contact at a marginal clearance',()=>{
 const initial=launchAuto({charge:.7});
 for(const options of [{hands:'late'},{legs:'none'},{hands:'one'}]){
  const r=clearanceTrace(initial,options);assert.equal(r.state.success,false);assert.ok(r.state.hitPart,'failure must be an actual body contact');
  const first=r.history.find(s=>s.hit);assert.equal(P.barContact(first),first.hitPart);
 }
});

test('fixed lower bars remain clearable without hands and planBar does not mutate live state',()=>{
 const initial=launchAuto({charge:.8,target:8}),before=JSON.stringify(initial);
 const plan=P.planBar(initial);assert.ok(Number.isFinite(plan.height));assert.equal(JSON.stringify(initial),before);
 assert.equal(clearanceTrace(initial,{hands:'none',legs:'early'}).state.success,true);
});

test('hand transitions remain continuous and replay snapshots retain earned rotation',()=>{
 const initial=launchAuto({charge:.8}),s=P.snapshot(initial),frozen=[];let previous=P.pose(s);
 for(let n=0;n<900&&s.phase==='air';n++){
  const raised=n%80<40;P.setLimb(s,'J',raised);P.setLimb(s,'K',raised);
  P.setLimb(s,'A',n%120<60);P.setLimb(s,'S',n%120<60);P.advance(s,1/240);
  const p=P.pose(s);if(s.phase==='air'){
   assert.ok(Math.abs(p.lean-previous.lean)<.08,'no frame-sized body snap');
   for(const name of ['head','hip','hand0','hand1','foot0','foot1'])assert.ok(Math.hypot(p[name].x-previous[name].x,p[name].y-previous[name].y)<.12,name+' snapped');
  }
  if(n%100===0)frozen.push({snapshot:P.snapshot(s),pose:structuredClone(p)});previous=p;
 }
 for(const frame of frozen)assert.deepEqual(P.pose(frame.snapshot),frame.pose,'future inputs must not alter a recorded pose');
});

test('bar rise locks before the body arrives for all sixteen held combinations',()=>{
 for(const charge of [.4,.65,.9])for(let mask=0;mask<16;mask++){
  const s=launchAuto({charge});let last=s.barHeight;
  for(let n=0;n<600&&s.phase==='air';n++){
   for(let i=0;i<4;i++)P.setLimb(s,P.KEYS[i],Boolean(mask&(1<<i)));P.advance(s,1/240);
   assert.ok(s.barHeight>=last);assert.ok(s.barHeight<=s.barGoal);last=s.barHeight;
   const nearest=Math.min(...Object.values(P.pose(s)).filter(v=>v&&Number.isFinite(v.x)).map(v=>Math.hypot(v.x,v.y-s.barGoal)));
   if(nearest<=.6||s.hit)assert.equal(s.barLocked,true,'the visible bar must settle before contact');
  }
 }
});
