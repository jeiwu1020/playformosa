import {focusGameplay,mountRestartConfirmation} from '../public/games/overtime-pinball/restart-confirmation.js';
import {installGameMenus} from '../public/games/overtime-pinball/game-menus.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';import {renderPage} from '../src/render.mjs';import {catalog} from '../src/catalog.mjs';
const source=readFileSync(new URL('../public/games/overtime-pinball/main.js',import.meta.url),'utf8');
const fn=name=>{const line=source.split('\n').find(l=>l.startsWith(`function ${name}(`));assert.ok(line,name);return line;};
test('pinball actual start and retry count once, opening completion/pause/resume do not count',()=>{
 let recoveryHides=0;
 const d=new JSDOM(readFileSync(new URL('../public/games/overtime-pinball/game.html',import.meta.url),'utf8'),{pretendToBeVisual:true}),doc=d.window.document;installGameMenus(doc);const hint=doc.createElement('div');hint.id='stationHint';doc.body.append(hint);
 const calls=[],noop=()=>{},node=doc.getElementById('pauseScreen');
 const c={focusGameplay,releaseRecovery:{hide:()=>{recoveryHides++;}},recordPlayStart:(win,key)=>{calls.push(key);},window:d.window,platform:{reset:noop},game:{reset:noop,start:noop,ball:{},round:{}},roundOptions:{limit:180,best:()=>0},gameAudio:{unlock:noop,setState:noop},clearRoundVisuals:noop,document:doc,cameraRig:{reset:noop},clearInput:noop,playFrame:()=>({w:1,h:1}),cameraPose:()=>({position:[0,0,0],target:[0,0,0],fov:45}),openingPose:()=>({position:[0,0,0],target:[0,0,0],fov:45}),innerWidth:1,innerHeight:1,comfort:false,camera:{position:{set:noop},userData:{look:{set:noop}}},$:id=>doc.getElementById(id),interactionsOn:true,mode:'intro',checkOrientation:()=>({canResume:true}),sound:noop};
 vm.createContext(c);for(const name of ['beginCinematic','openingKick','completeOpening','pause','resume'])vm.runInContext(fn(name),c);
 c.beginCinematic();assert.deepEqual(calls,['overtime-pinball']);c.completeOpening();c.completeOpening();assert.equal(calls.length,1);c.pause();assert.equal(node.open,true,'pause opens the game dialog');assert.equal(c.mode,'paused');assert.equal(calls.length,1,'pause does not add plays');c.resume();assert.equal(node.open,false,'resume closes the game dialog');assert.equal(c.mode,'playing');assert.equal(calls.length,1);const guard=mountRestartConfirmation({document:doc,mode:()=>c.mode,pause:c.pause,resume:c.resume,clearInput:noop,restart:c.beginCinematic});
 const snapshot=JSON.stringify(c.game);guard.request();assert.equal(calls.length,1);doc.getElementById('restartCancel').click();assert.equal(c.mode,'playing');assert.equal(calls.length,1,'cancel does not count');assert.equal(JSON.stringify(c.game),snapshot,'cancel preserves run');assert.equal(doc.activeElement.id,'world');
 c.pause();guard.request();doc.getElementById('restartCancel').click();assert.equal(c.mode,'paused');assert.equal(calls.length,1,'paused cancel does not count');c.resume();
 guard.request();doc.getElementById('restartAccept').click();doc.getElementById('restartAccept').click();assert.deepEqual(calls,['overtime-pinball','overtime-pinball'],'confirm counts exactly once, stale click cannot repeat');assert.equal(c.mode,'cinematic');assert.equal(doc.activeElement.id,'world');
 assert.equal(recoveryHides,2,'both start and retry dismiss recovery without adding plays');
 assert.equal((source.match(/\brecordPlayStart\(/g)||[]).length,1);d.window.close();
});
test('pinball entry and every retry route share one hook, not menu visits',()=>{
 for(const text of ["$('start').onclick=beginCinematic","$('restart').onclick=beginCinematic","$('pauseRestart').onclick=restartConfirmation.request",'restart:beginCinematic','restart:restartConfirmation.request'])assert.ok(source.includes(text),text);
 assert.doesNotMatch(fn('returnHome'),/recordPlayStart/);assert.doesNotMatch(fn('openingKick'),/recordPlayStart/);
 const doc=new JSDOM(renderPage(catalog)).window.document;assert.equal(doc.querySelectorAll('[data-play-count="overtime-pinball"]').length,1);
});
