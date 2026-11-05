import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountFastHandsLeaderboard} from '../../public/games/fast-hands/leaderboard.mjs';
import {mountLevelLeaderboard} from '../../public/games/fast-hands/levels-leaderboard.mjs';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const ok=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve}};
const state=(mode,wins=3)=>mode==='duck'?{phase:'success',elapsedMs:532.123456}:{mode,phase:'done',practice:false,total:mode==='catch'?Infinity:10,results:[...Array.from({length:wins},()=>({winner:'player'})),...Array.from({length:mode==='catch'?1:10-wins},()=>({winner:mode==='catch'?'none':'ai'}))]};
function fixture(mode,{fetcher,cryptoBlocked=false,queuedClose=false,storedNickname}={}){
 const html=mode==='duck'?readFileSync(new URL('../../public/games/fast-hands/index.html',import.meta.url),'utf8'):'<body><dialog id="summary"><div class="finale-scroll"></div></dialog></body>';
 const originalNow=Date.now;
 const dom=new JSDOM(html,{url:'https://qa.example/games/fast-hands/'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 const closeEvents=[];
 w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;const fire=()=>this.dispatchEvent(new w.Event('close'));if(queuedClose)closeEvents.push(fire);else fire()}};
 if(storedNickname)w.localStorage.setItem('pf-leaderboard-nickname-v1',storedNickname);
 let sequence=0;w.crypto.randomUUID=()=>{if(cryptoBlocked)throw Error('no crypto');return `00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`};
 const resultDialog=d.getElementById(mode==='duck'?'resultDialog':'summary'),scroll=resultDialog.querySelector('.finale-scroll');
 const host=d.createElement('section'),trigger=d.createElement('button'),hint=d.createElement('p');host.id='fixtureUploadHost';host.className='finale-upload-host';host.hidden=true;trigger.type='button';resultDialog.prepend(trigger,hint);scroll.prepend(host);
 const requests=[],returns=[],scrolled=[];scroll.scrollTo=options=>{scrolled.push(options);scroll.scrollTop=options.top};scroll.getBoundingClientRect=()=>({top:100});host.getBoundingClientRect=()=>({top:300});scroll.scrollTop=40;
 const $=name=>d.getElementById(mode==='duck'?name:'level'+name[0].toUpperCase()+name.slice(1));
 const boardData={game:mode==='duck'?'fast-hands':'fast-hands-'+mode,rules:mode==='duck'?'shuttle-v3-mouse':mode==='catch'?'cleared-levels-v1':'ten-round-wins-v1',unit:mode==='duck'?'ms':mode==='catch'?'levels':'wins',entries:[],own:null};
 const mount=mode==='duck'?mountFastHandsLeaderboard:mountLevelLeaderboard;
 const c=mount({document:d,mode,inlineUpload:{host,trigger,hint,resultDialog},fetcher:(url,options)=>{requests.push({url,options});return fetcher?fetcher(url,options):Promise.resolve(ok(options.method?{accepted:true,bestUpdated:true,own:{rank:27,score:mode==='duck'?500:3,nickname:'玩家',gap:1}}:boardData))},onOpen(dialog){for(const other of d.querySelectorAll('dialog[open]'))if(other!==dialog)other.close();dialog.showModal()},onClose(origin){returns.push(origin);resultDialog.showModal()}});
 const section=$('rankingUpload'),home=section.parentElement,run=state(mode);
 const capture=(s=run,options={})=>mode==='duck'?c.captureResult(s,'mouse',options):c.captureResult(s,options);
 const open=()=>{assert.equal(typeof c.showResultUpload,'function','controller must expose result-dialog upload');resultDialog.showModal();c.showResultUpload()};
 const posts=()=>requests.filter(r=>r.options.method==='POST');
 const valid=()=>{$('rankingNickname').value='玩家';$('rankingConsent').checked=true};
 return {mode,c,w,d,$,host,trigger,hint,resultDialog,scroll,scrolled,requests,returns,section,home,run,capture,open,posts,valid,flushCloseEvents(){for(const fire of closeEvents.splice(0))fire()},cleanup(){c.destroy();w.close();Date.now=originalNow}};
}

