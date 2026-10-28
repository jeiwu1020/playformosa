import {syncPauseButton} from '../../public/games/shared/game-ui.mjs';
import {createSandpits} from '../../public/games/long-jump/sandpits.mjs';
import {renderCameraBounds,isStandalone} from '../../public/games/long-jump/layout.mjs';
import * as surfaceApi from '../../public/games/long-jump/play-surface.mjs';
import {splitResultComment} from '../../public/games/long-jump/result-view.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as inputApi from '../../public/games/long-jump/controls.mjs';import * as captureApi from '../../public/games/long-jump/capture.mjs';import * as shareApi from '../../public/games/long-jump/share.mjs';import {createDialogController,createPauseDialogRecovery} from '../../public/games/long-jump/dialogs.mjs';
function harness({title='landing',chargeFoot=-1,standalone=false,scenery=null,noWebGL=false}={}){
 const events={},frames=[],copies=[],effectFrames=[],sprayFrames=[],recoveryTimers=new Map(),recoveryFrames=[];let nextTimer=0,ownerDoc;const listen=(n,f)=>{const previous=events[n];events[n]=previous?(...args)=>{previous(...args);f(...args);}:f;};const elements=new Map();let drawn='initial',nextPhase='run';
 class Element{constructor(){this.hidden=false;this.tabIndex=0;this.disabled=false;this.ownerDocument=ownerDoc||{activeElement:null};this.isConnected=true;this.scrollTop=0;this.shows=0;this.closes=0;this.style={setProperty(){}};this.listeners={};this.children=[];this.captured=new Set();this.dataset={};const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c),contains:c=>classes.has(c)};this.clientWidth=390;this.clientHeight=600;this.width=390;this.height=600;}setAttribute(k,v){(this.attributes??={})[k]=v;if(k==='open')this.open=true;}getAttribute(k){return this.attributes?.[k]??null;}hasAttribute(k){return this.getAttribute(k)!==null;}removeAttribute(k){delete this.attributes?.[k];if(k==='open')this.open=false;}closest(){return null;}getClientRects(){return[{}];}addEventListener(k,f){this.listeners[k]=f;}querySelector(){return get('start');}querySelectorAll(){return[];}focus(){this.ownerDocument.activeElement=this;}showModal(){this.open=true;this.shows++;}close(){this.open=false;this.closes++;}contains(){return false;}appendChild(e){this.children.push(e);}replaceChildren(...e){this.children=e;}getContext(){return{fillRect(){},strokeRect(){},fillText(){},drawImage:s=>{this.pixels=s.pixels;if(s===renderer.domElement)copies.push(this.pixels);}};}toBlob(cb){cb(new Blob(['png'],{type:'image/png'}));}setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);this.listeners.lostpointercapture?.({pointerId:id});}}
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};const buttons=Array.from({length:4},(_,i)=>{const e=new Element();e.dataset.limb=String(i);return e;});
 class Obj{constructor(){this.position=this;this.scale=this;this.rotation=this;this.material=this;this.shadow={mapSize:this,camera:{}};this.target={position:this,updateMatrixWorld(){}};this.color=this;}set(){return this;}setScalar(){}add(){}lookAt(){}updateProjectionMatrix(){}copy(){}lerp(){}addScaledVector(){}project(){return{x:0,y:0};}}
 const renderer={domElement:new Element(),shadowMap:{},setPixelRatio(){},setSize(w,h){this.domElement.width=w;this.domElement.height=h;this.domElement.pixels='cleared';},render(scene){this.domElement.pixels=drawn;sprayFrames.push(scene.getObjectByName('sand-spray')?.children.filter(o=>o.visible).length??0);effectFrames.push({pit:scene.getObjectByName('delivered-sandpit')?.visible,impact:scene.getObjectByName('sand-impact')?.visible,kind:scene.getObjectByName('sand-impact')?.userData.kind});}};
 const THREE={...RealThree,WebGLRenderer:function(){if(noWebGL)throw Error('WebGL unavailable');return renderer;}};
 const context={syncPauseButton,createSandpits,renderCameraBounds,isStandalone,createPauseDialogRecovery,...surfaceApi,splitResultComment,...inputApi,...captureApi,...shareApi,createDialogController,createLandingCapture:()=>captureApi.createLandingCapture(()=>new Element()),paintScoreCard:(source,info,focus,_create,preview)=>captureApi.paintScoreCard(source,info,focus,()=>new Element(),preview),THREE,document:{documentElement:{setAttribute(){},style:{getPropertyValue:()=>'0'}},hidden:false,getElementById:get,querySelector:()=>get('overlay'),querySelectorAll:selector=>selector==='[data-limb]'?buttons:selector==='[data-play-surface]'?[get('main')]:selector==='header h1, #sound-status, header button, .card button'?['title','sound-status','sound','reset','pause','start','share-result','save-result','copy-result'].map(get):[],addEventListener:(n,f)=>events['doc:'+n]=f,createElement:()=>new Element(),body:new Element()},window:{navigator:{standalone},setTimeout:f=>{recoveryTimers.set(++nextTimer,f);return nextTimer;},clearTimeout:id=>recoveryTimers.delete(id),requestAnimationFrame:f=>recoveryFrames.push(f),addEventListener:listen,open(){return{};}},ResizeObserver:class{constructor(cb){events.resizeObserver=cb;}observe(){}},devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),localStorage:{},matchMedia:()=>({matches:true}),navigator:{},location:{origin:'https://example.test'},URL,Blob,File,console,setTimeout,
 createGameAudio:()=>({enabled:false,setPlaying(){},play(){},setEnabled(){}}),createAudioEvents:()=>({reset(){},update(){}}),createScenery:()=>scenery||({update(){}}),createCharacter:()=>({update(_p,s){drawn=s.phase;}}),fresh:()=>({chargeFoot,phase:'run',origin:0,x:0,y:0,wind:{push:0,nextPush:0},takeoffSpeed:null,rotations:0,brace:[0,0],energy:1}),step:s=>s.phase=nextPhase,pose:()=>({}),result:()=>({valid:true,legalAdventureKm:1,title,journey:'台北',achievements:[]}),readBest:()=>0,saveBest(){},saveJourney(){},settleVerdict(){},worldX:()=>0,START:0,BOARD:0,PIT:0,DT:1/120,cameraFrame:()=>({halfW:1,halfH:1,centerX:0,centerY:0}),toKmh:()=>0,adventureAt:()=>({region:{id:'taipei',sky:'#fff',start:0,name:'台北'},km:0,achievements:[]}),routeLabel:()=>'',arrivalFlavour:()=>'',controlFeedback:()=>Array.from({length:4},()=>({})),formatMileage:()=>({value:'1',unit:'km'}),resultDisplay:()=>({}),resultShareText:()=>''};
 context.saveResultImage=(file,options)=>shareApi.saveResultImage(file,{...options,navigator:context.navigator});context.window.window=context.window;ownerDoc=context.document;context.document.activeElement=context.document.body;context.document.body.children=[get('header'),get('main'),get('overlay')];vm.createContext(context);let runtimeError=null;try{vm.runInContext(fs.readFileSync(new URL('../../public/games/long-jump/game.mjs',import.meta.url),'utf8').replace(/^import .*;$/mg,''),context);}catch(error){if(!noWebGL)throw error;runtimeError=error;}
 return{runtimeError,get,buttons,events,renderer,copies,effectFrames,sprayFrames,context,recover(){for(const f of recoveryTimers.values())f();recoveryTimers.clear();while(recoveryFrames.length)recoveryFrames.shift()();},phase:p=>nextPhase=p,frame(now=20){frames.shift()(now);}};
}
test('actual game handlers release held captures through both orientation events then resume',()=>{const h=harness();h.get('start').onclick();h.buttons[2].listeners.pointerdown({pointerId:7,preventDefault(){}});assert.equal(h.buttons[2].captured.size,1);h.events.orientationchange();h.events.orientationchange();assert.equal(h.buttons[2].captured.size,0);assert.equal(h.get('overlay').open,true);h.get('start').onclick();assert.equal(h.get('overlay').open,false);h.buttons[2].listeners.pointerdown({pointerId:8,preventDefault(){}});assert.equal(h.buttons[2].captured.size,1);});
test('actual result flow copies the rendered final landing once and rotation cannot erase it',async()=>{const h=harness();h.get('start').onclick();h.phase('done');h.frame();assert.deepEqual(h.copies,['done']);const preview=h.get('landing-preview').children[0];assert.equal(preview.pixels,'done');h.get('scene').clientWidth=844;h.events.resizeObserver();h.events.orientationchange();h.frame(40);assert.equal(preview.pixels,'done');assert.equal(h.copies.length,1);h.get('start').onclick();assert.equal(h.get('landing-preview').children.length,0);await Promise.resolve();assert.equal(h.get('landing-preview').hidden,true);});
test('landing result waits through zero-size rotation viewport before freezing rather than saving a one-pixel image',()=>{const h=harness();h.get('start').onclick();h.get('scene').clientWidth=0;h.get('scene').clientHeight=0;h.events.resizeObserver();h.phase('done');h.frame();assert.equal(h.copies.length,0);h.get('scene').clientWidth=390;h.get('scene').clientHeight=600;h.events.resizeObserver();h.frame(40);assert.deepEqual(h.copies,['done']);});

