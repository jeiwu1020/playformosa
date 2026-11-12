import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';import {renderPage} from '../src/render.mjs';import {catalog} from '../src/catalog.mjs';
const source=readFileSync(new URL('../public/games/overtime-pinball/main.js',import.meta.url),'utf8');
const fn=name=>{const line=source.split('\n').find(l=>l.startsWith(`function ${name}(`));assert.ok(line,name);return line;};
test('pinball actual start and retry count once, opening completion/pause/resume do not count',()=>{
 const calls=[],noop=()=>{},node={hidden:false,textContent:'',focus:noop,classList:{add:noop,remove:noop},querySelector:()=>node};
 const c={recordPlayStart:(win,key)=>{calls.push(key);},window:{},platform:{reset:noop},game:{reset:noop,start:noop,ball:{},round:{}},roundOptions:{limit:180,best:()=>0},gameAudio:{unlock:noop,setState:noop},clearRoundVisuals:noop,document:{body:node},cameraRig:{reset:noop},clearInput:noop,playFrame:()=>({w:1,h:1}),cameraPose:()=>({position:[0,0,0],target:[0,0,0],fov:45}),openingPose:()=>({position:[0,0,0],target:[0,0,0],fov:45}),innerWidth:1,innerHeight:1,comfort:false,camera:{position:{set:noop},userData:{look:{set:noop}}},$:()=>node,interactionsOn:true,mode:'intro',checkOrientation:()=>({canResume:true}),sound:noop};
 vm.createContext(c);for(const name of ['beginCinematic','openingKick','completeOpening','pause','resume'])vm.runInContext(fn(name),c);
 c.beginCinematic();assert.deepEqual(calls,['overtime-pinball']);c.completeOpening();c.completeOpening();assert.equal(calls.length,1);c.pause();c.resume();assert.equal(calls.length,1);c.beginCinematic();assert.deepEqual(calls,['overtime-pinball','overtime-pinball']);
 assert.equal((source.match(/\brecordPlayStart\(/g)||[]).length,1);
});
test('pinball entry and every retry route share one hook, not menu visits',()=>{
 for(const text of ["$('start').onclick=beginCinematic","$('restart').onclick=beginCinematic","$('pauseRestart').onclick=beginCinematic",'restart:beginCinematic'])assert.ok(source.includes(text),text);
 assert.doesNotMatch(fn('returnHome'),/recordPlayStart/);assert.doesNotMatch(fn('openingKick'),/recordPlayStart/);
 const doc=new JSDOM(renderPage(catalog)).window.document;assert.equal(doc.querySelectorAll('[data-play-count="overtime-pinball"]').length,1);
});
