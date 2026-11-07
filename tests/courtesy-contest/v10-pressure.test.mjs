import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';
import {createEscalatingThreatPlan as createThreatPlan} from '../../public/games/courtesy-contest/threat-plan.js';
import {createRunPlan,replayRun} from './helpers/private-replay-reference.mjs';

const thresholds=[3,5,7,9,11,13,15,18,21,24];
const speeds=[3000,2700,2300,2000,1700,1400,1100,900,750,650];
const plan=thresholds.map((afterCount,i)=>({afterCount,type:i%3,travelMs:speeds[i],side:i%2?1:-1}));
const runId='00000000-0000-4000-8000-000000000001';
const completed=(h,n)=>{for(let i=0;i<n;i++){h.s.offer();if(h.s.threat)h.s.repel();h.tick(970);}};
function playing(){const h=harness();h.s.startRound({runId,plan});return h;}
function payload(h,reason='thanks'){return {runId,events:Array.from(h.s.trace,e=>({...e})),finishedAtMs:h.s.departureTiming.finishedAtMs,wallElapsedMs:h.s.departureTiming.wallElapsedMs,reason};}

test('the visible countdown reaches 20 and clears only when the next displayed second is 19',()=>{
 const h=playing();
 for(const [at,want] of [[0,'30'],[5000,'25'],[9999,'21'],[10000,'20'],[10999,'20'],[11000,'']]){
  h.tick(at-h.now);assert.equal(h.node('clock').textContent,want);assert.equal(h.node('.time').classList.contains('timer-hidden'),want==='');
 }
 h.tick(18999);assert.equal(h.node('clock').textContent,'');h.tick(1);assert.equal(h.s.phase,'depart');
});
test('online and offline rounds offer ten increasingly fast encounters, without consecutive identical people',()=>{
 for(let i=0;i<30;i++)for(const p of [createRunPlan(10),createThreatPlan(()=>i%2?.99:0)]){
  assert.deepEqual(p.map(e=>e.afterCount),thresholds);assert.deepEqual(p.map(e=>e.travelMs),speeds);
  assert.ok(p.every((e,j)=>[0,1,2].includes(e.type)&&[-1,1].includes(e.side)&&(!j||e.type!==p[j-1].type)));
 }
});
test('a fast player can meet all ten planned intruders in one real round',()=>{
 const h=playing(),seen=[];
 for(let i=0;i<26;i++){h.s.offer();if(h.s.threat){seen.push({count:h.s.count,speed:h.s.threat.travelMs});h.s.repel();}h.tick(970);}
 assert.deepEqual(seen,thresholds.map((count,i)=>({count,speed:speeds[i]})));
 h.s.thank();h.tick(300);assert.equal(replayRun(payload(h),plan).completedCount,26);
});
test('returning to the standing pose does not erase an approaching intruder when offers continue',()=>{
 const h=playing();completed(h,9);h.s.offer();const incoming=h.s.threat;assert.ok(incoming);h.tick(970);
 assert.equal(h.s.seatReady,false);assert.equal(h.s.threat,incoming);
 h.s.offer();h.tick(970);h.s.offer();h.tick(859);assert.equal(h.s.phase,'play');h.tick(1);assert.equal(h.s.reason,'stolen');
});
test('stopping after an exchange leaves the seat open to the approaching intruder',()=>{
 const h=playing();completed(h,9);h.s.offer();h.tick(970);assert.ok(h.s.threat);h.tick(1830);
 assert.equal(h.s.threat,null);assert.equal(h.s.seatReady,false);assert.equal(h.s.reason,'stolen');assert.equal(h.s.count,10);assert.equal(h.s.seated,false);
});
test('Thanks still immediately dismisses an intruder and only scores already completed exchanges',()=>{
 const h=playing();completed(h,9);h.s.offer();h.tick(100);h.s.thank();assert.equal(h.s.threat,null);h.tick(300);
 assert.equal(h.s.seated,true);assert.equal(replayRun(payload(h),plan).completedCount,9);
});
test('server replay rejects pretending each brief return cancels a live threat in new rounds',()=>{
 const h=playing();completed(h,9);const events=Array.from(h.s.trace,e=>({...e}));
 for(const [type,atMs,seated]of [['offer',9000],['complete',9970,true],['offer',10000],['complete',10970,true],['offer',11000],['complete',11970,true],['thanks',12000],['seated',12300]])events.push({type,atMs,wallMs:atMs,...(type==='complete'?{seated}:{})});
 assert.throws(()=>replayRun({runId,events,finishedAtMs:12300,wallElapsedMs:12300,reason:'thanks'},plan),/invalid_run/);
});
test('a new plan cannot substitute an easier speed, skip a threshold, or repeat the same person',()=>{
 const body={runId,events:[{type:'thanks',atMs:0,wallMs:0},{type:'seated',atMs:300,wallMs:300}],finishedAtMs:300,wallElapsedMs:300,reason:'thanks'};
 assert.equal(replayRun(body,plan).completedCount,0);
 for(const key of ['travelMs','afterCount','type']){const p=plan.map(e=>({...e}));p[1][key]=p[0][key];assert.throws(()=>replayRun(body,p),/invalid_run/);}
});

