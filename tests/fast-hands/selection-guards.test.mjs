import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
import {mountClub} from '../../public/games/fast-hands/club.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
for(const mode of ['duck','catch','duel'])test(`${mode} blocks gameplay long-press menu without blocking editable/copy controls`,()=>{
 const dom=new JSDOM(readFileSync(new URL(mode==='duck'?'index.html':mode+'.html',root),'utf8'),{url:'https://qa.test/games/fast-hands/',pretendToBeVisual:true}),w=dom.window,d=w.document;w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 const club=mountClub({document:d,window:w,mode});try{
  const fire=el=>{const e=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented};
  assert.equal(fire(d.querySelector(mode==='duck'?'#pad':'#actionButton')),true);
  assert.equal(fire(d.querySelector('h1')),true);
  for(const tag of ['input','textarea']){const el=d.createElement(tag);d.body.append(el);assert.equal(fire(el),false,tag+' keeps native editing');}
  const editable=d.createElement('div'),inside=d.createElement('span');editable.contentEditable='true';editable.setAttribute('contenteditable','true');editable.append(inside);d.body.append(editable);assert.equal(fire(inside),false);
  const shareImage=d.getElementById(mode==='duck'?'shareFallbackImage':'summaryShareFallbackImage');assert.equal(fire(shareImage),false,'long press image saving remains available');
  const copy=new w.KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});d.querySelector('textarea').dispatchEvent(copy);assert.equal(copy.defaultPrevented,false);
  club.destroy();assert.equal(fire(d.querySelector('h1')),false,'listener is removed with the controller');
 }finally{club.destroy();w.close()}
});
test('selection CSS protects both browser engines and restores native editing/image saving without disabling gestures',()=>{
 const tree=postcss.parse(readFileSync(new URL('club.css',root),'utf8'));
 const rules=tree.nodes.filter(n=>n.type==='rule'),guard=rules.find(n=>n.selector==='body.fast-hands-club,body.fast-hands-club *');assert.ok(guard);
 for(const name of ['user-select','-webkit-user-select','-webkit-touch-callout'])assert.equal(guard.nodes.find(n=>n.prop===name)?.value,'none');
 assert.equal(guard.nodes.some(n=>['touch-action','pointer-events'].includes(n.prop)),false,'do not suppress scrolling/pointer gameplay');
 const editable=rules.find(n=>n.selector.includes('body.fast-hands-club textarea')&&n.nodes.some(d=>d.prop==='user-select'&&d.value==='text'));assert.ok(editable);assert.equal(editable.nodes.find(n=>n.prop==='-webkit-touch-callout')?.value,'default');
 const saved=rules.find(n=>n.selector.includes('#summaryShareFallbackImage')&&n.nodes.some(d=>d.prop==='-webkit-touch-callout'&&d.value==='default'));assert.ok(saved);
});
