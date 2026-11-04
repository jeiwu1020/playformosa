import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../../src/catalog.mjs';
import {renderPage} from '../../src/render.mjs';
import {mountClub} from '../../public/games/fast-hands/club.mjs';

const root=new URL('../../public/games/fast-hands/',import.meta.url);
const modes={duck:{id:'fast-hands',name:'鴨沒漏補',file:'index.html',href:'/games/fast-hands/?intro=1',image:'/assets/fast-hands-card-v2.webp'},catch:{id:'fast-hands-catch',name:'玩具彈接接樂',file:'catch.html',href:'/games/fast-hands/catch.html?intro=1',image:'/games/fast-hands/assets/intro-catch-generated.webp'},duel:{id:'fast-hands-duel',name:'十回合對決',file:'duel.html',href:'/games/fast-hands/duel.html?intro=1',image:'/games/fast-hands/assets/intro-duel-generated.webp'}};
function fixture(mode,{seen=false,query=''}={}){
 const info=modes[mode],dom=new JSDOM(readFileSync(new URL(info.file,root),'utf8'),{url:`https://qa.test/games/fast-hands/${mode==='duck'?'':info.file}${query}`,pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 if(seen)w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 let starts=0;const nav=[];const club=mountClub({document:d,window:w,mode,onStart:()=>starts++,onNavigate:href=>nav.push(href)});
 return {d,w,club,nav,get starts(){return starts},close(){club.destroy();w.close()}};
}
test('homepage has exactly three distinct Fast Hands cards with separate count keys and existing cover art',()=>{
 const dom=new JSDOM(renderPage(catalog,{channel:'preview'}));try{const d=dom.window.document;for(const row of Object.values(modes)){const item=catalog.minigames.find(g=>g.id===row.id);assert.ok(item,row.id);assert.equal(item.title,'快手王｜'+row.name);assert.equal(item.href,row.href);assert.equal(item.image,row.image);const count=d.querySelector(`[data-play-count="${row.id}"]`);assert.ok(count);const card=count.closest('.game-card');assert.equal(card.querySelector('a.game-cta').getAttribute('href'),row.href);assert.equal(card.querySelector('img').getAttribute('src'),row.image);}assert.equal(catalog.minigames.filter(g=>g.id.startsWith('fast-hands')).length,3)}finally{dom.window.close()}
});
for(const [mode,row]of Object.entries(modes))test(`${mode} direct entrance presents only its own large illustrated introduction and stays in that game`,()=>{
 const f=fixture(mode);try{const intro=f.d.getElementById('entryDialog');assert.equal(intro.open,true);assert.equal(intro.querySelectorAll('.club-card').length,1);assert.equal(intro.querySelector('h3').textContent,row.name);assert.match(f.d.getElementById('entryTitle').textContent,new RegExp(row.name));assert.ok(intro.querySelector('img').alt.length>8);assert.equal(f.starts,0);f.d.getElementById('entryStart').click();assert.equal(f.starts,1);assert.deepEqual(f.nav,[]);assert.equal(intro.open,false)}finally{f.close()}
});
for(const mode of Object.keys(modes))test(`${mode} homepage intent shows its own intro even after a previous club visit`,()=>{
 const f=fixture(mode,{seen:true,query:'?intro=1&view=front#kept'});try{assert.equal(f.d.getElementById('entryDialog').open,true);assert.equal(f.w.location.search,'?view=front');assert.equal(f.w.location.hash,'#kept');assert.equal(f.starts,1);f.d.getElementById('entryStart').click();assert.equal(f.starts,1,'reentering intro must not reset initialized gameplay');assert.deepEqual(f.nav,[])}finally{f.close()}
});
test('in-club continuation and previously seen entrances do not repeat a forced introduction',()=>{
 for(const opts of [{seen:true},{query:'?club=1'}]){const f=fixture('duel',opts);try{assert.equal(f.d.getElementById('entryDialog').open,false);assert.equal(f.starts,1)}finally{f.close()}}
});
test('reopening mode help and pressing Start does not navigate to duck or restart an active match',()=>{
 const f=fixture('duel',{seen:true});try{f.d.getElementById('openMenu').click();assert.equal(f.d.getElementById('entryDialog').open,true);f.d.getElementById('entryStart').click();assert.equal(f.starts,1);assert.deepEqual(f.nav,[]);assert.equal(f.club.navigationPending(),false)}finally{f.close()}
});
test('homepage renderer rejects arbitrary nested routes, query injection and wrong-mode artwork',()=>{
 for(const patch of [{href:'/games/fast-hands/other.html?intro=1'},{href:'/games/fast-hands/catch.html?intro=1&redirect=evil'},{href:'https://evil.test/games/fast-hands/catch.html?intro=1'},{image:'/games/fast-hands/assets/other.webp'}]){
  const clone={...catalog,minigames:[{...catalog.minigames.find(g=>g.id==='fast-hands'),id:'fast-hands-catch',href:modes.catch.href,image:modes.catch.image,...patch}]};assert.throws(()=>renderPage(clone,{channel:'preview'}));
 }
});
