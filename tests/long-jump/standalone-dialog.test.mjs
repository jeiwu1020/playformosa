import test from 'node:test';import assert from 'node:assert/strict';import {createDialogController} from '../../public/games/long-jump/dialogs.mjs';
function fixture(){
 const doc={activeElement:null,listeners:{},addEventListener(k,f){this.listeners[k]=f;},body:{children:[],appendChild(e){this.children.push(e);}}};
 function element(tag='div') {const attrs=new Map(),classes=new Set();return {tagName:tag.toUpperCase(),ownerDocument:doc,isConnected:true,scrollTop:0,tabIndex:0,hidden:false,children:[],listeners:{},classList:{add:k=>classes.add(k),contains:k=>classes.has(k)},setAttribute(k,v){attrs.set(k,String(v));},getAttribute:k=>attrs.get(k)??null,hasAttribute:k=>attrs.has(k),removeAttribute:k=>attrs.delete(k),get open(){return attrs.has('open');},addEventListener(k,f){this.listeners[k]=f;},contains(e){return e===this||this.children.includes(e);},closest(){return null;},getClientRects(){return[{}];},focus(o){doc.activeElement=this;this.focusOptions=o;},querySelector(){return this.children.at(-1);},querySelectorAll(){return this.children;}};}
 doc.createElement=element;const header=element('header'),main=element('main'),existing=element('aside'),dialog=element('dialog'),first=element('summary'),hidden=element('a'),start=element('button');hidden.getClientRects=()=>[];existing.setAttribute('inert','already');existing.setAttribute('aria-hidden','false');doc.body.children=[header,main,existing,dialog];dialog.children=[first,hidden,start];let shows=0,closes=0;dialog.showModal=()=>{shows++;dialog.setAttribute('open','');};dialog.close=()=>{closes++;dialog.removeAttribute('open');};doc.activeElement=header;return{doc,header,main,existing,dialog,first,start,shows:()=>shows,closes:()=>closes};
}
test('explicit standalone keeps modal outside native top layer with backdrop and reversible background inertness',()=>{
 const h=fixture(),c=createDialogController(h.dialog,()=>{},{forceFallback:true});c.open();c.open();assert.equal(h.shows(),0);assert.equal(h.dialog.open,true);assert.equal(h.dialog.getAttribute('aria-modal'),'true');assert.equal(h.main.hasAttribute('inert'),true);assert.equal(h.main.getAttribute('aria-hidden'),'true');assert.equal(h.doc.activeElement,h.start);assert.equal(h.doc.body.children.filter(e=>e.className==='dialog-backdrop').length,1);assert.equal(c.refresh(),false);
 c.close();assert.equal(h.closes(),0);assert.equal(h.dialog.open,false);assert.equal(h.dialog.getAttribute('aria-modal'),null);assert.equal(h.dialog.getAttribute('tabindex'),null);assert.equal(h.main.hasAttribute('inert'),false);assert.equal(h.main.hasAttribute('aria-hidden'),false);assert.equal(h.existing.getAttribute('inert'),'already');assert.equal(h.existing.getAttribute('aria-hidden'),'false');assert.equal(h.doc.activeElement,h.header);c.close();assert.equal(h.doc.activeElement,h.header);
});
test('fallback traps Tab among rendered controls, redirects escaped focus and Escape does not restart',()=>{
 const h=fixture();let cancels=0;const c=createDialogController(h.dialog,()=>cancels++,{forceFallback:true});c.open();const event=key=>({key,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}});let e=event('Tab');h.dialog.listeners.keydown(e);assert.equal(e.prevented,true);assert.equal(h.doc.activeElement,h.first);e={...event('Tab'),shiftKey:true};h.dialog.listeners.keydown(e);assert.equal(h.doc.activeElement,h.start);
 h.doc.activeElement=h.main;h.doc.listeners.focusin({target:h.main});assert.equal(h.doc.activeElement,h.start);h.dialog.scrollTop=91;c.refresh();assert.equal(h.dialog.scrollTop,91);h.dialog.listeners.keydown(event('Escape'));assert.equal(cancels,1);assert.equal(h.dialog.open,true);c.close();h.doc.activeElement=h.main;h.doc.listeners.focusin({target:h.main});assert.equal(h.doc.activeElement,h.main);
});
test('ordinary Safari/browser retains native showModal, close, and rotation refresh without fallback/inert edits',()=>{
 const h=fixture(),c=createDialogController(h.dialog,()=>{});c.open();assert.equal(h.shows(),1);assert.equal(h.main.hasAttribute('inert'),false);assert.equal(h.doc.body.children.length,4);assert.equal(c.refresh(),true);assert.equal(h.shows(),2);c.close();assert.equal(h.closes(),2);
});

test('fallback Escape stops the event before game keydown can immediately pause again',()=>{
 const h=fixture();let paused=true,restarts=0;const c=createDialogController(h.dialog,()=>{paused=false;c.close();},{forceFallback:true});c.open();const e={key:'Escape',preventDefault(){},stopPropagation(){this.stopped=true;}};h.dialog.listeners.keydown(e);if(!e.stopped&&!paused){paused=true;restarts++;}assert.equal(paused,false);assert.equal(restarts,0);assert.equal(h.dialog.open,false);
});

test('closed fallback result is hidden even when responsive result CSS uses display block or grid',async()=>{
 const fs=await import('node:fs/promises'),css=await fs.readFile(new URL('../../public/games/long-jump/style.css',import.meta.url),'utf8');assert.ok(css.includes('.card.fallback:not([open]){display:none}'));
});
test('disabled autofocus uses the first rendered enabled control, then the dialog if none exist',()=>{
 const h=fixture();h.start.disabled=true;const c=createDialogController(h.dialog,()=>{},{forceFallback:true});c.open();assert.equal(h.doc.activeElement,h.first);c.close();h.first.getClientRects=()=>[];c.open();assert.equal(h.doc.activeElement,h.dialog);
});
