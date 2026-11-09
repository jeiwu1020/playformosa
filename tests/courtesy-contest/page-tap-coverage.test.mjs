import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createEntryShell} from '../../public/games/shared/entry-shell.mjs';
import {installButtonTapGuard} from '../../public/games/courtesy-contest/touch-controls.js';
const html=readFileSync(new URL('../../public/games/courtesy-contest/index.html',import.meta.url),'utf8');
function harness(t){
 const dom=new JSDOM(html,{url:'https://example.test/games/courtesy-contest/',pretendToBeVisual:true});t.after(()=>dom.window.close());
 const {document:doc}=dom.window;let now=0,hit;doc.elementFromPoint=()=>hit;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const entry=createEntryShell({document:doc,title:'客氣大賽',goal:'測試',operations:[],canStart:()=>true,onStart(){}});
 entry.configurePause({canContinue:()=>true,onContinue(){},onRestart(){}});
 installButtonTapGuard(doc,()=>now);
 const p=(x=50,y=50,id=1)=>({clientX:x,clientY:y,identifier:id});
 function fire(type,target,opts={}){const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{touches:type==='touchend'||type==='touchcancel'?[]:[p()],changedTouches:[p()],...opts});target.dispatchEvent(e);return e;}
 function tap(target){hit=target;fire('touchstart',target);now+=60;return fire('touchend',target);}
 return {doc,entry,tap,fire,p,setHit:target=>hit=target,advance:ms=>now+=ms};
}
for(const view of ['entry','pause','help','ranking','result','share','page-gap','fallback-backdrop'])test(`quick repeated taps cover the actual ${view} surface`,t=>{
 const h=harness(t);let target;
 if(view==='entry'){h.entry.open();target=h.entry.dialog.querySelector('h2');}
 if(view==='pause'){h.entry.openPause();target=h.entry.dialog.querySelector('[data-pf-pause]');}
 if(view==='help'){h.entry.open({help:true});target=h.entry.dialog.querySelector('h2');}
 if(view==='ranking'){h.entry.open();const content=h.doc.createElement('section');content.textContent='排行榜';h.entry.openView(content,{label:'排行榜'});target=content;}
 if(view==='result')target=h.doc.querySelector('#result .result-card');
 if(view==='share')target=h.doc.querySelector('#share-fallback');
 if(view==='page-gap')target=h.doc.body;
 if(view==='fallback-backdrop'){target=h.doc.createElement('div');target.className='dialog-backdrop';h.doc.body.append(target);}
 assert.ok(target);assert.equal(h.tap(target).defaultPrevented,false);h.advance(80);assert.equal(h.tap(target).defaultPrevented,true);
});
test('new menu buttons activate exactly once on a cancelled repeat',t=>{const h=harness(t);h.entry.open();const button=h.entry.dialog.querySelector('button');let n=0;button.addEventListener('click',()=>n++);h.tap(button);h.advance(80);assert.equal(h.tap(button).defaultPrevented,true);assert.equal(n,1);});
test('switching from a dialog to gameplay never replays an old action',t=>{const h=harness(t);h.tap(h.entry.dialog);h.advance(80);assert.equal(h.tap(h.doc.querySelector('#game')).defaultPrevented,false);});
for(const selector of ['input','textarea','select','a[href]','summary','[data-share]','[data-selectable]'])test(`${selector} stays native in a real dialog`,t=>{
 const h=harness(t),dialog=h.doc.querySelector('#result');const div=h.doc.createElement('div');div.innerHTML='<input><textarea></textarea><select><option>a</option></select><a href="#">link</a><details><summary>more</summary></details><button data-share="image">share</button><p data-selectable>text</p>';dialog.append(div);const el=div.querySelector(selector);h.tap(el);h.advance(80);assert.equal(h.tap(el).defaultPrevented,false);
});
test('reading-dialog scrolling, long press and pinch remain native',t=>{
 const h=harness(t),el=h.entry.dialog;h.tap(el);h.fire('touchstart',el);h.fire('touchmove',el,{touches:[h.p(50,95)]});h.setHit(el);assert.equal(h.fire('touchend',el,{changedTouches:[h.p(50,95)]}).defaultPrevented,false);
 h.fire('touchstart',el);h.advance(600);assert.equal(h.fire('touchend',el).defaultPrevented,false);
 h.tap(el);h.fire('touchstart',el,{touches:[h.p(),h.p(80,50,2)]});assert.equal(h.fire('touchend',el,{touches:[h.p()],changedTouches:[h.p(80,50,2)]}).defaultPrevented,false);assert.equal(h.fire('touchend',el).defaultPrevented,false);
});
test('the fallback does not attach new coverage to other games',t=>{const h=harness(t);h.doc.body.classList.remove('pf-courtesy');h.tap(h.entry.dialog);h.advance(80);assert.equal(h.tap(h.entry.dialog).defaultPrevented,false);});
