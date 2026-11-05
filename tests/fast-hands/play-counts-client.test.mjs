import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const moduleURL=new URL('../../public/games/fast-hands/play-counts.mjs',import.meta.url);
async function reporter(){assert.ok(existsSync(moduleURL),'Fast Hands needs a dedicated best-effort reporter');return (await import(moduleURL)).recordFastHandsStart;}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const saved='22222222-2222-4222-8222-222222222222';
function fixture(responses=[]){
 const calls=[],timers=new Map(),writes=[];let sequence=0,timerId=0;
 const win={localStorage:{getItem:()=>saved,setItem:(key,value)=>writes.push([key,value])},crypto:{randomUUID:()=>`11111111-1111-4111-8111-${String(++sequence).padStart(12,'0')}`},AbortController,
  setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
  fetch:async(url,options)=>{calls.push({url,options});const r=responses.shift();if(r instanceof Error)throw r;if(typeof r==='function')return r(options);return r??{ok:true,status:200};}};
 return{win,calls,writes,timers,fire(ms){for(const[id,t]of timers)if(t.ms===ms){timers.delete(id);t.fn();}}};
}
for(const game of ['fast-hands','fast-hands-catch','fast-hands-duel'])test(`${game} records an anonymous start with a fresh run UUID and no leaderboard fields`,async()=>{
 const record=await reporter(),h=fixture();await record(h.win,game);await record(h.win,game);
 assert.equal(h.calls.length,2);const values=h.calls.map(r=>JSON.parse(r.options.body));
 for(const [i,{url,options}]of h.calls.entries()){assert.equal(url,'/api/play-counts/starts');assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'application/json');assert.deepEqual(Object.keys(values[i]),['game','deviceId','runId','startedAt']);assert.equal(values[i].game,game);assert.equal(values[i].deviceId,saved);assert.equal(Number.isSafeInteger(values[i].startedAt),true);}
 assert.notEqual(values[0].runId,values[1].runId);assert.equal(h.writes.length,0);assert.equal(h.timers.size,0);
});
for(const response of [new Error('offline'),{ok:false,status:429},{ok:false,status:503}])test(`a transient ${response.status||'network'} failure retries once with exactly the same payload`,async()=>{
 const record=await reporter(),h=fixture([response,response]),done=record(h.win,'fast-hands');await flush();assert.equal(h.calls.length,1);assert.deepEqual([...h.timers.values()].map(t=>t.ms),[2500]);h.fire(2500);await done;assert.equal(h.calls.length,2);assert.equal(h.calls[0].options.body,h.calls[1].options.body);assert.equal(h.timers.size,0);
});
test('five-second abort and one bounded retry cannot leave a stalled report blocking gameplay',async()=>{
 const record=await reporter(),h=fixture([options=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))]);
 const done=record(h.win,'fast-hands-catch');assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.signal.aborted,false);h.fire(5000);await flush();assert.equal(h.calls[0].options.signal.aborted,true);h.fire(2500);await done;assert.equal(h.calls.length,2);assert.equal(h.calls[0].options.body,h.calls[1].options.body);assert.equal(h.timers.size,0);
});
test('invalid game, permanent rejection, blocked storage and unavailable crypto remain best effort',async()=>{
 const record=await reporter(),h=fixture([{ok:false,status:400}]);for(const game of ['home','duck','catch','replay','hurdles'])await record(h.win,game);assert.equal(h.calls.length,0);
 await record(h.win,'fast-hands');assert.equal(h.calls.length,1);assert.equal(h.timers.size,0);
 h.win.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};await assert.doesNotReject(record(h.win,'fast-hands-duel'));assert.equal(h.calls.length,2);assert.notEqual(JSON.parse(h.calls[1].options.body).deviceId,saved);
 h.win.crypto.randomUUID=()=>{throw Error('unavailable');};await assert.doesNotReject(record(h.win,'fast-hands'));assert.equal(h.calls.length,2);
});
test('invalid stored identity is repaired using only the existing anonymous device slot',async()=>{
 const record=await reporter(),h=fixture();h.win.localStorage.getItem=()=>'-'.repeat(36);await record(h.win,'fast-hands');assert.deepEqual(h.writes,[['pf-leaderboard-device-v1','11111111-1111-4111-8111-000000000001']]);const p=JSON.parse(h.calls[0].options.body);assert.equal(p.deviceId,h.writes[0][1]);assert.notEqual(p.deviceId,p.runId);
});
