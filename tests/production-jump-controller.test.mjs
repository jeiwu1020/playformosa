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
import {mountControlsFrame} from '../public/games/shared/controls-shell.mjs';
import {syncPauseButton} from '../public/games/shared/game-ui.mjs';
import * as replayApi from '../public/games/long-jump/replay.mjs';
import {createSandpits} from '../public/games/long-jump/sandpits.mjs';
import {helpIsOpen,ensurePauseHelp} from '../public/games/shared/entry-shell.mjs';
import {trial} from './long-jump/v8-scenarios.mjs';
const tick=()=>new Promise(r=>setTimeout(r,10));
function boot(standalone){
 const dom=new JSDOM(readFileSync(new URL('../public/games/long-jump/index.html',import.meta.url),'utf8'),{url:'https://playformosa.playformosa.workers.dev/games/long-jump/'}),w=dom.window,d=w.document;
 Object.defineProperty(w.navigator,'standalone',{value:standalone});Object.defineProperty(d,'hidden',{value:false});
 w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.getClientRects=()=>[{width:390,height:500}];
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get:()=>390});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get:()=>500});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 // Native close is queued: it must not abort the newly opened leaderboard GET.
 w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;setTimeout(()=>this.dispatchEvent(new w.Event('close')),0)};
 const frames=[],requests=[],recordedStarts=[];w.fetch=(_url,options)=>{if(_url==='/api/play-counts/starts'){recordedStarts.push(JSON.parse(options.body));return Promise.resolve({ok:true,status:200});}return new Promise(resolve=>requests.push({options,resolve}));};
 const canvas=d.createElement('canvas');const renderer={domElement:canvas,shadowMap:{},setPixelRatio(){},setSize(){},render(){}};
 let frozen=null;const calls={steps:0,journeys:0,bests:0,verdicts:0};
 const context={recordPlayStart,...physics,...replayApi,mountControlsFrame,syncPauseButton,structuredClone,...world,...presentation,...controls,...dialogs,...layout,...surface,...share,splitResultComment,mountProductionJumpLeaderboard,helpIsOpen,ensurePauseHelp,
 THREE:{...Three,WebGLRenderer:function(){return renderer}},document:d,window:w,navigator:w.navigator,location:w.location,localStorage:w.localStorage,
 ResizeObserver:class{observe(){}disconnect(){}},devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),matchMedia:w.matchMedia,URL,Blob,File,console,setTimeout,clearTimeout,
 createGameAudio:()=>({unlock:async()=>true,subscribe:()=>()=>{},getState:()=>({musicEnabled:true,effectsEnabled:true,musicVolume:.5,effectsVolume:.7}),enabled:false,ready:false,setPlaying(){},play(){},setEnabled(){}}),createAudioEvents:()=>({reset(){},update(){}}),
 createScenery:()=>({update(){}}),createSandpits,createCharacter:()=>({update(){}}),arrivalFlavour:()=>'',
 step(...args){calls.steps++;return physics.step(...args)},saveJourney(...args){calls.journeys++;return physics.saveJourney(...args)},saveBest(...args){calls.bests++;return physics.saveBest(...args)},settleVerdict(){calls.verdicts++;},
 // Only pixels/media are replaced; real controller/physics/input/dialog/share-state/board run.
 createLandingCapture:()=>({reset(){frozen=null},get current(){return frozen},freeze(){return frozen={canvas:d.createElement('canvas'),focus:{x:.5,y:.5}}}}),
 paintScoreCard:(_source,_info,_focus,_create,preview)=>preview,
 captureResultPng:async({paint,source})=>{paint(source);return new Blob(['fixture PNG'],{type:'image/png'})}
 };
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../public/games/long-jump/game.mjs',import.meta.url),'utf8').replace(/^import .*;$/mg,''),context);
 return{dom,w,d,requests,recordedStarts,calls,run:code=>vm.runInContext(code,context),frame:t=>frames.shift()(t),close(){vm.runInContext('leaderboard.destroy();modal.close()',context);dom.window.close()}};
}
for(const standalone of [false,true])test(`real main Jump controller + real board (${standalone?'standalone fallback':'native queued close'}) keeps round, PNG and explicit resume`,async()=>{
 const h=boot(standalone),{d,w}=h;try{
 assert.equal(h.recordedStarts.length,0);assert.equal(d.querySelector('.pf-entry').open,true);assert.match(d.querySelector('.pf-entry').textContent,/腳短按跑步|短按跑步/);assert.match(d.querySelector('.pf-entry').textContent,/Funin and Sunin/);assert.equal(d.querySelector('#replay-controls').hidden,true,'replay stays hidden before a completed jump');d.querySelector('.pf-entry-start').click();assert.equal(h.recordedStarts.length,1);assert.equal(h.run('playing&&!paused'),true);
 h.frame(0);const firstState=h.run('state');w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyA',bubbles:true}));assert.equal(h.run('input[2]'),true);
 d.getElementById('pause').click();assert.equal(h.run('paused'),true);assert.equal(d.querySelector('.pf-pause-dialog').open,true);assert.equal(d.querySelector('[data-pf-volume=music]').value,'50');assert.equal(d.querySelector('[data-pf-volume=effects]').value,'70');d.querySelector('[data-pf-pause-ranking]').click();assert.equal(h.run('paused'),true);assert.equal(h.run('input.some(Boolean)'),false);assert.equal(d.getElementById('overlay').open,false);assert.equal(d.querySelectorAll('dialog[open]').length,1);
 await tick();assert.equal(h.requests.at(-1).options.signal.aborted,false);h.requests.at(-1).resolve({ok:false,status:503});await tick();assert.match(d.querySelector('.pf-honor-board').textContent,/暫時無法讀取/);
 w.dispatchEvent(new w.Event('orientationchange'));w.dispatchEvent(new w.Event('resize'));assert.equal(d.getElementById('overlay').open,false);
 d.querySelector('[data-pf-view-return]').click();assert.equal(d.getElementById('overlay').open,false);assert.equal(d.querySelector('.pf-pause-dialog').open,true);assert.equal(h.run('paused'),true);assert.equal(h.run('state'),firstState);
 d.querySelector('[data-pf-continue]').click();assert.equal(h.run('paused'),false);assert.equal(h.run('state'),firstState);assert.equal(h.recordedStarts.length,1,'pause/rank/resume do not count');
 const settled=trial({air:'left',flightSeconds:1,maxSeconds:20,onStep:s=>h.run('replay').record(s)});assert.equal(settled.phase,'done');assert.equal(physics.result(settled).valid,true);h.run('state').phase='done';Object.assign(h.run('state'),settled);h.frame(20);await tick();
 assert.equal(h.run('playing'),false);const file=h.run('shareState.file'),preview=d.getElementById('landing-preview').firstChild,score=d.getElementById('result-score-block').innerHTML;assert.ok(file);assert.ok(preview);assert.equal(d.getElementById('overlay').open,true);
 d.querySelector('.pf-result-ranking').click();await tick();assert.equal(h.requests.at(-1).options.signal.aborted,false);h.requests.at(-1).resolve({ok:true,json:async()=>({entries:[],own:null})});await tick();assert.doesNotMatch(d.querySelector('.pf-honor-board').textContent,/讀取中/);assert.equal(d.querySelectorAll('dialog[open]').length,1);
 d.querySelector('[data-pf-view-return]').click();assert.equal(d.getElementById('overlay').open,true);assert.equal(h.run('shareState.file'),file);assert.equal(d.getElementById('landing-preview').firstChild,preview);assert.equal(d.getElementById('result-score-block').innerHTML,score);assert.equal(h.run('state.phase'),'done');
 d.getElementById('start').click();assert.equal(h.run('playing&&!paused'),true);assert.equal(h.run('replay.size'),1,'retry starts a new recording');assert.equal(h.run('replay.ready'),false);assert.equal(d.getElementById('replay-controls').hidden,true);assert.equal(h.run('shareState.file'),null);assert.equal(d.getElementById('landing-preview').children.length,0);assert.notEqual(h.run('state'),firstState);assert.equal(h.recordedStarts.length,2);assert.notEqual(h.recordedStarts[0].runId,h.recordedStarts[1].runId);
 }finally{h.close()}
});

