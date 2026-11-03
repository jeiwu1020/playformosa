import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const page=new URL('../../public/games/reaction-rod/index.html',import.meta.url);
// Real document, CSS cascade and viewport adapter. JSDOM has no iOS UI process:
// viewport geometry and scroll acknowledgements below are explicit replay inputs.
function fixture({standalone=true}={}){
 const dom=new JSDOM(fs.readFileSync(page,'utf8'),{runScripts:'outside-only',url:'https://example.test/games/reaction-rod/'});
 const win=dom.window,doc=win.document,frames=[],requests=[];
 for(const link of doc.querySelectorAll('link[rel="stylesheet"]')){
  const style=doc.createElement('style');style.textContent=fs.readFileSync(new URL(link.getAttribute('href'),page),'utf8');doc.head.append(style);
 }
 const vv=Object.assign(new win.EventTarget(),{width:390,height:844,offsetLeft:0,offsetTop:0,scale:1});
 Object.defineProperty(win,'visualViewport',{value:vv});
 Object.defineProperty(win.navigator,'standalone',{value:standalone});
 Object.assign(win,{innerWidth:390,innerHeight:844,scrollX:0,scrollY:0});
 win.matchMedia=q=>({matches:q==='(pointer: coarse)'});
 win.requestAnimationFrame=f=>{frames.push(f);return frames.length;};
 win.scrollTo=options=>requests.push(options);
 // Only standalone page-level viewport scripts execute here. game.mjs is covered
 // by ui.test.mjs with real physics/Three math and a documented GPU boundary.
 for(const script of doc.querySelectorAll('script[type="module"][src]')){
  if(script.getAttribute('src')==='./game.mjs')continue;
  const source=fs.readFileSync(new URL(script.getAttribute('src'),page),'utf8');
  win.eval(source.replace(/^export /gm,''));
 }
 const emit=(target,type)=>target.dispatchEvent(new win.Event(type));
 const frame=()=>{for(const f of frames.splice(0))f();};
 const value=name=>doc.documentElement.style.getPropertyValue(name);
 return{win,doc,vv,frames,requests,emit,frame,value,close:()=>dom.window.close()};
}

test('desktop bottom hints retain padding inside the rounded game card after all platform styles',()=>{
 const h=fixture(),css=h.win.getComputedStyle(h.doc.querySelector('.bottomline'));
 assert.ok(parseFloat(css.paddingLeft)>=16,'left hint must clear rounded card edge');
 assert.ok(parseFloat(css.paddingRight)>=16,'progress must clear rounded card edge');
 assert.ok(parseFloat(css.paddingBottom)>=8,'second hint line needs bottom breathing room');
 h.close();
});

test('game shell stays fixed to measured viewport instead of becoming a second scroll container',()=>{
 const h=fixture(),css=h.win.getComputedStyle(h.doc.querySelector('.shell'));
 assert.equal(css.position,'fixed');assert.equal(css.overflow,'clip');
 assert.equal(h.value('--visible-width'),'390px');assert.equal(h.value('--visible-height'),'844px');
 h.close();
});

test('Rod page recovers delayed standalone root pan on repeated portrait landscape portrait cycles',()=>{
 const h=fixture();
 for(let cycle=0;cycle<3;cycle++){
  Object.assign(h.win,{innerWidth:844,innerHeight:390});Object.assign(h.vv,{width:844,height:390});
  h.emit(h.win,'orientationchange');h.emit(h.vv,'resize');h.frame();
  assert.equal(h.value('--visible-height'),'390px');
  Object.assign(h.win,{innerWidth:390,innerHeight:844});Object.assign(h.vv,{width:390,height:844});
  h.emit(h.win,'orientationchange');h.emit(h.win,'resize');h.frame();
  h.win.scrollY=62;h.vv.offsetTop=62;h.emit(h.vv,'scroll');h.emit(h.win,'focusin');h.frame();
  assert.equal(h.requests.length,cycle+1);assert.equal(h.requests.at(-1).top,0);
  h.win.scrollY=0;h.vv.offsetTop=0;h.emit(h.win,'scroll');h.emit(h.vv,'scroll');h.frame();
  assert.equal(h.value('--visible-top'),'0px');assert.equal(h.value('--visible-height'),'844px');
 }
 h.close();
});

test('viewport recovery does not fight ordinary browser, pinch zoom, keyboard or copy textarea focus',()=>{
 for(const kind of ['browser','pinch','keyboard','textarea']){
  const h=fixture({standalone:kind!=='browser'});
  if(kind==='pinch')h.vv.scale=2;
  if(kind==='keyboard')h.vv.height=480;
  if(kind==='textarea')h.doc.getElementById('copyText').focus();
  h.win.scrollY=47;h.vv.offsetTop=47;h.emit(h.vv,'scroll');h.frame();
  assert.equal(h.requests.length,0,kind);assert.equal(h.win.scrollY,47,kind);
  h.close();
 }
});

test('foreground restoration recovers a shifted origin without another resize',()=>{
 const h=fixture();h.win.scrollY=37;h.vv.offsetTop=37;h.emit(h.win,'pageshow');h.frame();
 assert.equal(h.requests.length,1);assert.equal(h.requests[0].top,0);h.close();
});
