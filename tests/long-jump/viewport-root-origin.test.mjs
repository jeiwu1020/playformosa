import test from 'node:test';
import assert from 'node:assert/strict';
import {installViewportLayout} from '../../public/games/long-jump/layout.mjs';

// The iOS UI process is external to Node. Replay its observed geometry/events,
// including a scrollTo acknowledgement arriving after the requesting frame.
function fixture({standalone=true,scale=1}={}){
 const values=new Map(),attrs=new Map(),frames=[],requests=[];
 const target=()=>({events:new Map(),addEventListener(k,f){this.events.set(k,f);},removeEventListener(k){this.events.delete(k);},emit(k){this.events.get(k)?.();}});
 const vv=Object.assign(target(),{width:402,height:812,offsetLeft:0,offsetTop:0,pageTop:0,scale});
 const safe={paddingTop:'0',paddingRight:'0',paddingBottom:'34',paddingLeft:'0'};
 const probe={style:{},setAttribute(){},remove(){}};
 const doc={querySelector:()=>null,activeElement:{tagName:'BUTTON'},documentElement:{setAttribute:(k,v)=>attrs.set(k,v),style:{setProperty:(k,v)=>values.set(k,v)}},createElement:()=>probe,body:{appendChild(){}}};
 const win=Object.assign(target(),{innerWidth:402,innerHeight:812,scrollX:0,scrollY:0,navigator:{standalone},visualViewport:vv,matchMedia:q=>({matches:q==='(pointer: coarse)'}),getComputedStyle:()=>safe,requestAnimationFrame:f=>frames.push(f),scrollTo(...args){requests.push(args);}});
 const dispose=installViewportLayout(win,doc);
 function frame(){const pending=frames.splice(0);for(const f of pending)f();}
 function pan(y,event='scroll',where=win){win.scrollY=y;vv.offsetTop=y;vv.pageTop=y;where.emit(event);}
 function acknowledge(){win.scrollX=win.scrollY=vv.offsetLeft=vv.offsetTop=vv.pageTop=0;win.emit('scroll');vv.emit('scroll');frame();}
 return{win,vv,safe,doc,values,attrs,requests,frames,frame,pan,acknowledge,dispose};
}

test('late portrait root pan after an already-settled rotation returns to origin, then remeasures safe area',()=>{
 const h=fixture();assert.equal(h.requests.length,0);
 Object.assign(h.win,{innerWidth:874,innerHeight:402});Object.assign(h.vv,{width:874,height:402});Object.assign(h.safe,{paddingLeft:'62',paddingRight:'62',paddingTop:'0',paddingBottom:'20'});
 h.win.emit('resize');h.win.emit('orientationchange');h.vv.emit('resize');h.frame();assert.equal(h.attrs.get('data-layout'),'side');
 Object.assign(h.win,{innerWidth:402,innerHeight:812});Object.assign(h.vv,{width:402,height:812});Object.assign(h.safe,{paddingLeft:'0',paddingRight:'0',paddingTop:'62',paddingBottom:'34'});
 h.win.emit('resize');h.frame();assert.equal(h.values.get('--safe-top'),'62px');
 h.win.emit('orientationchange');h.frame();assert.equal(h.requests.length,0);
 // Trace: the pan arrives later, after resize and its first frame completed.
 h.pan(62);h.vv.emit('scroll');h.frame();assert.deepEqual(h.requests,[[{left:0,top:0,behavior:'instant'}]]);
 h.safe.paddingTop='0';h.acknowledge();assert.equal(h.win.scrollY,0);assert.equal(h.values.get('--visible-top'),'0px');assert.equal(h.values.get('--safe-top'),'0px');assert.equal(h.values.get('--visible-height'),'812px');assert.equal(h.requests.length,1);
 h.dispose();
});

