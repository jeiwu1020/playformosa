import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../worker/leaderboard/index.mjs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {PINBALL_RULESETS} from '../public/games/overtime-pinball/ruleset.mjs';
import {BOARD_METRICS,resultToSubmission} from '../public/games/shared/leaderboard-metrics.mjs';
import {settledSnapshot} from '../public/games/overtime-pinball/platform-snapshot.mjs';
const origin='https://qa.example',now=1800000000000;
const specs=[[60,'60s'],[180,'180s'],[0,'unlimited']];
for(const [limit,suffix] of specs)test(`flow ${suffix}: exact frontend/backend agreement and cross-scope history preservation`,async t=>{
 const db=await database();t.after(()=>db.raw.close());
 const game='overtime-pinball-'+suffix, rules=`office-overtime-flow-${limit||'unlimited'}-v3`,old=`office-overtime-shadow-${limit||'unlimited'}-v2`;
 assert.equal(PINBALL_RULESETS[limit],rules);assert.equal(BOARD_METRICS[game].rules,rules);
 const snapshot=settledSnapshot({state:'over',score:123,round:{limit,reason:limit?'time':'drain'}});
 assert.equal(snapshot.ruleset,rules);assert.ok(Object.isFrozen(snapshot));assert.ok(resultToSubmission(game,snapshot));assert.equal(resultToSubmission(game,{...snapshot,ruleset:old}),null);
 for(const [scope,rule]of[['production',rules],['production',old],['qa',old]]){
 const key=scope+rule;
 db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',[scope,game,rule,'old-device','historic',99999,now-9*86400000]);
 db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',[scope,key,'old-payload','old-device',game,rule,'historic',99999,now-9*86400000,0]);
 }
 const history=table=>db.raw.exec(`SELECT * FROM ${table} WHERE scope='production' OR rules='${old}' ORDER BY 1,2,3,4`)[0].values;
 const beforeBest=history('leaderboard_best'),beforeReceipts=history('leaderboard_submissions');
 const body={game,rules,unit:'points',status:'done',score:123,nickname:'QA',deviceId:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002'};
 const env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:origin};
 const post=b=>new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await handleRequest(post(body),env,now)).status,200);
 assert.equal((await(await handleRequest(post(body),env,now+1)).json()).duplicate,true);
 assert.equal((await handleRequest(post({...body,rules:old}),env,now+2)).status,400);
 const board=await(await handleRequest(new Request(origin+'/api/leaderboard?game='+game),env,now)).json();assert.equal(board.rules,rules);assert.deepEqual(board.entries.map(x=>x.score),[123]);
 assert.deepEqual(history('leaderboard_best'),beforeBest);assert.deepEqual(history('leaderboard_submissions'),beforeReceipts);
});