test('result displays complete main joke and food subtitle as text, then hides both result extras on restart/pause',()=>{const title='用頭腦參賽，不是這個意思。 基隆市航段 · 廟口美食還在等你。',h=harness({title});h.get('start').onclick();h.phase('done');h.frame();assert.equal(h.get('card-title').textContent,'用頭腦參賽，不是這個意思。');assert.equal(h.get('card-subtitle').textContent,' 基隆市航段 · 廟口美食還在等你。');assert.equal(h.get('card-subtitle').hidden,false);assert.match(h.get('result-score-block').innerHTML,/result-score/);h.get('start').onclick();h.events.orientationchange();assert.equal(h.get('result-score-block').hidden,true);assert.equal(h.get('result-brand').hidden,true);assert.equal(h.get('card-subtitle').hidden,true);});

test('actual startup scopes touch blocking to live play and keeps dialog/share controls native',()=>{
 const h=harness();
 for(const type of ['touchstart','touchmove','touchend','selectstart','contextmenu','dragstart']){
  let prevented=0;assert.equal(typeof h.get('main').listeners[type],'function',type);h.get('main').listeners[type]({cancelable:true,preventDefault(){prevented++;}});assert.equal(prevented,1);
  assert.equal(h.get('overlay').listeners[type],undefined,'dialog must not inherit '+type);
 }
 for(const id of ['sound','reset','pause','start','share-result','save-result','copy-result']){
  for(const type of ['touchstart','touchmove','touchend','pointerdown','click'])assert.equal(h.get(id).listeners[type],undefined,id+' native '+type);
  let prevented=0;h.get(id).listeners.selectstart({cancelable:true,preventDefault(){prevented++;}});assert.equal(prevented,1);
 }
 assert.equal(h.get('share-status').listeners.selectstart,undefined,'manual-copy fallback stays selectable');
});
test('actual pointer cancellation pauses all held limbs and desktop keys work after resume',()=>{
 const h=harness();h.get('start').onclick();h.buttons[2].listeners.pointerdown({pointerId:7,preventDefault(){}});h.buttons[3].listeners.pointerdown({pointerId:8,preventDefault(){}});
 h.buttons[2].listeners.pointercancel({pointerId:7});assert.equal(h.get('overlay').open,true);for(const button of h.buttons)assert.equal(button.getAttribute('aria-pressed'),'false');
 h.get('start').onclick();let prevented=0;h.events.keydown({code:'KeyJ',preventDefault(){prevented++;}});assert.equal(h.buttons[0].getAttribute('aria-pressed'),'true');h.events.keyup({code:'KeyJ',preventDefault(){prevented++;}});assert.equal(h.buttons[0].getAttribute('aria-pressed'),'false');assert.equal(prevented,2);
});
test('actual share click synchronously hands prepared PNG to native share and copy fallback remains available',async()=>{
 const h=harness();h.get('start').onclick();h.phase('done');h.frame();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.get('save-result').disabled,false);
 let shared=null;h.context.navigator.canShare=()=>true;h.context.navigator.share=payload=>{shared=payload;return Promise.resolve();};
 const pending=h.get('save-result').onclick();assert.equal(shared.files.length,1);assert.equal(shared.files[0].type,'image/png');await pending;assert.equal(h.get('save-result').disabled,false);assert.match(h.get('share-status').textContent,/已交給系統/);
 await h.get('copy-result').onclick();assert.match(h.get('share-status').textContent,/請選取以下文字/);assert.equal(h.get('share-status').listeners.selectstart,undefined);
});

