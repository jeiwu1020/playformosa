import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{JSDOM}from'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
const html=mode=>readFileSync(new URL(mode==='duel'?'duel.html':'catch.html',root),'utf8');
function harness(mode='catch'){
 const dom=new JSDOM(html(mode),{url:`https://game.test/games/fast-hands/${mode}.html`,pretendToBeVisual:true});let now=0,frame;
 const app=mountLevel({document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{frame=null;},stageLoader:async()=>null});
 const $=id=>dom.window.document.getElementById(id);
 return {dom,app,$,step(ms){now+=ms;frame?.(now);},elapse(ms){now+=ms;},at(value){now=value;frame?.(now);},click(id){$(id).click();},get now(){return now;},pointer(type='mouse',primary=true,button=0){const e=new dom.window.Event('pointerdown',{bubbles:true,cancelable:true});Object.assign(e,{pointerType:type,isPrimary:primary,button});$('actionButton').dispatchEvent(e);},key(key='Space',repeat=false){const e=new dom.window.KeyboardEvent('keydown',{code:key,key:key==='Space'?' ':key,bubbles:true,cancelable:true,repeat});$('actionButton').dispatchEvent(e);}};
}
test('every level has three direct accessible links and the original entry and result can switch',()=>{
 for(const file of ['index.html','catch.html','duel.html']){
  const doc=new JSDOM(readFileSync(new URL(file,root),'utf8')).window.document;
  for(const nav of doc.querySelectorAll('.level-switch')){
   assert.equal(nav.querySelectorAll('a').length,3);assert.equal(nav.querySelectorAll('[aria-current="page"]').length,1);
   assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')),['./','catch.html','duel.html']);
  }
  assert.ok(doc.querySelector('.level-switch'));
  if(file==='index.html')for(const id of ['entryDialog','resultDialog'])assert.ok(doc.querySelector(`#${id} .level-switch`));
 }
});
test('new levels clearly name the AI, the foam toy and local-only scores without ranking API',()=>{
 assert.match(html('catch'),/泡棉/);assert.match(html('catch'),/虛構接彈遊戲/);assert.match(html('duel'),/AI 虛擬對手/);
 for(const mode of ['catch','duel']){const doc=new JSDOM(html(mode)).window.document;
  assert.equal(doc.querySelector('#actionButton').tagName,'BUTTON');assert.equal(doc.querySelector('#actionButton').type,'button');
  assert.equal(doc.querySelector('#roundStatus').getAttribute('aria-live'),'polite');
  assert.ok(doc.querySelector('noscript'));assert.equal(doc.querySelectorAll('[id]').length,new Set([...doc.querySelectorAll('[id]')].map(e=>e.id)).size);
 }
 const source=readFileSync(new URL('levels-app.mjs',root),'utf8');assert.doesNotMatch(source,/fetch\(|localStorage|leaderboard\.mjs|saveBest/);
});
test('practice happens first, then a fresh survival match starts',()=>{
 const h=harness();assert.match(h.$('roundButton').textContent,/練習/);h.click('roundButton');assert.equal(h.app.state.practice,true);
 h.pointer();assert.equal(h.app.state.phase,'done');assert.match(h.$('roundButton').textContent,/逐關/);
 h.click('roundButton');assert.equal(h.app.state.practice,false);assert.equal(h.app.state.results.length,0);assert.equal(h.app.state.phase,'waiting');h.app.destroy();
});
test('repeated pointer, synthesized click and held keyboard cannot count twice or enter next round',()=>{
 const h=harness('duel');h.click('roundButton');h.pointer();const first=h.app.state;h.pointer();h.click('actionButton');h.key('Space',true);
 assert.equal(h.app.state,first);assert.equal(first.results.length,1);h.app.destroy();
});
test('non-primary and secondary mouse inputs are ignored, Space is a valid single action',()=>{
 const h=harness('duel');h.click('roundButton');h.pointer('touch',false);h.pointer('mouse',true,2);assert.equal(h.app.state.results.length,0);
 h.key();assert.equal(h.app.state.results[0].reason,'early');h.app.destroy();
});
test('blur pauses and resume retries current round without scoring or stale callbacks',()=>{
 const h=harness();h.click('roundButton');h.dom.window.dispatchEvent(new h.dom.window.Event('blur'));
 assert.equal(h.app.state.phase,'paused');assert.match(h.$('roundStatus').textContent,/暫停/);h.step(5000);assert.equal(h.app.state.results.length,0);
 h.click('roundButton');assert.equal(h.app.state.phase,'waiting');assert.ok(h.app.state.readyAt>h.now);h.app.destroy();
});
test('an observed long frame gap pauses a live round and preserves the score',()=>{
 const h=harness();h.click('roundButton');h.at(h.app.state.readyAt);assert.equal(h.app.state.phase,'live');h.step(500);
 assert.equal(h.app.state.phase,'paused');assert.equal(h.app.state.results.length,0);h.app.destroy();
});
test('input received before a delayed frame pauses instead of scoring an unseen loss',()=>{
 const h=harness('duel');h.click('roundButton');h.at(h.app.state.readyAt);h.elapse(600);h.pointer();
 assert.equal(h.app.state.phase,'paused');assert.equal(h.app.state.results.length,0);h.step(1);assert.equal(h.app.state.phase,'paused');h.app.destroy();
});
test('real live catch flow scores a timed touch and a later missed shot',()=>{
 const h=harness();h.click('roundButton');h.at(h.app.state.readyAt);for(let i=0;i<3;i++)h.step(200);h.step(50);h.pointer('touch');
 assert.equal(h.app.state.results[0].winner,'player');assert.match(h.$('roundStatus').textContent,/接住/);h.click('roundButton');h.at(h.app.state.readyAt);for(let i=0;i<5;i++)h.step(200);
 assert.equal(h.app.state.results[0].reason,'miss');assert.equal(h.$('opponentScore').textContent,'1');assert.equal(h.app.state.phase,'done');h.app.destroy();
});
test('a live duel scores a keyboard win, AI timeout and late player action correctly',()=>{
 const h=harness('duel');h.click('roundButton');h.at(h.app.state.readyAt);h.step(100);h.key();assert.equal(h.app.state.results[0].winner,'player');
 h.click('roundButton');h.at(h.app.state.readyAt);h.step(200);h.step(200);assert.equal(h.app.state.results[0].winner,'ai');
 h.click('roundButton');h.at(h.app.state.readyAt);h.step(200);h.elapse(121);h.pointer();assert.equal(h.app.state.results[1].winner,'ai');assert.equal(h.app.state.results[1].playerMs,321);h.app.destroy();
});
test('a full duel displays all ten changing items and ten scores with no extra round',()=>{
 const h=harness('duel');h.click('roundButton');h.pointer();h.click('roundButton');const items=[];
 for(let i=0;i<10;i++){
  items.push(h.$('itemName').textContent);h.pointer();if(i<9)h.click('roundButton');
 }
 assert.equal(h.app.state.phase,'done');assert.equal(new Set(items).size,10);assert.equal(h.$('roundResults').children.length,10);assert.match(h.$('summaryTitle').textContent,/快手王/);assert.equal(h.$('summary').hidden,false);
 h.click('restartButton');assert.equal(h.app.state.phase,'idle');assert.equal(h.app.state.results.length,0);h.app.destroy();
});
