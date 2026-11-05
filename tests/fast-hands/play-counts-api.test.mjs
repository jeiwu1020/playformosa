import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {database} from '../helpers/leaderboard-sqlite.mjs';
import {handlePlayCounts,validateStart} from '../../worker/play-counts/index.mjs';
import {loadPlayCounts} from '../../public/assets/play-counts.mjs';
import {JSDOM} from 'jsdom';

// Only in-memory SQLite and injected fetch are used. No request is sent to a host.
const origin='https://counts.test',now=1793808000000;
const games=['fast-hands','fast-hands-catch','fast-hands-duel'];
const deviceId='00000000-0000-4000-8000-000000000001';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload=(game,n=2,startedAt=now)=>({game,deviceId,runId:uuid(n),startedAt});
async function fixture(){
 const db=await database();db.raw.run(readFileSync(new URL('../../worker/play-counts/002.sql',import.meta.url),'utf8'));
 const env={DB:db,PLAY_COUNTS_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:origin};
 const send=(value,at=now)=>handlePlayCounts(new Request(origin+'/api/play-counts/starts',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)}),env,at);
 const totals=async()=>{const response=await handlePlayCounts(new Request(origin+'/api/play-counts'),env,now);assert.equal(response.status,200);return (await response.json()).counts;};
 return {db,send,totals};
}
for(const [i,game] of games.entries())test(`${game} is accepted by the existing schema and increments only its own total`,async()=>{
 const h=await fixture();const empty=await h.totals();assert.deepEqual(empty[game],{count:0,since:null});
 const value=payload(game,i+2);assert.deepEqual(validateStart(value,now),value);
 const response=await h.send(value);assert.equal(response.status,200);assert.deepEqual(await response.json(),{accepted:true,duplicate:false});
 const counts=await h.totals();assert.deepEqual(counts[game],{count:1,since:now});for(const other of games.filter(k=>k!==game))assert.deepEqual(counts[other],{count:0,since:null});
 assert.equal(counts.hurdles.count,0);assert.equal(counts.home.count,0);assert.equal(h.db.raw.exec('SELECT count(*) FROM leaderboard_best')[0].values[0][0],0);
});
test('Fast Hands retries dedupe, conflicting games reject, and cross-game cooldown stays in force',async()=>{
 const h=await fixture(),value=payload('fast-hands');assert.equal((await h.send(value)).status,200);
 assert.deepEqual(await (await h.send(value)).json(),{accepted:true,duplicate:true});
 assert.equal((await h.send({...value,game:'fast-hands-catch'})).status,409);
 assert.equal((await h.send(payload('fast-hands-catch',3),now+1000)).status,429);
 assert.equal((await h.send(payload('fast-hands-catch',3,now+3000),now+3000)).status,200);
 const counts=await h.totals();assert.equal(counts['fast-hands'].count,1);assert.equal(counts['fast-hands-catch'].count,1);assert.equal(counts['fast-hands-duel'].count,0);
 for(const game of ['duck','catch','duel','fast-hands-practice','fast-hands-replay'])assert.throws(()=>validateStart(payload(game),now));
});
test('all three homepage labels consume independent real totals and retain a genuine zero',async()=>{
 const dom=new JSDOM('<span data-play-count="fast-hands"></span><span data-play-count="fast-hands-catch"></span><span data-play-count="fast-hands-duel"></span>');
 const h=await fixture();await h.send(payload('fast-hands-catch'));
 try{await loadPlayCounts(dom.window.document,{fetcher:async()=>({ok:true,json:async()=>({counts:await h.totals()})})});assert.deepEqual([...dom.window.document.querySelectorAll('span')].map(n=>n.textContent),['已開玩 0 次','已開玩 1 次','已開玩 0 次']);}finally{dom.window.close();}
});
