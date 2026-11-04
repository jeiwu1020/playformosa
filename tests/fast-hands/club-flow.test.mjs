import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const releaseInput=()=>new Promise(resolve=>setTimeout(resolve,5));
const root=new URL('../../public/games/fast-hands/',import.meta.url);
const {mountClub}=await import(new URL('club.mjs',root)).catch(()=>({}));
const html=mode=>readFileSync(new URL(mode==='duck'?'index.html':`${mode}.html`,root),'utf8');
function fixture({mode='duck',seen=false,blockedStorage=false,url,active=false,answer=true}={}){
 assert.equal(typeof mountClub,'function','the shared club entry controller must exist');
 const dom=new JSDOM(html(mode),{url:url||`https://qa.test/games/fast-hands/${mode==='duck'?'':mode+'.html'}`,pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 if(blockedStorage)Object.defineProperty(w,'sessionStorage',{get(){throw Error('denied')}});
 else if(seen)w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 const events=[],destinations=[];let starts=0;
 w.confirm=()=>{events.push('confirm');return answer};
 const options={document:d,window:w,mode,isActive:()=>active,onInterrupt:({reason})=>events.push(reason),onStart:()=>starts++,onNavigate:href=>destinations.push(href)};
 const club=mountClub(options),$=id=>d.getElementById(id);
 function click(selector,extra={}){const el=d.querySelector(selector);assert.ok(el,selector);const event=new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0,...extra});el.dispatchEvent(event);return event}
 return {dom,w,d,$,club,events,destinations,options,click,get starts(){return starts},close(){club.destroy();dom.window.close()}};
}

