import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {LeaderboardRepository} from '../worker/leaderboard/repository.mjs';
import {BOARDS,LEVEL_BOARDS} from '../worker/leaderboard/index.mjs';
const t=1800000000000,id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
// Observe execution of real SQLite aggregate subqueries, not a mocked query result.
// Wrapping each diagnostic aggregate's result calls a UDF only if that subquery runs.
async function fixture(ctx,rod){
 const db=await database();ctx.after(()=>db.raw.close());
 const calls={daily:0,capacity:0,latest:0};for(const key of Object.keys(calls))db.raw.create_function('observed_'+key,value=>{calls[key]++;return value;});
 const batch=db.batch.bind(db);db.batch=items=>batch(items.map((item,i)=>i!==7?item:{...item,sql:item.sql.replace(/SELECT count\(\*\) FROM leaderboard_submissions/g,'SELECT observed_daily(count(*)) FROM leaderboard_submissions').replace(/SELECT count\(\*\) FROM leaderboard_best/g,'SELECT observed_capacity(count(*)) FROM leaderboard_best').replace(/SELECT MAX\(created_at\) FROM leaderboard_submissions/g,'SELECT observed_latest(MAX(created_at)) FROM leaderboard_submissions')}));
 const game=rod?'reaction-rod':'fast-hands-catch',b=rod?BOARDS[game]:LEVEL_BOARDS[game],repo=new LeaderboardRepository(db,'qa');
 const entry=(n,extra={})=>({game,rules:b.rules,unit:b.unit,status:b.status,score:3,nickname:'島民',deviceId:id(1),submissionId:id(n),...(rod?{secondaryScore:5}:{}),...extra});
 return {db,calls,entry,submit:(data,time=t)=>repo.submit(data,b,time),reset(){for(const key of Object.keys(calls))calls[key]=0;}};
}
for(const rod of [false,true]){
 const name=rod?'Rod':'single-score';
 test(`${name}: success, duplicate and conflicting receipt skip all diagnostic aggregates`,async ctx=>{
  const {submit,entry,calls}=await fixture(ctx,rod);assert.equal((await submit(entry(1))).accepted,true);assert.deepEqual(calls,{daily:0,capacity:0,latest:0});
  assert.equal((await submit(entry(1),t+1)).duplicate,true);assert.equal((await submit(entry(1,{score:4}),t+1)).error,'conflict');assert.deepEqual(calls,{daily:0,capacity:0,latest:0});
 });
 test(`${name}: racing receipt conflict skips diagnostic aggregates in both atomic batches`,async ctx=>{
  const {submit,entry,calls}=await fixture(ctx,rod);const results=await Promise.all([submit(entry(1)),submit(entry(1,{score:4}))]);assert.equal(results.filter(x=>x.accepted).length,1);assert.equal(results.filter(x=>x.error==='conflict').length,1);assert.deepEqual(calls,{daily:0,capacity:0,latest:0});
 });
 test(`${name}: returning-player cooldown checks daily and latest but skips capacity scan`,async ctx=>{
  const {submit,entry,calls,reset}=await fixture(ctx,rod);await submit(entry(1));reset();assert.deepEqual(await submit(entry(2),t+12345),{error:'limited',reason:'cooldown',retryAfterSeconds:48});assert.deepEqual(calls,{daily:1,capacity:0,latest:1});
 });
 test(`${name}: daily quota takes priority without capacity or cooldown aggregation`,async ctx=>{
  const {submit,entry,calls,reset,db}=await fixture(ctx,rod);await submit(entry(1));const q=db.raw.prepare('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)');for(let i=1;i<1000;i++)q.run(['qa','s'+i,'hash','d'+i,'long-jump','journey-km-v1','島',1,t,Math.floor(t/86400000)]);q.free();reset();assert.deepEqual(await submit(entry(2),t+1),{error:'limited',reason:'daily_limit'});assert.deepEqual(calls,{daily:1,capacity:0,latest:0});
 });
 test(`${name}: new player capacity rejection checks capacity once without cooldown aggregation`,async ctx=>{
  const {submit,entry,calls,db}=await fixture(ctx,rod);const q=db.raw.prepare('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)');for(let i=0;i<10000;i++)q.run(['qa','long-jump','journey-km-v1','d'+i,'島',1,t]);q.free();assert.deepEqual(await submit(entry(1)),{error:'limited',reason:'capacity'});assert.deepEqual(calls,{daily:1,capacity:1,latest:0});
 });
}