test('focus and root-scroll events recover arbitrary excursions without waiting for another resize',()=>{
 const h=fixture();for(const [y,event] of [[37,'focusin'],[83,'scroll'],[44,'focus']]){h.pan(y,event);h.frame();assert.deepEqual(h.requests.at(-1),[{left:0,top:0,behavior:'instant'}]);h.acknowledge();assert.equal(h.values.get('--visible-top'),'0px');}
 assert.equal(h.requests.length,3);h.dispose();
});

test('a visual-only origin excursion also recovers at default scale and full viewport dimensions',()=>{
 const h=fixture();h.vv.offsetTop=47;h.vv.emit('scroll');h.frame();assert.deepEqual(h.requests,[[{left:0,top:0,behavior:'instant'}]]);h.acknowledge();assert.equal(h.values.get('--visible-top'),'0px');h.dispose();
});

test('ordinary browser scrolling and viewport offsets remain unchanged',()=>{
 const h=fixture({standalone:false});h.pan(62,'scroll',h.vv);h.frame();assert.equal(h.requests.length,0);assert.equal(h.win.scrollY,62);assert.equal(h.values.get('--visible-top'),'62px');h.dispose();
});

test('pinch zoom, editable focus and keyboard-sized visual viewports are not reset',()=>{
 for(const configure of [h=>h.vv.scale=1.02,h=>h.vv.scale=2,h=>h.doc.activeElement={tagName:'INPUT'},h=>h.doc.activeElement={tagName:'TEXTAREA'},h=>h.doc.activeElement={tagName:'SELECT'},h=>h.doc.activeElement={tagName:'DIV',isContentEditable:true},h=>h.vv.height=480]){
  const h=fixture();configure(h);h.pan(62,'scroll',h.vv);h.frame();assert.equal(h.requests.length,0);assert.equal(h.win.scrollY,62);h.dispose();
 }
});

test('resize timing differences wait for matching viewports before requesting origin recovery',()=>{
 const h=fixture();h.vv.height=402;h.pan(62,'resize');h.frame();assert.equal(h.requests.length,0);
 h.vv.height=812;h.vv.emit('resize');h.frame();assert.equal(h.requests.length,1);h.acknowledge();h.dispose();
});

test('coalesced events and ignored scroll requests cannot create a requestAnimationFrame retry loop',()=>{
 const h=fixture();h.pan(62);h.vv.emit('scroll');h.win.emit('focusin');assert.equal(h.frames.length,1);h.frame();assert.equal(h.requests.length,1);assert.equal(h.frames.length,0);
 h.win.emit('resize');h.dispose();h.frame();assert.equal(h.requests.length,1);assert.equal(h.win.events.size,0);assert.equal(h.vv.events.size,0);
});

test('ignored scrollTo and a persistent visual offset do not repeatedly force unchanged geometry',()=>{
 const h=fixture();h.pan(62);h.frame();assert.equal(h.requests.length,1);
 for(let i=0;i<5;i++){h.win.emit('scroll');h.vv.emit('scroll');h.win.emit('resize');h.frame();}
 assert.equal(h.requests.length,1,'ignored request: unchanged state must not be retried');
 // A partial acknowledgement is a different state; allow one correction only.
 h.win.scrollY=0;h.vv.emit('scroll');h.frame();assert.equal(h.requests.length,2);
 for(let i=0;i<5;i++){h.vv.emit('scroll');h.win.emit('focusin');h.frame();}
 assert.equal(h.requests.length,2,'persistent visual pan: no feedback loop');assert.equal(h.frames.length,0);
 h.acknowledge();h.pan(62);h.frame();assert.equal(h.requests.length,3,'a later fresh excursion is recoverable');h.dispose();
});

test('editable focus during a pending frame cancels recovery and later noneditable focus can recover',()=>{
 const h=fixture();h.pan(62);h.doc.activeElement={tagName:'TEXTAREA'};h.frame();assert.equal(h.requests.length,0);
 h.win.emit('focusin');h.frame();assert.equal(h.requests.length,0);h.doc.activeElement={tagName:'BUTTON'};h.win.emit('focusin');h.frame();assert.equal(h.requests.length,1);h.dispose();
});
