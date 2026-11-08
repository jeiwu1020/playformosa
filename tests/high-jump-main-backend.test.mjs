import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {handleRequest} from '../worker/leaderboard/index.mjs';
import {eligibleResult} from '../public/games/high-jump/leaderboard.mjs';
const origin='https://main.test',now=1800000000000,id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('high-jump UI sends only actual successful final height',()=>{
 assert.deepEqual(eligibleResult('high-jump',{phase:'done',success:true,height:2.123,comHeight:999}),{score:2.123,status:'cleared'});
 for(const x of [{phase:'air',success:true,height:2},{phase:'done',success:false,height:2},{phase:'done',success:true,height:0},{phase:'done',success:true,height:Infinity}])assert.equal(eligibleResult('high-jump',x),null);
});
test('high-jump production ranking and counts use existing schema without changing other scores or QA',async()=>{
 const db=await database();db.raw.run(readFileSync(new URL('../worker/play-counts/002.sql',import.meta.url),'utf8'));
 const env={DB:db,LEADERBOARD_ENABLED:'true',PLAY_COUNTS_ENABLED:'true',LEADERBOARD_ORIGIN:origin,LEADERBOARD_SCOPE:'production'};
 const post=(path,body,scope='production',at=now)=>handleRequest(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{...env,LEADERBOARD_SCOPE:scope},at);
 const payload={game:'high-jump',rules:'cleared-height-v1',unit:'m',status:'cleared',score:2.123,nickname:'跳高測試',deviceId:id(1),submissionId:id(2)};
 try{
  const schema=db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name');
  assert.equal((await post('/api/leaderboard/submissions',{...payload,game:'long-jump',rules:'journey-km-v1',unit:'km',status:'valid',score:12,submissionId:id(3)})).status,200);
  const old=db.raw.exec("SELECT * FROM leaderboard_best WHERE game='long-jump'");
  assert.equal((await post('/api/leaderboard/submissions',payload)).status,200);
  assert.equal((await(await post('/api/leaderboard/submissions',payload)).json()).duplicate,true);
  assert.equal((await post('/api/leaderboard/submissions',{...payload,score:3})).status,409);
  assert.equal((await post('/api/leaderboard/submissions',{...payload,submissionId:id(4),score:3},'production',now+60001)).status,200);
  const get=async(scope)=> (await handleRequest(new Request(origin+'/api/leaderboard?game=high-jump'),{...env,LEADERBOARD_SCOPE:scope},now)).json();
  assert.deepEqual((await get('production')).entries.map(x=>x.score),[3]);assert.deepEqual((await get('qa')).entries,[]);
  assert.equal((await post('/api/leaderboard/submissions',{...payload,score:8},'qa')).status,200);
  assert.deepEqual((await get('production')).entries.map(x=>x.score),[3]);
  const start={game:'high-jump',deviceId:id(1),runId:id(5),startedAt:now};
  assert.equal((await post('/api/play-counts/starts',start)).status,200);
  assert.equal((await(await post('/api/play-counts/starts',start)).json()).duplicate,true);
  const counts=await(await handleRequest(new Request(origin+'/api/play-counts'),env,now)).json();assert.deepEqual(counts.counts['high-jump'],{count:1,since:now});
  assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_best WHERE game='long-jump'"),old);
  assert.deepEqual(db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name'),schema);
 }finally{db.raw.close();}
});
