import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {handleRequest,validateSubmission} from '../worker/leaderboard/index.mjs';
const origin='https://playformosa.playformosa.workers.dev',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const courtesy=(n=1,score=8,secondaryScore=1)=>({game:'courtesy-contest',rules:'press-courtesy-v2',unit:'courtesies',status:'seated',score,secondaryScore,nickname:'客氣玩家',deviceId:id(n),submissionId:id(n)});
async function fixture(t){const db=await database();db.raw.run(readFileSync(new URL('../worker/leaderboard/003-reaction-rod-production.sql',import.meta.url),'utf8'));t.after(()=>db.raw.close());const env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'production',LEADERBOARD_ORIGIN:origin};return{db,env,post:(v,time=100000,from=origin)=>handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:typeof v==='string'?v:JSON.stringify(v)}),env,time),board:async(game='courtesy-contest',device)=>{const response=await handleRequest(new Request(origin+'/api/leaderboard?game='+game,{headers:device?{'X-Leaderboard-Device':id(device)}:{}}),env);return{status:response.status,body:await response.json()};}};}
test('production Courtesy admits strict safe-seat tuples including zero, rejecting QA and malformed scores',()=>{
 assert.equal(validateSubmission(courtesy(1,0,30),'production').score,0);
 for(const x of [{score:-1},{score:.5},{score:Number.MAX_SAFE_INTEGER},{secondaryScore:0},{secondaryScore:30.01},{secondaryScore:.015},{secondaryScore:NaN},{status:'failed'},{rules:'old'},{unit:'s'},{bonus:1}])assert.throws(()=>validateSubmission({...courtesy(),...x},'production'));
 assert.throws(()=>validateSubmission(courtesy(),'qa'));
});
test('production Courtesy ranks count descending and remaining ascending, preserves zero/ties/nearest rank and updates only better tuples',async t=>{
 const f=await fixture(t);for(const [n,count,seconds] of [[1,8,1],[2,8,1],[3,8,2],[4,7,.01],[5,0,30]])assert.equal((await f.post(courtesy(n,count,seconds))).status,200);
 let b=(await f.board('courtesy-contest',3)).body;assert.deepEqual(b.entries.map(x=>[x.score,x.secondaryScore,x.rank]),[[8,1,1],[8,1,1],[8,2,3],[7,.01,4],[0,30,5]]);assert.equal(b.own.gap,1);assert.equal(b.own.gapMetric,'remaining');
 assert.equal((await f.board('courtesy-contest',4)).body.own.gapMetric,'courtesies');
 for(const [run,count,seconds,expected] of [[10,8,.5,true],[11,8,3,false],[12,7,.01,false],[13,9,30,true]]){const response=await f.post({...courtesy(3,count,seconds),submissionId:id(run)},100000+(run-9)*61000);assert.equal((await response.json()).bestUpdated,expected);}
 b=(await f.board('courtesy-contest',3)).body;assert.equal(b.own.score,9);assert.equal(b.own.rank,1);assert.equal(b.own.gap,null);
 assert.equal(f.db.raw.exec("SELECT score FROM leaderboard_best WHERE game='courtesy-contest' AND score=1")[0].values.length,1,'zero uses offset only in Courtesy storage');
});
test('Courtesy duplicate/conflict/cooldown and cross-origin or QA requests cannot corrupt production best',async t=>{
 const f=await fixture(t),p=courtesy(1,0,.01);assert.equal((await f.post(p)).status,200);assert.equal((await (await f.post(p)).json()).duplicate,true);assert.equal((await f.post({...p,secondaryScore:1})).status,409);
 const limited=await f.post({...p,submissionId:id(2)},100001);assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');assert.equal((await f.post(courtesy(3),100000,'https://preview-hurdles-playformosa.playformosa.workers.dev')).status,403);
 assert.equal((await f.post(JSON.stringify(courtesy(4)).replace('"score":8','"score":1,"score":8'))).status,400);
 f.env.LEADERBOARD_SCOPE='qa';assert.equal((await f.post(courtesy(5))).status,400);assert.equal((await f.board()).status,400);
 assert.equal(f.db.raw.exec("SELECT count(*) FROM leaderboard_best WHERE scope='qa'")[0].values[0][0],0);
});
test('new Courtesy submissions preserve every existing production leaderboard row byte-for-byte',async t=>{
 const f=await fixture(t);const boards=[['long-jump','journey-km-v1','km','valid',123],['hurdles','110m-8h-v1','s','done',16],['high-jump','cleared-height-v1','m','cleared',1.5],['reaction-rod','catch-rating-v1','catches','done',8],['fast-hands','shuttle-v3-mouse','ms','success',800],['fast-hands','shuttle-v3-touch','ms','success',820],['fast-hands-catch','cleared-levels-v1','levels','done',3],['fast-hands-duel','ten-round-wins-v1','wins','done',7]];
 for(let i=0;i<boards.length;i++){const[game,rules,unit,status,score]=boards[i];const payload={game,rules,unit,status,score,nickname:'原玩家',deviceId:id(100+i),submissionId:id(100+i),...(game==='reaction-rod'?{secondaryScore:9}:{})};assert.equal((await f.post(payload)).status,200,game);}
 const snapshot=()=>JSON.stringify({best:f.db.raw.exec("SELECT * FROM leaderboard_best WHERE game!='courtesy-contest' ORDER BY game,rules,device"),submissions:f.db.raw.exec("SELECT * FROM leaderboard_submissions WHERE game!='courtesy-contest' ORDER BY game,rules,id")});const before=snapshot(),aged=100000+8*86400000;assert.equal((await f.post(courtesy(20,0,.01),aged)).status,200);assert.equal((await f.post(courtesy(21,8,1),aged)).status,200);assert.equal(snapshot(),before);assert.equal(f.db.raw.exec("SELECT count(*) FROM leaderboard_best WHERE scope='production'")[0].values[0][0],10);
});
test('production Courtesy play counts add one key and leave existing totals intact',async t=>{
 const f=await fixture(t);f.env.PLAY_COUNTS_ENABLED='true';f.db.raw.run(readFileSync(new URL('../worker/play-counts/002.sql',import.meta.url),'utf8'));
 const start=game=>handleRequest(new Request(origin+'/api/play-counts/starts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({game,deviceId:id(game==='courtesy-contest'?91:92),runId:id(game==='courtesy-contest'?91:92),startedAt:100000})}),f.env,100000);
 assert.equal((await start('long-jump')).status,200);assert.equal((await start('courtesy-contest')).status,200);
 const response=await handleRequest(new Request(origin+'/api/play-counts'),f.env);const {counts}=await response.json();assert.equal(counts['courtesy-contest'].count,1);assert.equal(counts['long-jump'].count,1);
 for(const game of ['hurdles','high-jump','reaction-rod','fast-hands','fast-hands-catch','fast-hands-duel','home','taiwanfighter'])assert.ok(Object.hasOwn(counts,game));
 f.env.LEADERBOARD_SCOPE='qa';assert.equal((await start('courtesy-contest')).status,400);assert.equal(f.db.raw.exec("SELECT count(*) FROM play_count_receipts WHERE scope='qa' AND counter_key='courtesy-contest'")[0].values[0][0],0);f.env.LEADERBOARD_SCOPE='production';
 for(const game of ['pole-vault','sprint-100m','run-400m','run-1500m','beer-slide','tower-climb'])assert.equal((await start(game)).status,400);
});
