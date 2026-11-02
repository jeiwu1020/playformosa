import test from 'node:test';import assert from 'node:assert/strict';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {LeaderboardRepository} from '../worker/leaderboard/repository.mjs';
import {BOARDS,handleRequest} from '../worker/leaderboard/index.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const entry=(n,extra={})=>({game:'long-jump',rules:'journey-km-v1',unit:'km',status:'valid',score:100,nickname:'島民',deviceId:id(1),submissionId:id(n),...extra});
test('actual SQLite atomic best, conflict, cooldown, concurrency, scope and ordering',async()=>{
 const db=await database(),repo=new LeaderboardRepository(db,'qa'),b=BOARDS['long-jump'],t=1_800_000_000_000;
 assert.equal((await repo.submit(entry(1),b,t)).accepted,true);
 assert.equal((await repo.submit(entry(1),b,t+1)).duplicate,true);
 assert.equal((await repo.submit(entry(1,{score:200}),b,t+1)).error,'conflict');
 assert.equal((await repo.submit(entry(2,{score:200}),b,t+1)).error,'limited');
 const out=await Promise.all([repo.submit(entry(3,{score:200}),b,t+60001),repo.submit(entry(4,{score:300}),b,t+60001)]);
 assert.equal(out.filter(x=>x.accepted).length,1);const winning=out[0].accepted?200:300;assert.equal((await repo.top('long-jump',b))[0].score,winning);
 assert.equal((await repo.submit(entry(5,{score:150}),b,t+120002)).accepted,true);assert.equal((await repo.top('long-jump',b))[0].score,winning);
 assert.deepEqual(await new LeaderboardRepository(db,'production').top('long-jump',b),[]);
 const h={game:'hurdles',rules:'110m-8h-v1',unit:'s',status:'done',score:20};
 await repo.submit(entry(6,h),BOARDS.hurdles,t+180003);await repo.submit(entry(7,{...h,score:18}),BOARDS.hurdles,t+240004);
 assert.equal((await repo.top('hurdles',BOARDS.hurdles))[0].score,18);
 db.raw.close();
});
test('fixed top20; global daily cap and limited cleanup do not grow rejected rows',async()=>{
 const db=await database(),repo=new LeaderboardRepository(db,'qa'),b=BOARDS['long-jump'],t=1_800_000_000_000;
 for(let i=0;i<21;i++)await repo.submit(entry(i+1,{deviceId:id(i+1),score:i+1}),b,t);
 assert.equal((await repo.top('long-jump',b)).length,20);assert.equal((await repo.top('long-jump',b))[0].score,21);
 const q=db.raw.prepare('INSERT INTO leaderboard_submissions VALUES(?,?,?,?,?,?,?,?,?,?)');
 for(let i=21;i<1000;i++)q.run(['qa',id(i+1),'hash','d'+i,'long-jump',b.rules,'島',1,t,Math.floor(t/86400000)]);q.free();
 assert.equal((await repo.submit(entry(1001,{deviceId:id(1001)}),b,t)).error,'limited');
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],1000);db.raw.close();
});
test('API strict same-origin/body bounded before DB and no client scope',async()=>{
 const db=await database(),env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:'https://qa.example'};
 const post=(body,origin='https://qa.example')=>new Request('https://qa.example/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body});
 assert.equal((await handleRequest(post(JSON.stringify(entry(1)),'https://evil.example'),env)).status,403);
 assert.equal((await handleRequest(post('x'.repeat(2049)),env)).status,413);
 assert.equal((await handleRequest(post(JSON.stringify({...entry(1),environment:'production'})),env)).status,400);
 assert.equal((await handleRequest(post(JSON.stringify(entry(1))),env)).status,200);
 const result=await (await handleRequest(new Request('https://qa.example/api/leaderboard?game=long-jump'),env)).json();assert.equal(result.entries.length,1);assert.deepEqual(Object.keys(result.entries[0]).sort(),['isMe','nickname','rank','score']);
 assert.equal((await handleRequest(new Request('https://qa.example/api/leaderboard?game=constructor'),env)).status,400);db.raw.close();
});
test('simultaneous same UUID is idempotent; conflicting race cannot update a second score',async()=>{
 const db=await database(),r=new LeaderboardRepository(db,'qa'),b=BOARDS['long-jump'],t=1800000000000;
 const both=await Promise.all([r.submit(entry(1),b,t),r.submit(entry(1),b,t)]);assert.ok(both.every(x=>x.accepted));assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],1);
 const race=await Promise.all([r.submit(entry(2,{score:200}),b,t+60001),r.submit(entry(2,{score:300}),b,t+60001)]);assert.equal(race.filter(x=>x.accepted).length,1);assert.equal(race.filter(x=>x.error==='conflict').length,1);assert.equal((await r.top('long-jump',b))[0].score,race[0].accepted?200:300);assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],2);db.raw.close();
});
test('best storage cap refuses new devices, still accepts existing best; receipt cleanup is bounded',async()=>{
 const db=await database(),repo=new LeaderboardRepository(db,'qa'),b=BOARDS['long-jump'],t=1800000000000;
 await repo.submit(entry(1),b,t);const q=db.raw.prepare('INSERT INTO leaderboard_best VALUES(?,?,?,?,?,?,?)');for(let i=1;i<10000;i++)q.run(['qa','long-jump',b.rules,'f'+i,'島',1,t]);q.free();
 assert.equal((await repo.submit(entry(2,{deviceId:id(2)}),b,t+60001)).error,'limited');assert.equal((await repo.submit(entry(3,{score:200}),b,t+60001)).accepted,true);
 const receipt=db.raw.prepare('INSERT INTO leaderboard_submissions VALUES(?,?,?,?,?,?,?,?,?,?)');for(let i=0;i<150;i++)receipt.run(['qa','old'+i,'hash','old','long-jump',b.rules,'島',1,t-8*86400000,0]);receipt.free();
 await repo.submit(entry(4,{score:300}),b,t+120002);assert.equal(db.raw.exec("SELECT count(*) FROM leaderboard_submissions WHERE id LIKE 'old%'")[0].values[0][0],50);db.raw.close();
});
