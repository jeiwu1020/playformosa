import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {database} from '../helpers/leaderboard-sqlite.mjs';
import {validateSubmission,handleRequest} from '../../worker/leaderboard/index.mjs';
import {mountLeaderboard,eligibleResult} from '../../public/games/shared/leaderboard.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload=(n=1,score=8,secondaryScore=1,extra={})=>({game:'courtesy-contest',rules:'press-courtesy-v2',unit:'courtesies',status:'seated',score,secondaryScore,nickname:'客氣玩家',deviceId:id(n),submissionId:id(n),...extra});
const fixture=async()=>{const db=await database(),env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:'https://qa.example'};return {db,env,post:(p,time=100000)=>handleRequest(new Request('https://qa.example/api/leaderboard/submissions',{method:'POST',headers:{Origin:env.LEADERBOARD_ORIGIN,'Content-Type':'application/json'},body:typeof p==='string'?p:JSON.stringify(p)}),env,time),board:async device=>(await handleRequest(new Request('https://qa.example/api/leaderboard?game=courtesy-contest',{headers:device?{'X-Leaderboard-Device':id(device)}:{}}),env)).json()};};
test('courtesy strict QA contract permits seated zero and rejects invalid bounds/status/extra fields',()=>{
 assert.equal(validateSubmission(payload(1,0,30),'qa').score,0);
 assert.equal(validateSubmission(payload(1,1,.01),'qa').secondaryScore,.01);
 for(const change of [{score:-1},{score:.5},{score:Number.MAX_SAFE_INTEGER},{score:Number.MAX_SAFE_INTEGER+1},{score:Infinity},{score:NaN},{secondaryScore:-.01},{secondaryScore:30.01},{secondaryScore:NaN},{secondaryScore:'1'},{secondaryScore:undefined},{status:'failed'},{status:'done'},{rules:'old'},{unit:'s'},{seated:true}])assert.throws(()=>validateSubmission({...payload(),...change},'qa'));
 assert.throws(()=>validateSubmission(payload(),'production'));
});
test('SQLite courtesy ranks count DESC / remaining ASC, ties and own nearest gap; best tuple updates only',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());
 for(const [n,count,seconds] of [[1,8,1],[2,8,1],[3,8,2],[4,7,.01],[5,0,30]])assert.equal((await f.post(payload(n,count,seconds))).status,200);
 let b=await f.board(3);assert.deepEqual(b.entries.map(x=>[x.score,x.secondaryScore,x.rank]),[[8,1,1],[8,1,1],[8,2,3],[7,.01,4],[0,30,5]]);assert.equal(b.own.rank,3);assert.equal(b.own.gap,1);assert.equal(b.own.gapMetric,'remaining');
 assert.equal((await f.board(4)).own.gapMetric,'courtesies');assert.equal((await f.board(4)).own.gap,1);
 for(const [run,count,seconds,updated] of [[10,8,.5,true],[11,8,3,false],[12,7,.01,false],[13,9,30,true]]){const r=await f.post(payload(3,count,seconds,{submissionId:id(run)}),100000+(run-9)*61000);assert.equal((await r.json()).bestUpdated,updated);}
 b=await f.board(3);assert.equal(b.own.score,9);assert.equal(b.own.secondaryScore,30);assert.equal(b.own.rank,1);assert.equal(b.own.gap,null);
});
test('SQLite courtesy duplicate, conflict, cooldown and strict malformed requests preserve admitted best',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());const p=payload(1,0,.01);
 assert.equal((await f.post(p)).status,200);assert.equal((await (await f.post(p)).json()).duplicate,true);assert.equal((await f.post({...p,secondaryScore:1})).status,409);
 const limited=await f.post({...p,submissionId:id(2)},100001);assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');
 const duplicateKey=JSON.stringify(payload(3)).replace('"score":8','"score":1,"score":8');assert.equal((await f.post(duplicateKey)).status,400);
 for(const change of [{status:'failed'},{score:-1},{secondaryScore:31}])assert.equal((await f.post({...payload(4),...change})).status,400);
 assert.equal((await f.board()).entries.length,1);
 f.env.LEADERBOARD_SCOPE='production';assert.equal((await f.post(payload(10))).status,400);assert.equal((await f.board()).error,'invalid_board');
});
test('courtesy client eligibility uses completed safe-seat snapshot, includes zero, excludes bonus',()=>{
 const r={phase:'done',seated:true,count:0,remaining:30,chainBonus:100};assert.deepEqual(eligibleResult('courtesy-contest',r),{score:0,status:'seated',secondaryScore:30});
 for(const change of [{phase:'play'},{seated:false},{seated:1},{count:-1},{count:.5},{remaining:31},{remaining:NaN},{remaining:undefined}])assert.equal(eligibleResult('courtesy-contest',{...r,...change}),null);
});
test('courtesy shared client manually uploads correct tuple and labels seconds without private auth',async t=>{
 const d=new JSDOM('<section id="entry"></section><section id="result"></section>',{url:'https://qa.example/'});t.after(()=>d.window.close());const doc=d.window.document,calls=[];
 const c=mountLeaderboard({document:doc,game:'courtesy-contest',enabled:true,entry:doc.querySelector('#entry'),result:doc.querySelector('#result'),fetcher:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>opts.method?{accepted:true,duplicate:false,bestUpdated:true}:{game:'courtesy-contest',rules:'press-courtesy-v2',unit:'courtesies',entries:[],own:null}};}});assert.ok(c);t.after(()=>c.destroy());
 c.setResult({phase:'done',seated:true,count:0,remaining:.01});assert.equal(calls.length,0);const panel=doc.querySelector('#result details');assert.equal(panel.hidden,false);assert.match(panel.textContent,/0 次.*0.01 秒/);panel.querySelector('input').value='測試';panel.querySelector('[data-submit]').click();await new Promise(r=>setImmediate(r));
 assert.equal(calls.filter(x=>x.opts.method==='POST').length,1);assert.deepEqual(JSON.parse(calls[0].opts.body),{...payload(1,0,.01),nickname:'測試',deviceId:JSON.parse(calls[0].opts.body).deviceId,submissionId:JSON.parse(calls[0].opts.body).submissionId});
 c.setResult({phase:'done',seated:false,count:20,remaining:0});assert.equal(panel.hidden,true);
});
test('courtesy top20 and outside own rank match independent mixed-direction ranking including zero ties',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());const scores=Array.from({length:26},(_,i)=>({n:i+1,count:i%4,seconds:((i*7)%31)||.01}));
 for(const row of scores)assert.equal((await f.post(payload(row.n,row.count,row.seconds))).status,200);
 const expected=[...scores].sort((a,b)=>b.count-a.count||a.seconds-b.seconds);
 for(const row of scores){const board=await f.board(row.n),better=scores.filter(x=>x.count>row.count||(x.count===row.count&&x.seconds<row.seconds));assert.equal(board.own.rank,better.length+1);assert.equal(board.own.score,row.count);assert.equal(board.own.secondaryScore,row.seconds);assert.deepEqual(board.entries.map(x=>[x.score,x.secondaryScore]),expected.slice(0,20).map(x=>[x.count,x.seconds]));}
});
test('courtesy query shape and escaped duplicate fields fail before writes',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());
 for(const query of ['game=courtesy-contest&game=courtesy-contest','game=courtesy-contest&mode=mouse'])assert.equal((await handleRequest(new Request('https://qa.example/api/leaderboard?'+query),f.env)).status,400);
 const duplicate=JSON.stringify(payload()).replace('"score":8','"scor\\u0065":1,"score":8');assert.equal((await f.post(duplicate)).status,400);
 const response=await handleRequest(new Request('https://qa.example/api/leaderboard/submissions?x=1',{method:'POST',headers:{Origin:f.env.LEADERBOARD_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(payload())}),f.env);assert.equal(response.status,400);assert.equal((await f.board()).entries.length,0);
});

