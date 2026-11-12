import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../../public/games/run-1500m/race.mjs';
import {simulate,strategies} from './simulation.mjs';
import {freezeRunnerResult,RUNNER_RULES} from '../../public/games/shared/runner-result.mjs';
import {BOARD_METRICS,resultToSubmission} from '../../public/games/shared/leaderboard-metrics.mjs';
import {readRecords,storeRecord,STORAGE_KEY} from '../../public/games/run-1500m/records.mjs';
import {handleRequest,validateSubmission} from '../../worker/leaderboard/index.mjs';
import {database} from '../helpers/leaderboard-sqlite.mjs';

test('four selected schedules are reproducible, distinct, bounded, and never rerolled on pause',()=>{
 const traces=[];
 for(const plan of e.RACE_PLANS){
  assert.ok(plan.offsets[0]>=0&&plan.offsets[0]<=18);assert.deepEqual(plan.offsets.slice(1),[0,0]);
  const a=simulate(e,{planId:plan.id,strategy:'recover',scenario:4}),b=simulate(e,{planId:plan.id,strategy:'recover',scenario:4});
  assert.deepEqual(a,b);traces.push(JSON.stringify(a.snapshots));
  const before=structuredClone(a.race);a.race.paused=true;e.step(a.race,5);assert.deepEqual(a.race,{...before,paused:true});
  assert.equal(e.resultOf(a.race).seed,plan.seed);assert.equal(e.resultOf(a.race).planId,plan.id);
  assert.deepEqual(a.race.supplies,e.SUPPLIES);
 }
 assert.equal(new Set(traces).size,e.RACE_PLANS.length);
 for(const id of [-1,4,NaN,1.2,'0',null])assert.throws(()=>e.createRace(id));
});

test('player outcome spread stays under one second for each matched route/pace/start input',()=>{
 for(const strategy of Object.keys(strategies))for(const scenario of [0,1,2,3,4,24,25,26,27,28,29,44,74]){
  const times=e.RACE_PLANS.map(p=>simulate(e,{planId:p.id,strategy,scenario}).seconds);
  assert.ok(Math.max(...times)-Math.min(...times)<=1,`${strategy}/${scenario}: ${times}`);
 }
});

test('player physics matches the exact published parent when rivals are absent',async()=>{
 const m=JSON.parse(readFileSync(new URL('../../docs/run1500-variation/MANIFEST.json',import.meta.url)));
 const original=m.files.find(f=>f.path==='public/games/run-1500m/race.mjs').beforeText;
 const old=await import('data:text/javascript;base64,'+Buffer.from(original).toString('base64'));
 for(const strategy of Object.keys(strategies))for(const scenario of [0,1,4]){
  const expected=simulate(old,{strategy,scenario,alone:true});
  for(const plan of e.RACE_PLANS)assert.deepEqual(simulate(e,{planId:plan.id,strategy,scenario,alone:true}).player,expected.player);
 }
});

test('default engine seed is reproducible and browser restart selects a new plan from all four',()=>{
 assert.deepEqual(e.createRace(),e.createRace());
 const random=Math.random;try{for(let id=0;id<4;id++){Math.random=()=>(id+.5)/4;assert.equal(e.randomRacePlan(),id);}}finally{Math.random=random;}
 const app=readFileSync(new URL('../../public/games/run-1500m/app.mjs',import.meta.url),'utf8');
 assert.match(app,/create:\(\)=>e\.createRace\(e\.randomRacePlan\(\)\)/);
});

test('v4 local records preserve v3 storage and carry the actual plan through frozen results',()=>{
 const oldKey='pf-1500m-prototype-1500m-ccw-tactics-v3',prior=JSON.stringify([{rules:'1500m-ccw-tactics-v3',status:'done',time:120}]);
 const values=new Map([[oldKey,prior]]),previous=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 try{
  assert.notEqual(STORAGE_KEY,oldKey);assert.deepEqual(readRecords(),[]);
  const {race}=simulate(e,{planId:3});const frozen=freezeRunnerResult('run-1500m',race,e.RULES);
  assert.equal(frozen.metrics.raceSeed,e.RACE_PLANS[3].seed);assert.equal(frozen.metrics.racePlanId,3);
  const saved=e.resultOf({runners:[frozen.metrics],initialSeed:frozen.metrics.raceSeed,planId:frozen.metrics.racePlanId});
  assert.equal(storeRecord(saved).saved,true);assert.equal(readRecords()[0].seed,e.RACE_PLANS[3].seed);assert.equal(readRecords()[0].planId,3);
  assert.equal(values.get(oldKey),prior);
  assert.equal(BOARD_METRICS['run-1500m'].rules,e.RULES);assert.equal(RUNNER_RULES['run-1500m'],e.RULES);
  assert.equal(resultToSubmission('run-1500m',{...frozen,ruleset:'1500m-ccw-tactics-v3'}),null);
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('QA API isolates v4 rankings, rejects stale v3 uploads, and retains stored v3 rows',async t=>{
 const db=await database();t.after(()=>db.raw.close());
 db.raw.run("INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at,secondary_score) VALUES('qa','run-1500m','1500m-ccw-tactics-v3','old-device','舊紀錄',119,1,0)");
 const before=db.raw.exec("SELECT * FROM leaderboard_best WHERE rules='1500m-ccw-tactics-v3'");
 const origin='https://local.test',env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:origin};
 const payload={game:'run-1500m',rules:e.RULES,unit:'s',status:'done',score:130,nickname:'新紀錄',deviceId:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002'};
 assert.throws(()=>validateSubmission({...payload,rules:'1500m-ccw-tactics-v3'},'qa'));
 assert.throws(()=>validateSubmission(payload,'production'));
 const post=await handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)}),env,100000);
 assert.equal(post.status,200);
 const data=await (await handleRequest(new Request(origin+'/api/leaderboard?game=run-1500m'),env)).json();
 assert.equal(data.rules,e.RULES);assert.deepEqual(data.entries.map(x=>x.score),[130]);assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_best WHERE rules='1500m-ccw-tactics-v3'"),before);
});
