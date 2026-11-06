import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {handleRequest,BOARDS,validateSubmission} from '../worker/leaderboard/index.mjs';
import {LeaderboardRepository} from '../worker/leaderboard/repository.mjs';
import {BOARD_METRICS,resultToSubmission} from '../public/games/shared/leaderboard-metrics.mjs';
const current='real-altitude-v3',old='highest-feet-v1',origin='https://local.test';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload=(rules,score=10,n=1)=>({game:'pole-vault',rules,unit:'m',status:'done',score,nickname:'測試',deviceId:id(n),submissionId:id(n+100)});
test('paced client requires matching run and frozen snapshot rulesets',()=>{
 assert.equal(BOARD_METRICS['pole-vault'].rules,current);
 const valid={phase:'done',ruleset:current,maxHeight:999,scoreSnapshot:{height:10,ruleset:current}};
 assert.deepEqual(resultToSubmission('pole-vault',valid),{score:10,status:'done'});
 for(const ruleset of [undefined,'real-altitude-v2'])assert.equal(resultToSubmission('pole-vault',{...valid,ruleset}),null);
 for(const ruleset of [undefined,'real-altitude-v2'])assert.equal(resultToSubmission('pole-vault',{...valid,scoreSnapshot:{height:10,ruleset}}),null);
 assert.equal(resultToSubmission('pole-vault',{...valid,scoreSnapshot:null}),null);
});
test('QA active rules differ while production validation retains legacy contract',()=>{
 assert.equal(BOARDS['pole-vault'].rules,old);
 assert.doesNotThrow(()=>validateSubmission(payload(current),'qa'));
 assert.throws(()=>validateSubmission(payload(old),'qa'));
 assert.doesNotThrow(()=>validateSubmission(payload(old),'production'));
 assert.throws(()=>validateSubmission(payload(current),'production'));
});
test('QA GET and POST isolate old rows, own best and rank without deleting history',async t=>{
 const db=await database();t.after(()=>db.raw.close());
 const repo=new LeaderboardRepository(db,'qa');
 await repo.submit({...payload(old,10000),submissionId:id(900)},BOARDS['pole-vault'],100000);
 const env=scope=>({DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:scope,LEADERBOARD_ORIGIN:origin});
 const post=(body,scope='qa',now=200000)=>handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env(scope),now);
 const get=async scope=>{const r=await handleRequest(new Request(origin+'/api/leaderboard?game=pole-vault',{headers:{'X-Leaderboard-Device':id(1)}}),env(scope));assert.equal(r.status,200);return r.json();};
 const empty=await get('qa');assert.equal(empty.rules,current);assert.deepEqual(empty.entries,[]);assert.equal(empty.own,null);
 assert.equal((await post({...payload(old),submissionId:id(500)})).status,400);
 const accepted=await post(payload(current));assert.equal(accepted.status,200);assert.equal((await accepted.json()).own.score,10);
 assert.equal((await post(payload(current,20,2))).status,200);
 const qa=await get('qa');assert.deepEqual(qa.entries.map(x=>x.score),[20,10]);assert.equal(qa.own.score,10);assert.equal(qa.own.rank,2);assert.equal(qa.own.gap,10);
 assert.equal(db.raw.exec("SELECT score FROM leaderboard_best WHERE rules='highest-feet-v1'")[0].values[0][0],10000);
 assert.equal((await post(payload(current,50,3),'production')).status,400);
 assert.equal((await post(payload(old,30,3),'production')).status,200);
 const production=await get('production');assert.equal(production.rules,old);assert.deepEqual(production.entries.map(x=>x.score),[30]);
});

test('paced client never renders a stale or unversioned pole-vault ranking response',async()=>{
 const {JSDOM}=await import('jsdom');
 const {mountLeaderboard}=await import('../public/games/shared/leaderboard.mjs');
 for(const rules of [undefined,old,current]){
  const dom=new JSDOM('<section id="entry"></section><section id="result"></section>',{url:origin});
  const document=dom.window.document;
  const board=mountLeaderboard({document,game:'pole-vault',enabled:true,entry:document.querySelector('#entry'),result:document.querySelector('#result'),fetcher:async()=>({ok:true,json:async()=>({game:'pole-vault',unit:'m',rules,entries:[{nickname:'版本選手',score:12,rank:1}],own:null})})});
  try{board.showRanking();await new Promise(r=>setImmediate(r));assert.equal(document.querySelector('.pf-rank-list').textContent.includes('版本選手'),rules===current);}
  finally{board.destroy();dom.window.close();}
 }
});