for(const mode of ['duck','catch','duel']){
 test(mode+': direct upload reuses one form inside the result, focuses nickname and scrolls only its container',()=>{
  const h=fixture(mode);try{h.capture();assert.equal(h.trigger.disabled,false);h.open();assert.equal(h.host.hidden,false);assert.equal(h.section.parentElement,h.host);assert.equal(h.section.hidden,false);assert.equal(h.$('rankingDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.requests.length,0);assert.equal(h.$('rankingConsent').checked,false);assert.equal(h.d.activeElement,h.$('rankingNickname'));assert.equal(h.trigger.getAttribute('aria-expanded'),'true');assert.equal(h.scrolled.length,1);assert.equal(h.scrolled[0].top,228);assert.equal(h.d.documentElement.scrollTop,0);assert.equal(h.d.body.scrollTop,0);h.c.showResultUpload();assert.equal(h.d.querySelectorAll('#'+h.section.id).length,1);assert.equal(h.requests.length,0);}finally{h.cleanup()}
 });
 test(mode+': invalid names and unchecked consent never post; only explicit submit freezes payload',async()=>{
  const h=fixture(mode);try{h.capture();h.open();for(const name of ['',' ','x'.repeat(21),'<b>','a\u200db']){h.$('rankingNickname').value=name;h.$('rankingConsent').checked=true;h.$('rankingSubmit').click();assert.equal(h.posts().length,0)}h.$('rankingNickname').value='😀'.repeat(20);h.$('rankingConsent').checked=false;h.$('rankingSubmit').click();assert.equal(h.posts().length,0);assert.equal(h.d.activeElement,h.$('rankingConsent'));h.$('rankingConsent').checked=true;let gameplayKeys=0;h.w.addEventListener('keydown',()=>gameplayKeys++);const enter=new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});h.$('rankingNickname').dispatchEvent(enter);assert.equal(enter.defaultPrevented,true);assert.equal(gameplayKeys,0);assert.equal(h.posts().length,0);h.$('rankingSubmit').click();h.$('rankingSubmit').click();assert.equal(h.posts().length,1);await flush();const body=JSON.parse(h.posts()[0].options.body);assert.equal(body.nickname,'😀'.repeat(20));assert.equal(body.score,mode==='duck'?532.123456:3);assert.deepEqual(Object.keys(body).sort(),['deviceId','game','nickname','rules','score','status','submissionId','unit'].sort());assert.equal(body.game,mode==='duck'?'fast-hands':'fast-hands-'+mode);assert.equal(body.status,mode==='duck'?'success':'done');assert.match(h.$('rankingUploadStatus').textContent,/第 27 名/);assert.equal(h.trigger.disabled,true);assert.match(h.trigger.textContent,/已上傳|已提交/);assert.match(h.hint.textContent,/已收錄|已上傳|已提交/);}finally{h.cleanup()}
 });
 test(mode+': close and board transitions restore the same form without resetting consent or completed state',async()=>{
  const h=fixture(mode);try{h.capture();h.open();h.valid();const input=h.$('rankingNickname');h.resultDialog.close();assert.equal(h.host.hidden,true);assert.equal(h.section.parentElement,h.home);assert.equal(h.trigger.getAttribute('aria-expanded'),'false');h.open();assert.equal(h.$('rankingNickname'),input);assert.equal(h.$('rankingConsent').checked,true);h.c.showBoard({origin:'result'});await flush();assert.equal(h.resultDialog.open,false);assert.equal(h.$('rankingDialog').open,true);assert.equal(h.section.parentElement,h.home);assert.equal(h.host.hidden,true);h.c.showUpload();assert.equal(h.section.hidden,false);assert.equal(h.$('rankingNickname'),input);h.$('rankingClose').click();h.open();h.$('rankingSubmit').click();await flush();h.resultDialog.close();h.capture();h.open();h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,1);assert.equal(h.$('rankingSubmit').disabled,true);assert.equal(h.d.querySelectorAll('#'+input.id).length,1);}finally{h.cleanup()}
 });
 test(mode+': pending close aborts waiting, ignores late acceptance and retries the identical unknown outcome',async()=>{
  const wait=deferred();let first=true;const h=fixture(mode,{fetcher:(url,options)=>options.method?(first?(first=false,wait.promise):Promise.resolve(ok({accepted:true,bestUpdated:false}))):Promise.resolve(ok({}))});try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();assert.equal(h.trigger.disabled,true);assert.match(h.hint.textContent,/提交中|等待/);h.resultDialog.close();assert.equal(h.posts()[0].options.signal.aborted,true);h.open();assert.equal(h.$('rankingNickname').disabled,true);assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);assert.equal(h.trigger.disabled,false);wait.resolve(ok({accepted:true,bestUpdated:true}));await flush();assert.equal(h.$('rankingSubmit').disabled,false);assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);h.$('rankingNickname').value='改名';h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,2);assert.equal(h.posts()[0].options.body,h.posts()[1].options.body);assert.equal(h.$('rankingSubmit').disabled,true);}finally{h.cleanup()}
 });
 test(mode+': switching to board aborts a pending submit and a stale board cannot overwrite inline result',async()=>{
  const post=deferred(),get=deferred();const h=fixture(mode,{fetcher:(url,options)=>options.method?post.promise:get.promise});try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();h.c.showBoard({origin:'result'});assert.equal(h.posts()[0].options.signal.aborted,true);h.$('rankingClose').click();h.open();const getRequest=h.requests.find(r=>!r.options.method);assert.equal(getRequest.options.signal.aborted,true);post.resolve(ok({accepted:true}));get.resolve(ok({game:mode==='duck'?'fast-hands':'fast-hands-'+mode,rules:mode==='duck'?'shuttle-v3-mouse':mode==='catch'?'cleared-levels-v1':'ten-round-wins-v1',unit:mode==='duck'?'ms':mode==='catch'?'levels':'wins',entries:[{nickname:'舊榜',rank:1,score:1}],own:null}));await flush();assert.equal(h.section.parentElement,h.host);assert.equal(h.resultDialog.open,true);assert.equal(h.$('rankingDialog').open,false);assert.doesNotMatch(h.$('rankingEntries').textContent,/舊榜/);assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);}finally{h.cleanup()}
 });
 test(mode+': new round invalidates pending result and obtains fresh consent and submission ID',async()=>{
  const wait=deferred();let first=true;const h=fixture(mode,{fetcher:()=>first?(first=false,wait.promise):Promise.resolve(ok({accepted:true}))});try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();const old=JSON.parse(h.posts()[0].options.body);h.c.reset();assert.equal(h.posts()[0].options.signal.aborted,true);assert.equal(h.host.hidden,true);assert.equal(h.trigger.disabled,true);const next=state(mode,4);if(mode==='duck')next.elapsedMs=400;h.capture(next);h.open();assert.equal(h.$('rankingConsent').checked,false);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(h.$('rankingNickname').disabled,false);wait.resolve(ok({accepted:true}));await flush();assert.equal(h.$('rankingSubmit').disabled,false);h.valid();h.$('rankingSubmit').click();await flush();const body=JSON.parse(h.posts()[1].options.body);assert.notEqual(body.submissionId,old.submissionId);assert.equal(body.score,mode==='duck'?400:4);}finally{h.cleanup()}
 });
 test(mode+': every close/reopen preserves the three-attempt cap and terminal rejection',async()=>{
  for(const status of [503,400,403,409,413]){const h=fixture(mode,{fetcher:()=>Promise.resolve(ok({error:'unavailable'},status))});try{h.capture();h.open();h.valid();for(let attempt=0;attempt<4;attempt++){h.$('rankingSubmit').click();await flush();h.resultDialog.close();h.open()}const terminal=[400,403,409,413].includes(status);assert.equal(h.posts().length,terminal?1:3);assert.equal(new Set(h.posts().map(r=>r.options.body)).size,1);assert.equal(h.trigger.disabled,true);assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.hint.textContent,terminal?/無法接受|重新挑戰/:/3次|上限/);}finally{h.cleanup()}}
 });
 test(mode+': invalid rounds keep a visible disabled trigger and cannot open or submit',()=>{
  const h=fixture(mode);try{const invalids=mode==='duck'?[{phase:'failed',elapsedMs:0},{phase:'cancelled',elapsedMs:100},{phase:'success',elapsedMs:0}]:[state(mode,0),{...state(mode),practice:true},{...state(mode),phase:'live'}];for(const run of invalids){assert.equal(h.capture(run),false);h.open();assert.equal(h.host.hidden,true);assert.equal(h.trigger.hidden,false);assert.equal(h.trigger.disabled,true);assert.ok(h.hint.textContent.length>0);h.valid();h.$('rankingSubmit').click();assert.equal(h.requests.length,0)}}finally{h.cleanup()}
 });
 test(mode+': navigation aborts unresolved request, restores form and cannot be undone by late reply',async()=>{
  const wait=deferred(),h=fixture(mode,{fetcher:()=>wait.promise});try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide',{persisted:true}));assert.equal(h.posts()[0].options.signal.aborted,true);assert.equal(h.host.hidden,true);assert.equal(h.section.parentElement,h.home);wait.resolve(ok({accepted:true}));await flush();h.open();assert.equal(h.$('rankingSubmit').disabled,false);assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);}finally{h.cleanup()}
 });
 test(mode+': no crypto has a visible reason without sending anything',()=>{
  const h=fixture(mode,{cryptoBlocked:true});try{h.capture();h.open();assert.equal(h.$('rankingSubmit').disabled,true);assert.equal(h.trigger.disabled,true);assert.match(h.hint.textContent,/識別|瀏覽器/);h.valid();h.$('rankingSubmit').click();assert.equal(h.requests.length,0);}finally{h.cleanup()}
 });
 test(mode+': remembered nickname focuses unchecked consent, never consenting or submitting automatically',()=>{
  const h=fixture(mode,{storedNickname:'記住的玩家'});try{h.capture();h.open();assert.equal(h.$('rankingNickname').value,'記住的玩家');assert.equal(h.$('rankingConsent').checked,false);assert.equal(h.d.activeElement,h.$('rankingConsent'));assert.equal(h.posts().length,0);h.c.showResultUpload();assert.equal(h.posts().length,0);assert.equal(h.$('rankingConsent').checked,false);}finally{h.cleanup()}
 });
 test(mode+': native queued close events cannot dismiss a newer board or cancel a reopened inline request',async()=>{
  const post=deferred(),get=deferred();const h=fixture(mode,{queuedClose:true,fetcher:(url,options)=>options.method?post.promise:get.promise});try{
   h.capture();h.open();h.c.showBoard({origin:'result'});const boardRequest=h.requests[0];h.flushCloseEvents();assert.equal(boardRequest.options.signal.aborted,false);assert.equal(h.$('rankingDialog').open,true);
   h.c.dismiss(false);h.open();h.valid();h.$('rankingSubmit').click();const postRequest=h.posts()[0];h.flushCloseEvents();assert.equal(postRequest.options.signal.aborted,false);assert.equal(h.host.hidden,false);assert.equal(h.resultDialog.open,true);
   h.resultDialog.close();h.open();h.flushCloseEvents();assert.equal(postRequest.options.signal.aborted,false);assert.equal(h.$('rankingSubmit').disabled,true);assert.equal(h.posts().length,1);
   h.resultDialog.close();h.c.showResultUpload();assert.equal(h.resultDialog.open,false);h.$('rankingSubmit').click();assert.equal(h.posts().length,1);h.flushCloseEvents();assert.equal(postRequest.options.signal.aborted,true);assert.equal(h.host.hidden,true);
   post.resolve(ok({accepted:true}));get.resolve(ok({}));await flush();h.open();assert.match(h.$('rankingUploadStatus').textContent,/可能已收錄/);assert.equal(h.$('rankingSubmit').disabled,false);
  }finally{h.cleanup()}
 });

}

