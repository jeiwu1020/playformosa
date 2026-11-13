import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';

// Regression: a catalog entry with the old arrow/long label, or a changed home
// destination, must fail even if its individual game tests do not cover headers.
const fastHands=new Set(['fast-hands','fast-hands-catch','fast-hands-duel']);
for(const entry of [...catalog.games,...catalog.minigames].filter(e=>e.status==='available')){
 test(`${entry.id}: concise home label retains its native accessible platform link`,()=>{
  const path=new URL(entry.href,'https://playformosa.test').pathname;
  const file='public'+path+(path.endsWith('/')?'index.html':'');
  let html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  if(entry.id==='overtime-pinball'){
   const shell=new JSDOM(html);const iframe=shell.window.document.querySelector('iframe');
   assert.ok(iframe,'pinball retains its original iframe shell');
   assert.equal(iframe.id,'gameWindow');
   assert.equal(shell.window.document.querySelector('script[src="./viewport-shell.js"]').type,'module');
   const boot=readFileSync(new URL('../public/games/overtime-pinball/viewport-shell.js',import.meta.url),'utf8');
   assert.match(boot,/const url=new URL\('\.\/game\.html',location\.href\);url\.search=location\.search;frame\.src=url\.href;/);
   const target=new URL('./game.html',new URL(path,'https://playformosa.test'));
   assert.equal(target.origin,'https://playformosa.test');assert.equal(target.pathname,'/games/overtime-pinball/game.html');
   html=readFileSync(new URL('../public'+target.pathname,import.meta.url),'utf8');shell.window.close();
  }
  const dom=new JSDOM(html);
  try{
   const links=dom.window.document.querySelectorAll('header a.pf-home, header a.home-link');
   assert.equal(links.length,1,'one unambiguous platform home control');
   const link=links[0];
   assert.equal(link.textContent.trim(),entry.id==='overtime-pinball'?'返回遊戲平台':'首頁','exact approved platform label');
   assert.equal(link.getAttribute('href'),fastHands.has(entry.id)?'/#minigames':'/','existing destination is preserved');
   assert.equal(link.getAttribute('aria-label'),entry.id==='overtime-pinball'?'返回遊戲平台':fastHands.has(entry.id)?'返回小遊戲首頁':'遊戲首頁','existing screen-reader destination remains');
   if(entry.id==='overtime-pinball')assert.equal(link.getAttribute('target'),'_top','home exits the iframe');
   assert.equal(link.tabIndex,0,'native keyboard-focusable link');
   assert.equal(link.getAttribute('aria-hidden'),null);
   assert.equal(link.querySelector('svg,img'),null,'no supplemental visible icon');
  }finally{dom.window.close()}
 });
}
test('the separate feel-test return still leads to its game instead of the platform',()=>{
 const dom=new JSDOM(readFileSync(new URL('../public/games/fast-hands-test/index.html',import.meta.url),'utf8'));
 const link=dom.window.document.getElementById('returnGame');
 assert.equal(link.textContent,'回到原遊戲 ↗');assert.equal(link.getAttribute('href'),'../fast-hands/catch.html');dom.window.close();
});
test('the two-character home control keeps the common 44px minimum touch width',()=>{
 const html=readFileSync(new URL('../public/games/sprint-100m/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://playformosa.test/games/sprint-100m/'}),style=dom.window.document.createElement('style');
 style.textContent=readFileSync(new URL('../public/games/shared/game-ui.css',import.meta.url),'utf8');dom.window.document.head.append(style);
 const home=dom.window.document.querySelector('.pf-home'),computed=dom.window.getComputedStyle(home);
 assert.equal(computed.minWidth,'44px','shorter labels must not shrink the touch target');assert.equal(computed.minHeight,'44px');dom.window.close();
});
