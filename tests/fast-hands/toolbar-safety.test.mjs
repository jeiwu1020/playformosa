import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';import {mountClub} from '../../public/games/fast-hands/club.mjs';
const flush=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture(mode){
 const dom=new JSDOM(readFileSync(new URL(`../../public/games/fast-hands/${mode}.html`,import.meta.url),'utf8'),{url:`https://qa.test/games/fast-hands/${mode}`,pretendToBeVisual:true});const w=dom.window,d=w.document,$=id=>d.getElementById(id);let now=0,frame,club;const destinations=[];
 w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 const app=mountLevel({document:d,window:w,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:()=>null,clubFactory:opts=>(club=mountClub({...opts,onNavigate:url=>destinations.push(url)})),sharingFactory:()=>({prepare(){},reset(){},destroy(){}}),imageCapture:()=>Promise.reject(Error('no pixels needed')),soundFactory:()=>({unlock(){},cue(){},destroy(){}})});
 const tick=t=>{while(now+100<t){now+=100;frame(now)}now=t;frame(now)};
 return{w,d,$,app,club,destinations,tick,get now(){return now},click:id=>$(id).click(),formal(){this.click('roundButton');this.click('actionButton');tick(now+1700);this.click('roundButton')},win(){tick(app.state.readyAt);tick(mode==='catch'?app.state.targetAt:now+100);this.click('actionButton')},switch(){d.querySelector('.level-switch a[data-club-mode="duck"]').click()},close(){app.destroy();w.close()}};
}

