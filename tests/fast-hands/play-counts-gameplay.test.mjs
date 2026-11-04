import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';

const root=new URL('../../public/games/fast-hands/',import.meta.url),flush=()=>new Promise(resolve=>setImmediate(resolve));
function browser(mode){
 const dom=new JSDOM(readFileSync(new URL(mode==='duck'?'index.html':`${mode}.html`,root),'utf8'),{url:`https://counts.test/games/fast-hands/${mode}`,pretendToBeVisual:true});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),calls=[];let sequence=0;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'));}};
 w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};
 w.crypto.randomUUID=()=>`11111111-1111-4111-8111-${String(++sequence).padStart(12,'0')}`;
 // Every fetch is replaced locally. Unexpected endpoints fail rather than reaching a network.
 w.fetch=async(url,options)=>{assert.equal(url,'/api/play-counts/starts');calls.push({url,options});return{ok:true,status:200};};
 return{w,d,$,calls,close:()=>dom.window.close()};
}
function level(mode){
 const h=browser(mode);let now=0,frame,blocked=false,clubOptions;
 const app=mountLevel({document:h.d,window:h.w,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:()=>null,clubFactory:options=>(clubOptions=options,{blocked:()=>blocked,destroy(){}}),imageCapture:async()=>{throw Error('No pixels needed');},soundFactory:()=>({unlock(){},cue(){},destroy(){}})});
 const tick=target=>{while(now+100<target){now+=100;frame(now);}now=target;frame(now);};
 return{...h,app,tick,get now(){return now;},click:id=>h.$(id).click(),practice(){this.click('roundButton');this.click('actionButton');tick(now+1700);},formal(){this.practice();this.click('roundButton');},win(){tick(app.state.readyAt);tick(mode==='catch'?app.state.targetAt:now+100);this.click('actionButton');},settle(){tick(now+1700);},switchAway(){blocked=true;clubOptions.onInterrupt({reason:'navigation'});},stay(){blocked=false;},close(){app.destroy();h.close();}};
}
async function duck(){
 const h=browser('duck'),url=new URL('app.mjs',root),raw=readFileSync(url,'utf8'),bindings={};
 for(const m of raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)){const mod=await import(new URL(m[2],url));for(const part of m[1].split(',')){const[key,alias]=part.trim().split(/\s+as\s+/);bindings[alias||key]=mod[key];}}
 let now=0,frame,blocked=false,clubOptions;const captures=new Set();
 h.$('pad').getBoundingClientRect=()=>({left:0,top:0,width:1000,height:200});h.$('pad').setPointerCapture=id=>captures.add(id);h.$('pad').hasPointerCapture=id=>captures.has(id);h.$('pad').releasePointerCapture=id=>captures.delete(id);
 const context=vm.createContext({...bindings,document:h.d,window:h.w,localStorage:h.w.localStorage,navigator:h.w.navigator,URL,Blob,setTimeout,performance:{now:()=>now,timeOrigin:0},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame:()=>{},Image:class{set src(value){queueMicrotask(()=>this.onload?.());}},renderScene(){},squeak(){},AudioContext:class{resume(){return Promise.resolve();}},loadGameStage:async()=>({stage:{metrics:{},render:()=>true,resize(){},dispose(){}},sampleForRun:s=>({phase:s.phase})}),captureFinaleImage:async()=>{throw Error('No pixels needed');},mountClub:options=>(clubOptions=options,{blocked:()=>blocked,destroy(){}})});
 vm.runInContext(raw.replace(/^import .*\n/gm,''),context);await flush();frame();
 return{...h,get state(){return vm.runInContext('s',context);},click:id=>h.$(id).click(),frame(ms=20){now+=ms;frame();},pointer(type,x=.1,extra={}){now+=20;const event=new h.w.Event(type,{bubbles:true,cancelable:true});for(const[key,value]of Object.entries({clientX:x*1000,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,timeStamp:now,...extra}))Object.defineProperty(event,key,{value});h.$('pad').dispatchEvent(event);},win(){this.pointer('pointermove',.9);this.pointer('pointermove',.1);this.pointer('pointerup',.1);},switchAway(){blocked=true;clubOptions.onInterrupt({reason:'navigation'});},stay(){blocked=false;},close(){h.w.dispatchEvent(new h.w.Event('pagehide'));h.close();}};
}

