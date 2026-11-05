import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const appUrl=new URL('../../public/games/fast-hands/app.mjs',import.meta.url);
const raw=readFileSync(appUrl,'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({fetcher}={}){
 const bindings={};for(const m of raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const mod=await import(new URL(m[2],appUrl));for(const part of m[1].split(',')){const [key,alias]=part.trim().split(/\s+as\s+/);bindings[alias||key]=mod[key]}}
 const dom=new JSDOM(readFileSync(new URL('index.html',appUrl),'utf8'),{url:'https://qa.test/games/fast-hands/',pretendToBeVisual:true}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 let now=0,raf,videoPlaying=false;const requests=[];
 w.HTMLMediaElement.prototype.play=function(){videoPlaying=true;return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){videoPlaying=false};Object.defineProperty($('demo3d'),'paused',{get:()=>!videoPlaying});
 w.fetch=async(url,options)=>{requests.push({url,options});return fetcher?fetcher(url,options):{ok:true,status:200,json:async()=>url.includes('submissions')?{accepted:true,bestUpdated:true}:{game:'fast-hands',rules:'shuttle-v3-'+new URL(url,'https://qa.test').searchParams.get('mode'),unit:'ms',entries:[],own:null}}};
 const captures=new Set();$('pad').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:200});$('pad').setPointerCapture=id=>captures.add(id);$('pad').hasPointerCapture=id=>captures.has(id);$('pad').releasePointerCapture=id=>captures.delete(id);
 const context=vm.createContext({...bindings,document:d,window:w,localStorage:w.localStorage,navigator:w.navigator,URL,Blob,setTimeout,performance:{now:()=>now,timeOrigin:0},matchMedia:()=>({matches:false}),requestAnimationFrame:f=>(raf=f,1),cancelAnimationFrame:()=>raf=null,Image:class{set src(v){queueMicrotask(()=>this.onload?.())}},renderScene(){},squeak(){},AudioContext:class{resume(){return Promise.resolve()}},loadGameStage:async()=>{throw Error('fixture uses offline fallback')},captureFinaleImage:async()=>{throw Error('Canvas capture is outside this leaderboard fixture')},createScoreImage:async()=>({blob:new Blob(['png']),filename:'score.png'})});
 vm.runInContext(raw.replace(/^import .*\n/gm,''),context);await flush();
 function frame(ms=20){now+=ms;raf?.()}
 function send(type,x,pointerType='mouse'){now+=10;const event=new w.Event(type,{bubbles:true,cancelable:true});for(const [key,value]of Object.entries({pointerType,pointerId:1,isPrimary:true,button:0,clientX:x*1000,timeStamp:now}))Object.defineProperty(event,key,{value});$('pad').dispatchEvent(event)}
 function win(mode='mouse'){ if($('entryDialog').open)$('entryStart').click();$('play').click();frame();send('pointerdown',.1,mode);send('pointermove',.9,mode);send('pointermove',.1,mode);send('pointerup',.1,mode);frame(1000) }
 return {dom,w,d,$,requests,get leaderboardRequests(){return requests.filter(r=>['/api/leaderboard','/api/leaderboard/submissions'].includes(new URL(r.url,'https://qa.test').pathname));},get countRequests(){return requests.filter(r=>r.url==='/api/play-counts/starts');},frame,send,win,get:expr=>vm.runInContext(expr,context),cleanup(){assert.ok(requests.every(r=>['/api/leaderboard','/api/leaderboard/submissions','/api/play-counts/starts'].includes(new URL(r.url,'https://qa.test').pathname)),'unexpected network endpoint');w.dispatchEvent(new w.Event('pagehide'));dom.window.close()},get videoPlaying(){return videoPlaying}};
}