test('actual repeated rotation rebuilds only the still-paused dialog and resume cancels stale work',()=>{
 const h=harness(),dialog=h.get('overlay');h.get('start').onclick();
 h.events.orientationchange();assert.equal(dialog.shows,2);h.recover();assert.equal(dialog.shows,3);assert.equal(dialog.open,true);
 h.events.orientationchange();h.recover();assert.equal(dialog.shows,4,'second orientation refreshes existing native dialog');
 h.events.orientationchange();h.get('start').onclick();h.recover();assert.equal(dialog.shows,4,'pending rotation must not reopen after resume');assert.equal(dialog.open,false);
 h.events.keydown({code:'KeyK',preventDefault(){}});assert.equal(h.buttons[1].getAttribute('aria-pressed'),'true');h.events.keyup({code:'KeyK',preventDefault(){}});assert.equal(h.buttons[1].getAttribute('aria-pressed'),'false');
});
test('viewport resize never refreshes or reopens result/share dialog',()=>{
 const h=harness();h.get('start').onclick();h.phase('done');h.frame();const dialog=h.get('overlay'),shows=dialog.shows;h.events.resize();h.events.orientationchange();h.recover();assert.equal(dialog.shows,shows);assert.equal(dialog.open,true);
});

test('armed orange inset belongs only to charging feet, never sentinel-matched right arm',()=>{
 for(const chargeFoot of [-1,0,1]){const h=harness({chargeFoot});h.get('start').onclick();h.frame();for(let limb=0;limb<4;limb++)assert.equal(h.buttons[limb].classList.contains('armed'),limb>=2&&chargeFoot===limb-2,`chargeFoot ${chargeFoot}, limb ${limb}`);}
});