for(const mode of ['duck','catch','duel'])for(const remembered of [false,true])test(`${mode}: inline opening and validation keep the focused field visible in a short result scroller (${remembered?'stored':'blank'} name)`,async()=>{
 const h=fixture(mode,{storedNickname:remembered?'舊暱稱':undefined});try{h.capture();Object.defineProperty(h.scroll,'clientHeight',{value:120});h.scroll.getBoundingClientRect=()=>({top:100,bottom:220,height:120});h.host.getBoundingClientRect=()=>({top:300-h.scroll.scrollTop,bottom:900-h.scroll.scrollTop,height:600});for(const [name,pos,height]of[['rankingNickname',520,46],['rankingConsent',640,22]])h.$(name).getBoundingClientRect=()=>({top:100+pos-h.scroll.scrollTop,bottom:100+pos+height-h.scroll.scrollTop,height});
 h.open();const visible=()=>{const r=h.d.activeElement.getBoundingClientRect();assert.ok(r.top>=100&&r.bottom<=220,`focused ${h.d.activeElement.id}: ${r.top}..${r.bottom} outside100..220`)};visible();h.$('rankingNickname').value='有效暱稱';h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,0);assert.equal(h.d.activeElement,h.$('rankingConsent'));visible();h.$('rankingNickname').value='';h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,0);assert.equal(h.d.activeElement,h.$('rankingNickname'));visible();
 }finally{h.cleanup()}
});

