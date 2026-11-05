import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARDS,handleRequest,validateSubmission} from '../worker/leaderboard/index.mjs';
import {NOTE_FLOOR_MS} from '../public/games/fast-hands/challenge.mjs';
import {database} from './helpers/leaderboard-sqlite.mjs';

const origin='https://qa.example';
const now=1_800_000_000_000;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload=(changes={})=>({game:'fast-hands',rules:'shuttle-v3-mouse',unit:'ms',status:'success',score:475.125,nickname:'快手玩家',deviceId:id(1),submissionId:id(1),...changes});
const env=(DB,scope='qa')=>({DB,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:scope,LEADERBOARD_ORIGIN:origin});
const get=(query='game=fast-hands&mode=mouse',deviceId)=>new Request(`${origin}/api/leaderboard?${query}`,{headers:deviceId?{'X-Leaderboard-Device':deviceId}:{}});
const post=(body,options={})=>new Request(`${origin}/api/leaderboard/submissions${options.query??''}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...options.headers},body:typeof body==='string'?body:JSON.stringify(body)});
async function fixture(t){const db=await database();t.after(()=>db.raw.close());return db;}
const count=(db,table)=>db.raw.exec(`SELECT count(*) FROM ${table}`)[0].values[0][0];

// Rejecting a legal Fast Hands result, rounding it, or admitting a floor-time result breaks this contract.
test('Fast Hands accepts both exact rules and preserves positive raw milliseconds below the physics floor',()=>{
 for(const rules of ['shuttle-v3-mouse','shuttle-v3-touch']){
  for(const score of [Number.MIN_VALUE,475.125,NOTE_FLOOR_MS-1e-9]){
   assert.equal(validateSubmission(payload({rules,score})).score,score);
  }
  for(const score of [0,-1,NaN,Infinity,-Infinity,'475',null,NOTE_FLOOR_MS,NOTE_FLOOR_MS+1e-9,Number.MAX_VALUE]){
   assert.throws(()=>validateSubmission(payload({rules,score})),/invalid_score/);
  }
 }
});

test('Fast Hands validates exact board identity, eight fields, nickname and IDs without caller scope or mode',()=>{
 for(const changes of [
  {rules:'shuttle-v3'},{rules:'shuttle-v2-mouse'},{rules:'shuttle-v3-pen'},
  {rules:'shuttle-v3-Mouse'},{rules:'constructor'},{rules:['shuttle-v3-mouse']},
  {unit:'s'},{unit:'MS'},{status:'failed'},{status:'done'},
  {mode:'touch'},{scope:'qa'},{environment:'production'},{secondaryScore:0},{secondaryScore:1},
  {nickname:' '},{nickname:'x\nY'},{nickname:'<b>x</b>'},
  {deviceId:'invalid'},{submissionId:id(1).replace('-4000-','-1000-')}
 ])assert.throws(()=>validateSubmission(payload(changes)),JSON.stringify(changes));
 const withLetters=payload({deviceId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'});
 assert.equal(validateSubmission(withLetters).deviceId,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 assert.deepEqual(Object.keys(validateSubmission(payload())),['game','rules','unit','status','score','nickname','deviceId','submissionId']);
});

// Query ambiguity must fail before a database request, rather than silently selecting a mode.
test('Fast Hands GET requires exactly one game and one explicit supported mode',async t=>{
 const db=await fixture(t);
 for(const mode of ['mouse','touch']){
  const response=await handleRequest(get(`mode=${mode}&game=fast-hands`),env(db));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{game:'fast-hands',rules:`shuttle-v3-${mode}`,unit:'ms',entries:[],own:null});
  assert.equal(response.headers.get('Cache-Control'),'public, max-age=30');
 }
 for(const query of [
  'game=fast-hands','game=fast-hands&mode=','game=fast-hands&mode=pen',
  'game=fast-hands&mode=Mouse','game=fast-hands&mode=constructor',
  'game=fast-hands&mode=mouse&mode=touch','game=fast-hands&mode=mouse&mode=mouse',
  'game=fast-hands&game=fast-hands&mode=mouse','game=fast-hands&game=hurdles&mode=mouse',
  'game=fast-hands&mode=mouse&scope=production','game=fast-hands&mode=mouse&rules=shuttle-v3-touch',
  'game=fast-hands&mode=mouse&extra=1'
 ]){
  const response=await handleRequest(get(query),env(db));
  assert.equal(response.status,400,query);
  assert.deepEqual(await response.json(),{error:'invalid_board'});
 }
 assert.equal(count(db,'leaderboard_submissions'),0);
});

test('Fast Hands invalid bodies and duplicate JSON keys are rejected without writes',async t=>{
 const db=await fixture(t),body=JSON.stringify(payload());
 for(const bad of [
  payload({rules:'shuttle-v3'}),payload({unit:'s'}),payload({status:'failed'}),
  payload({score:NOTE_FLOOR_MS}),payload({score:'475.125'}),payload({scope:'qa'}),payload({mode:'mouse'}),payload({secondaryScore:0}),
  body.replace('"score":475.125','"score":600,"score":475.125'),
  body.replace('"score":475.125','"score":475.125,"score":475.125'),
  body.replace('"rules":"shuttle-v3-mouse"','"rules":"shuttle-v3-touch","rules":"shuttle-v3-mouse"'),
  body.replace('"score":475.125','"score":600,"sco\\u0072e":475.125'),
  body.replace('"nickname":"快手玩家"','"nickname":"first","nickname":"快手玩家"'),
  body.replace('"game":"fast-hands"','"game":"fast-hands","ga\\u006de":"fast-hands"'),
  '{', 'null', '[]', body.replace('475.125','1e999')
 ]){
  const response=await handleRequest(post(bad),env(db),now);
  assert.equal(response.status,400,typeof bad==='string'?bad:JSON.stringify(bad));
  assert.deepEqual(await response.json(),{error:'invalid_submission'});
 }
 assert.equal(count(db,'leaderboard_submissions'),0);
 assert.equal(count(db,'leaderboard_best'),0);
});

test('quoted nickname text is not mistaken for duplicate JSON properties',async t=>{
 const db=await fixture(t);
 const response=await handleRequest(post(payload({nickname:'"score":名字'})),env(db),now);
 assert.equal(response.status,200);
 assert.equal((await response.json()).own.nickname,'"score":名字');
});

// Separate board queries and row updates must retain mode-specific personal bests.
test('mouse and touch boards isolate bests, own rank, raw milliseconds and competition ties',async t=>{
 const db=await fixture(t);
 for(const [device,score] of [[1,510.125],[2,410.125],[3,410.125],[4,510.124]]){
  const response=await handleRequest(post(payload({deviceId:id(device),submissionId:id(device),score,nickname:`玩家${device}`})),env(db),now);
  assert.equal(response.status,200);
 }
 const touch=await handleRequest(post(payload({rules:'shuttle-v3-touch',score:700.875,submissionId:id(5)})),env(db),now+60001);
 assert.equal(touch.status,200);
 let response=await handleRequest(get('game=fast-hands&mode=mouse',id(1)),env(db));
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 assert.equal(response.headers.get('Vary'),'X-Leaderboard-Device');
 let result=await response.json();
 assert.deepEqual(result.entries.map(x=>x.score),[410.125,410.125,510.124,510.125]);
 assert.deepEqual(result.entries.map(x=>x.rank),[1,1,3,4]);
 assert.deepEqual(result.entries.map(x=>x.isMe),[false,false,false,true]);
 assert.equal(result.own.score,510.125);assert.equal(result.own.rank,4);
 assert.ok(Math.abs(result.own.gap-.001)<1e-10);
 assert.deepEqual(Object.keys(result.entries[0]).sort(),['isMe','nickname','rank','score']);
 result=await (await handleRequest(get('game=fast-hands&mode=touch',id(1)),env(db))).json();
 assert.deepEqual(result.entries,[{nickname:'快手玩家',score:700.875,rank:1,isMe:true}]);
 assert.deepEqual(result.own,{nickname:'快手玩家',score:700.875,rank:1,gap:null});
 assert.equal((await (await handleRequest(get('game=fast-hands&mode=touch',id(2)),env(db))).json()).own,null);
 assert.equal(count(db,'leaderboard_best'),5);
});

test('only faster milliseconds improve a personal best; equal runs do not replace it',async t=>{
 const db=await fixture(t);
 for(const [run,score,expected,bestUpdated] of [[1,500.125,500.125,true],[2,500.124,500.124,true],[3,500.124,500.124,false],[4,600,500.124,false]]){
  const response=await handleRequest(post(payload({submissionId:id(run),score,nickname:`run${run}`})),env(db),now+(run-1)*60001);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.bestUpdated,bestUpdated);assert.equal(result.own.score,expected);
  if(run>=3)assert.equal(result.own.nickname,'run2');
 }
});

test('Fast Hands retries are idempotent and changed score or mode conflicts on the same submission ID',async t=>{
 const db=await fixture(t),body=payload();
 const first=await handleRequest(post(body),env(db),now);assert.equal(first.status,200);
 assert.equal((await first.json()).bestUpdated,true);
 const retry=await handleRequest(post(Object.fromEntries(Object.entries(body).reverse())),env(db),now+1);
 assert.equal(retry.status,200);assert.deepEqual(await retry.json(),{accepted:true,duplicate:true,bestUpdated:false,own:{nickname:'快手玩家',score:475.125,rank:1,gap:null}});
 for(const changes of [{score:400},{rules:'shuttle-v3-touch'}]){
  const conflict=await handleRequest(post({...body,...changes}),env(db),now+2);
  assert.equal(conflict.status,409);assert.deepEqual(await conflict.json(),{error:'conflict'});
 }
 assert.equal(count(db,'leaderboard_submissions'),1);assert.equal(count(db,'leaderboard_best'),1);
});

test('device cooldown applies across Fast Hands modes and leaves rejected attempts unrecorded',async t=>{
 const db=await fixture(t);
 assert.equal((await handleRequest(post(payload()),env(db),now)).status,200);
 const limited=await handleRequest(post(payload({rules:'shuttle-v3-touch',submissionId:id(2)})),env(db),now+59999);
 assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'1');
 assert.deepEqual(await limited.json(),{error:'limited',reason:'cooldown',retryAfterSeconds:1});
 assert.equal(count(db,'leaderboard_submissions'),1);
 assert.equal((await handleRequest(post(payload({rules:'shuttle-v3-touch',submissionId:id(2)})),env(db),now+60000)).status,200);
 assert.equal(count(db,'leaderboard_submissions'),2);
});

test('simultaneous Fast Hands duplicate submissions persist once and conflicting scores cannot both win',async t=>{
 const db=await fixture(t);
 const both=await Promise.all([handleRequest(post(payload()),env(db),now),handleRequest(post(payload()),env(db),now)]);
 const results=await Promise.all(both.map(x=>x.json()));
 assert.ok(both.every(x=>x.status===200));
 assert.equal(results.filter(x=>x.bestUpdated).length,1);assert.equal(results.filter(x=>x.duplicate).length,1);
 const race=await Promise.all([400.125,300.875].map(score=>handleRequest(post(payload({score,submissionId:id(2)})),env(db),now+60001)));
 assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
 assert.equal(count(db,'leaderboard_submissions'),2);
 const winner=await race.find(x=>x.status===200).json();
 const result=await (await handleRequest(get(),env(db))).json();
 assert.equal(result.entries[0].score,winner.own.score);
});

test('Fast Hands cannot read or write production, or select scope through a request',async t=>{
 const db=await fixture(t);
 db.raw.run("INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES('production','fast-hands','shuttle-v3-mouse','prod','Production only',100,0)");
 assert.deepEqual((await (await handleRequest(get(),env(db))).json()).entries,[]);
 for(const request of [get(),get('game=fast-hands&mode=touch'),post(payload()),post(payload({rules:'shuttle-v3-touch'}))]){
  const response=await handleRequest(request,env(db,'production'),now);
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
 }
 for(const query of ['?scope=production','?mode=touch','?game=fast-hands','?mode=mouse&mode=touch']){
  const response=await handleRequest(post(payload(),{query}),env(db),now);
  assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'invalid_submission'});
 }
 assert.equal(count(db,'leaderboard_submissions'),0);
 assert.equal(count(db,'leaderboard_best'),1);
});

test('Fast Hands scope and origin gates reject before any database access',async()=>{
 const forbiddenDb={prepare(){throw new Error('Database access forbidden');},batch(){throw new Error('Database access forbidden');}};
 for(const request of [get(),post(payload())]){
  const response=await handleRequest(request,env(forbiddenDb,'production'),now);
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
 }
 const denied=await handleRequest(post(payload(),{headers:{Origin:'https://evil.example'}}),env(forbiddenDb),now);
 assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{error:'origin'});
 const disabled=await handleRequest(get(),{...env(forbiddenDb),LEADERBOARD_ENABLED:'false'},now);
 assert.equal(disabled.status,503);assert.deepEqual(await disabled.json(),{error:'unavailable'});
});

test('Fast Hands body limits and malformed IDs do not reach storage',async t=>{
 const db=await fixture(t);
 assert.equal((await handleRequest(post('x'.repeat(2049)),env(db),now)).status,413);
 assert.equal((await handleRequest(post(payload(),{headers:{'Content-Type':'text/plain'}}),env(db),now)).status,415);
 assert.equal((await handleRequest(get('game=fast-hands&mode=mouse','bad-id'),env(db),now)).status,400);
 assert.equal(count(db,'leaderboard_submissions'),0);
});

test('Fast Hands database faults return temporary unavailability without a success receipt',async()=>{
 const fault={prepare(){throw new Error('database unavailable');},batch(){throw new Error('database unavailable');}};
 for(const request of [get(),post(payload())]){
  const response=await handleRequest(request,env(fault),now);
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'temporarily_unavailable'});
 }
});

// Fast Hands extension must not alter any of the nine established game schemas or production routes.
test('all nine legacy contracts retain validation, GET shape, ranking direction and production access',async t=>{
 const db=await fixture(t);
 const legacy=[
  ['long-jump','journey-km-v1','km','valid',123.25,'desc'],
  ['hurdles','110m-8h-v1','s','done',16.7,'asc'],
  ['high-jump','cleared-height-v1','m','cleared',2.1,'desc'],
  ['pole-vault','highest-feet-v1','m','done',4.5,'desc'],
  ['shot-put','relay-distance-v1','m','valid',13.2,'desc'],
  ['discus','wind-ufo-distance-v1','m','valid',44.5,'desc'],
  ['reaction-rod','catch-rating-v1','catches','done',8,'desc'],
  ['beer-slide','accuracy-retention-v1','points','valid',9.7,'desc'],
  ['tower-climb','indoor-10floors-v1','s','summit',45.2,'asc']
 ];
 assert.deepEqual(Object.keys(BOARDS),legacy.map(x=>x[0]));
 for(const [i,[game,rules,unit,status,score,direction]] of legacy.entries()){
  assert.equal(BOARDS[game].direction,direction);
  const body=payload({game,rules,unit,status,score,deviceId:id(i+1),submissionId:id(i+1),...(game==='reaction-rod'?{secondaryScore:7.5}:{})});
  assert.equal(validateSubmission(body).score,score);
  assert.equal((await handleRequest(post(body),env(db,'production'),now)).status,200,game);
  const response=await handleRequest(get(`game=${game}`),env(db,'production'));
  assert.equal(response.status,200,game);
  const result=await response.json();
  assert.deepEqual(Object.keys(result).sort(),['entries','game','own','rules','unit']);
  assert.equal(result.game,game);assert.equal(result.rules,rules);assert.equal(result.unit,unit);
  assert.equal(result.entries[0].score,score);
  assert.equal((await handleRequest(get(`game=${game}&mode=mouse`),env(db,'production'))).status,400);
  assert.deepEqual((await (await handleRequest(get(`game=${game}`),env(db))).json()).entries,[]);
 }
});
