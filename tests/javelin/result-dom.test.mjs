import {JSDOM} from 'jsdom';
import test from 'node:test';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import * as physics from '../../public/games/javelin/physics.mjs';
import * as presentation from '../../public/games/javelin/presentation.mjs';
import * as entry from '../../public/games/shared/entry-shell.mjs';
import {syncPauseButton} from '../../public/games/shared/game-ui.mjs';
import {controllerSource,audioBoundary} from '../helpers/entry-boundary.mjs';
const html=fs.readFileSync(new URL('../../public/games/javelin/index.html',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../../public/games/javelin/app.mjs',import.meta.url),'utf8');
// Real DOM, shared entry controller and physics; only hardware/audio/share boundaries are stubbed.
for(const touch of [false,true])test(`actual ${touch?'pointer':'keyboard'} controls complete a valid throw, replay and retry without leaking held input`,()=>{
 const dom=new JSDOM(html,{url:'https://preview.invalid/games/javelin/',pretendToBeVisual:true}),w=dom.window,d=w.document;let now=0,raf;
 w.matchMedia=()=>({matches:touch,addEventListener(){},removeEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelector('[autofocus]')?.focus()};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,cG5n';
 w.Element.prototype.setPointerCapture=function(id){this.capture=id};w.Element.prototype.hasPointerCapture=function(id){return this.capture===id};w.Element.prototype.releasePointerCapture=function(){this.capture=null};
 const audio={...audioBoundary(),unlock:async()=>true,reset(){},suspend(){},resume(){},sync(){}};
 const context={...physics,...presentation,...entry,syncPauseButton,createJavelinShare:()=>({reset(){},bind(){}}),createAudio:()=>audio,createAudioAdapter:()=>audio,createJavelin3D:()=>({render:()=>true,renderer:{domElement:{width:800,height:500}}}),captureResultFrame:(source,state,mode)=>presentation.captureResultFrame(source,state,mode,()=>d.createElement('canvas')),shoeSolePoints(){},document:d,window:w,screen:{orientation:{addEventListener(){}}},performance:{now:()=>now},requestAnimationFrame:f=>raf=f,addEventListener:w.addEventListener.bind(w),localStorage:w.localStorage,structuredClone,devicePixelRatio:1,console};vm.createContext(context);vm.runInContext(controllerSource(app),context);
 function tick(n=1){for(let i=0;i<n;i++){now+=1000/120;raf(now)}}
 function send(type,key,{repeat=false,target=d.getElementById('world')}={}){if(touch&&['a','s','j','k'].includes(key)){const event=new w.Event(type==='keydown'?'pointerdown':'pointerup',{bubbles:true,cancelable:true});Object.defineProperty(event,'pointerId',{value:key.charCodeAt(0)});d.querySelector(`[data-pf-key="${key}"]`).dispatchEvent(event);}else target.dispatchEvent(new w.KeyboardEvent(type,{key,code:key===' '?'Space':key,bubbles:true,cancelable:true,repeat}));}
 function tap(key){send('keydown',key);send('keyup',key)}
 d.querySelector('.pf-entry-start').click();let next=0,strides=0,braking=false;tap('s');
 for(let i=0;i<7200;i++) {const s=w.javelinDebug.state;if(s.phase==='result')break;if(s.phase==='run'&&s.braceTime===null){if(s.x>-5.8&&!s.held.a)send('keydown','a');else if(s.time>=next&&s.x<=-5.8){tap(strides++%2?'a':'s');tap('j');next=s.time+.32;}if(s.x>-15&&!s.held.k)send('keydown','k');}if(s.phase==='run'&&s.braceTime!==null&&s.time-s.braceTime>=.27&&s.draw>=.32)send('keyup','k');if(s.phase==='flight'&&!braking){send('keydown','a');send('keydown','s');braking=true;}tick();}
 tick(300);const terminal=w.javelinDebug.state;assert.equal(terminal.phase,'result');assert.equal(terminal.foul,false);assert.ok(d.querySelector('.result-summary').textContent.includes('標槍先下班，你的腳還要記得煞車。'));assert.equal(d.querySelectorAll('.result-tip').length,1);assert.ok(terminal.distance>90);assert.equal(d.activeElement.id,'again');assert.match(d.getElementById('resultPhoto').src,/^data:image\/png;base64,/);
 d.getElementById('replay').click();tick(120);d.getElementById('replayBack').click();assert.equal(d.activeElement.id,'again');assert.ok(d.querySelector('.result-summary').textContent.includes('標槍先下班，你的腳還要記得煞車。'));d.getElementById('resultClose').click();d.getElementById('viewResult').click();assert.equal(d.activeElement.id,'again');
 const target=d.getElementById('again');send('keydown',' ',{target,repeat:true});send('keyup',' ',{target});assert.equal(w.javelinDebug.state.phase,'result');
 if(touch)target.click();else{send('keydown',' ',{target});send('keydown',' ',{target,repeat:true});assert.equal(w.javelinDebug.state.phase,'result');send('keyup',' ',{target});}
 tick(60);assert.equal(w.javelinDebug.state.phase,'ready');assert.equal(d.activeElement.id,'world');assert.equal(d.querySelectorAll('dialog[open]').length,0);dom.window.close();
});