// Replay the real continuous input flow, not an invented successful trace.
for(const index of [0,2,5,7,8,9])for(const action of ['repel','thank'])for(const paused of [false,true])for(const early of [true,false]){
 test(`${speeds[index]}ms approach: ${action} ${early?'1ms before':'at'} expiry ${paused?'with':'without'} a pause matches server replay`,()=>{
  const h=playing();completed(h,thresholds[index]);h.s.offer();const expiry=h.s.threat.expiresAtMs;
  h.tick(799);
  if(paused){h.s.pauseRound();h.tick(10000);h.s.resumeRound();}
  const target=expiry-(early?1:0),active=()=>h.s.roundClock.elapsed(h.now);
  while(active()<target){
   const pending=h.s.trace.findLast(e=>e.type==='offer').atMs;
   h.tick(Math.min(target-active(),Math.max(1,pending+970-active())));
   if(active()<target&&!h.s.busy)h.s.offer();
  }
  h.s[action]();
  if(!early){assert.equal(h.s.reason,'stolen');return;}
  if(action==='repel')h.s.thank();h.tick(300);assert.equal(h.s.reason,'thanks');
  const replay=replayRun(payload(h),plan);assert.equal(replay.completedCount,h.s.count);assert.equal(replay.seatSettledAtMs,h.s.seatSettledAtMs);
 });
}
test('repelling an arrival clears the hazard without carrying it into a later offer',()=>{
 const h=playing();completed(h,9);h.s.offer();h.tick(970);h.s.repel();assert.equal(h.s.threat,null);
 h.s.offer();h.tick(970);h.s.offer();assert.ok(h.s.threat);h.s.repel();h.s.thank();h.tick(300);
 assert.equal(replayRun(payload(h),plan).completedCount,h.s.count);
});
test('the persistent hazard is reset on replay and does not survive a new round',()=>{
 const h=playing();completed(h,9);h.s.offer();h.tick(970);assert.ok(h.s.threat);h.s.startRound({runId,plan});
 assert.equal(h.s.threat,null);assert.equal(h.s.threatIndex,0);h.tick(3000);assert.equal(h.s.count,0);assert.equal(h.s.reason,null);assert.equal(h.s.threat,null);
});

test('platform rounds stay offline from private ranking and use the current local plan',async()=>{
 const h=harness();let options;h.window.courtesyRanking={begin:async(value)=>{options=value;return {runId,plan};}};
 await h.s.start();assert.equal(options,undefined);assert.equal(h.s.rankingRunId,null);assert.equal(h.s.pressureThreats,true);
});