// A real DOM with only transport and time replaced: catches cooldown/budget/lifecycle regressions.
function clockFor(w){
 let now=0,id=0;const jobs=new Map();w.Date.now=()=>now;
 w.setTimeout=(fn,ms)=>{jobs.set(++id,{fn,at:now+ms});return id};w.clearTimeout=id=>jobs.delete(id);
 return {tick(ms){const end=now+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn()}now=end},count:()=>jobs.size};
}
const limited=(data,header)=>({...ok(data,429),headers:{get:name=>name.toLowerCase()==='retry-after'?header:null}});
for(const mode of ['duck','catch','duel']){
 test(mode+': repeated cooldowns never spend retry budget; expiry never posts and retry keeps exact payload',async()=>{
  let n=0;const h=fixture(mode,{fetcher:()=>Promise.resolve(++n<=4?limited({reason:'cooldown',retryAfterSeconds:2},'9'):ok({error:'unavailable'},503))}),clock=clockFor(h.w);
  try{h.capture();h.open();h.valid();for(let i=0;i<4;i++){
   h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,i+1);assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.hint.textContent,/2 秒/);
   h.$('rankingSubmit').click();clock.tick(1000);assert.match(h.$('rankingUploadStatus').textContent,/1 秒/);
   h.resultDialog.close();h.open();assert.equal(h.$('rankingSubmit').disabled,true);clock.tick(1000);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(h.posts().length,i+1);
  }
  for(let i=0;i<3;i++){h.$('rankingSubmit').click();await flush()}assert.equal(h.posts().length,7);assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.hint.textContent,/3次/);assert.equal(new Set(h.posts().map(p=>p.options.body)).size,1);
  }finally{h.cleanup()}assert.equal(clock.count(),0);
 });
 test(mode+': reset preserves active same-game cooldown; destroy cancels timer',async()=>{
  const h=fixture(mode,{fetcher:()=>Promise.resolve(limited({reason:'cooldown',retryAfterSeconds:7},'7'))}),clock=clockFor(h.w);
  try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();const old=JSON.parse(h.posts()[0].options.body);h.c.reset();h.capture(state(mode,4));h.open();h.valid();assert.equal(h.$('rankingSubmit').disabled,true);h.$('rankingSubmit').click();assert.equal(h.posts().length,1);clock.tick(7000);assert.doesNotMatch(h.$('rankingUploadStatus').textContent,/等待 [1-9][0-9]* 秒/);assert.equal(h.posts().length,1);assert.equal(h.$('rankingSubmit').disabled,false);h.$('rankingSubmit').click();await flush();assert.notEqual(JSON.parse(h.posts()[1].options.body).submissionId,old.submissionId)}finally{h.cleanup()}assert.equal(clock.count(),0);
 });
 test(mode+': legacy rate limit honors Retry-After rather than hardcoding sixty seconds',async()=>{
  const h=fixture(mode,{fetcher:()=>Promise.resolve(limited({error:'limited'},'13'))}),clock=clockFor(h.w);
  try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();assert.match(h.$('rankingUploadStatus').textContent,/13 秒/);clock.tick(12000);assert.equal(h.$('rankingSubmit').disabled,true);clock.tick(1000);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(h.posts().length,1)}finally{h.cleanup()}
 });
 for(const [reason,pattern] of [['daily_limit',/每日|今日|當日/],['capacity',/容量|額滿/]])test(mode+': '+reason+' never promises a sixty-second cooldown',async()=>{
  const h=fixture(mode,{fetcher:()=>Promise.resolve(limited({error:'limited',reason},'60'))}),clock=clockFor(h.w);
  try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();assert.match(h.$('rankingUploadStatus').textContent,pattern);assert.doesNotMatch(h.$('rankingUploadStatus').textContent,/60|冷卻/);clock.tick(60000);assert.equal(h.posts().length,1)}finally{h.cleanup()}
 });
 test(mode+': accepted submission cooldown also survives a new round',async()=>{
  const h=fixture(mode),clock=clockFor(h.w);try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();h.capture(state(mode,4));h.open();h.valid();assert.equal(h.$('rankingSubmit').disabled,true);clock.tick(60000);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(h.posts().length,1)}finally{h.cleanup()}
 });
}
for(const mode of ['duck','catch','duel']){
 test(mode+': duplicate confirmation never creates a fresh sixty-second cooldown',async()=>{
  const h=fixture(mode,{fetcher:()=>Promise.resolve(ok({accepted:true,duplicate:true}))}),clock=clockFor(h.w);try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();h.capture(state(mode,4));h.open();assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(clock.count(),0)}finally{h.cleanup()}
 });
 test(mode+': stale 429 cannot impose cooldown on a newer round',async()=>{
  const wait=deferred(),h=fixture(mode,{fetcher:()=>wait.promise}),clock=clockFor(h.w);try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();h.capture(state(mode,4));h.open();wait.resolve(limited({reason:'cooldown',retryAfterSeconds:60},'60'));await flush();assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(clock.count(),0)}finally{h.cleanup()}
 });
 test(mode+': non-JSON 429 still honors Retry-After and does not consume service retries',async()=>{
  let n=0;const h=fixture(mode,{fetcher:()=>Promise.resolve(++n<=4?{...limited(null,'2'),json:async()=>{throw new SyntaxError('HTML proxy response')}}:ok({accepted:true}))}),clock=clockFor(h.w);try{h.capture();h.open();h.valid();for(let i=0;i<4;i++){h.$('rankingSubmit').click();await flush();assert.equal(h.$('rankingSubmit').disabled,true);assert.match(h.$('rankingUploadStatus').textContent,/2 秒/);clock.tick(2000);assert.equal(h.$('rankingSubmit').disabled,false)}h.$('rankingSubmit').click();await flush();assert.equal(h.posts().length,5);assert.match(h.hint.textContent,/已收錄/)}finally{h.cleanup()}
 });
}
for(const mode of ['duck','catch','duel'])test(mode+': oversized retry deadline is bounded and clock changes cannot outlive destroy',async()=>{
 const h=fixture(mode,{fetcher:()=>Promise.resolve(limited({reason:'cooldown',retryAfterSeconds:1e308},'1e308'))}),clock=clockFor(h.w);
 try{h.capture();h.open();h.valid();h.$('rankingSubmit').click();await flush();assert.match(h.$('rankingUploadStatus').textContent,/60 秒/);clock.tick(60000);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(clock.count(),0);h.$('rankingSubmit').click();await flush();h.w.Date.now=()=>-100000;clock.tick(1000);assert.equal(h.$('rankingSubmit').disabled,true);h.w.Date.now=()=>1e12;clock.tick(1000);assert.equal(h.$('rankingSubmit').disabled,false);assert.equal(clock.count(),0)}finally{h.cleanup()}assert.equal(clock.count(),0);
});