test('duck counts only an accepted official arm, never demo, preparation, rejected pointers or repeated events',async()=>{
 const h=await duck();try{h.pointer('pointerdown');h.click('showDemo');h.frame();assert.equal(h.calls.length,0);h.click('play');h.click('retry');assert.equal(h.calls.length,0);h.pointer('pointerdown',.5);h.pointer('pointerdown',.1,{isPrimary:false});h.pointer('pointerdown',.1,{pointerType:'pen'});assert.equal(h.calls.length,0);h.pointer('pointerdown');assert.equal(h.state.phase,'armed');assert.equal(h.calls.length,1);assert.equal(JSON.parse(h.calls[0].options.body).game,'fast-hands');h.pointer('pointerdown');h.pointer('pointermove',.4);assert.equal(h.calls.length,1);}finally{h.close();}
});
test('duck cancelled switch, current-run retry, resize and restored page never double-count a run',async()=>{
 const h=await duck();try{h.click('play');h.pointer('pointerdown');assert.equal(h.calls.length,1);h.switchAway();assert.equal(h.state.phase,'cancelled');h.click('retry');h.pointer('pointerdown');assert.equal(h.calls.length,1);h.stay();h.click('retry');h.pointer('pointerdown');assert.equal(h.state.phase,'armed');assert.equal(h.calls.length,1);h.w.dispatchEvent(new h.w.Event('resize'));h.pointer('pointerdown');assert.equal(h.calls.length,1);h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide',{persisted:true}));h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow',{persisted:true}));h.click('retry');h.pointer('pointerdown');assert.equal(h.calls.length,1);}finally{h.close();}
});
test('duck replay is free and a new challenge after a completed result gets a new run ID',async()=>{
 const h=await duck();try{h.click('play');h.pointer('pointerdown');h.win();assert.equal(h.state.phase,'success');h.click('viewResult');h.click('resultDemo');h.frame();assert.equal(h.calls.length,1);h.click('viewResult');h.click('resultAgain');assert.equal(h.calls.length,1);h.pointer('pointerdown');assert.equal(h.calls.length,2);assert.notEqual(JSON.parse(h.calls[0].options.body).runId,JSON.parse(h.calls[1].options.body).runId);h.win();h.pointer('pointerdown');assert.equal(h.calls.length,3);}finally{h.close();}
});
for(const mode of ['catch','duel']){
 test(`${mode} practice, repeated practice and blocked starts never count; first official start counts once`,()=>{
  const h=level(mode);try{assert.equal(h.calls.length,0);h.practice();assert.equal(h.calls.length,0);h.click('practiceAgain');h.click('actionButton');h.settle();assert.equal(h.calls.length,0);h.switchAway();h.click('roundButton');assert.equal(h.calls.length,0);h.stay();h.click('roundButton');assert.equal(h.app.state.practice,false);assert.equal(h.app.state.phase,'waiting');assert.equal(h.calls.length,1);assert.equal(JSON.parse(h.calls[0].options.body).game,`fast-hands-${mode}`);h.click('roundButton');assert.equal(h.calls.length,1);}finally{h.close();}
 });
 test(`${mode} later rounds, cancelled navigation and paused retries retain the original counted match`,()=>{
  const h=level(mode);try{h.formal();assert.equal(h.calls.length,1);h.switchAway();assert.equal(h.app.state.phase,'paused');h.click('roundButton');h.stay();h.click('roundButton');assert.equal(h.app.state.phase,'waiting');assert.equal(h.calls.length,1);h.win();h.settle();h.click('roundButton');assert.equal(h.app.state.results.length,1);assert.equal(h.calls.length,1);h.w.dispatchEvent(new h.w.Event('blur'));h.click('roundButton');assert.equal(h.calls.length,1);h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide',{persisted:true}));h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow',{persisted:true}));h.click('roundButton');assert.equal(h.calls.length,1);}finally{h.close();}
 });
 test(`${mode} one full match, result replay and explicit next match produce exactly two starts`,()=>{
  const h=level(mode);try{h.formal();if(mode==='duel'){for(let i=0;i<9;i++){h.click('actionButton');h.settle();h.click('roundButton');}}h.click('actionButton');h.settle();assert.equal(h.app.state.phase,'done');assert.equal(h.calls.length,1);h.click('summaryReplay');assert.equal(h.d.body.dataset.replay,'true');h.tick(h.now+100);h.click('replayReturn');assert.equal(h.calls.length,1);h.click('summaryAgain');assert.equal(h.app.state.phase,'waiting');assert.equal(h.app.state.results.length,0);assert.equal(h.calls.length,2);assert.notEqual(JSON.parse(h.calls[0].options.body).runId,JSON.parse(h.calls[1].options.body).runId);}finally{h.close();}
 });
}
