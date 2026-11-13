import test from 'node:test';
import assert from 'node:assert/strict';
const {settledSnapshot,createSettlementLatch}=await import('../../public/games/overtime-pinball/platform-snapshot.mjs').catch(()=>({}));
const game=(limit=60,reason='time',score=123)=>({state:'over',score,round:{limit,reason}});
for(const limit of [60,180,0])test(`settlement freezes ${limit} actual round rather than settings or best`,()=>{const g=game(limit,limit?'time':'drain');g.settings={limit:180};g.best=99999;const r=settledSnapshot(g);assert.equal(r.score,123);assert.equal(r.limit,limit);assert.equal(r.game,'overtime-pinball-'+(limit?limit+'s':'unlimited'));assert.equal(r.phase,'done');assert.ok(Object.isFrozen(r));g.score=999;assert.equal(r.score,123)});
for(const [limit,reason,state] of [[60,'drain','over'],[180,'drain','over'],[0,'time','over'],[60,'time','playing'],[42,'time','over']])test(`reject ${limit}/${reason}/${state}`,()=>assert.equal(settledSnapshot({...game(limit,reason),state}),null));
for(const score of [-1,1.2,NaN,Infinity,Number.MAX_SAFE_INTEGER,'12'])test(`reject score ${score}`,()=>assert.equal(settledSnapshot(game(60,'time',score)),null));
for(const score of [0,Number.MAX_SAFE_INTEGER-1])test(`allow score ${score}`,()=>assert.equal(settledSnapshot(game(60,'time',score)).score,score));
test('one settlement per round: late/duplicate callbacks do not retarget; reset enables next',()=>{const latch=createSettlementLatch();const first=latch.settle(game());assert.ok(first);assert.equal(latch.settle(game(180)),null);latch.reset();assert.equal(latch.settle(game(0,'drain')).limit,0)});


test('three admitted pinball metric contracts are exact and cannot substitute another settled mode',async()=>{
 const {BOARD_METRICS,resultToSubmission}=await import('../../public/games/shared/leaderboard-metrics.mjs');
 const expected={
  'overtime-pinball-60s':{rules:'office-overtime-flow-60-v3',unit:'points',status:'done',direction:'desc'},
  'overtime-pinball-180s':{rules:'office-overtime-flow-180-v3',unit:'points',status:'done',direction:'desc'},
  'overtime-pinball-unlimited':{rules:'office-overtime-flow-unlimited-v3',unit:'points',status:'done',direction:'desc'}
 };
 assert.deepEqual(Object.fromEntries(Object.entries(BOARD_METRICS).filter(([id])=>id.startsWith('overtime-pinball-'))),expected);
 const snapshots=[60,180,0].map(limit=>settledSnapshot(game(limit,limit?'time':'drain')));
 for(const snapshot of snapshots)for(const id of Object.keys(expected)){
  const actual=resultToSubmission(id,snapshot);
  if(id===snapshot.game)assert.deepEqual(actual,{score:123,status:'done'});else assert.equal(actual,null);
 }
});
