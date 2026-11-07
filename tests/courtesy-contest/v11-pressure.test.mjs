import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';
import {createThreatPlan} from '../../public/games/courtesy-contest/round-variation.js';
import {createRunPlan,replayRun} from './helpers/private-replay-reference.mjs';
const thresholds=[3,5,7,...Array.from({length:21},(_,i)=>i+9)];
const speeds=[3000,2400,1800,1300,1000,800,650,550,450,...Array(15).fill(400)];
const plan=thresholds.map((afterCount,i)=>({afterCount,travelMs:speeds[i],type:i%3,side:i%2?1:-1}));
const runId='00000000-0000-4000-8000-000000000001';
const playing=()=>{const h=harness();h.s.startRound({runId,plan});return h;};
const completed=(h,n)=>{for(let i=0;i<n;i++){h.s.offer();if(h.s.threat)h.s.repel();h.tick(970);}};
const payload=h=>({runId,events:Array.from(h.s.trace,e=>({...e})),...h.s.departureTiming,reason:'thanks'});

test('new rounds keep enough encounters for every late exchange rather than exhausting ten slots',()=>{
 for(const p of [createThreatPlan(()=>.5),createRunPlan()]){assert.deepEqual(p.map(e=>e.afterCount),thresholds);assert.deepEqual(p.map(e=>e.travelMs),speeds);}
});
test('late arrivals follow every accepted rise even for a slower player with only three completed exchanges',()=>{
 const h=playing();completed(h,3);h.tick(20000-h.now);
 for(let i=0;i<7;i++){h.s.offer();assert.ok(h.s.threat,`no late intruder on exchange ${h.s.count+1}`);assert.equal(h.s.threat.travelMs,400);h.tick(800);h.s.repel();h.tick(170);}
 h.s.thank();h.tick(300);assert.equal(replayRun(payload(h),plan).completedCount,10);
});
for(const [at,windup,travel] of [[0,800,3000],[9999,800,3000],[10000,700,850],[14999,700,850],[15000,650,550],[19999,650,550],[20000,550,400],[28000,550,400]]){
 test(`first intruder is time-adjusted at ${at}ms: ${windup}ms warning + ${travel}ms approach`,()=>{
  const h=playing();h.s.count=3;h.now=at;h.s.offer();const t=h.s.threat;assert.equal(t.windup*1000,windup);assert.equal(t.travelMs,travel);assert.equal(t.expiresAtMs-t.startedAtMs,windup+travel);
  const x=h.s.intruder.x;h.tick(windup-1);assert.equal(h.s.intruder.x,x);h.tick(2);assert.notEqual(h.s.intruder.x,x);
 });
}
test('late density never starts an unrequested encounter while the player rests standing',()=>{
 const h=playing();completed(h,8);h.tick(21000-h.now);assert.equal(h.s.threat,null);assert.equal(h.s.threatIndex,3);assert.equal(h.s.seatReady,false);
});
test('no late encounter starts without its whole 950ms reaction window plus the departure margin',()=>{
 for(const [at,expected]of [[28550,true],[28551,false]]){const h=playing();h.s.count=3;h.now=at;h.s.offer();assert.equal(Boolean(h.s.threat),expected);}
});

for(const at of [10000,15000,20000])for(const action of ['repel','thank'])for(const early of [true,false])for(const pause of [true,false]){
 test(`${action} at ${at}ms stage ${early?'just before':'exactly at'} arrival ${pause?'after pause':'without pause'} agrees with replay`,()=>{
  const h=playing();completed(h,3);h.tick(at-h.now);h.s.offer();const expiry=h.s.threat.expiresAtMs;
  h.tick(300);if(pause){h.s.pauseRound();h.tick(11000);h.s.resumeRound();}
  const active=()=>h.s.roundClock.elapsed(h.now),target=expiry-(early?1:0);
  while(active()<target){
   const offerAt=h.s.trace.findLast(e=>e.type==='offer').atMs;
   h.tick(Math.min(target-active(),Math.max(1,offerAt+970-active())));
   if(active()<target&&!h.s.busy)h.s.offer();
  }
  h.s[action]();
  if(!early){assert.equal(h.s.reason,'stolen');return;}
  if(action==='repel')h.s.thank();h.tick(300);const score=replayRun(payload(h),plan);
  assert.equal(score.completedCount,h.s.count);assert.equal(score.seatSettledAtMs,h.s.seatSettledAtMs);
 });
}
test('a continued fast run keeps producing newcomers after the old ten-encounter cap',()=>{
 const h=playing(),seen=[];
 for(let i=0;i<29;i++){h.s.offer();if(h.s.threat){seen.push({at:h.s.threat.startedAtMs,travel:h.s.threat.travelMs,windup:h.s.threat.windup});h.s.repel();}h.tick(970);}
 assert.ok(seen.length>20);const late=seen.filter(e=>e.at>=20000);assert.ok(late.length>=8);assert.ok(late.every(e=>e.travel===400&&e.windup===.55));
 assert.ok(late.every((e,i)=>!i||e.at-late[i-1].at===970));
 h.s.thank();h.tick(300);assert.equal(replayRun(payload(h),plan).completedCount,29);
});
test('late wave input spam during the same exchange creates only one intruder',()=>{
 const h=playing();completed(h,3);h.tick(20000-h.now);h.s.offer();const original=h.s.threat;
 for(let i=0;i<20;i++){h.s.offer();h.tick(10);}assert.equal(h.s.threat,original);assert.equal(h.s.threatIndex,1);
 h.s.repel();for(let i=0;i<20;i++)h.s.offer();assert.equal(h.s.threat,null);assert.equal(h.s.threatIndex,1);
});
test('restart restores the slow opening and clears an active late wave',()=>{
 const h=playing();completed(h,3);h.tick(20000-h.now);h.s.offer();assert.equal(h.s.threat.travelMs,400);
 h.s.startRound({runId,plan});completed(h,3);h.s.offer();assert.equal(h.s.threat.travelMs,3000);assert.equal(h.s.threat.windup,.8);
});

test('late theft arrives before the 970ms automatic return, so waiting through one offer is not free defense',()=>{
 const h=playing();completed(h,9);h.tick(20000-h.now);h.s.offer();h.tick(949);assert.equal(h.s.phase,'play');assert.equal(h.s.count,9);
 h.tick(1);assert.equal(h.s.reason,'stolen');assert.equal(h.s.count,9);assert.equal(h.s.seated,false);
});
test('server rejects a trace that tries to use the late automatic return instead of defending',()=>{
 const h=playing();completed(h,9);const events=Array.from(h.s.trace,e=>({...e}));
 for(const [type,atMs,seated]of [['offer',20000],['complete',20970,true],['thanks',20971],['seated',21271]])events.push({type,atMs,wallMs:atMs,...(type==='complete'?{seated}:{})});
 assert.throws(()=>replayRun({runId,events,finishedAtMs:21271,wallElapsedMs:21271,reason:'thanks'},plan),/invalid_run/);
});
