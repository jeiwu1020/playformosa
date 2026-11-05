import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {handleRequest,validateSubmission,BOARDS} from '../worker/leaderboard/index.mjs';
import {NOTE_FLOOR_MS} from '../public/games/fast-hands/challenge.mjs';
const origin='https://main.test',now=1800000000000;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const configs=[['fast-hands','shuttle-v3-mouse','ms','success',532.123456,'&mode=mouse'],['fast-hands','shuttle-v3-touch','ms','success',400.123456,'&mode=touch'],['fast-hands-catch','cleared-levels-v1','levels','done',23,''],['fast-hands-duel','ten-round-wins-v1','wins','done',7,'']];
const payload=(c,n=1)=>({game:c[0],rules:c[1],unit:c[2],status:c[3],score:c[4],nickname:'玩家',deviceId:id(n),submissionId:id(n+100)});
async function fixture(){const db=await database();db.raw.run(readFileSync(new URL('../worker/leaderboard/003-reaction-rod-production.sql',import.meta.url),'utf8'));db.raw.run(readFileSync(new URL('../worker/play-counts/002.sql',import.meta.url),'utf8'));const env={DB:db,LEADERBOARD_ENABLED:'true',PLAY_COUNTS_ENABLED:'true',LEADERBOARD_ORIGIN:origin,LEADERBOARD_SCOPE:'production'};return {db,env};}
const post=(env,p,at=now,suffix='')=>handleRequest(new Request(origin+'/api/leaderboard/submissions'+suffix,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:typeof p==='string'?p:JSON.stringify(p)}),env,at);
const get=(env,c)=>handleRequest(new Request(origin+'/api/leaderboard?game='+c[0]+c[5]),env,now);
test('Fast Hands submits and reads all four boards in production and QA, isolated by game, rule and scope without changing old rows or schema',async()=>{
 const {db,env}=await fixture();try{
 const old=[['long-jump','journey-km-v1','km','valid',12,''],['hurdles','110m-8h-v1','s','done',15,''],['reaction-rod','catch-rating-v1','catches','done',5,'']];
 for(const [i,c] of old.entries()){const p=payload(c,50+i);if(i===2)p.secondaryScore=4.123456789;assert.equal((await post(env,p)).status,200);}
 const before=db.raw.exec("SELECT * FROM leaderboard_best ORDER BY game"),schema=db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name');
 for(const scope of ['production','qa']){const e={...env,LEADERBOARD_SCOPE:scope};for(const [i,c] of configs.entries()){const p=payload(c,i+1),r=await post(e,p);assert.equal(r.status,200,scope+' '+c[1]);assert.equal((await r.json()).accepted,true);const board=await (await get(e,c)).json();assert.equal(board.rules,c[1]);assert.deepEqual(board.entries.map(x=>x.score),[c[4]]);assert.equal((await (await post(e,p)).json()).duplicate,true);}}
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_best')[0].values[0][0],11);
 assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_best WHERE game IN ('long-jump','hurdles','reaction-rod') ORDER BY game"),before);assert.deepEqual(db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name'),schema);
 assert.deepEqual(Object.keys(BOARDS),['long-jump','hurdles','reaction-rod']);
 }finally{db.raw.close();}
});
test('Fast Hands strict field and score validation keeps raw precision and rejects unsafe integers',()=>{
 for(const c of configs){const p=payload(c);assert.equal(validateSubmission(p).score,c[4]);for(const change of [{secondaryScore:0},{score:0},{score:Infinity},{scope:'qa'},{rules:'wrong'},{unit:'wrong'},{status:'wrong'}])assert.throws(()=>validateSubmission({...p,...change}));}
 for(const c of configs.slice(0,2))assert.throws(()=>validateSubmission({...payload(c),score:NOTE_FLOOR_MS}));
 for(const c of configs.slice(2))for(const score of [1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>validateSubmission({...payload(c),score}));
 assert.throws(()=>validateSubmission({...payload(configs[3]),score:11}));
});
test('Fast Hands rejects ambiguous queries and duplicate JSON keys without writes',async()=>{
 const {db,env}=await fixture();try{for(const c of configs){const p=payload(c);for(const suffix of ['&game='+c[0],'&scope=qa','&mode=touch'])assert.equal((await handleRequest(new Request(origin+'/api/leaderboard?game='+c[0]+c[5]+suffix),env)).status,400);assert.equal((await post(env,p,now,'?scope=qa')).status,400);for(const key of ['score','sc\\u006fre']){const raw=JSON.stringify(p).replace(/}$/,`,"${key}":1}`);assert.equal((await post(env,raw)).status,400);}}assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],0);}finally{db.raw.close();}
});
test('Fast Hands best-only ordering, duplicate conflicts and shared legacy cooldown remain enforced',async()=>{
 const {db,env}=await fixture();try{const c=configs[0],p=payload(c);assert.equal((await post(env,p)).status,200);assert.equal((await post(env,{...p,score:400})).status,409);assert.equal((await post(env,{...payload(configs[2]),submissionId:id(999)})).status,429);assert.equal((await post(env,{...p,submissionId:id(998),score:600},now+60001)).status,200);assert.equal((await post(env,{...p,submissionId:id(997),score:300.123456},now+120002)).status,200);assert.equal((await (await get(env,c)).json()).entries[0].score,300.123456);const legacy={...payload(['long-jump','journey-km-v1','km','valid',12]),submissionId:id(996)};assert.equal((await post(env,legacy,now+120003)).status,429);}finally{db.raw.close();}
});
test('all three Fast Hands play counts use existing tables and remain scope isolated',async()=>{
 const {db,env}=await fixture();try{for(const scope of ['qa','production']){const e={...env,LEADERBOARD_SCOPE:scope};for(const [i,game] of ['fast-hands','fast-hands-catch','fast-hands-duel'].entries()){const p={game,deviceId:id(i+1),runId:id(i+10),startedAt:now};const request=()=>new Request(origin+'/api/play-counts/starts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(p)});assert.equal((await handleRequest(request(),e,now)).status,200);assert.equal((await (await handleRequest(request(),e,now)).json()).duplicate,true);}const counts=(await (await handleRequest(new Request(origin+'/api/play-counts'),e,now)).json()).counts;for(const game of ['fast-hands','fast-hands-catch','fast-hands-duel'])assert.deepEqual(counts[game],{count:1,since:now});for(const game of ['long-jump','hurdles','reaction-rod','home'])assert.deepEqual(counts[game],{count:0,since:null});}}finally{db.raw.close();}
});
