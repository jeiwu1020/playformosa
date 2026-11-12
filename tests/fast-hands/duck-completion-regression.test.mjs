import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const appUrl=new URL('../../public/games/fast-hands/app.mjs',import.meta.url);
const raw=readFileSync(appUrl,'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function harness({seen=false,firstFrameFails=false}={}){
 const bindings={};for(const m of raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const mod=await import(new URL(m[2],appUrl));for(const part of m[1].split(',')){const [key,alias]=part.trim().split(/\s+as\s+/);bindings[alias||key]=mod[key]}}
 const dom=new JSDOM(readFileSync(new URL('index.html',appUrl),'utf8'),{url:'https://qa.test/games/fast-hands/',pretendToBeVisual:true}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 if(seen)w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};
 let now=0,raf,resolveStage,rejectStage,onUnavailable,legacyPaints=0,disposed=0,renders=0;const timers=new Map();let timerId=0;
 w.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId};w.clearTimeout=id=>timers.delete(id);
 const captures=new Set();$('pad').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:200});$('pad').setPointerCapture=id=>captures.add(id);$('pad').hasPointerCapture=id=>captures.has(id);$('pad').releasePointerCapture=id=>captures.delete(id);
 const paintedModes=[],stage={metrics:{frames:0},render(){paintedModes.push(d.body.dataset.renderer);if(firstFrameFails){onUnavailable('First paint failed');return false;}renders++;this.metrics.frames++;return true},resize(){},dispose(){disposed++}};
 const context=vm.createContext({...bindings,document:d,window:w,localStorage:w.localStorage,navigator:w.navigator,URL,Blob,setTimeout,performance:{now:()=>now,timeOrigin:0},matchMedia:()=>({matches:false}),requestAnimationFrame:f=>(raf=f,1),cancelAnimationFrame:()=>raf=null,Image:class{set src(v){queueMicrotask(()=>this.onload?.())}},renderScene(){legacyPaints++},squeak(){},AudioContext:class{resume(){return Promise.resolve()}},loadGameStage:(canvas,options)=>{onUnavailable=options.onUnavailable;return new Promise((resolve,reject)=>{resolveStage=resolve;rejectStage=reject})},captureFinaleImage:async()=>null,createScoreImage:async()=>({blob:new Blob(['png']),filename:'score.png'})});
 vm.runInContext(raw.replace(/^import .*\n/gm,''),context);await flush();
 return{d,w,$,paintedModes,get legacyPaints(){return legacyPaints},get disposed(){return disposed},get renders(){return renders},get timers(){return timers},frame(ms=20){now+=ms;raf?.()},get:expr=>vm.runInContext(expr,context),async ready(){resolveStage({stage,sampleForRun:s=>({phase:s.phase})});await flush()},async fail(){rejectStage(Error('Unavailable'));await flush()},timeout(){for(const [id,t]of timers)if(t.ms===5000){timers.delete(id);t.fn()}},cleanup(){w.dispatchEvent(new w.Event('pagehide'));dom.window.close()}};
}


function emit(h,type,x,dt=0,extra={}){h.frame(dt);const e=new h.w.Event(type,{cancelable:true});Object.assign(e,{clientX:x*1000,pointerId:7,pointerType:'mouse',button:0,isPrimary:true,...extra});Object.defineProperty(e,'timeStamp',{value:h.get('clock()')});h.$('pad').dispatchEvent(e);}
for(const pointerType of ['mouse','touch'])test(`${pointerType}: home crossing finishes without release`,async()=>{const h=await harness({seen:true});try{
 await h.ready();h.frame();h.$('play').click();
 emit(h,'pointerdown',.1,0,{pointerType});emit(h,'pointermove',.9,10,{pointerType});emit(h,'pointermove',.1,200,{pointerType});
 assert.equal(h.get('s.phase'),'success');const score=h.get('s.elapsedMs');assert.equal(h.get('activePointer'),null);assert.equal(h.$('pad').hasPointerCapture(7),false);
 h.frame(1000);assert.equal(h.$('resultDialog').open,true);assert.equal(h.get('s.elapsedMs'),score);assert.equal(h.$('resultUpload').disabled,false);
 emit(h,'pointerup',.1,100,{pointerType});assert.equal(h.get('s.elapsedMs'),score);assert.equal(h.get('s.phase'),'success');
 }finally{h.cleanup()}});
for(const reason of ['released','pointercancel','blur','timeout'])test(`${reason}: unfinished round never displays score seconds`,async()=>{const h=await harness({seen:true});try{
 await h.ready();h.frame();h.$('play').click();emit(h,'pointerdown',.1);emit(h,'pointermove',.9,10);h.frame(100);assert.match(h.$('time').textContent,/0\.100/);
 if(reason==='released')emit(h,'pointerup',.9,100);
 if(reason==='pointercancel')emit(h,'pointercancel',.5,100);
 if(reason==='blur')h.w.dispatchEvent(new h.w.Event('blur'));
 if(reason==='timeout')h.frame(3000);
 h.frame();assert.equal(h.$('time').textContent,'未完成');assert.equal(h.$('time').dataset.ms,'');assert.equal(h.$('resultUpload').disabled,true);
 }finally{h.cleanup()}});
test('coalesced moves stop cleanly after a successful crossing',async()=>{const h=await harness({seen:true});try{
 await h.ready();h.frame();h.$('play').click();emit(h,'pointerdown',.1);emit(h,'pointermove',.9,10);h.frame(200);
 const samples=[{clientX:100,timeStamp:h.get('clock()')-1},{clientX:300,timeStamp:h.get('clock()')}];
 emit(h,'pointermove',.3,0,{getCoalescedEvents:()=>samples});assert.equal(h.get('s.phase'),'success');assert.equal(h.get('activePointer'),null);h.frame(1000);assert.equal(h.$('resultDialog').open,true);
 }finally{h.cleanup()}});
