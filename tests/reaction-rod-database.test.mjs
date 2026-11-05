import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {LeaderboardRepository} from '../worker/leaderboard/repository.mjs';
import {ReactionRodRepository} from '../worker/leaderboard/reaction-rod-repository.mjs';
import {BOARDS,handleRequest} from '../worker/leaderboard/index.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,t=1800000000000;
const rod=(n,extra={})=>({game:'reaction-rod',rules:'catch-rating-v1',unit:'catches',status:'done',score:5,secondaryScore:4.5123456789,nickname:'島民'+n,deviceId:id(n),submissionId:id(1000+n),...extra});
const jump=(n,extra={})=>({game:'long-jump',rules:'journey-km-v1',unit:'km',status:'valid',score:10,nickname:'選手'+n,deviceId:id(n),submissionId:id(2000+n),...extra});
const migrate=db=>db.raw.run(readFileSync(new URL('../worker/leaderboard/003-reaction-rod-production.sql',import.meta.url),'utf8'));
test('additive Rod migration preserves all old rows, original tie order, and backward-compatible writes',async()=>{
 const db=await database(),r=new LeaderboardRepository(db,'production');
 try{await r.submit(jump(9),BOARDS['long-jump'],t);await r.submit(jump(1),BOARDS['long-jump'],t+1);
 const before=await r.board('long-jump',BOARDS['long-jump'],id(9)),rows=db.raw.exec('SELECT scope,game,rules,device,nickname,score,updated_at FROM leaderboard_best');
 migrate(db);assert.deepEqual(await r.board('long-jump',BOARDS['long-jump'],id(9)),before);assert.deepEqual(db.raw.exec('SELECT scope,game,rules,device,nickname,score,updated_at FROM leaderboard_best'),rows);
 assert.equal((await r.submit(jump(7),BOARDS['long-jump'],t+2)).accepted,true);assert.deepEqual((await r.board('long-jump',BOARDS['long-jump'])).entries.map(x=>x.nickname),['選手9','選手1','選手7']);assert.equal(db.raw.exec('SELECT MAX(secondary_score) FROM leaderboard_best')[0].values[0][0],0);
 }finally{db.raw.close();}
});
test('Rod keeps full-precision rating ties, best-only update, gap units, duplicates, per-game cooldown and scope',async()=>{
 const db=await database();migrate(db);const r=new ReactionRodRepository(db,'production'),b=BOARDS['reaction-rod'];
 try{await r.submit(rod(1),b,t);await r.submit(rod(2,{secondaryScore:4.6}),b,t);await r.submit(rod(3,{score:6,secondaryScore:0}),b,t);
 let board=await r.board('reaction-rod',b,id(1));assert.deepEqual(board.entries.map(x=>x.score),[6,5,5]);assert.equal(board.own.secondaryScore,4.5123456789);assert.equal(board.own.gapMetric,'rating');assert.ok(Math.abs(board.own.gap-(4.6-4.5123456789))<1e-12);
 assert.equal((await r.submit(rod(1),b,t+1)).duplicate,true);assert.equal((await r.submit(rod(1,{secondaryScore:4.9}),b,t+1)).error,'conflict');
 assert.deepEqual(await r.submit(rod(1,{submissionId:id(9000)}),b,t+12345),{error:'limited',reason:'cooldown',retryAfterSeconds:48});
 const legacy=new LeaderboardRepository(db,'production');assert.equal((await legacy.submit(jump(1),BOARDS['long-jump'],t+1)).accepted,true);
 assert.equal((await r.submit(rod(1,{submissionId:id(9001),secondaryScore:4.9}),b,t+60001)).bestUpdated,true);
 assert.equal((await r.submit(rod(1,{submissionId:id(9002),score:4,secondaryScore:10}),b,t+120002)).bestUpdated,false);
 assert.equal((await new ReactionRodRepository(db,'qa').board('reaction-rod',b)).entries.length,0);
 }finally{db.raw.close();}
});
test('without new columns only Rod is unavailable, and no request mutates schema or legacy game service',async()=>{
 const db=await database(),env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'production',LEADERBOARD_ORIGIN:'https://prod.example'};
 try{const before=db.raw.exec("SELECT sql FROM sqlite_schema ORDER BY name");
 assert.equal((await handleRequest(new Request('https://prod.example/api/leaderboard?game=reaction-rod'),env)).status,503);
 assert.equal((await handleRequest(new Request('https://prod.example/api/leaderboard?game=long-jump'),env)).status,200);
 assert.deepEqual(db.raw.exec("SELECT sql FROM sqlite_schema ORDER BY name"),before);
 migrate(db);const p=new Request('https://prod.example/api/leaderboard/submissions',{method:'POST',headers:{Origin:env.LEADERBOARD_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(rod(1))});assert.equal((await handleRequest(p,env,t)).status,200);
 const response=await (await handleRequest(new Request('https://prod.example/api/leaderboard?game=reaction-rod'),env)).json();assert.equal(response.entries[0].secondaryScore,4.5123456789);assert.equal(response.entries[0].score,5);
 }finally{db.raw.close();}
});