test('actual standalone game resumes the same attempt repeatedly without native dialog or leaked inert',()=>{
 const h=harness({standalone:true}),dialog=h.get('overlay');assert.equal(dialog.shows,0);assert.equal(dialog.getAttribute('aria-modal'),'true');h.get('start').onclick();assert.equal(dialog.open,false);let restarted=0;const fresh=h.context.fresh;h.context.fresh=()=>{restarted++;return fresh();};
 for(let cycle=0;cycle<3;cycle++){h.buttons[2].listeners.pointerdown({pointerId:cycle+5,preventDefault(){}});h.events.orientationchange();h.recover();h.events.orientationchange();h.recover();assert.equal(dialog.open,true);assert.equal(dialog.shows,0);assert.equal(h.get('main').hasAttribute('inert'),true);h.get('start').onclick();h.recover();assert.equal(dialog.open,false);assert.equal(h.get('main').hasAttribute('inert'),false);assert.equal(h.get('header').hasAttribute('aria-hidden'),false);assert.equal(h.buttons[2].captured.size,0);}
 assert.equal(restarted,0,'Resume must never call fresh/start');assert.equal(dialog.closes,0,'no native close in standalone');
});
test('standalone result keeps native share activation and manual copy during rotation, then unlocks on restart',async()=>{
 const h=harness({standalone:true});h.get('start').onclick();h.phase('done');h.frame();await new Promise(resolve=>setImmediate(resolve));const dialog=h.get('overlay');dialog.scrollTop=91;let shares=0;h.context.navigator.canShare=()=>true;h.context.navigator.share=()=>{shares++;return Promise.resolve();};const pending=h.get('save-result').onclick();assert.equal(shares,1);await pending;h.events.orientationchange();h.recover();assert.equal(dialog.open,true);assert.equal(dialog.shows,0);assert.equal(dialog.scrollTop,91);assert.equal(h.get('main').hasAttribute('inert'),true);await h.get('copy-result').onclick();assert.match(h.get('share-status').textContent,/請選取以下文字/);assert.equal(h.get('share-status').listeners.selectstart,undefined);h.get('start').onclick();assert.equal(dialog.open,false);assert.equal(h.get('main').hasAttribute('inert'),false);
});

