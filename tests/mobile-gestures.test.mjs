import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
let api={};try{api=await import('../public/games/shared/mobile-gestures.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const entries=["beer-slide/index","courtesy-contest/index","discus/index","fast-hands-test/index","fast-hands/catch","fast-hands/duel","fast-hands/index","high-jump/index","hurdles/index","javelin/index","long-jump/index","pole-vault/index","reaction-rod/index","run-1500m/index","run-400m/index","shot-put/index","sprint-100m/index","tower-climb/index"];
function setup(){assert.equal(typeof api.protectGameGestures,'function','A shared native zoom guard is required');const dom=new JSDOM('<main><section data-game-gesture-surface><canvas></canvas><button>Play</button></section><dialog open><p>Read settings</p><input></dialog></main>');const d=dom.window.document,surface=d.querySelector('section'),canvas=d.querySelector('canvas'),button=d.querySelector('button');const dispose=api.protectGameGestures(surface);return{dom,d,surface,canvas,button,dispose};}
function send(dom,target,type,props={}){const e=new dom.window.Event(type,{bubbles:true,cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;}
const touch=(target,x=20,y=20,id=1)=>({target,clientX:x,clientY:y,identifier:id});
function tap(ctx,target,time,x=20){const t=touch(target,x);send(ctx.dom,target,'touchstart',{touches:[t],changedTouches:[t],timeStamp:time});return send(ctx.dom,target,'touchend',{touches:[],changedTouches:[t],timeStamp:time+25});}
test('all preview game entries load the shared guard and stylesheet without viewport scaling restrictions',async()=>{
 for(const entry of entries){const d=new JSDOM(await readFile(new URL(`../public/games/${entry}.html`,import.meta.url),'utf8')).window.document;
 assert.ok(d.querySelector('script[type="module"][src="../shared/mobile-gestures.mjs"]'),entry);
 assert.ok(d.querySelector('link[rel="stylesheet"][href="../shared/mobile-gestures.css"]'),entry);
 assert.ok(d.querySelector('[data-game-gesture-surface]'),entry);
 assert.doesNotMatch(d.querySelector('meta[name="viewport"]').content,/user-scalable\s*=\s*no|maximum-scale/i,entry);
 for(const dialog of d.querySelectorAll('dialog')){const ancestor=dialog.closest('[data-game-gesture-surface]');if(ancestor)assert.ok(ancestor.hasAttribute('data-game-gesture-overlays'),`${entry}: nested dialog must release the ancestor gesture lock`);}
 assert.ok(d.querySelector('main[data-game-gesture-surface]'),`${entry}: protect gaps between scene and controls`);
 for(const el of d.querySelectorAll('[data-game-gesture-surface]'))assert.ok(!['HTML','BODY'].includes(el.tagName),entry);
 }
});
test('native double tap and Safari pinch defaults cancel only on gameplay, not reading dialogs',()=>{
 const ctx=setup();for(const type of ['dblclick','gesturestart','gesturechange']){assert.equal(send(ctx.dom,ctx.canvas,type).defaultPrevented,true,type);assert.equal(send(ctx.dom,ctx.d.querySelector('dialog p'),type).defaultPrevented,false,type);}
 const a=touch(ctx.canvas),b=touch(ctx.canvas,60,20,2);
 assert.equal(send(ctx.dom,ctx.canvas,'touchstart',{touches:[a,b],changedTouches:[b]}).defaultPrevented,true);
 assert.equal(send(ctx.dom,ctx.canvas,'touchmove',{touches:[a,b],changedTouches:[b]}).defaultPrevented,true);
 assert.equal(send(ctx.dom,ctx.d.querySelector('dialog p'),'touchmove',{touches:[a,b]}).defaultPrevented,false);
});
test('legacy double-tap fallback does not consume the first tap, long press, movement or ordinary button clicks',()=>{
 const ctx=setup();assert.equal(tap(ctx,ctx.canvas,100).defaultPrevented,false);assert.equal(tap(ctx,ctx.canvas,250).defaultPrevented,true);
 assert.equal(tap(ctx,ctx.canvas,1000).defaultPrevented,false);assert.equal(tap(ctx,ctx.canvas,1150,120).defaultPrevented,false);
 assert.equal(tap(ctx,ctx.button,1500).defaultPrevented,false);assert.equal(tap(ctx,ctx.button,1600).defaultPrevented,false);
 let clicks=0;ctx.button.addEventListener('click',()=>clicks++);send(ctx.dom,ctx.button,'click');send(ctx.dom,ctx.button,'click');assert.equal(clicks,2);
 const t=touch(ctx.canvas);send(ctx.dom,ctx.canvas,'touchstart',{touches:[t],timeStamp:2000});assert.equal(send(ctx.dom,ctx.canvas,'touchend',{touches:[],changedTouches:[t],timeStamp:2700}).defaultPrevented,false);
});
test('game pointer movement, four simultaneous limb inputs, release/cancel, and keyboard remain unmodified',()=>{
 const ctx=setup(),held=new Set();let bubbled=0;ctx.d.addEventListener('pointerdown',()=>bubbled++);ctx.canvas.addEventListener('pointerdown',e=>held.add(e.pointerId));ctx.canvas.addEventListener('pointerup',e=>held.delete(e.pointerId));ctx.canvas.addEventListener('pointercancel',e=>held.delete(e.pointerId));
 for(let id=1;id<=4;id++)assert.equal(send(ctx.dom,ctx.canvas,'pointerdown',{pointerId:id,pointerType:'touch',isPrimary:id===1}).defaultPrevented,false);
 assert.equal(held.size,4);assert.equal(bubbled,4);
 for(const type of ['pointermove','lostpointercapture','keydown','keyup','click'])assert.equal(send(ctx.dom,ctx.canvas,type).defaultPrevented,false,type);
 send(ctx.dom,ctx.canvas,'pointercancel',{pointerId:2});send(ctx.dom,ctx.canvas,'pointerup',{pointerId:1});assert.deepEqual([...held],[3,4]);
});
test('installation is idempotent and cleanup restores defaults after remount',()=>{
 const ctx=setup();assert.equal(api.protectGameGestures(ctx.surface),ctx.dispose);ctx.dispose();assert.equal(send(ctx.dom,ctx.canvas,'gesturestart').defaultPrevented,false);api.protectGameGestures(ctx.surface);assert.equal(send(ctx.dom,ctx.canvas,'gesturestart').defaultPrevented,true);
});
test('CSS protects marked gameplay surfaces only and never disables reading zoom globally',async()=>{
 const css=await readFile(new URL('../public/games/shared/mobile-gestures.css',import.meta.url),'utf8');assert.match(css,/\[data-game-gesture-surface\][^{]*\{[^}]*touch-action:\s*none/);assert.doesNotMatch(css,/(?:^|\})\s*(?:html|body|\*)\s*\{/);assert.doesNotMatch(css,/-webkit-text-size-adjust:\s*none/);
});

test('nested reading dialogs and inline pause panels bypass every native-gesture fallback',()=>{
 const ctx=setup();ctx.surface.append(ctx.d.querySelector('dialog'));const panel=ctx.d.createElement('div');panel.setAttribute('data-game-gesture-reading','');ctx.surface.append(panel);
 for(const target of [ctx.d.querySelector('dialog p'),panel])for(const type of ['gesturestart','gesturechange','dblclick','touchstart','touchmove','touchend'])assert.equal(send(ctx.dom,target,type,{touches:[touch(target),touch(target,60,20,2)]}).defaultPrevented,false,type);
});


test('class-hidden courtesy pause overlays do not release the active game touch lock',async()=>{
 const css=await readFile(new URL('../public/games/shared/mobile-gestures.css',import.meta.url),'utf8');
 assert.ok(css.includes('[data-game-gesture-reading]:not([hidden]):not(.hidden)'), 'both hidden attribute and hidden class must keep gameplay protected');
});
