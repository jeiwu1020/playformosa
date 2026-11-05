import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {mountLeaderboard as mountShared} from '../public/games/shared/leaderboard.mjs';
import {createDialogController} from '../public/games/long-jump/dialogs.mjs';
const flush=()=>new Promise(r=>setImmediate(r));
const response=(status,data,after)=>({ok:status===200,status,headers:{get:()=>after},json:async()=>data});
function fixture(game,{fetcher,adapter=false,standalone=false}={}){
 const html=adapter?readFileSync(new URL('../public/games/long-jump/index.html',import.meta.url),'utf8'):'<section id="entry"></section><dialog id="result" open></dialog>';
 const dom=new JSDOM(html,{url:'https://example.test/'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};w.HTMLElement.prototype.getClientRects=()=>[{width:20,height:20}];
 const originalNow=w.Date.now;let now=100000,id=0;const jobs=new Map();w.Date.now=()=>now;w.setTimeout=(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id};w.clearTimeout=id=>jobs.delete(id);
 const tick=ms=>{const end=now+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn()}now=end};
 const posts=[];w.fetch=(url,options)=>{if(options.method==='POST'){posts.push(options);return fetcher?fetcher(posts.length,options):Promise.resolve(response(429,{reason:'cooldown',retryAfterSeconds:2},'2'))}return Promise.resolve(response(200,{entries:[],own:null}))};
 const result=d.querySelector(adapter?'#overlay':'#result');
 const c=adapter?mountProductionJumpLeaderboard({document:d,modal:createDialogController(result,()=>{},{forceFallback:standalone}),standalone,pause(){},clear(){},cancelRecovery(){},showPause(){},isPaused:()=>false}):mountShared({document:d,game,enabled:true,result,entry:d.querySelector('#entry')});
 const run=game==='hurdles'?{phase:'done',t:23}:game==='long-jump'?{phase:'done',valid:true,legalAdventureKm:12}:{phase:'done',caught:8,rating:7.5};
 c.setResult(run);const panel=d.querySelector(adapter?'#share-actions .pf-leaderboard':'#result .pf-leaderboard'),submit=panel.querySelector('[data-submit]'),status=panel.querySelector('[role=status]');panel.open=true;panel.querySelector('input').value='玩家';
 return {w,d,c,result,run,panel,submit,status,posts,tick,jobs,cleanup(){c.destroy();w.Date.now=originalNow;w.close()}};
}
for(const game of ['long-jump','hurdles','reaction-rod']){
 test(game+': repeated 429 does not exhaust three service attempts or mutate frozen submission',async()=>{
  const h=fixture(game,{fetcher:n=>Promise.resolve(n<=4?response(429,{reason:'cooldown',retryAfterSeconds:2},'2'):response(503,{}))});try{for(let i=0;i<4;i++){h.submit.click();await flush();assert.equal(h.submit.disabled,true);assert.match(h.status.textContent,/2 秒/);h.submit.click();h.tick(1000);assert.match(h.status.textContent,/1 秒/);h.tick(1000);assert.equal(h.submit.disabled,false);assert.equal(h.posts.length,i+1)}for(let i=0;i<4;i++){h.submit.click();await flush()}assert.equal(h.posts.length,7);assert.equal(h.submit.disabled,true);assert.equal(new Set(h.posts.map(p=>p.body)).size,1)}finally{h.cleanup()}assert.equal(h.jobs.size,0);
 });
 test(game+': close/reopen and new round retain cooldown, expire without automatic POST',async()=>{const h=fixture(game);try{h.submit.click();await flush();h.panel.querySelector('[data-cancel]').click();h.panel.open=true;assert.equal(h.submit.disabled,true);h.c.setResult({...h.run});h.panel.open=true;assert.equal(h.submit.disabled,true);h.tick(2000);assert.equal(h.submit.disabled,false);assert.doesNotMatch(h.status.textContent,/等待 [1-9]/);assert.equal(h.posts.length,1);h.submit.click();await flush();assert.notEqual(JSON.parse(h.posts[0].body).submissionId,JSON.parse(h.posts[1].body).submissionId)}finally{h.cleanup()}assert.equal(h.jobs.size,0)});
 test(game+': closing pending dialog keeps unknown payload and ignores late 429',async()=>{let resolve;const h=fixture(game,{fetcher:()=>new Promise(r=>resolve=r)});try{h.submit.click();h.result.close();assert.equal(h.posts[0].signal.aborted,true);resolve(response(429,{reason:'cooldown',retryAfterSeconds:60},'60'));await flush();h.result.showModal();assert.equal(h.submit.disabled,false);assert.match(h.status.textContent,/可能已收錄/);h.submit.click();assert.equal(h.posts[0].body,h.posts[1].body);h.c.setResult({...h.run});resolve(response(200,{accepted:true}));await flush();assert.equal(h.submit.disabled,false)}finally{h.cleanup()}});
 test(game+': Retry-After works with non-JSON legacy 429',async()=>{const h=fixture(game,{fetcher:()=>Promise.resolve({...response(429,null,'13'),json:async()=>{throw Error('HTML')}})});try{h.submit.click();await flush();assert.match(h.status.textContent,/13 秒/);h.tick(12000);assert.equal(h.submit.disabled,true);h.tick(1000);assert.equal(h.submit.disabled,false)}finally{h.cleanup()}});
 for(const [reason,pattern]of[['daily_limit',/今日.*總量/],['capacity',/容量/]])test(game+': '+reason+' does not claim recovery after 60 seconds',async()=>{const h=fixture(game,{fetcher:()=>Promise.resolve(response(429,{reason},'60'))});try{h.submit.click();await flush();assert.match(h.status.textContent,pattern);assert.doesNotMatch(h.status.textContent,/60 秒/);h.tick(60000);assert.equal(h.posts.length,1)}finally{h.cleanup()}});
 for(const duplicate of [false,true])test(game+': accepted duplicate='+duplicate+' preserves expected new-round cooldown',async()=>{const h=fixture(game,{fetcher:()=>Promise.resolve(response(200,{accepted:true,duplicate}))});try{h.submit.click();await flush();h.c.setResult({...h.run});assert.equal(h.submit.disabled,!duplicate);h.tick(60000);assert.equal(h.submit.disabled,false)}finally{h.cleanup()}});
}
