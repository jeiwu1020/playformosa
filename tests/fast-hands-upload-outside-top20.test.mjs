import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../worker/leaderboard/index.mjs';
import {database} from './helpers/leaderboard-sqlite.mjs';
const origin='https://qa.example',now=1800000000000;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
for(const mode of ['mouse','catch','duel'])test(`${mode}: top20 is display only; an eligible rank22 submission is stored with exact own rank`,async t=>{
 const db=await database();t.after(()=>db.raw.close());const duck=mode==='mouse',game=duck?'fast-hands':'fast-hands-'+mode,rules=duck?'shuttle-v3-mouse':mode==='catch'?'cleared-levels-v1':'ten-round-wins-v1',unit=duck?'ms':mode==='catch'?'levels':'wins',score=duck?500.125:1;
 for(let n=0;n<21;n++)db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',game,rules,'existing-'+n,'原玩家'+n,duck?300+n:mode==='catch'?30+n:10,n]);
 const env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:origin};const payload={game,rules,unit,status:duck?'success':'done',score,nickname:'榜外玩家',deviceId:id(50),submissionId:id(51)};
 const post=new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});const response=await handleRequest(post,env,now);assert.equal(response.status,200);const data=await response.json();assert.equal(data.accepted,true);assert.equal(data.own.rank,22);assert.equal(data.own.score,score);
 const query='game='+game+(duck?'&mode=mouse':'');const result=await(await handleRequest(new Request(origin+'/api/leaderboard?'+query,{headers:{'X-Leaderboard-Device':id(50)}}),env,now)).json();assert.equal(result.entries.length,20);assert.equal(result.entries.some(x=>x.nickname==='榜外玩家'),false);assert.equal(result.own.rank,22);assert.equal(result.own.score,score);assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_best')[0].values[0][0],22);assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],1);
});