test('courtesy storage encoding stays safe at upper bound and canonical retries do not change payload hash',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());const p=payload(1,Number.MAX_SAFE_INTEGER-1,30);
 assert.equal((await f.post(p)).status,200);assert.equal((await f.board(1)).own.score,p.score);
 const reversed=Object.fromEntries(Object.entries(p).reverse());assert.equal((await (await f.post(reversed)).json()).duplicate,true);
 assert.equal((await f.post({...p,score:0})).status,409);assert.equal((await f.post(payload(2,Number.MAX_SAFE_INTEGER,0))).status,400);
 assert.equal(eligibleResult('courtesy-contest',{phase:'done',seated:true,count:Number.MAX_SAFE_INTEGER,remaining:0}),null);
 assert.equal(f.db.raw.exec('SELECT score FROM leaderboard_best')[0].values[0][0],Number.MAX_SAFE_INTEGER);
});
test('courtesy concurrent retries keep one receipt and conflicting tuples cannot overwrite the winning receipt',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());const p=payload(1,0,1);
 const both=await Promise.all([f.post(p),f.post(p)]);const results=await Promise.all(both.map(x=>x.json()));assert.ok(results.every(x=>x.accepted));assert.equal(results.filter(x=>x.bestUpdated).length,1);assert.equal(results.filter(x=>x.duplicate).length,1);
 const first=payload(1,1,3,{submissionId:id(2)}),second={...first,secondaryScore:2};const races=await Promise.all([f.post(first,161000),f.post(second,161000)]);assert.deepEqual(races.map(x=>x.status).sort(),[200,409]);const winner=races[0].status===200?first:second;const b=await f.board(1);assert.equal(b.own.score,winner.score);assert.equal(b.own.secondaryScore,winner.secondaryScore);assert.equal(f.db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],2);
});
test('courtesy ranking uses its existing home-card icon while legacy board icons remain unchanged',t=>{
 const d=new JSDOM('<section id="entry"></section>',{url:'https://qa.example/'});t.after(()=>d.window.close());const doc=d.window.document;
 for(const game of ['courtesy-contest','reaction-rod']){const c=mountLeaderboard({document:doc,game,enabled:true,entry:doc.querySelector('#entry')});assert.equal(doc.querySelector('.pf-honor-board header img').getAttribute('src'),game==='courtesy-contest'?'/assets/courtesy-contest-card.jpg':'/assets/app-icons/reaction-rod/apple-touch-icon.png');c.destroy();}
});