import * as RealThree from '../../public/games/long-jump/vendor/three.module.min.js';
import {createScenery as realScenery} from '../../public/games/long-jump/scenery.mjs';
import {worldX as realWorldX,result as realResult,pose as realPose} from '../../public/games/long-jump/physics.mjs';
import {adventureAt as realAdventureAt} from '../../public/games/long-jump/world.mjs';
import {trial} from './v8-scenarios.mjs';
test('actual result renderer keeps first-contact scenery when settled body crosses a multiverse boundary',()=>{
 const s=trial({flightSeconds:309.175,maxSeconds:330}),snapshot=structuredClone(s),r=realResult(s);assert.equal(s.phase,'done');assert.ok(r.journeyDistance<8664);assert.ok(realWorldX(s)-10>8664);
 const w=realScenery(RealThree,new RealThree.Scene()),h=harness({scenery:w});h.context.fresh=()=>structuredClone(s);h.context.worldX=realWorldX;h.context.pose=realPose;h.context.BOARD=10;h.context.adventureAt=realAdventureAt;h.get('start').onclick();h.phase('done');h.frame();let hero;w.group.traverse(n=>{if(n.userData.cosmicScene)hero=n;});assert.equal(hero.userData.cosmicVariant,'saturn_market');assert.equal(hero.userData.worldAnchor,realWorldX(s)+1.5);assert.equal(h.copies.length,1,'snapshot still copies the final render once');assert.deepEqual(s,snapshot);w.dispose();
});


test('actual final result renders receiving sand and its matching real head impression before freeze; retry clears effects',()=>{
 const s=trial({air:'left',flightSeconds:1,maxSeconds:20});assert.equal(s.landingPart,'額頭');
 const h=harness();h.context.fresh=()=>structuredClone(s);h.context.pose=realPose;h.get('start').onclick();h.phase('done');h.frame();
 assert.deepEqual(h.effectFrames.at(-1),{pit:true,impact:true,kind:'head'});assert.deepEqual(h.copies,['done']);
 const preview=h.get('landing-preview').children[0];h.events.orientationchange();h.recover();h.frame(40);assert.equal(preview.pixels,'done');assert.equal(h.copies.length,1);
 h.get('start').onclick();h.phase('run');h.frame(60);assert.equal(h.effectFrames.at(-1).pit,false);assert.equal(h.effectFrames.at(-1).impact,false);
});


test('zero-size result viewport defers freeze without allowing the final sand spray to expire',()=>{
 const s=trial({air:'left',flightSeconds:1,maxSeconds:20}),h=harness();h.context.fresh=()=>structuredClone(s);h.context.pose=realPose;h.get('start').onclick();
 h.get('scene').clientWidth=0;h.get('scene').clientHeight=0;h.events.resizeObserver();h.phase('done');
 for(let n=1;n<=100;n++)h.frame(n*100);assert.equal(h.copies.length,0,'freeze remains deferred until nonzero geometry');
 h.get('scene').clientWidth=390;h.get('scene').clientHeight=600;h.events.resizeObserver();h.frame(10100);
 assert.deepEqual(h.copies,['done']);assert.ok(h.sprayFrames.at(-1)>0,'the actual successfully frozen scene must still include sand spray');
});

test('shared toolbar states reflect actual long-jump pause and restart',()=>{const h=harness();h.frame();assert.equal(h.get('pause').disabled,true);h.get('start').onclick();h.frame(40);assert.equal(h.get('pause').disabled,false);h.get('pause').onclick();h.frame(60);assert.equal(h.get('pause').getAttribute('aria-pressed'),'true');assert.match(h.get('pause').textContent,/繼續/);h.get('reset').onclick();h.frame(80);assert.equal(h.get('pause').getAttribute('aria-pressed'),'false');});

test('unavailable Long Jump renderer disables game toolbar instead of leaving dead enabled controls',()=>{const h=harness({noWebGL:true});assert.ok(h.runtimeError);for(const id of ['sound','reset','pause','start'])assert.equal(h.get(id).disabled,true,id);});