async function finishRound(h){
 h.d.querySelector('.pf-entry-start').click();h.frame(0);
 // Drive the actual keyboard bindings and fixed-step controller through a full jump.
 let chargeAt=null,airAt=null,now=0;const keys=['KeyJ','KeyK','KeyA','KeyS'],held=[false,false,false,false];
 for(let frame=0;h.run('playing')&&frame<2400;frame++){
  const s=h.run('state');let desired=[0,0,0,0];
  if(s.phase==='run'){
   if(physics.worldX(s)>0&&chargeAt===null)chargeAt=s.t;
   const side=Math.floor(s.t/.25)%2;
   desired=chargeAt===null?[1-side,side,side,1-side]:[0,0,s.t-chargeAt<.58?1:0,0];
  }else if(s.phase==='air'){
   airAt??=s.t;desired=s.t-airAt>1?[0,0,1,1]:[1,0,1,0];
  }
  desired.forEach((value,i)=>{if(Boolean(value)!==held[i]){held[i]=Boolean(value);h.w.dispatchEvent(new h.w.KeyboardEvent(value?'keydown':'keyup',{code:keys[i],bubbles:true}));}});
  now+=1000*physics.DT;h.frame(now);
 }
 await tick();assert.equal(h.run('state.phase'),'done');assert.equal(physics.result(h.run('state')).valid,true);assert.ok(h.calls.steps>0);
 assert.equal(h.run('replay.ready'),true);assert.equal(h.d.getElementById('replay-result').hidden,false);
}
for(const standalone of [false,true])test(`production replay (${standalone?'standalone fallback':'native queued close'}) preserves one score through pause, help, ranking and return; stale requests cannot mutate it`,async()=>{
 const h=boot(standalone),{d,w}=h;try{
 await finishRound(h);
 const state=h.run('state'),savedState=JSON.stringify(state),file=h.run('shareState.file'),preview=d.getElementById('landing-preview').firstChild,score=d.getElementById('result-score-block').innerHTML;
 const counts={...h.calls},storage=JSON.stringify({...w.localStorage});assert.ok(file);assert.equal(counts.journeys,1);assert.equal(counts.verdicts,1);
 const submit=d.querySelector('[data-submit]'),panel=submit.closest('details');panel.open=true;panel.querySelector('input').value='Replay tester';submit.click();
 const submission=h.requests.at(-1);assert.equal(submission.options.method,'POST');assert.equal(JSON.parse(submission.options.body).score,physics.result(state).legalAdventureKm);
 d.getElementById('overlay').scrollTop=47;d.getElementById('replay-result').click();assert.equal(h.run('replay.active'),true);assert.equal(submission.options.signal.aborted,true,'replay cancels pending score submission');assert.equal(d.getElementById('overlay').open,false);assert.equal(d.getElementById('replay-controls').hidden,false);
 await tick();h.frame(80);assert.equal(h.run('replay.active'),true);assert.equal(h.run('replay.time>replay.firstTime'),true);
 w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyA',bubbles:true}));assert.equal(h.run('input.some(Boolean)'),false);assert.ok([...d.querySelectorAll('[data-limb]')].every(b=>b.disabled));
 d.getElementById('replay-pause').click();assert.equal(h.run('replay.paused'),true);const replayTime=h.run('replay.time');h.frame(140);assert.equal(h.run('replay.time'),replayTime);
 d.getElementById('pause').click();assert.equal(h.run('replay.paused'),false);h.frame(200);
 d.querySelector('.pf-entry-help').click();assert.equal(h.run('replay.paused'),true);assert.equal(d.querySelectorAll('dialog[open]').length,1);const helpTime=h.run('replay.time');h.frame(260);assert.equal(h.run('replay.time'),helpTime);
 d.querySelector('.pf-entry-start').click();assert.equal(h.run('replay.active&&replay.paused'),true,'help return requires explicit replay resume');assert.equal(d.getElementById('overlay').open,false);
 d.getElementById('replay-pause').click();assert.equal(h.run('replay.paused'),false);d.querySelector('.pf-rank-action').click();assert.equal(h.run('replay.paused'),true);await tick();
 const ranking=h.requests.at(-1);assert.equal(ranking.options.signal.aborted,false,'queued result-close must not kill ranking GET');assert.equal(d.querySelectorAll('dialog[open]').length,1);
 d.querySelector('[data-pf-view-return]').click();assert.equal(ranking.options.signal.aborted,true,'return cancels the old ranking request');assert.equal(h.run('replay.active&&replay.paused'),true);assert.equal(d.getElementById('overlay').open,false);
 ranking.resolve({ok:true,json:async()=>({entries:[{nickname:'STALE REPLAY ROW',score:999,rank:1}],own:null})});submission.resolve({ok:true,json:async()=>({accepted:true,bestUpdated:true})});await tick();
 assert.doesNotMatch(d.body.textContent,/STALE REPLAY ROW|刷新線上最佳/);assert.equal(h.requests.length,2,'late submission must not refresh or resubmit');
 d.getElementById('replay-close').click();assert.equal(h.run('replay.active'),false);assert.equal(d.getElementById('overlay').open,true);assert.equal(d.getElementById('overlay').scrollTop,47);assert.equal(d.activeElement,d.getElementById('replay-result'));
 assert.equal(h.run('state'),state);assert.equal(JSON.stringify(state),savedState);assert.equal(h.run('shareState.file'),file);assert.equal(d.getElementById('landing-preview').firstChild,preview);assert.equal(d.getElementById('result-score-block').innerHTML,score);assert.deepEqual(h.calls,counts,'replay neither simulates nor writes scores/journeys/verdicts');assert.equal(h.recordedStarts.length,1);
 // Nickname storage is the only intentional change made by manual submission.
 const originalStorage=JSON.parse(storage);delete originalStorage['pf-leaderboard-nickname-v1'];const currentStorage={...w.localStorage};delete currentStorage['pf-leaderboard-nickname-v1'];assert.deepEqual(currentStorage,originalStorage);
 d.getElementById('replay-result').click();d.getElementById('reset').click();assert.equal(h.run('playing&&!paused'),true);assert.equal(h.run('replay.active||replay.ready'),false);assert.equal(h.run('replay.size'),1);assert.equal(h.run('finalReplayView'),null);assert.equal(h.run('shareState.file'),null);assert.equal(d.getElementById('landing-preview').children.length,0);assert.equal(d.getElementById('replay-controls').hidden,true);assert.equal(h.recordedStarts.length,2);assert.ok([...d.querySelectorAll('[data-limb]')].every(b=>!b.disabled));
 }finally{h.close()}
});

