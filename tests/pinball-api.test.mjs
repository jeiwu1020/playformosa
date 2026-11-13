import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleRequest, validateSubmission} from '../worker/leaderboard/index.mjs';
import {database} from './helpers/leaderboard-sqlite.mjs';
const origin='https://qa.example', now=1_800_000_000_000;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const specs=[['60s','office-overtime-flow-60-v6'],['180s','office-overtime-flow-180-v6'],['unlimited','office-overtime-flow-unlimited-v6']];
const payload=(i,n=1,score=1000)=>({game:'overtime-pinball-'+specs[i][0],rules:specs[i][1],unit:'points',status:'done',score,nickname:'測試玩家'+n,deviceId:id(n),submissionId:id(i*100+n)});
const env=(DB,scope='qa')=>({DB,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:scope,LEADERBOARD_ORIGIN:origin});
const post=(body,query='',from=origin)=>new Request(origin+'/api/leaderboard/submissions'+query,{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
const get=(i,extra='')=>new Request(origin+'/api/leaderboard?game='+payload(i).game+extra);
async function fixture(t){const db=await database();t.after(()=>db.raw.close());return db;}
const all=(db,table)=>db.raw.exec(`SELECT * FROM ${table} ORDER BY 1,2,3,4`)[0]?.values??[];

for(const i of [0,1,2]) test('QA '+specs[i][0]+' preserves exact zero/integer score and descending tied ranks',async t=>{
 const db=await fixture(t);
 for(const [n,score] of [[1,0],[2,3000],[3,3000],[4,1000]])assert.equal((await handleRequest(post(payload(i,n,score)),env(db),now)).status,200);
 const result=await (await handleRequest(get(i),env(db),now)).json();
 assert.equal(result.game,payload(i).game);assert.equal(result.rules,specs[i][1]);assert.equal(result.unit,'points');
 assert.deepEqual(result.entries.map(r=>[r.score,r.rank]),[[3000,1],[3000,1],[1000,3],[0,4]]);
 const own=await (await handleRequest(new Request(get(i),{headers:{'X-Leaderboard-Device':id(4)}}),env(db),now)).json();
 assert.deepEqual(own.own,{nickname:'測試玩家4',score:1000,rank:3,gap:2000});
 assert.equal(db.raw.exec('SELECT MIN(score) FROM leaderboard_best')[0].values[0][0],1);
});

test('same device keeps three independent mode scores; reusing UUID conflicts across modes',async t=>{
 const db=await fixture(t);
 for(const [i,score] of [600,1800,9000].entries())assert.equal((await handleRequest(post(payload(i,1,score)),env(db),now)).status,200);
 for(const [i,score] of [600,1800,9000].entries())assert.deepEqual((await (await handleRequest(get(i),env(db),now)).json()).entries.map(r=>r.score),[score]);
 const p=payload(0,1,600);assert.equal((await (await handleRequest(post(p),env(db),now+1)).json()).duplicate,true);
 assert.equal((await handleRequest(post({...payload(1,1,1200),submissionId:p.submissionId}),env(db),now+60001)).status,409);
 assert.equal(db.raw.exec('SELECT COUNT(*) FROM leaderboard_submissions')[0].values[0][0],3);
});

test('strict pinball fields/rules/ranges/duplicate keys reject before any writes',async t=>{
 const db=await fixture(t);
 for(const i of [0,1,2]){
  const p=payload(i);
  for(const extra of [{score:-1},{score:.5},{score:Number.MAX_SAFE_INTEGER},{score:NaN},{score:Infinity},{score:'1000'},{unit:'ms'},{rules:specs[(i+1)%3][1]},{rules:'old-test-v0'},{status:'playing'},{secondaryScore:0},{scope:'production'},{isolateReceiptCleanup:true}])assert.equal((await handleRequest(post({...p,...extra}),env(db),now)).status,400);
  const duplicate=JSON.stringify(p).replace('"score":1000','"score":0,"sco\\u0072e":1000');assert.equal((await handleRequest(post(duplicate),env(db),now)).status,400);
  assert.equal((await handleRequest(post(p,'?mode=60'),env(db),now)).status,400);
  for(const q of ['&game='+p.game,'&mode=60','&scope=qa'])assert.equal((await handleRequest(get(i,q),env(db),now)).status,400);
  assert.equal(validateSubmission({...p,score:Number.MAX_SAFE_INTEGER-1},'qa').score,Number.MAX_SAFE_INTEGER-1);
 }
 assert.deepEqual(all(db,'leaderboard_best'),[]);assert.deepEqual(all(db,'leaderboard_submissions'),[]);
});

test('pinball production, disabled and wrong-origin requests cannot touch storage',async t=>{
 let touches=0;const db={prepare(){touches++;throw Error('unexpected DB access')},batch(){touches++;throw Error('unexpected DB access')}};
 for(const i of [0,1,2]){
  assert.ok([400,503].includes((await handleRequest(get(i),env(db,'production'),now)).status));
  assert.ok([400,503].includes((await handleRequest(post(payload(i)),env(db,'production'),now)).status));
  assert.equal((await handleRequest(post(payload(i),'','https://wrong.example'),env(db),now)).status,403);
  assert.equal((await handleRequest(get(i),{...env(db),LEADERBOARD_ENABLED:'false'},now)).status,503);
 }
 assert.equal(touches,0);
});

test('real pinball API success/cooldown keeps all other-game and play-count records unchanged',async t=>{
 const db=await fixture(t);await db.raw.run(await readFile(new URL('../worker/play-counts/002.sql',import.meta.url),'utf8'));
 const old=now-8*86400000;
 db.raw.run("INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES('qa','hurdles','110m-8h-v1','existing','既有玩家',20,?)",[old]);
 db.raw.run("INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES('qa','keep','existing','existing','hurdles','110m-8h-v1','既有玩家',20,?,0)",[old]);
 db.raw.run("INSERT INTO play_count_totals VALUES('qa','hurdles',30,0,0,2)");
 db.raw.run("INSERT INTO play_count_receipts VALUES('qa','keep-play','existing','existing','hurdles',?,0)",[old]);
 const snapshots={best:all(db,'leaderboard_best'),receipts:all(db,'leaderboard_submissions'),totals:all(db,'play_count_totals'),plays:all(db,'play_count_receipts')};
 for(const i of [0,1,2]){
  assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
  assert.equal((await handleRequest(post({...payload(i),submissionId:id(500+i)}),env(db),now+1)).status,429);
 }
 assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_best WHERE game='hurdles' ORDER BY 1,2,3,4")[0].values,snapshots.best);
 assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_submissions WHERE game='hurdles' ORDER BY 1,2,3,4")[0].values,snapshots.receipts);
 assert.deepEqual(all(db,'play_count_totals'),snapshots.totals);assert.deepEqual(all(db,'play_count_receipts'),snapshots.plays);
});

test('new contact/work-clock rules keep old scores and receipts isolated without deleting history',async t=>{
 const db=await fixture(t),oldRules=['office-v0826-reentry-60-v1','office-v0826-reentry-180-v1','office-v0826-drain-unlimited-v1'];
 for(const i of[0,1,2]){
  db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',payload(i).game,oldRules[i],'historic','舊規則',999999,now-9*86400000]);
  db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',['qa','old-rule-'+i,'old-payload','historic',payload(i).game,oldRules[i],'舊規則',999999,now-9*86400000,0]);
  assert.deepEqual((await(await handleRequest(get(i),env(db),now)).json()).entries,[]);
  assert.equal((await handleRequest(post({...payload(i),rules:oldRules[i]}),env(db),now)).status,400);
  assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
  assert.deepEqual((await(await handleRequest(get(i),env(db),now)).json()).entries.map(x=>x.score),[1000]);
  assert.equal(db.raw.exec('SELECT score FROM leaderboard_best WHERE rules=?',[oldRules[i]])[0].values[0][0],999999);
  assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions WHERE rules=?',[oldRules[i]])[0].values[0][0],1);
 }
});

 test('flow-v6 preserves shadow-v2 scores and receipts, rejecting legacy submissions',async t=>{
 const db=await fixture(t);
 for(const i of [0,1,2]){const oldRules='office-overtime-shadow-'+[60,180,'unlimited'][i]+'-v2';
 db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',payload(i).game,oldRules,'historic','舊規則',999999,now-9*86400000]);
 db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',['qa','shadow-'+i,'old-payload','historic',payload(i).game,oldRules,'舊規則',999999,now-9*86400000,0]);
 assert.equal((await handleRequest(post({...payload(i),rules:oldRules}),env(db),now)).status,400);
 assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
 assert.deepEqual((await (await handleRequest(get(i),env(db),now)).json()).entries.map(x=>x.score),[1000]);
 assert.equal(db.raw.exec('SELECT score FROM leaderboard_best WHERE rules=?',[oldRules])[0].values[0][0],999999);
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions WHERE rules=?',[oldRules])[0].values[0][0],1);
 }
 });

 test('flow-v6 preserves flow-v3 scores and receipts, rejecting legacy submissions',async t=>{
 const db=await fixture(t);
 for(const i of [0,1,2]){const oldRules='office-overtime-flow-'+[60,180,'unlimited'][i]+'-v3';
 db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',payload(i).game,oldRules,'historic','舊規則',999999,now-9*86400000]);
 db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',['qa','flow-v3-'+i,'old-payload','historic',payload(i).game,oldRules,'舊規則',999999,now-9*86400000,0]);
 assert.equal((await handleRequest(post({...payload(i),rules:oldRules}),env(db),now)).status,400);
 assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
 assert.deepEqual((await (await handleRequest(get(i),env(db),now)).json()).entries.map(x=>x.score),[1000]);
 assert.equal(db.raw.exec('SELECT score FROM leaderboard_best WHERE rules=?',[oldRules])[0].values[0][0],999999);
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions WHERE rules=?',[oldRules])[0].values[0][0],1);
 }
 });

 test('flow-v6 preserves flow-v4 scores and receipts, rejecting legacy submissions',async t=>{
 const db=await fixture(t);
 for(const i of [0,1,2]){const oldRules='office-overtime-flow-'+[60,180,'unlimited'][i]+'-v4';
 db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',payload(i).game,oldRules,'historic','舊規則',999999,now-9*86400000]);
 db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',['qa','flow-v4-'+i,'old-payload','historic',payload(i).game,oldRules,'舊規則',999999,now-9*86400000,0]);
 assert.equal((await handleRequest(post({...payload(i),rules:oldRules}),env(db),now)).status,400);
 assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
 assert.deepEqual((await (await handleRequest(get(i),env(db),now)).json()).entries.map(x=>x.score),[1000]);
 assert.equal(db.raw.exec('SELECT score FROM leaderboard_best WHERE rules=?',[oldRules])[0].values[0][0],999999);
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions WHERE rules=?',[oldRules])[0].values[0][0],1);
 }
 });

 test('flow-v6 preserves flow-v5 scores and receipts, rejecting legacy submissions',async t=>{
 const db=await fixture(t);
 for(const i of [0,1,2]){const oldRules='office-overtime-flow-'+[60,180,'unlimited'][i]+'-v5';
 db.raw.run('INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at) VALUES(?,?,?,?,?,?,?)',['qa',payload(i).game,oldRules,'historic','舊規則',999999,now-9*86400000]);
 db.raw.run('INSERT INTO leaderboard_submissions(scope,id,payload,device,game,rules,nickname,score,created_at,day) VALUES(?,?,?,?,?,?,?,?,?,?)',['qa','flow-v5-'+i,'old-payload','historic',payload(i).game,oldRules,'舊規則',999999,now-9*86400000,0]);
 assert.equal((await handleRequest(post({...payload(i),rules:oldRules}),env(db),now)).status,400);
 assert.equal((await handleRequest(post(payload(i)),env(db),now)).status,200);
 assert.deepEqual((await (await handleRequest(get(i),env(db),now)).json()).entries.map(x=>x.score),[1000]);
 assert.equal(db.raw.exec('SELECT score FROM leaderboard_best WHERE rules=?',[oldRules])[0].values[0][0],999999);
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions WHERE rules=?',[oldRules])[0].values[0][0],1);
 }
 });
