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
 const context=vm.createContext({...bindings,document:d,window:w,localStorage:w.localStorage,navigator:w.navigator,URL,Blob,setTimeout,performance:{now:()=>now,timeOrigin:0},matchMedia:()=>({matches:false}),requestAnimationFrame:f=>(raf=f,1),cancelAnimationFrame:()=>raf=null,Image:class{set src(v){queueMicrotask(()=>this.onload?.())}},renderScene(){legacyPaints++},squeak(){},AudioContext:class{resume(){return Promise.resolve()}},loadGameStage:(canvas,options)=>{onUnavailable=options.onUnavailable;return new Promise((resolve,reject)=>{resolveStage=resolve;rejectStage=reject})},createScoreImage:async()=>({blob:new Blob(['png']),filename:'score.png'})});
 vm.runInContext(raw.replace(/^import .*\n/gm,''),context);await flush();
 return{d,w,$,paintedModes,get legacyPaints(){return legacyPaints},get disposed(){return disposed},get renders(){return renders},get timers(){return timers},frame(ms=20){now+=ms;raf?.()},get:expr=>vm.runInContext(expr,context),async ready(){resolveStage({stage,sampleForRun:s=>({phase:s.phase})});await flush()},async fail(){rejectStage(Error('Unavailable'));await flush()},timeout(){for(const [id,t]of timers)if(t.ms===5000){timers.delete(id);t.fn()}},cleanup(){w.dispatchEvent(new w.Event('pagehide'));dom.window.close()}};
}

for (const mode of ['mouse','touch']) for (const duration of [20,200,900]) test(`${mode}: final home position on pointerup completes ${duration}ms run`,async()=>{
 const h=await harness({seen:true});try{
 await h.ready();h.frame();h.$('play').click();
 const emit=(type,x,dt=0)=>{h.frame(dt);const e=new h.w.Event(type,{cancelable:true});Object.assign(e,{clientX:x*1000,pointerId:7,pointerType:mode,button:0,isPrimary:true});Object.defineProperty(e,'timeStamp',{value:h.get('clock()')});h.$('pad').dispatchEvent(e);};
 emit('pointerdown',.1);emit('pointermove',.9,10);emit('pointerup',.1,duration);
 assert.equal(h.get('s.phase'),'success');assert.equal(h.get('s.reason'),null);
 assert.ok(h.get('s.elapsedMs')>0);assert.equal(h.$('resultUpload').disabled,false);
 }finally{h.cleanup()}
});
for(const scenario of [
 {name:'release before home',far:.9,end:.4,dt:200,phase:'cancelled'},
 {name:'never reached duck',far:.6,end:.1,dt:200,phase:'cancelled'},
 {name:'same timestamp cannot fabricate movement',far:.9,end:.1,dt:0,phase:'cancelled'},
 {name:'too late return remains failed',far:.9,end:.1,dt:3000,phase:'failed'},
 {name:'invalid coordinate cannot finish',far:.9,end:NaN,dt:200,phase:'cancelled'},
])test(scenario.name,async()=>{const h=await harness({seen:true});try{
 await h.ready();h.frame();h.$('play').click();
 const emit=(type,x,dt=0)=>{h.frame(dt);const e=new h.w.Event(type,{cancelable:true});Object.assign(e,{clientX:x*1000,pointerId:7,pointerType:'mouse',button:0,isPrimary:true});Object.defineProperty(e,'timeStamp',{value:h.get('clock()')});h.$('pad').dispatchEvent(e);};
 emit('pointerdown',.1);emit('pointermove',scenario.far,10);emit('pointerup',scenario.end,scenario.dt);
 assert.equal(h.get('s.phase'),scenario.phase);assert.equal(h.$('resultUpload').disabled,true);
 }finally{h.cleanup()}});
