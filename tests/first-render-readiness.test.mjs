import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
// Execute complete controllers, real physics/input/clock/render transaction and
// shared entry DOM. Only drawing/audio/share encoding are external boundaries.
async function boot(game,failDraw){
 const url=new URL(`../public/games/${game}/game.mjs`,import.meta.url),raw=fs.readFileSync(url,'utf8'),bindings={};
 for(const match of raw.matchAll(/import\s*([^;]+?)\s*from\s*['"]([^'"]+)['"];?/g)){
  const mod=await import(new URL(match[2],url));const clause=match[1].trim();if(clause.startsWith('*'))bindings[clause.match(/as\s+(\w+)/)[1]]=mod;else for(const item of clause.replace(/[{}]/g,'').split(',')){const [name,alias]=item.trim().split(/\s+as\s+/);bindings[alias||name]=mod[name];}
 }
 const dom=new JSDOM(fs.readFileSync(new URL('index.html',url),'utf8'),{url:'https://private.test/'}),w=dom.window,document=w.document;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};let attempts=0;
 const draw=()=>{attempts++;if(failDraw)throw Error('first presentation failed');};const renderer={draw,render:draw,resize(){}};
 const context={...bindings,document,window:w,navigator:w.navigator,screen:w.screen,location:w.location,localStorage:w.localStorage,performance:{now:()=>0},requestAnimationFrame(){},addEventListener:w.addEventListener.bind(w),removeEventListener:w.removeEventListener.bind(w),matchMedia:()=>({matches:false}),structuredClone,URL,console:{error(){},warn(){}},createWorld:()=>renderer,createRenderer:()=>renderer,createMusicController:()=>({setPlaying(){},unlock(){},enabled:false}),createRelaySound:()=>({silence(){},reset(){},setEnabled(){},unlock(){}}),createSharing:()=>({reset(){}}),bindShare:()=>({reset(){}})};
 const source=raw.replace(/import\s*([^;]+?)\s*from\s*['"]([^'"]+)['"];?/g,'').replace(/^mountControlsFrame\([^\n]*\);\n/gm,'').replaceAll('import.meta.url',JSON.stringify(url.href));
 vm.createContext(context);vm.runInContext(source,context);return{document,dom,attempts,evaluate:code=>vm.runInContext(code,context)};
}
for(const game of ['high-jump','shot-put','tower-climb'])for(const failure of [true,false])test(`${game}: constructor success and first draw ${failure?'failure blocks':'success permits'} entry`,async()=>{
 const app=await boot(game,failure);try{assert.equal(app.attempts,1,'constructor reached a real first draw');const start=app.document.querySelector('.pf-entry-start');assert.ok(start);assert.equal(start.disabled,failure);if(failure){assert.equal(app.document.getElementById('restart').disabled,true);app.evaluate('start()');assert.equal(app.evaluate(game==='shot-put'?'running':'active'),false);}assert.equal(app.document.querySelector('.pf-entry').open,true);if(game==='shot-put')assert.equal(app.document.getElementById('center').hidden,!failure);if(game==='tower-climb')assert.equal(app.document.getElementById('launch').hidden,!failure);}finally{app.dom.window.close();}
});
