import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
import vm from 'node:vm';
import {createResultDialog,syncPauseButton} from '../../public/games/shared/game-ui.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const css=postcss.parse(read('public/games/courtesy-contest/platform.css'));
function declarations(selector,media=''){const out={};css.walkRules(r=>{if(r.selector===selector&&(r.parent.type==='atrule'?r.parent.params:'')===media)r.walkDecls(d=>out[d.prop]=d.value);});return out;}
test('courtesy photo keeps its own full-frame ratio rather than a letterbox height',()=>{
 const rule=declarations('.pf-courtesy #result-photo');
 assert.equal(rule.height,'auto');assert.equal(rule['max-height'],'none');assert.equal(rule['object-fit'],'contain');
});
test('courtesy portrait clock shares first toolbar row without changing hidden-clock geometry',()=>{
 const timer=declarations('.pf-game.pf-courtesy .app .pf-header .header-actions','(max-width:650px)');
 assert.equal(declarations('.pf-game.pf-courtesy .app .pf-header nav','(max-width:650px)')['grid-column'],'3');
 assert.equal(timer['grid-row'],'1');assert.equal(timer['grid-column'],'2');
 const heading=declarations('.pf-game.pf-courtesy .app .pf-header>.pf-studio-heading','(max-width:650px)');
 assert.equal(heading['grid-column'],'1/-1');assert.equal(heading['padding-right'],'0');
});
test('courtesy short landscape has an explicit two-column summary and full-width actions',()=>{
 const media='(min-width:651px) and (max-height:600px)';
 assert.equal(declarations('.pf-courtesy #result .result-card',media).display,'grid');
 assert.equal(declarations('.pf-courtesy #result .result-card',media).gap,'4px 16px');
 assert.equal(declarations('.pf-courtesy #result-upload .pf-leaderboard:not([open])',media).padding,'0');
 assert.equal(declarations('.pf-courtesy #result .pf-studio-result',media)['grid-column'],'2');
 assert.equal(declarations('.pf-courtesy #result-photo',media)['grid-row'],'1 / span 4');
 assert.equal(declarations('.pf-courtesy #result .result-card> :where(.pf-result-play,#result-upload,.pf-share-actions,#share-status,.share-note,.pf-studio-result)',media)['grid-column'],'1 / -1');
});
test('real courtesy finish focuses replay, never title, and replay closes result once',t=>{
 const dom=new JSDOM(read('public/games/courtesy-contest/index.html'),{url:'https://qa.example/',pretendToBeVisual:true}),{document}=dom.window;t.after(()=>dom.window.close());
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const dialog=document.getElementById('result');let pending,starts=0;const scores=[];
 const scene={phase:'result',ready:true,seated:true,count:3,chainBonus:0,seatAcceptedAtMs:20000,seatSettledAtMs:21000,start(){starts++;this.phase='play';},pauseRound(){},resumeRound(){},game:{canvas:{},events:{once(event,fn){assert.equal(event,'postrender');pending=fn;}}}};
 const entry={dialog:document.createElement('dialog'),configurePause(){},setAudio(){},open(){},close(){},openPause(){}};
 const source=read('public/games/courtesy-contest/platform.mjs').replace(/^import .*;\n/gm,'').replace(/export /g,'');
 const prefs={get:()=>({musicVolume:.4,effectsVolume:.7,musicEnabled:false,effectsEnabled:false}),subscribe(){},set(){}};
 const context={window:dom.window,document,createEntryShell:()=>entry,createResultDialog,syncPauseButton,audioPreferences:()=>prefs,mountLeaderboard:()=>({reset(){},setResult(score){scores.push(score);}}),recordPlayStart(){},createCourtesySharing:()=>({reset(){},prepare(){}}),copyResultFrame:()=>({})};
 vm.createContext(context);vm.runInContext(source,context);
 const controller=context.installCourtesyPlatform(scene,{note(){},noise(){},context:{state:'running'}},{startBuffer(){},media:{},audio:{paused:true},setEnabled(){}});
 for(let round=0;round<2;round++){
  scene.phase='result';controller.finished();pending();assert.equal(document.activeElement.id,'restart');assert.notEqual(document.activeElement.id,'result-title');assert.equal(scores.at(-1).remaining,10,'ranking uses acceptance time, not animation completion');
  document.activeElement.click();assert.equal(starts,round+1);assert.equal(dialog.open,false);
 }
 assert.match(document.getElementById('restart').textContent,/再玩一次/);
});
