import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import worker, {handleRequest} from '../worker/leaderboard/index.mjs';
import {PlayCountsRepository} from '../worker/play-counts/repository.mjs';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {renderPage} from '../src/render.mjs';
import {catalog} from '../src/catalog.mjs';
import {loadPlayCounts} from '../public/assets/play-counts.mjs';

const origin='https://playformosa.playformosa.workers.dev', route='/api/play-counts/entries/taiwanfighter', target='https://taiwanfighter.playformosa.workers.dev/', now=1794182400000;
const headers={'Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document','Sec-Fetch-Site':'same-origin'};
const request=(extra={},method='GET',suffix='')=>new Request(origin+route+suffix,{method,headers:{...headers,...extra}});
async function setup(){const DB=await database();DB.raw.run(readFileSync(new URL('../worker/play-counts/002.sql',import.meta.url),'utf8'));return {DB,PLAY_COUNTS_ENABLED:'true',LEADERBOARD_SCOPE:'production',LEADERBOARD_ORIGIN:origin};}
async function enter(env,req=request(),time=now){const work=[];const r=await handleRequest(req,env,time,{waitUntil(p){work.push(p);}});await Promise.all(work);return r;}
const value=async(env,scope='production')=>(await new PlayCountsRepository(env.DB,scope).totals()).taiwanfighter;

test('Fighter card opens the counted native link and labels entries without changing other game semantics',async()=>{
 const dom=new JSDOM(renderPage(catalog),{url:origin}),d=dom.window.document;
 const card=d.querySelector('[data-external-id="taiwanfighter"]'),a=card.querySelector('a');
 assert.equal(a.getAttribute('href'),route);assert.equal(a.target,'_blank');assert.match(a.rel,/noopener/);assert.match(a.rel,/noreferrer/);
 const count=card.querySelector('[data-play-count="taiwanfighter"]');assert.ok(count);assert.match(count.textContent,/開玩次數/);assert.match(count.title,/點擊進入/);
 assert.equal(d.querySelectorAll('[data-play-count]').length,23);
 await loadPlayCounts(d,{fetcher:async()=>({ok:true,json:async()=>({counts:{taiwanfighter:{count:1234},'long-jump':{count:12}}})})});
 assert.equal(count.textContent,'已開玩 1,234 次');assert.equal(d.querySelector('[data-play-count="long-jump"]').textContent,'已開玩 12 次');
 dom.window.close();
});

test('each rapid entry increments once, without start cooldown, daily cap, receipts, schema changes or QA contamination',async()=>{
 const env=await setup(),db=env.DB,schema=db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name');
 try {
  assert.deepEqual(await value(env),{count:0,since:null});
  await Promise.all(Array.from({length:125},()=>enter(env)));
  assert.deepEqual(await value(env),{count:125,since:now});assert.deepEqual(await value(env,'qa'),{count:0,since:null});
  assert.equal(db.raw.exec('SELECT count(*) FROM play_count_receipts')[0].values[0][0],0);
  assert.equal(db.raw.exec("SELECT day_total FROM play_count_totals WHERE counter_key='taiwanfighter'")[0].values[0][0],0);
  db.raw.run("UPDATE play_count_totals SET total=10000 WHERE counter_key='taiwanfighter'");
  await enter(env);assert.equal((await value(env)).count,10001);
  const start={game:'hurdles',deviceId:'22222222-2222-4222-8222-222222222222',runId:'11111111-1111-4111-8111-111111111111',startedAt:now};
  const repo=new PlayCountsRepository(db,'production');assert.equal((await repo.start(start,now)).accepted,true);assert.equal((await repo.totals()).hurdles.count,1);
  const old=db.raw.exec("SELECT * FROM play_count_totals WHERE counter_key!='taiwanfighter'");
  await enter(env);assert.deepEqual(db.raw.exec("SELECT * FROM play_count_totals WHERE counter_key!='taiwanfighter'"),old);
  await enter({...env,LEADERBOARD_SCOPE:'qa'});assert.equal((await value(env,'qa')).count,1);assert.equal((await value(env)).count,10002);
  assert.deepEqual(db.raw.exec('SELECT sql FROM sqlite_schema ORDER BY name'),schema);
 }finally{db.raw.close();}
});

test('entry redirect never waits for database work and still opens the fixed game on database failure',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;}),work=[];
 const env={PLAY_COUNTS_ENABLED:'true',LEADERBOARD_SCOPE:'production',LEADERBOARD_ORIGIN:origin,DB:{prepare(){return {bind(){return {};}};},batch(){return pending;}}};
 const r=await Promise.race([handleRequest(request(),env,now,{waitUntil(p){work.push(p);}}),new Promise((_,reject)=>setTimeout(()=>reject(Error('redirect waited for D1')),100))]);
 assert.equal(r.status,302);assert.equal(r.headers.get('Location'),target);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(work.length,1);finish([]);await Promise.all(work);
 const failed=await enter({...env,DB:{prepare(){throw Error('D1 unavailable');}}});assert.equal(failed.status,302);assert.equal(failed.headers.get('Location'),target);
});

test('prefetch, HEAD, cross-site, non-navigation and disabled counting never inflate entries or block the approved destination',async()=>{
 const env=await setup();try{
  for(const req of [request({},'HEAD'),request({'Purpose':'prefetch'}),request({'Sec-Purpose':'prefetch;prerender'}),request({'Sec-Fetch-Mode':'cors'}),request({'Sec-Fetch-Dest':'image'}),request({'Sec-Fetch-Site':'cross-site'}),request({},'GET','?redirect=https://evil.test/')]){const r=await enter(env,req);assert.equal(r.status,302);assert.equal(r.headers.get('Location'),target);}
  for(const patch of [{PLAY_COUNTS_ENABLED:'false'},{LEADERBOARD_SCOPE:'invalid'},{LEADERBOARD_ORIGIN:'https://else.test'},{DB:null}])assert.equal((await enter({...env,...patch})).status,302);
  assert.equal((await value(env)).count,0);
  assert.equal((await enter(env,request({},'POST'))).status,405);
  const r=await handleRequest(new Request(origin+'/api/play-counts/entries/other'),env,now,{waitUntil(){throw Error('unexpected work');}});assert.notEqual(r.status,302);
 }finally{env.DB.raw.close();}
});

test('worker forwards execution lifetime and API reads the entry total without admitting Fighter as a gameplay start',async()=>{
 const env=await setup(),work=[];try{
  const r=await worker.fetch(request(),env,{waitUntil(p){work.push(p);}});assert.equal(r.status,302);assert.equal(work.length,1);await Promise.all(work);
  const counts=await(await handleRequest(new Request(origin+'/api/play-counts'),env,now)).json();assert.equal(counts.counts.taiwanfighter.count,1);
  const r2=await handleRequest(new Request(origin+'/api/play-counts/starts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({game:'taiwanfighter',deviceId:'22222222-2222-4222-8222-222222222222',runId:'11111111-1111-4111-8111-111111111111',startedAt:now})}),env,now);assert.equal(r2.status,400);assert.equal((await value(env)).count,1);
 }finally{env.DB.raw.close();}
});

test('browser-UI new-tab navigations with Sec-Fetch-Site none are not lost',async()=>{
 const env=await setup();try{await enter(env,request({'Sec-Fetch-Site':'none'}));assert.equal((await value(env)).count,1);}finally{env.DB.raw.close();}
});