test('every entrance shows the same three illustrated games and one start action',()=>{
 for(const mode of ['duck','catch','duel']){const d=new JSDOM(html(mode)).window.document,intro=d.querySelector('#entryDialog');assert.ok(intro,`${mode} has the shared intro`);assert.equal(intro.querySelectorAll('.club-card').length,3);assert.equal(intro.querySelectorAll('.club-card img').length,3);assert.equal(intro.querySelectorAll('.intro-start').length,1);assert.equal(intro.querySelector('#entryStart').textContent.trim(),'開始遊戲');assert.ok(d.body.classList.contains('fast-hands-club'));assert.equal(d.querySelectorAll('[id]').length,new Set([...d.querySelectorAll('[id]')].map(el=>el.id)).size);}
});
test('first duck entry waits for Start then opens a score-free demo',()=>{
 const f=fixture();try{assert.equal(f.$('entryDialog').open,true);assert.equal(f.starts,0);assert.equal(f.$('entryClose').hidden,true);f.$('entryStart').click();assert.equal(f.$('entryDialog').open,false);assert.equal(f.starts,1);assert.equal(f.w.sessionStorage.getItem('fast-hands:club-intro:v1'),'seen');assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('first deep link starts at duck demo, and returning session enters directly',()=>{
 const f=fixture({mode:'catch'});try{f.$('entryStart').click();assert.equal(new URL(f.destinations[0]).pathname,'/games/fast-hands/');assert.equal(f.starts,0);}finally{f.close()}
 const returning=fixture({mode:'duel',seen:true});try{assert.equal(returning.$('entryDialog').open,false);assert.equal(returning.starts,1);assert.equal(returning.d.body.dataset.clubReady,'true');}finally{returning.close()}
});
test('storage-denied sessions carry one-hop marker and consume it without permanent storage',()=>{
 const f=fixture({mode:'catch',blockedStorage:true});try{f.$('entryStart').click();assert.equal(new URL(f.destinations[0]).searchParams.get('club'),'1');}finally{f.close()}
 const next=fixture({mode:'duck',blockedStorage:true,url:'https://qa.test/games/fast-hands/?club=1&view=front#demo'});try{assert.equal(next.$('entryDialog').open,false);assert.equal(next.w.location.search,'?view=front');assert.equal(next.w.location.hash,'#demo');assert.equal(next.w.localStorage.length,0);next.click('.level-switch a[href="duel.html"]');assert.equal(new URL(next.destinations[0]).searchParams.get('club'),'1');}finally{next.close()}
});
test('active navigation stops the round before confirmation and cancel never navigates',()=>{
 const f=fixture({seen:true,active:true,answer:false});try{f.click('.level-switch a[href="catch.html"]');assert.deepEqual(f.events,['navigation']);assert.equal(f.$('clubNavigationDialog').open,true);f.$('clubNavigationStay').click();assert.equal(f.$('clubNavigationDialog').open,false);assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('confirmed and idle navigation clean up once and preserve the exact destination',()=>{
 for(const active of [false,true]){const f=fixture({seen:true,active});try{f.click('.level-switch a[href="catch.html"]');assert.deepEqual(f.events,['navigation']);if(active){assert.equal(f.destinations.length,0);f.$('clubNavigationLeave').click();}assert.equal(f.destinations[0],'https://qa.test/games/fast-hands/catch.html');}finally{f.close()}}
});
test('same-game tabs do not reload or interrupt, modifier/new-tab links remain native',()=>{
 const f=fixture({seen:true,active:true});try{assert.equal(f.click('.level-switch a[href="./"]').defaultPrevented,true);assert.equal(f.click('.level-switch a[href="catch.html"]',{ctrlKey:true}).defaultPrevented,false);const link=f.d.querySelector('.level-switch a[href="duel.html"]');link.target='_blank';assert.equal(f.click('.level-switch a[href="duel.html"]').defaultPrevented,false);assert.deepEqual(f.events,[]);assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('home navigation is guarded but never receives the internal session marker',()=>{
 const f=fixture({seen:true,active:true,blockedStorage:false});try{f.click('a[href="/#minigames"]');assert.deepEqual(f.events,['navigation']);f.$('clubNavigationLeave').click();assert.equal(f.destinations[0],'https://qa.test/#minigames');}finally{f.close()}
});
test('menu reopens one dismissible intro without repeating initial start behavior',()=>{
 const f=fixture({seen:true,mode:'duel'});try{f.$('openMenu').click();assert.equal(f.$('entryDialog').open,true);assert.equal(f.$('entryClose').hidden,false);f.$('entryClose').click();assert.equal(f.$('entryDialog').open,false);assert.equal(f.starts,1);assert.equal(f.events[0],'intro');}finally{f.close()}
});
test('bfcache restoration and duplicate mounting do not replay intro or duplicate handlers',()=>{
 const f=fixture({seen:true});try{assert.equal(mountClub(f.options),f.club);f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide',{persisted:true}));f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(f.$('entryDialog').open,false);assert.equal(f.starts,1);f.click('.level-switch a[href="catch.html"]');assert.deepEqual(f.events,['pagehide','navigation']);assert.equal(f.destinations.length,1);}finally{f.close()}
});
test('returning duck startup becomes visible without opening an obsolete intro',async()=>{
 const f=fixture({seen:true});try{f.w.eval(f.$('pf-startup-script').textContent);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.d.documentElement.dataset.pfStartup,'ready');assert.equal(f.$('pf-startup'),null);assert.equal(f.$('entryDialog').open,false);}finally{f.close()}
});
test('new-level results are accessible dialogs with separate repeat and practice actions',()=>{
 for(const mode of ['catch','duel']){const d=new JSDOM(html(mode)).window.document,summary=d.querySelector('#summary');assert.equal(summary.tagName,'DIALOG');assert.ok(summary.querySelector('#summaryClose'));assert.ok(summary.querySelector('#summaryAgain'));assert.ok(summary.querySelector('#summaryPractice'));assert.ok(summary.querySelector('.summary-scroll #roundResults'));assert.ok(d.querySelector('.level-controls #roundButton'));}
});

async function duckApp({seen=false,answer=false}={}){
 const {default:vm}=await import('node:vm'),appUrl=new URL('app.mjs',root),raw=readFileSync(appUrl,'utf8'),bindings={};
 for(const match of raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const module=await import(new URL(match[2],appUrl));for(const part of match[1].split(',')){const [key,alias]=part.trim().split(/\s+as\s+/);bindings[alias||key]=module[key]}}
 const dom=new JSDOM(html('duck'),{url:'https://qa.test/games/fast-hands/',pretendToBeVisual:true}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 if(seen)w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
 let now=0,raf,confirms=0;const destinations=[],captures=new Set();
 w.confirm=()=>{confirms++;return answer};
 $('pad').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:200});$('pad').setPointerCapture=id=>captures.add(id);$('pad').hasPointerCapture=id=>captures.has(id);$('pad').releasePointerCapture=id=>captures.delete(id);
 const context=vm.createContext({...bindings,mountClub:options=>mountClub({...options,onNavigate:href=>destinations.push(href)}),document:d,window:w,localStorage:w.localStorage,navigator:w.navigator,URL,Blob,setTimeout,performance:{now:()=>now,timeOrigin:0},matchMedia:()=>({matches:false}),requestAnimationFrame:f=>(raf=f,1),cancelAnimationFrame:()=>raf=null,Image:class{set src(v){queueMicrotask(()=>this.onload?.())}},renderScene(){},squeak(){},AudioContext:class{resume(){return Promise.resolve()}},loadGameStage:async()=>{throw Error('use fallback')},captureFinaleImage:async()=>{throw Error('Canvas capture is outside this navigation fixture')},createScoreImage:async()=>({blob:new Blob(['png']),filename:'score.png'})});
 vm.runInContext(raw.replace(/^import .*\n/gm,''),context);await new Promise(resolve=>setImmediate(resolve));
 function frame(ms=20){now+=ms;raf?.()}
 function send(type,x){now+=10;const e=new w.Event(type,{bubbles:true,cancelable:true});for(const [key,value]of Object.entries({pointerType:'mouse',pointerId:1,isPrimary:true,button:0,clientX:x*1000,timeStamp:now}))Object.defineProperty(e,key,{value});$('pad').dispatchEvent(e)}
 function switchGame(){d.querySelector('.level-switch a[href="catch.html"]').click()}
 return {dom,w,d,$,captures,destinations,frame,send,switchGame,get:expression=>vm.runInContext(expression,context),get confirms(){return confirms},close(){w.dispatchEvent(new w.PageTransitionEvent('pagehide'));dom.window.close()}};
}
test('duck app returning session begins demonstration with no flash of entry',async()=>{
 const h=await duckApp({seen:true});try{h.frame();assert.equal(h.$('entryDialog').open,false);assert.equal(h.d.body.dataset.clubReady,'true');assert.equal(h.get('demo'),true);}finally{h.close()}
});
test('duck switch cancellation releases the pointer and suppresses a delayed cancelled-result modal',async()=>{
 const h=await duckApp({seen:true});try{h.$('play').click();h.send('pointerdown',.1);h.send('pointermove',.9);assert.equal(h.captures.size,1);h.switchGame();assert.equal(h.confirms,0);assert.equal(h.$('clubNavigationDialog').open,true);assert.equal(h.captures.size,0);assert.equal(h.get('s.phase'),'cancelled');h.frame(3000);assert.equal(h.$('resultDialog').open,false);assert.equal(h.destinations.length,0);h.$('clubNavigationStay').click();h.send('pointerup',.9);await releaseInput();h.$('retry').click();assert.equal(h.get('s.phase'),'idle');}finally{h.close()}
});
test('finished duck navigation clears pending presentation without asking to abandon an active round',async()=>{
 const h=await duckApp({seen:true});try{h.$('play').click();h.send('pointerdown',.1);h.send('pointermove',.9);h.send('pointermove',.1);h.send('pointerup',.1);const score=h.get('s.elapsedMs');h.switchGame();assert.equal(h.confirms,0);h.frame(3000);assert.equal(h.$('resultDialog').open,false);assert.equal(h.get('s.elapsedMs'),score);assert.equal(h.destinations.length,1);}finally{h.close()}
});
test('storage-denied sessions survive extensionless canonical routes and a slashless duck entrance',()=>{
 for(const [mode,path]of [['catch','/games/fast-hands/catch'],['duel','/games/fast-hands/duel'],['duck','/games/fast-hands']]){const f=fixture({mode,blockedStorage:true,url:`https://qa.test${path}?club=1`});try{f.club.requestNavigation('https://qa.test/games/fast-hands/duel');assert.equal(new URL(f.destinations[0]).searchParams.get('club'),'1');}finally{f.close()}}
});

test('new-level result dialogs offer all three guarded game switches without dismissing results first',()=>{
 for(const mode of ['catch','duel']){const d=new JSDOM(html(mode)).window.document;assert.deepEqual([...d.querySelectorAll('#summary .level-switch a')].map(a=>a.dataset.clubMode),['duck','catch','duel']);assert.equal(d.querySelector('#summary .level-switch [aria-current="page"]').dataset.clubMode,mode);}
});
test('duck replay is stopped on navigation and cannot reappear after a bfcache return',async()=>{
 const h=await duckApp({seen:true});try{h.$('play').click();h.send('pointerdown',.1);h.send('pointermove',.9);h.send('pointermove',.1);h.send('pointerup',.1);h.frame(3000);h.$('resultDemo').click();assert.equal(h.get('replaying'),true);h.switchGame();assert.equal(h.get('replaying'),false);assert.equal(h.confirms,0);h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide',{persisted:true}));h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow',{persisted:true}));h.frame(3000);assert.equal(h.$('resultDialog').open,false);assert.equal(h.$('entryDialog').open,false);}finally{h.close()}
});
test('reopened introduction cannot discard an in-progress match through its Start button',()=>{
 const f=fixture({mode:'duel',seen:true,active:true,answer:false});try{f.$('openMenu').click();f.$('entryStart').click();assert.deepEqual(f.events,['intro','navigation']);assert.equal(f.$('clubNavigationDialog').open,true);f.$('clubNavigationStay').click();assert.equal(f.destinations.length,0);assert.equal(f.$('entryDialog').open,false);}finally{f.close()}
});
test('duck pending confirmation blocks visible and programmatic background game controls',async()=>{
 const h=await duckApp({seen:true});try{h.$('play').click();h.send('pointerdown',.1);h.send('pointermove',.9);h.switchGame();const run=h.get('s');assert.equal(h.$('clubNavigationDialog').open,true);for(const id of ['play','retry','showDemo']){h.$(id).click();h.$(id).onclick?.();assert.equal(h.get('s'),run,`${id} cannot reset a pending run`);assert.equal(h.get('demo'),false,`${id} cannot reopen demonstration`);}h.$('headerRanking').click();h.$('headerSettings').click();h.frame(4000);assert.equal(h.$('resultDialog').open,false);assert.equal(h.$('rankingDialog').open,false);assert.equal(h.$('info').open,false);assert.equal(h.$('clubNavigationDialog').open,true);}finally{h.close()}
});
for(const seen of [false,true])test(`duck ${seen?'reopened menu':'first introduction'} opens its visible ranking control without stacking dialogs`,async()=>{
 const h=await duckApp({seen});try{if(seen)h.$('openMenu').click();assert.equal(h.$('entryDialog').open,true);h.$('entryRanking').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.$('rankingDialog').open,true);assert.equal(h.$('entryDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.d.body.dataset.overlay,'ranking');}finally{h.close()}
});

test('duck introduction keeps its visible settings control functional without allowing background navigation controls',async()=>{
 const h=await duckApp({seen:false});try{assert.equal(h.$('entryDialog').open,true);h.$('about').click();assert.equal(h.$('info').open,true);assert.equal(h.$('entryDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.$('closeInfo').click();h.$('openMenu').click();assert.equal(h.$('entryDialog').open,true);h.$('about').click();assert.equal(h.$('info').open,true);}finally{h.close()}
});