for(const standalone of [false,true])test(`production replay (${standalone?'standalone fallback':'native queued close'}) naturally finishes or exits with Escape without recording another run`,async()=>{
 const h=boot(standalone),{d,w}=h;try{
 await finishRound(h);const counts={...h.calls},state=JSON.stringify(h.run('state')),file=h.run('shareState.file'),preview=d.getElementById('landing-preview').firstChild,score=d.getElementById('result-score-block').innerHTML;
 d.getElementById('replay-result').click();let frames=0;
 for(let time=80;h.run('replay.active')&&frames<500;time+=60,frames++)h.frame(time);
 assert.ok(frames>1&&frames<500,'recorded replay must reach its own end');assert.equal(h.run('replay.active'),false);assert.equal(d.getElementById('overlay').open,true);assert.equal(d.getElementById('replay-controls').hidden,true);assert.equal(d.activeElement,d.getElementById('replay-result'));
 d.getElementById('replay-result').click();assert.equal(h.run('replay.active'),true);w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Escape',bubbles:true}));assert.equal(h.run('replay.active'),false);assert.equal(d.getElementById('overlay').open,true);
 assert.equal(JSON.stringify(h.run('state')),state);assert.equal(h.run('shareState.file'),file);assert.equal(d.getElementById('landing-preview').firstChild,preview);assert.equal(d.getElementById('result-score-block').innerHTML,score);assert.deepEqual(h.calls,counts);assert.equal(h.recordedStarts.length,1);assert.equal(h.requests.length,0,'replays never submit a leaderboard score automatically');
 }finally{h.close()}
});
