import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createGameEntry} from '../public/games/shared/entry-shell.mjs';
import {createDialogController} from '../public/games/long-jump/dialogs.mjs';
const games=['long-jump','hurdles','reaction-rod'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function boot(game){
 let expire;const html=readFileSync(new URL('../public/games/'+game+'/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://playformosa.playformosa.workers.dev/games/'+game+'/',runScripts:'dangerously',beforeParse(w){
  w.setTimeout=fn=>(expire=fn,1);w.clearTimeout=()=>{};w.matchMedia=()=>({matches:false});
  w.HTMLElement.prototype.getClientRects=function(){return this.closest('details:not([open]),[hidden]')?[]:[{width:80,height:44}];};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 }});
 return{dom,doc:dom.window.document,window:dom.window,timeout:()=>expire?.()};
}
for(const game of games){
 test(game+' has first-paint recovery without an external image or bootstrap request',()=>{
  const h=boot(game);try{assert.equal(h.doc.documentElement.dataset.pfStartup,'pending');const loader=h.doc.querySelector('#pf-startup');assert.ok(loader);assert.equal(loader.querySelectorAll('img,video,audio,iframe,image,script').length,0);assert.ok(loader.querySelector('svg[aria-hidden=true]'));assert.ok(loader.querySelector('a[href=""]'));assert.ok(loader.querySelector('a[href="/"]'));assert.ok(loader.querySelector('noscript'));assert.equal(h.doc.querySelector('#pf-startup-script').hasAttribute('src'),false);}finally{h.dom.window.close();}
 });
 for(const fallback of [false,true])test(game+' releases only the real open entry and does not start gameplay ('+(fallback?'standalone':'native')+')',async()=>{
  const h=boot(game);let starts=0;let entry;try{assert.equal(h.doc.documentElement.dataset.pfStartup,'pending');entry=createGameEntry({document:h.doc,gameId:game,forceFallback:fallback,onStart:()=>starts++});await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'pending');entry.open();await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'ready');assert.equal(h.doc.querySelector('#pf-startup'),null);assert.equal(starts,0);assert.equal(h.doc.activeElement,entry.dialog.querySelector('.pf-entry-start'));entry.dialog.querySelector('.pf-entry-start').click();assert.equal(starts,1);assert.equal(entry.active,false);entry.open({help:true});await tick();assert.equal(h.doc.querySelector('#pf-startup'),null);}finally{entry?.destroy();h.dom.window.close();}
 });
 test(game+' preserves recovery after resource failure and accepts a late successful entry',async()=>{
  const h=boot(game);let entry;try{h.window.dispatchEvent(new h.window.Event('error'));assert.equal(h.doc.documentElement.dataset.pfStartup,'waiting');assert.match(h.doc.querySelector('#pf-startup-status').textContent,/重新載入/);h.timeout();assert.equal(h.doc.documentElement.dataset.pfStartup,'waiting');entry=createGameEntry({document:h.doc,gameId:game,onStart(){},forceFallback:true});entry.open();await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'ready');}finally{entry?.destroy();h.dom.window.close();}
 });
}
test('closed or hidden legacy Jump overlay cannot reveal an unfinished game',async()=>{
 const h=boot('long-jump');try{const overlay=h.doc.getElementById('overlay');overlay.open=true;await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'pending');h.doc.getElementById('start').disabled=true;overlay.hidden=true;h.window.dispatchEvent(new h.window.Event('error'));await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'waiting');assert.ok(h.doc.getElementById('pf-startup'));}finally{h.dom.window.close();}
});
for(const fallback of [false,true])test('Jump WebGL failure reveals its existing error with working recovery ('+(fallback?'standalone':'native')+')',async()=>{
 const h=boot('long-jump');try{const overlay=h.doc.getElementById('overlay'),start=h.doc.getElementById('start');h.doc.getElementById('card-title').textContent='這個裝置暫時無法開啟 3D';start.disabled=true;createDialogController(overlay,()=>{},{forceFallback:fallback}).open();h.window.dispatchEvent(new h.window.Event('error'));await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'ready');assert.equal(h.doc.getElementById('pf-startup'),null);assert.equal(overlay.open,true);assert.ok(overlay.querySelector('[data-pf-startup-recovery] a[href=""]'));assert.ok(overlay.querySelector('[data-pf-startup-recovery] a[href="/"]'));assert.notEqual(h.doc.activeElement,start);}finally{h.dom.window.close();}
});
test('Rod unsupported WebGL entry reveals its disabled start and home recovery',async()=>{
 const h=boot('reaction-rod');let entry;try{entry=createGameEntry({document:h.doc,gameId:'reaction-rod',onStart(){throw Error('must not start');},canStart:()=>false});entry.open();await tick();assert.equal(h.doc.documentElement.dataset.pfStartup,'ready');assert.equal(entry.dialog.querySelector('.pf-entry-start').disabled,true);assert.equal(h.doc.activeElement,entry.dialog.querySelector('.pf-entry-error a'));}finally{entry?.destroy();h.dom.window.close();}
});