test('old seated timing rules cannot enter press-time leaderboard',()=>{assert.throws(()=>validateSubmission(payload(1,8,1,{rules:'seated-courtesy-v1'}),'qa'));});
test('new press-time board isolates historical seated rows without deleting them',async t=>{
 const f=await fixture();t.after(()=>f.db.raw.close());
 f.db.raw.run("INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at,secondary_score) VALUES('qa','courtesy-contest','seated-courtesy-v1','old-device','old',99,1,0)");
 assert.deepEqual((await f.board()).entries,[]);
 assert.equal((await f.post(payload(1,3,.01))).status,200);
 const b=await f.board();assert.equal(b.rules,'press-courtesy-v2');assert.deepEqual(b.entries.map(x=>[x.score,x.secondaryScore]),[[3,.01]]);
 assert.equal(f.db.raw.exec("SELECT count(*) FROM leaderboard_best WHERE rules='seated-courtesy-v1'")[0].values[0][0],1);
});
test('press-time scores use strictly positive hundredths consistently on client and server',()=>{
 for(const seconds of [0,.001,.009,.011,1.234]){
  assert.throws(()=>validateSubmission(payload(1,8,seconds),'qa'));
  assert.equal(eligibleResult('courtesy-contest',{phase:'done',seated:true,count:8,remaining:seconds}),null);
 }
 for(const seconds of [.01,.07,.29,1.01,29.99,30])assert.equal(validateSubmission(payload(1,8,seconds),'qa').secondaryScore,seconds);
});
