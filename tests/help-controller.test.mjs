import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
// Execute complete controllers, real physics/input/clock/render transaction and
// shared entry DOM. Only drawing/audio/share encoding are external boundaries.
async function boot(game,failDraw=false,{standalone=false}={}){
 const url=new URL(`../public/games/${game}/game.mjs`,import.meta.url),raw=fs.readFileSync(url,'utf8'),bindings={};
 for(const match of raw.matchAll(/import\s*([^;]+?)\s*from\s*['"]([^'"]+)['"];?/g)){
  const mod=await import(new URL(match[2],url));const clause=match[1].trim();if(clause.startsWith('*'))bindings[clause.match(/as\s+(\w+)/)[1]]=mod;else for(const item of clause.replace(/[{}]/g,'').split(',')){const [name,alias]=item.trim().split(/\s+as\s+/);bindings[alias||name]=mod[name];}
 }
 const dom=new JSDOM(fs.readFileSync(new URL('index.html',url),'utf8'),{url:'https://private.test/'}),w=dom.window,document=w.document;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};let attempts=0;
 Object.defineProperty(w.navigator,'standalone',{value:standalone});w.HTMLElement.prototype.setPointerCapture=function(id){(this.captures??=new Set()).add(id)};w.HTMLElement.prototype.hasPointerCapture=function(id){return this.captures?.has(id)};w.HTMLElement.prototype.releasePointerCapture=function(id){this.captures?.delete(id)};
 const draw=()=>{attempts++;if(failDraw)throw Error('first presentation failed');};const renderer={draw,render:draw,resize(){}};
 const context={...bindings,document,window:w,navigator:w.navigator,screen:w.screen,location:w.location,localStorage:w.localStorage,performance:{now:()=>0},requestAnimationFrame(){},addEventListener:w.addEventListener.bind(w),removeEventListener:w.removeEventListener.bind(w),matchMedia:()=>({matches:false}),structuredClone,URL,console:{error(){},warn(){}},createWorld:()=>renderer,createRenderer:()=>renderer,createMusicController:()=>({setPlaying(){},unlock(){},enabled:false}),createRelaySound:()=>({silence(){},reset(){},setEnabled(){},unlock(){}}),createSharing:()=>({reset(){}}),bindShare:()=>({reset(){}}),createGustAudio:()=>({unlock(){},play(){}})};
 const source=raw.replace(/import\s*([^;]+?)\s*from\s*['"]([^'"]+)['"];?/g,'').replace(/^mountControlsFrame\([^\n]*\);\n/gm,'').replaceAll('import.meta.url',JSON.stringify(url.href));
 vm.createContext(context);vm.runInContext(source,context);return{document,dom,attempts,evaluate:code=>vm.runInContext(code,context)};
}

for(const game of ['high-jump','shot-put','discus','tower-climb'])for(const standalone of[false,true])test(`${game}: real help preserves pause/result with ${standalone?'standalone fallback':'native'} ownership`,async()=>{
 const app=await boot(game,false,{standalone}),d=app.document,w=app.dom.window;
 try{const start=d.querySelector('.pf-entry-start');start.click();const isShot=game==='shot-put',isHigh=game==='high-jump',stateName=isShot||isHigh?'s':'state';
 app.evaluate(isShot?"input.set('key:k','k');press(s,'k')":game==='discus'?"input.set('key:k','k');setLimb(state,'k',true)":'');
 const help=d.querySelector('.pf-entry-help');help.click();assert.equal(d.querySelectorAll('dialog[open]').length,1);assert.equal(start.closest('[inert]'),null);assert.equal(app.evaluate(stateName+'.paused'),true);assert.equal(app.evaluate(isShot?'input.sources.size':game==='discus'?'input.sources.size':isHigh?'s.held.some(Boolean)':'sources.ids.length'),isShot||game==='discus'?0:isHigh?false:0);
 w.dispatchEvent(new w.Event('orientationchange'));w.dispatchEvent(new w.Event('blur'));assert.equal(d.querySelectorAll('dialog[open]').length,1,'interrupt cannot reopen pause over help');start.click();assert.equal(app.evaluate(stateName+'.paused'),true);assert.equal(d.querySelector('.pf-entry').open,false);const pauseId=isShot?'center':game==='discus'?'pause-panel':isHigh?'paused':'pause-dialog';assert.equal(d.getElementById(pauseId).hidden,false);if(!isShot&&game!=='discus')assert.equal(d.getElementById(pauseId).open,true);
 const menuHelp=d.querySelector('#'+pauseId+' .pf-pause-help');assert.ok(menuHelp);menuHelp.click();assert.equal(d.querySelectorAll('dialog[open]').length,1);start.click();assert.equal(app.evaluate(stateName+'.paused'),true);
 // Model an already-committed result, preserving exact object and DOM pixels; no settle/start call.
 app.evaluate(isShot?"running=false;s.phase='done';dialog.open()":isHigh?"active=false;s.phase='done';result.open()":"active=false;state.phase='done';resultDialog.open()");if(d.getElementById(pauseId).tagName==='DIALOG')d.getElementById(pauseId).close();else d.getElementById(pauseId).hidden=true;
 d.getElementById('result').dataset.frozen='same-png-and-score';const before=app.evaluate('JSON.stringify('+stateName+')');app.evaluate('entry.open({help:true})');assert.equal(d.getElementById('result').open,false);start.click();assert.equal(d.getElementById('result').open,true);assert.equal(d.getElementById('result').dataset.frozen,'same-png-and-score');assert.equal(app.evaluate('JSON.stringify('+stateName+')'),before);assert.equal(d.getElementById('result').closest('[inert]'),null);
 }finally{app.dom.window.close();}
});
