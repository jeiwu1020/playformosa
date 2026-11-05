import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {database} from './helpers/leaderboard-sqlite.mjs';
import {handleRequest,BOARDS,FAST_HANDS_BOARDS,LEVEL_BOARDS} from '../worker/leaderboard/index.mjs';
import {mountLeaderboard} from '../public/games/shared/leaderboard.mjs';

// Preview has nine legacy boards plus three Fast Hands games. Keep these
// explicit so transplanting the smaller main registry cannot make this pass.
const legacy={
 'long-jump':{rules:'journey-km-v1',unit:'km',status:'valid',score:12.345,run:{phase:'done',valid:true,legalAdventureKm:12.345}},
 hurdles:{rules:'110m-8h-v1',unit:'s',status:'done',score:23.125,run:{phase:'done',t:23.125}},
 'high-jump':{rules:'cleared-height-v1',unit:'m',status:'cleared',score:2.125,run:{phase:'done',success:true,height:2.125}},
 'pole-vault':{rules:'highest-feet-v1',unit:'m',status:'done',score:6.125,run:{phase:'done',maxHeight:99,scoreSnapshot:{height:6.125}}},
 'shot-put':{rules:'relay-distance-v1',unit:'m',status:'valid',score:17.125,run:{phase:'done',valid:true,distance:17.125}},
 discus:{rules:'wind-ufo-distance-v1',unit:'m',status:'valid',score:52.125,run:{phase:'done',foul:false,score:52.125}},
 'reaction-rod':{rules:'catch-rating-v1',unit:'catches',status:'done',score:8,secondaryScore:7.125,run:{phase:'done',caught:8,rating:7.125}},
 'beer-slide':{rules:'accuracy-retention-v1',unit:'points',status:'valid',score:8.125,run:{phase:'done',raw:8.125}},
 'tower-climb':{rules:'indoor-10floors-v1',unit:'s',status:'summit',score:18.125,run:{phase:'done',finished:true,floor:10,time:18.125}}
};
const fast={
 'fast-hands':{rules:'shuttle-v3-mouse',unit:'ms',status:'success',score:350.125},
 'fast-hands-catch':{rules:'cleared-levels-v1',unit:'levels',status:'done',score:3},
 'fast-hands-duel':{rules:'ten-round-wins-v1',unit:'wins',status:'done',score:5}
};
const contracts={...legacy,...fast},games=Object.keys(contracts);
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const submission=(game,id,device=1)=>{const {run,...contract}=contracts[game];return{game,...contract,nickname:'島民',deviceId:uuid(device),submissionId:uuid(id)}};
const origin='https://local.test',epoch=1_800_000_000_000;
async function backend(ctx){
 const db=await database();ctx.after(()=>db.raw.close());
 return{db,async post(body,offset=0,scope='qa'){
  const result=await handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:scope,LEADERBOARD_ORIGIN:origin},epoch+offset);
  return{status:result.status,retry:result.headers.get('Retry-After'),body:await result.json()};
 }};
}
test('preview preserves all nine legacy contracts and Fast Hands QA-only guards',async ctx=>{
 assert.deepEqual(Object.keys(BOARDS).sort(),Object.keys(legacy).sort());
 assert.deepEqual(Object.keys(LEVEL_BOARDS).sort(),['fast-hands-catch','fast-hands-duel']);
 assert.deepEqual(Object.keys(FAST_HANDS_BOARDS).sort(),['mouse','touch']);
 const {post}=await backend(ctx);
 for(const [index,game] of games.entries()){
  for(const key of ['rules','unit','status'])if(legacy[game])assert.equal(BOARDS[game][key],legacy[game][key]);
  assert.equal((await post(submission(game,index+1),0,'production')).status,legacy[game]?200:503,game+' production policy');
 }
});
test('preview all 12 games alternate on one device without sharing or extending cooldowns',async ctx=>{
 const {post,db}=await backend(ctx);
 for(const [index,game] of games.entries())assert.equal((await post(submission(game,index+1),index*17)).status,200,game);
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],12);
 for(const [index,game] of [...games].reverse().entries()){
  const acceptedAt=games.indexOf(game)*17;
  const result=await post(submission(game,100+index),acceptedAt+12345);
  assert.deepEqual(result,{status:429,retry:'48',body:{error:'limited',reason:'cooldown',retryAfterSeconds:48}},game);
 }
 assert.equal(db.raw.exec('SELECT count(*) FROM leaderboard_submissions')[0].values[0][0],12,'rejection never creates a receipt');
 for(const [index,game] of games.entries()){
  const acceptedAt=index*17;
  assert.equal((await post(submission(game,index+1),acceptedAt+20000)).body.duplicate,true,game+' original receipt');
  assert.equal((await post({...submission(game,index+1),nickname:'另一名'},acceptedAt+20000)).status,409,game+' conflict');
  assert.equal((await post(submission(game,200+index,2),acceptedAt+20000)).status,200,game+' another device');
  assert.equal((await post(submission(game,300+index),acceptedAt+59999)).retry,'1',game+' last millisecond');
  assert.equal((await post(submission(game,300+index),acceptedAt+60000)).status,200,game+' exact boundary');
 }
});
test('preview nine legacy games isolate QA and production cooldowns; duck modes share one game deadline',async ctx=>{
 const {post}=await backend(ctx);
 for(const [index,game] of Object.keys(legacy).entries()){
  assert.equal((await post(submission(game,index+1))).status,200);
  assert.equal((await post(submission(game,100+index),1,'production')).status,200,game);
  assert.equal((await post(submission(game,200+index),1001,'production')).retry,'59',game);
 }
 assert.equal((await post(submission('fast-hands',500))).status,200);
 const touch={...submission('fast-hands',501),rules:'shuttle-v3-touch'};
 assert.equal((await post(touch,1500)).retry,'59');
 assert.equal((await post(touch,60000)).status,200);
});

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const response=(status,data,retry=null)=>({ok:status===200,status,headers:{get:()=>retry},json:async()=>data});
function browser(){
 const dom=new JSDOM('<main id="root"></main>',{url:'https://preview.test/'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 w.HTMLElement.prototype.getClientRects=()=>[{width:20,height:20}];
 const originalNow=w.Date.now;let now=100000,nextId=0;const jobs=new Map(),controllers=[];
 w.Date.now=()=>now;w.setTimeout=(fn,ms)=>{jobs.set(++nextId,{fn,at:now+ms});return nextId};w.clearTimeout=id=>jobs.delete(id);
 function tick(ms){const end=now+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn()}now=end}
 function mount(game,fetcher){
  const entry=d.createElement('section'),result=d.createElement('dialog');result.open=true;d.getElementById('root').append(entry,result);const posts=[];
  const c=mountLeaderboard({document:d,game,enabled:true,entry,result,fetcher:(url,options={})=>{
   if(options.method==='POST'){posts.push(options);return fetcher?fetcher(posts.length,options):Promise.resolve(response(429,{reason:'cooldown',retryAfterSeconds:2},'2'))}
   return Promise.resolve(response(200,{entries:[],own:null}));
  }});assert.ok(c,game+' must keep its preview client');controllers.push(c);
  const run=structuredClone(legacy[game].run);c.setResult(run);
  const panel=result.querySelector('details'),submit=panel.querySelector('[data-submit]'),status=panel.querySelector('[role=status]');panel.open=true;panel.querySelector('input').value='玩家';
  return{c,run,result,panel,submit,status,posts};
 }
 return{w,d,jobs,tick,mount,close(){for(const c of controllers)c.destroy();w.Date.now=originalNow;w.close();assert.equal(jobs.size,0,'controller destruction clears all timers')}};
}
for(const game of Object.keys(legacy)){
 test(`preview ${game}: 429 countdown preserves full metric payload and all three 503 attempts`,async()=>{
  const h=browser(),c=h.mount(game,n=>Promise.resolve(n<=4?response(429,{reason:'cooldown',retryAfterSeconds:2},'7'):response(503,{})));
  try{
   for(let i=0;i<4;i++){
    c.submit.click();await flush();assert.equal(c.submit.disabled,true);assert.match(c.status.textContent,/2 秒/);c.submit.click();
    h.tick(1000);assert.match(c.status.textContent,/1 秒/);h.tick(1000);assert.equal(c.submit.disabled,false);assert.equal(c.posts.length,i+1);
   }
   for(let i=0;i<4;i++){c.submit.click();await flush()}
   assert.equal(c.posts.length,7);assert.equal(c.submit.disabled,true);assert.equal(new Set(c.posts.map(p=>p.body)).size,1);
   const sent=JSON.parse(c.posts[0].body),{run,...contract}=legacy[game];
   for(const [key,value]of Object.entries(contract))assert.equal(sent[key],value,game+' '+key);
   assert.deepEqual(Object.keys(sent).sort(),['game','rules','unit','status','score','nickname','deviceId','submissionId',...(game==='reaction-rod'?['secondaryScore']:[])].sort());
  }finally{h.close()}
 });
 test(`preview ${game}: close and new round retain deadline without automatic POST`,async()=>{
  const h=browser(),c=h.mount(game);try{
   c.submit.click();await flush();c.panel.querySelector('[data-cancel]').click();c.panel.open=true;assert.equal(c.submit.disabled,true);
   c.c.setResult(structuredClone(c.run));c.panel.open=true;assert.equal(c.submit.disabled,true);h.tick(2000);assert.equal(c.submit.disabled,false);assert.equal(c.posts.length,1);
   c.submit.click();await flush();assert.notEqual(JSON.parse(c.posts[0].body).submissionId,JSON.parse(c.posts[1].body).submissionId);
  }finally{h.close()}
 });
 for(const duplicate of [false,true])test(`preview ${game}: accepted duplicate=${duplicate} keeps expected next-round cooldown`,async()=>{
  const h=browser(),c=h.mount(game,()=>Promise.resolve(response(200,{accepted:true,duplicate})));try{
   c.submit.click();await flush();c.c.setResult(structuredClone(c.run));assert.equal(c.submit.disabled,!duplicate);h.tick(60000);assert.equal(c.submit.disabled,false);assert.equal(c.posts.length,1);
  }finally{h.close()}
 });
 for(const [reason,pattern]of [['daily_limit',/今日.*總量/],['capacity',/容量/]])test(`preview ${game}: ${reason} never claims a sixty-second recovery`,async()=>{
  const h=browser(),c=h.mount(game,()=>Promise.resolve(response(429,{reason},'60')));try{
   c.submit.click();await flush();assert.match(c.status.textContent,pattern);assert.doesNotMatch(c.status.textContent,/60 秒/);h.tick(60000);assert.equal(c.posts.length,1);
  }finally{h.close()}
 });
}
test('preview nine clients in one window use the same anonymous device but independent game cooldowns',async()=>{
 const h=browser(),clients=Object.keys(legacy).map(game=>h.mount(game,()=>Promise.resolve(response(200,{accepted:true,duplicate:false}))));
 try{
  for(const [index,c]of clients.entries()){
   c.submit.click();await flush();c.c.setResult(structuredClone(c.run));
   assert.equal(c.submit.disabled,true);
   for(const other of clients.slice(index+1))assert.equal(other.submit.disabled,false,'other game remains uploadable');
  }
  assert.equal(new Set(clients.map(c=>JSON.parse(c.posts[0].body).deviceId)).size,1);
  h.tick(59999);assert.ok(clients.every(c=>c.submit.disabled));h.tick(1);assert.ok(clients.every(c=>!c.submit.disabled));assert.ok(clients.every(c=>c.posts.length===1));
 }finally{h.close()}
});
