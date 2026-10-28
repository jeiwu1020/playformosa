import test from 'node:test';
import assert from 'node:assert/strict';
import {createInput,clearCapturedInput} from '../../public/games/long-jump/controls.mjs';
let api={};try{api=await import('../../public/games/long-jump/play-surface.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const send=(target,type,props={})=>{const event=Object.assign(new Event(type,{cancelable:true}),props);target.dispatchEvent(event);return event;};
function setup(name='protectPlaySurface'){assert.equal(typeof api[name],'function','Scoped long-press protection must exist');const surface=new EventTarget();api[name](surface);return surface;}
// Removing any native-default guard must expose selection/callouts without changing pointer input.
test('live play surface prevents selection, context menu, drag and touch defaults, never outside it',()=>{
 const surface=setup(),outside=new EventTarget();
 for(const type of ['selectstart','contextmenu','dragstart','touchstart','touchmove','touchend']){
  assert.equal(send(surface,type).defaultPrevented,true,type);assert.equal(send(outside,type).defaultPrevented,false,type);
 }
});
test('live guard preserves pointer cancellation, keyboard and assistive clicks and does not stop propagation',()=>{
 const surface=setup();
 for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','keydown','keyup','click','touchcancel'])assert.equal(send(surface,type).defaultPrevented,false,type);
 for(const type of ['touchstart','touchmove','touchend']){let seen=0;surface.addEventListener(type,()=>seen++);assert.equal(send(surface,type).cancelBubble,false);assert.equal(seen,1);}
});
// A blanket touch handler on ordinary buttons would break native click/share activation.
test('ordinary UI protection keeps native touch, click and focus while blocking long-press selection',()=>{
 const surface=setup('protectSelection');
 for(const type of ['selectstart','contextmenu','dragstart'])assert.equal(send(surface,type).defaultPrevented,true,type);
 for(const type of ['touchstart','touchmove','touchend','click','pointerdown','focus','keydown'])assert.equal(send(surface,type).defaultPrevented,false,type);
});
test('noncancelable notifications do not call preventDefault',()=>{
 const surface=setup();let calls=0;const event=new Event('touchstart');event.preventDefault=()=>calls++;surface.dispatchEvent(event);assert.equal(calls,0);
});
test('two fingers, cancellation and rotation cleanup still leave a fresh input after resume',()=>{
 const surface=setup(),input=createInput(),captured=new Set();
 const button={hasPointerCapture:id=>captured.has(id),releasePointerCapture(id){captured.delete(id);send(surface,'lostpointercapture',{pointerId:id});}};
 surface.addEventListener('pointerdown',event=>{input.pointer(event.pointerId,event.limb);captured.add(event.pointerId);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(input.endPointer(event.pointerId,type))clearCapturedInput(input,[button]);});
 send(surface,'pointerdown',{pointerId:7,limb:2});send(surface,'touchstart');send(surface,'pointerdown',{pointerId:8,limb:3});send(surface,'touchstart');assert.deepEqual(input.values,[false,false,true,true]);
 send(surface,'pointercancel',{pointerId:7});assert.deepEqual(input.values,[false,false,false,false]);
 clearCapturedInput(input,[button]);send(surface,'pointerdown',{pointerId:9,limb:2});assert.equal(input.values[2],true);send(surface,'pointerup',{pointerId:9});assert.deepEqual(input.values,[false,false,false,false]);
});
test('touch listeners explicitly opt out of passive handling and selection guards use capture',()=>{
 const registrations=[];api.protectPlaySurface({addEventListener(type,listener,options){registrations.push({type,listener,options});}});
 for(const type of ['touchstart','touchmove','touchend'])assert.equal(registrations.find(item=>item.type===type).options.passive,false,type);
 for(const type of ['selectstart','contextmenu','dragstart'])assert.equal(registrations.find(item=>item.type===type).options.capture,true,type);
});
