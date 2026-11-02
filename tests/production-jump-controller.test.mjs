import {recordPlayStart} from '../public/games/shared/play-counts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as Three from '../public/games/long-jump/vendor/three.module.min.js';
import * as physics from '../public/games/long-jump/physics.mjs';
import * as world from '../public/games/long-jump/world.mjs';
import * as presentation from '../public/games/long-jump/presentation.mjs';
import * as controls from '../public/games/long-jump/controls.mjs';
import * as dialogs from '../public/games/long-jump/dialogs.mjs';
import * as layout from '../public/games/long-jump/layout.mjs';
import * as surface from '../public/games/long-jump/play-surface.mjs';
import * as share from '../public/games/long-jump/share.mjs';
import {splitResultComment} from '../public/games/long-jump/result-view.mjs';
import {mountProductionJumpLeaderboard} from '../public/games/shared/production-jump-leaderboard.mjs';
import {helpIsOpen,ensurePauseHelp} from '../public/games/shared/entry-shell.mjs';
import {trial} from './long-jump/v8-scenarios.mjs';
const tick=()=>new Promise(r=>setTimeout(r,10));
function boot(standalone){
 const dom=new JSDOM(readFileSync(new URL('../public/games/long-jump/index.html',import.meta.url),'utf8'),{url:'https://playformosa.playformosa.workers.dev/games/long-jump/'}),w=dom.window,d=w.document;
 Object.defineProperty(w.navigator,'standalone',{value:standalone});Object.defineProperty(d,'hidden',{value:false});
 w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.getClientRects=()=>[{width:390,height:500}];
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get:()=>390});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get:()=>500});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 // Native close is queued: it must not abort the newly opened leaderboard GET.
 w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;setTimeout(()=>this.dispatchEvent(new w.Event('close')),0)};
 const frames=[],requests=[],recordedStarts=[];w.fetch=(_url,options)=>{if(_url==='/api/play-counts/starts'){recordedStarts.push(JSON.parse(options.body));return Promise.resolve({ok:true,status:200});}return new Promise(resolve=>requests.push({options,resolve}));};
 const canvas=d.createElement('canvas');const renderer={domElement:canvas,shadowMap:{},setPixelRatio(){},setSize(){},render(){}};
 let frozen=null;
 const context={recordPlayStart,...physics,...world,...presentation,...controls,...dialogs,...layout,...surface,...share,splitResultComment,mountProductionJumpLeaderboard,helpIsOpen,ensurePauseHelp,
 THREE:{...Three,WebGLRenderer:function(){return renderer}},document:d,window:w,navigator:w.navigator,location:w.location,localStorage:w.localStorage,
 ResizeObserver:class{observe(){}disconnect(){}},devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),matchMedia:w.matchMedia,URL,Blob,File,console,setTimeout,clearTimeout,
 createGameAudio:()=>({enabled:false,ready:false,setPlaying(){},play(){},setEnabled(){}}),createAudioEvents:()=>({reset(){},update(){}}),
 createScenery:()=>({update(){}}),createSandpits:()=>({reset(){},update(){}}),createCharacter:()=>({update(){}}),arrivalFlavour:()=>'',settleVerdict(){},
 // Only pixels/media are replaced; real controller/physics/input/dialog/share-state/board run.
 createLandingCapture:()=>({reset(){frozen=null},get current(){return frozen},freeze(){return frozen={canvas:d.createElement('canvas'),focus:{x:.5,y:.5}}}}),
 paintScoreCard:(_source,_info,_focus,_create,preview)=>preview,
 captureResultPng:async({paint,source})=>{paint(source);return new Blob(['fixture PNG'],{type:'image/png'})}
 };
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../public/games/long-jump/game.mjs',import.meta.url),'utf8').replace(/^import .*;$/mg,''),context);
 return{dom,w,d,requests,recordedStarts,run:code=>vm.runInContext(code,context),frame:t=>frames.shift()(t),close(){vm.runInContext('leaderboard.destroy();modal.close()',context);dom.window.close()}};
}
for(const standalone of [false,true])test(`real main Jump controller + real board (${standalone?'standalone fallback':'native queued close'}) keeps round, PNG and explicit resume`,async()=>{
 const h=boot(standalone),{d,w}=h;try{
 assert.equal(h.recordedStarts.length,0);d.getElementById('start').click();assert.equal(h.recordedStarts.length,1);assert.equal(h.run('playing&&!paused'),true);
 const firstState=h.run('state');w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyA',bubbles:true}));assert.equal(h.run('input[2]'),true);
 d.querySelector('.pf-rank-action').click();assert.equal(h.run('paused'),true);assert.equal(h.run('input.some(Boolean)'),false);assert.equal(d.getElementById('overlay').open,false);assert.equal(d.querySelectorAll('dialog[open]').length,1);
 await tick();assert.equal(h.requests.at(-1).options.signal.aborted,false);h.requests.at(-1).resolve({ok:false,status:503});await tick();assert.match(d.querySelector('.pf-honor-board').textContent,/暫時無法讀取/);
 w.dispatchEvent(new w.Event('orientationchange'));w.dispatchEvent(new w.Event('resize'));assert.equal(d.getElementById('overlay').open,false);
 d.querySelector('[data-pf-view-return]').click();assert.equal(d.getElementById('overlay').open,true);assert.equal(h.run('paused'),true);assert.equal(h.run('state'),firstState);
 d.getElementById('start').click();assert.equal(h.run('paused'),false);assert.equal(h.run('state'),firstState);assert.equal(h.recordedStarts.length,1,'pause/rank/resume do not count');
 const settled=trial({air:'left',flightSeconds:1,maxSeconds:20});assert.equal(settled.phase,'done');assert.equal(physics.result(settled).valid,true);h.run('state').phase='done';Object.assign(h.run('state'),settled);h.frame(20);await tick();
 assert.equal(h.run('playing'),false);const file=h.run('shareState.file'),preview=d.getElementById('landing-preview').firstChild,score=d.getElementById('result-score-block').innerHTML;assert.ok(file);assert.ok(preview);assert.equal(d.getElementById('overlay').open,true);
 d.querySelector('.pf-result-ranking').click();await tick();assert.equal(h.requests.at(-1).options.signal.aborted,false);h.requests.at(-1).resolve({ok:true,json:async()=>({entries:[],own:null})});await tick();assert.doesNotMatch(d.querySelector('.pf-honor-board').textContent,/讀取中/);assert.equal(d.querySelectorAll('dialog[open]').length,1);
 d.querySelector('[data-pf-view-return]').click();assert.equal(d.getElementById('overlay').open,true);assert.equal(h.run('shareState.file'),file);assert.equal(d.getElementById('landing-preview').firstChild,preview);assert.equal(d.getElementById('result-score-block').innerHTML,score);assert.equal(h.run('state.phase'),'done');
 d.getElementById('start').click();assert.equal(h.run('playing&&!paused'),true);assert.equal(h.run('shareState.file'),null);assert.equal(d.getElementById('landing-preview').children.length,0);assert.notEqual(h.run('state'),firstState);assert.equal(h.recordedStarts.length,2);assert.notEqual(h.recordedStarts[0].runId,h.recordedStarts[1].runId);
 }finally{h.close()}
});