test('real app opens a single accessible board from entry, pauses demo, blocks gestures and returns to entry',async()=>{
 const h=await harness();try{assert.equal(h.requests.length,0);h.$('entryRanking').click();await flush();assert.equal(h.$('rankingDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.videoPlaying,false);assert.equal(h.d.body.dataset.overlay,'ranking');h.send('pointerdown',.1);assert.equal(h.get('activePointer'),null);h.$('rankingReturn').click();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.$('entryStart').click();h.frame();assert.equal(h.videoPlaying,true);assert.equal(h.get('demo'),true);}finally{h.cleanup()}
});

test('actual successful touch input freezes raw milliseconds and preserves upload after result reopen',async()=>{
 const h=await harness();try{h.win('touch');assert.equal(h.countRequests.length,1);assert.equal(h.$('resultDialog').open,true);const rawScore=h.get('s.elapsedMs');assert.equal(h.$('resultUpload').disabled,false);assert.equal(h.leaderboardRequests.length,0);h.$('resultTime').textContent='0.000';h.$('resultUpload').click();assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.$('rankingNickname').value='觸控玩家';h.$('rankingConsent').checked=true;h.$('rankingSubmit').click();await flush();const post=h.requests.find(x=>x.url==='/api/leaderboard/submissions'&&x.options.method==='POST');assert.ok(post);const payload=JSON.parse(post.options.body);assert.equal(payload.score,rawScore);assert.equal(payload.rules,'shuttle-v3-touch');h.$('rankingClose').click();assert.equal(h.$('resultDialog').open,true);h.$('resultClose').click();h.$('viewResult').click();h.$('resultUpload').click();assert.equal(h.$('rankingSubmit').textContent,'已提交');assert.equal(h.$('rankingSubmit').disabled,true);h.$('rankingSubmit').click();assert.equal(h.leaderboardRequests.length,1);h.$('rankingClose').click();h.$('resultAgain').click();assert.equal(h.$('resultUpload').disabled,true);assert.equal(h.get('s.phase'),'idle');assert.equal(h.d.querySelectorAll('dialog[open]').length,0);}finally{h.cleanup()}
});

test('failed, cancelled and demo rounds never enable upload; board API failure does not prevent another challenge',async()=>{
 const h=await harness({fetcher:async()=>({ok:false,status:503,json:async()=>({error:'unavailable'})})});try{h.$('entryRanking').click();await flush();assert.match(h.$('rankingBoardStatus').textContent,/無法讀取/);h.$('rankingClose').click();h.$('entryStart').click();assert.equal(h.$('resultUpload').disabled,true);h.$('play').click();h.send('pointerdown',.1);h.send('pointermove',.9);h.send('pointerup',.9);h.frame(1000);assert.equal(h.get('s.phase'),'cancelled');assert.equal(h.$('resultUpload').disabled,true);h.$('resultAgain').click();h.send('pointerdown',.1);h.send('pointermove',.9);h.frame(2500);h.send('pointerup',.9);h.frame(1000);assert.equal(h.$('resultUpload').disabled,true);h.$('resultAgain').click();h.win();assert.equal(h.$('resultUpload').disabled,false);}finally{h.cleanup()}
});

test('board tabs cannot alter frozen category and closing result board restores the same result',async()=>{
 const h=await harness();try{h.win('mouse');assert.equal(h.countRequests.length,1);const frozen=h.get('s.elapsedMs');h.$('resultRanking').click();await flush();h.$('rankingTouch').click();await flush();assert.equal(h.get('mode'),'mouse');h.$('rankingClose').click();assert.equal(h.$('resultDialog').open,true);h.$('resultUpload').click();h.$('rankingNickname').value='鼠王';h.$('rankingConsent').checked=true;h.$('rankingSubmit').click();await flush();const payload=JSON.parse(h.requests.find(x=>x.url==='/api/leaderboard/submissions'&&x.options.method==='POST').options.body);assert.equal(payload.rules,'shuttle-v3-mouse');assert.equal(payload.score,frozen);}finally{h.cleanup()}
});

test('result direct upload expands inside same ticket and never posts until explicit consent and submit',async()=>{
 const h=await harness();try{h.win('touch');assert.equal(h.countRequests.length,1);const score=h.get('s.elapsedMs'),trigger=h.$('resultUploadDirect');assert.ok(trigger,'direct upload result control');assert.equal(trigger.disabled,false);trigger.click();assert.equal(h.$('resultDialog').open,true);assert.equal(h.$('rankingDialog').open,false);assert.equal(h.$('resultUploadHost').hidden,false);assert.ok(h.$('resultUploadHost').contains(h.$('rankingUpload')));assert.equal(h.leaderboardRequests.length,0);
 h.$('rankingNickname').value='結算玩家';h.$('rankingSubmit').click();await flush();assert.equal(h.leaderboardRequests.length,0);h.$('rankingConsent').checked=true;h.$('rankingSubmit').click();await flush();const post=h.requests.find(x=>x.url==='/api/leaderboard/submissions'&&x.options.method==='POST');assert.ok(post);const body=JSON.parse(post.options.body);assert.equal(body.score,score);assert.equal(body.rules,'shuttle-v3-touch');assert.equal(h.$('resultDialog').open,true);h.$('resultClose').click();h.$('viewResult').click();assert.equal(trigger.disabled,true);assert.match(h.$('resultUploadHint').textContent,/已/);assert.equal(h.leaderboardRequests.length,1);
 }finally{h.cleanup()}
});

const drainToolbar=()=>new Promise(resolve=>setTimeout(resolve,10));
test('header board can open frozen-result upload while gameplay remains blocked, then returns focus to the game',async()=>{
 const h=await harness();try{
  h.d.documentElement.dataset.pfStartup='ready';h.win();h.$('resultClose').click();const state=h.get('s');
  h.$('headerRanking').click();await flush();assert.equal(h.$('rankingDialog').open,true);assert.equal(h.$('resultUpload').disabled,false);
  h.$('resultUpload').click();assert.equal(h.$('rankingUpload').hidden,false);assert.equal(h.$('rankingBoard').hidden,true);
  assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.$('retry').click();h.send('pointerdown',.1);h.send('pointerup',.1);assert.equal(h.get('s'),state);
  assert.equal(h.leaderboardRequests.filter(r=>r.url==='/api/leaderboard/submissions').length,0);
  h.$('rankingReturn').click();await drainToolbar();assert.equal(h.d.querySelectorAll('dialog[open]').length,0);assert.equal(h.d.activeElement,h.$('retry'));assert.equal(h.get('s'),state);
 }finally{h.cleanup()}
});
for(const child of ['entryRanking','about'])test(`replay help ${child} transfers its overlay until the child and intro are closed`,async()=>{
 const h=await harness();try{
  h.d.documentElement.dataset.pfStartup='ready';h.win();const state=h.get('s');h.$('resultDemo').click();h.$('openMenu').click();assert.equal(h.$('entryDialog').open,true);
  h.$(child).click();await drainToolbar();const childDialog=h.$(child==='entryRanking'?'rankingDialog':'info');
  assert.equal(childDialog.open,true);assert.equal(h.$('entryDialog').open,false);assert.equal(h.$('resultDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);
  h.$('retry').click();h.send('pointerdown',.1);h.send('pointerup',.1);assert.equal(h.get('s'),state);
  if(child==='entryRanking'){h.$('resultUpload').click();assert.equal(h.$('rankingUpload').hidden,false);h.$('rankingReturn').click();}else h.$('closeInfo').click();
  await drainToolbar();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.$('resultDialog').open,false);assert.equal(h.d.activeElement,h.$(child));
  h.$('entryClose').click();await drainToolbar();assert.equal(h.$('resultDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.d.activeElement,h.$('resultAgain'));assert.equal(h.get('s'),state);assert.equal(h.get('replaying'),false);
 }finally{h.cleanup()}
});

for(const tool of ['headerRanking','headerSettings','openMenu'])test(`duck BFCache restores ${tool} without a stale overlay lock or losing the frozen result`,async()=>{
 const h=await harness();try{
  h.d.documentElement.dataset.pfStartup='ready';h.win();h.$('resultClose').click();const state=h.get('s');h.$(tool).click();
  for(const type of ['pagehide','pageshow']){const event=new h.w.Event(type);Object.defineProperty(event,'persisted',{value:true});h.w.dispatchEvent(event);}
  await drainToolbar();assert.equal(h.get('disposed'),false);assert.equal(h.get('club.blocked()'),false);assert.equal(h.d.querySelectorAll('dialog[open]').length,0);assert.equal(h.get('s'),state);assert.equal(h.d.activeElement,h.$('retry'));
  h.$('headerRanking').click();assert.equal(h.$('rankingDialog').open,true);h.$('resultUpload').click();assert.equal(h.$('rankingUpload').hidden,false);assert.equal(h.$('rankingSubmit').disabled,false);
  h.$('rankingClose').click();await drainToolbar();h.$('retry').click();assert.equal(h.get('s.phase'),'idle');
 }finally{h.cleanup()}
});

test('a queued close from the replaced intro cannot close its newly reopened parent view',async()=>{
 const h=await harness();try{
  h.win();h.$('resultDemo').click();h.$('openMenu').click();h.$('entryRanking').click();h.$('rankingReturn').click();assert.equal(h.$('entryDialog').open,true);
  h.$('entryDialog').dispatchEvent(new h.w.Event('close'));await drainToolbar();assert.equal(h.$('entryDialog').open,true);assert.equal(h.$('resultDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);
  h.$('entryClose').click();await drainToolbar();assert.equal(h.$('resultDialog').open,true);
 }finally{h.cleanup()}
});