test('all three pages place the only in-progress restart in the same upper toolbar slot',()=>{
 for(const file of ['index','catch','duel']){
  const d=new JSDOM(readFileSync(new URL(`../../public/games/fast-hands/${file}.html`,import.meta.url),'utf8')).window.document;
  assert.deepEqual([...d.querySelectorAll('header .header-tools button')].map(b=>b.textContent.trim()),['重來','排行','設定','玩法']);
  const id=file==='index'?'retry':'restartButton',restart=d.getElementById(id);
  assert.equal(restart.closest('.club-toolbar .header-tools'),d.querySelector('.club-toolbar .header-tools'));
  assert.match(restart.getAttribute('aria-label'),/重新開始/);
  assert.equal(d.querySelector(`.actions #${id}, .level-controls #${id}`),null);
  assert.ok(d.querySelector(file==='index'?'.actions #play':'.primary-control #roundButton'),'real primary action remains below gameplay');
  assert.ok(d.querySelector(file==='index'?'#resultDialog #resultAgain':'#summary #summaryAgain'),'result retry stays inside its completed ticket');
  if(file!=='index')assert.ok(d.querySelector('#summary details #summaryPractice'),'completed result practice stays in details');
  assert.doesNotMatch(d.body.textContent,/測試榜|測試排行榜|FAST HANDS · QA/);
 }
});
for(const mode of ['catch','duel'])for(const phase of ['waiting','live','feedback','paused'])test(`${mode} upper Restart preserves the existing reset-to-practice outcome from ${phase}`,()=>{
 const h=fixture(mode);try{
  h.formal();h.win();h.tick(h.now+1700);
  if(phase!=='feedback'){h.click('roundButton');if(phase==='live')h.tick(h.app.state.readyAt);if(phase==='paused')h.w.dispatchEvent(new h.w.Event('blur'));}
  assert.equal(h.app.state.phase,phase);assert.equal(h.app.state.practice,false);assert.equal(h.app.state.results.length,1);
  const restart=h.d.querySelector('.club-toolbar .header-tools #restartButton');assert.ok(restart,'Restart is reached from the upper toolbar');restart.click();
  assert.equal(h.app.state.phase,'idle');assert.equal(h.app.state.practice,true);assert.equal(h.app.state.results.length,0);assert.equal(h.$('summary').open,false);assert.equal(h.d.activeElement,h.$('roundButton'));
  h.tick(h.now+5000);assert.equal(h.app.state.phase,'idle','restart never starts another round automatically');
 }finally{h.close()}
});
for(const mode of ['catch','duel'])test(`${mode} lower practice reset is hidden during idle, live, feedback and pause but remains a completed-result choice`,()=>{
 const h=fixture(mode);try{
  assert.equal(h.$('practiceButton').hidden,true);h.formal();assert.equal(h.$('practiceButton').hidden,true);
  h.tick(h.app.state.readyAt);assert.equal(h.$('practiceButton').hidden,true);h.tick(mode==='catch'?h.app.state.targetAt:h.now+100);h.click('actionButton');h.tick(h.now+1700);
  assert.equal(h.app.state.phase,'feedback');assert.equal(h.$('practiceButton').hidden,true,'between-round feedback cannot offer accidental reset');assert.equal(h.$('roundButton').hidden,false,'next round stays available');
  h.click('roundButton');h.w.dispatchEvent(new h.w.Event('blur'));assert.equal(h.app.state.phase,'paused');assert.equal(h.$('practiceButton').hidden,true,'paused run cannot offer accidental reset');
  h.click('roundButton');h.click('actionButton');h.tick(h.now+1700);
  if(mode==='duel')for(let round=2;round<10;round++){h.click('roundButton');h.click('actionButton');h.tick(h.now+1700);}
  assert.equal(h.app.state.phase,'done');assert.equal(h.$('practiceButton').hidden,false,'completed state keeps its existing choice');assert.ok(h.$('summaryPractice').closest('#summary'));
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const tool of ['headerRanking','headerSettings','openMenu']){
 test(`${mode} ${tool} pauses immediately and requires explicit retry after close`,async()=>{
  const h=fixture(mode);try{
   h.formal();h.win();h.tick(h.now+1700);h.click('roundButton');h.tick(h.app.state.readyAt);
   const results=h.app.state.results;
   assert.ok(h.$(tool),'toolbar button exists');h.click(tool);
   assert.equal(h.app.state.phase,'paused');assert.equal(h.app.state.results,results);
   h.tick(h.now+5000);h.click('actionButton');assert.equal(h.app.state.phase,'paused');
   const dialog=h.d.querySelector('dialog[open]');assert.ok(dialog);
   dialog.close();await flush();assert.equal(h.app.state.phase,'paused');
   assert.equal(h.d.activeElement,h.$('roundButton'));
   h.click('roundButton');assert.equal(h.app.state.phase,'waiting');assert.equal(h.app.state.results,results);
  }finally{h.close()}
 });
}
for(const mode of ['catch','duel'])for(const tool of ['headerRanking','headerSettings','openMenu'])for(const replay of [false,true]){
 test(`${mode} ${tool} restores completed result after ${replay?'replay':'result'} without changing state`,async()=>{
  const h=fixture(mode);try{
   h.formal();for(let i=0;i<(mode==='catch'?1:10);i++){h.click('actionButton');h.tick(h.now+1700);if(mode==='duel'&&i<9)h.click('roundButton');}
   const state=h.app.state;assert.equal(state.phase,'done');assert.equal(h.$('summary').open,true);
   if(replay)h.click('summaryReplay');
   h.click(tool);assert.equal(h.$('summary').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);
   h.tick(h.now+5000);assert.equal(h.app.state,state);
   h.d.querySelector('dialog[open]').close();await flush();
   assert.equal(h.$('summary').open,true);assert.equal(h.$('summary').hidden,false);assert.equal(h.d.activeElement,h.$('summaryReplay'));
   assert.equal(h.app.state,state);assert.equal(h.d.body.dataset.replay,'false');
  }finally{h.close()}
 });
}
for(const mode of ['catch','duel'])for(const tool of ['headerRanking','headerSettings','openMenu'])test(`${mode} ${tool} closing held keyboard cannot leak a retry`,async()=>{
 const h=fixture(mode);try{
  h.click('roundButton');h.click(tool);const state=h.app.state;
  const d=h.d.querySelector('dialog[open]');
  d.dispatchEvent(new h.w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,code:'Enter',key:'Enter'}));d.close();
  h.click('roundButton');h.click('actionButton');assert.equal(h.app.state,state);
  h.$('roundButton').dispatchEvent(new h.w.KeyboardEvent('keyup',{bubbles:true,cancelable:true,code:'Enter',key:'Enter'}));await flush();
  assert.equal(h.app.state,state);h.click('roundButton');assert.equal(h.app.state.phase,'waiting');
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const tool of ['headerRanking','headerSettings','openMenu'])test(`${mode} BFCache while ${tool} is open releases the overlay but never resumes the round`,async()=>{
 const h=fixture(mode);try{
  h.click('roundButton');h.click(tool);const state=h.app.state;assert.equal(state.phase,'paused');
  for(const type of ['pagehide','pageshow'])h.w.dispatchEvent(new h.w.PageTransitionEvent(type,{persisted:true}));
  await flush();assert.equal(h.club.blocked(),false);assert.equal(h.app.state,state);assert.equal(h.d.querySelectorAll('dialog[open]').length,0);assert.equal(h.d.activeElement,h.$('roundButton'));
  h.click('roundButton');assert.equal(h.app.state.phase,'waiting');
 }finally{h.close()}
});
