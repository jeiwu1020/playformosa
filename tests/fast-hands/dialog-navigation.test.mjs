import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountLevel} from '../../public/games/fast-hands/levels-app.mjs';
import {mountClub} from '../../public/games/fast-hands/club.mjs';
const drain=()=>new Promise(resolve=>setTimeout(resolve,10));
function fixture(mode,{seen=true,queued=false,forcedIntro=false}={}){
 const dom=new JSDOM(readFileSync(new URL(`../../public/games/fast-hands/${mode}.html`,import.meta.url),'utf8'),{url:`https://qa.test/games/fast-hands/${mode}${forcedIntro?'?intro=1':''}`,pretendToBeVisual:true});const w=dom.window,d=w.document,$=id=>d.getElementById(id),closes=[],requests=[];let now=0,frame,club;
 if(seen)w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;const fire=()=>this.dispatchEvent(new w.Event('close'));if(queued)closes.push(fire);else fire()};
 w.fetch=async(url,options={})=>{requests.push({url,options});return{ok:true,status:200,json:async()=>url.includes('submissions')?{accepted:true,bestUpdated:true}:{game:`fast-hands-${mode}`,rules:mode==='catch'?'cleared-levels-v1':'ten-round-wins-v1',unit:mode==='catch'?'levels':'wins',entries:[],own:null}}};
 const app=mountLevel({document:d,window:w,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:()=>null,clubFactory:opts=>(club=mountClub(opts)),sharingFactory:()=>({prepare(){},reset(){},destroy(){}}),imageCapture:()=>Promise.reject(Error('No pixels needed'))});
 const tick=t=>{while(now+100<t){now+=100;frame(now)}now=t;frame(now)};
 const h={w,d,$,app,club,requests,tick,get now(){return now},click(id){assert.ok($(id),`${mode}: ${id} exists`);$(id).click()},flushClose(){for(const fire of closes.splice(0))fire()},formal(){this.click('roundButton');this.click('actionButton');tick(now+1700);this.click('roundButton')},win(){tick(app.state.readyAt);tick(mode==='catch'?app.state.targetAt:now+100);this.click('actionButton')},finish(){this.formal();if(mode==='catch'){this.win();tick(now+1700);this.click('roundButton');this.click('actionButton');tick(now+1700)}else for(let i=0;i<10;i++){this.win();tick(now+1700);if(i<9)this.click('roundButton')}},close(){app.destroy();w.close()}};return h;
}
const children=[['entryRanking','levelRankingDialog','levelRankingReturn'],['entrySettings','settingsDialog','settingsClose']];
for(const mode of ['catch','duel'])for(const [trigger,id,back] of children)for(const queued of [false,true])test(`${mode} seen forced intro opens ${trigger} and returns without restarting (${queued?'queued':'immediate'} close)`,async()=>{
 const h=fixture(mode,{seen:true,forcedIntro:true,queued});try{
  const state=h.app.state;assert.equal(h.$('entryDialog').open,true);assert.equal(h.club.seen,true);assert.equal(h.$('entryClose').hidden,false);assert.equal(h.w.location.search,'');
  for(let i=0;i<2;i++){
   h.click(trigger);h.flushClose();assert.equal(h.$(id).open,true,'the forced Help child must open');assert.equal(h.$('entryDialog').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);
   h.click('roundButton');h.click('restartButton');h.tick(h.now+2000);assert.equal(h.app.state,state,'a child dialog must not restart the existing practice');
   assert.equal(h.$(back).textContent,'返回玩法');h.click(back);h.flushClose();await drain();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.activeElement,h.$(trigger));assert.equal(h.app.state,state);
  }
  h.click('entryStart');h.flushClose();await drain();assert.equal(h.club.blocked(),false);assert.equal(h.d.querySelectorAll('dialog[open]').length,0);assert.equal(h.app.state,state,'dismissing an already-seen Help must not initialize practice again');assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
  h.click('roundButton');assert.equal(h.app.state.phase,'waiting');
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const [trigger,id,back] of children)for(const queued of [false,true])test(`${mode} first-entry ${trigger} returns to its unchanged Help before explicit Start (${queued?'native queued':'immediate'} close)`,async()=>{
 const h=fixture(mode,{seen:false,queued});try{
  const state=h.app.state;assert.equal(h.$('entryDialog').open,true);
  for(let i=0;i<2;i++){
   h.click(trigger);h.flushClose();assert.equal(h.$(id).open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.$('entryDialog').open,false);
   h.click('roundButton');h.click('actionButton');h.tick(h.now+5000);assert.equal(h.app.state,state);
   assert.equal(h.$(back).textContent,'返回玩法');h.click(back);h.flushClose();await drain();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.activeElement,h.$(trigger));assert.equal(h.$('entryClose').hidden,false);assert.equal(h.club.seen,false);assert.equal(h.app.state,state);
  }
  h.click('entryStart');h.flushClose();await drain();assert.equal(h.$('entryDialog').open,false);assert.equal(h.app.state,state);assert.equal(h.club.blocked(),false);h.click('roundButton');assert.equal(h.app.state.phase,'waiting');assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const [trigger,id,back] of children)for(const view of ['paused','result','replay'])test(`${mode} Help ${trigger} preserves ${view}, sound, frozen score and one dialog through repeated child returns`,async()=>{
 const h=fixture(mode,{queued:true});try{
  if(view==='paused'){h.formal();h.win();h.tick(h.now+1700);h.click('roundButton');h.tick(h.app.state.readyAt)}else{h.finish();assert.equal(h.$('summary').open,true);if(view==='replay')h.click('summaryReplay')}
  h.click('openMenu');h.flushClose();const state=h.app.state,score=h.$('summaryScore').textContent;
  for(let i=0;i<2;i++){
   h.click(trigger);h.flushClose();assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.$(id).open,true);assert.equal(h.$('summary').open,false);
   if(trigger==='entrySettings'){h.click('soundToggle');assert.equal(h.$('soundToggle').getAttribute('aria-pressed'),String(i===0))}
   else if(view!=='paused'){h.click('levelRankingUploadButton');assert.equal(h.$('levelRankingUpload').hidden,false);h.click('levelRankingBack');assert.equal(h.$('levelRankingBoard').hidden,false);assert.equal(h.$(back).textContent,'返回玩法')}
   h.click('roundButton');h.click('actionButton');h.tick(h.now+5000);assert.equal(h.app.state,state);
   h.click(back);h.flushClose();await drain();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.activeElement,h.$(trigger));assert.equal(h.$('summary').open,false);
  }
  h.click('entryClose');h.flushClose();await drain();assert.equal(h.app.state,state);assert.equal(h.$('summaryScore').textContent,score);assert.equal(h.d.body.dataset.replay,'false');
  if(view==='paused'){assert.equal(state.phase,'paused');assert.equal(h.d.querySelectorAll('dialog[open]').length,0);h.click('roundButton');assert.equal(h.app.state.phase,'waiting')}else{assert.equal(h.$('summary').open,true);assert.equal(h.d.activeElement,h.$('summaryReplay'));h.click('summaryUpload');assert.equal(h.$('summaryUploadHost').hidden,false);assert.equal(h.$('levelRankingSubmit').disabled,false)}
  assert.equal(h.requests.filter(r=>r.options.method==='POST'&&r.url.includes('leaderboard')).length,0);
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const [trigger,id] of children)test(`${mode} Help ${trigger} tolerates obsolete close, native Escape, held release and BFCache`,async()=>{
 const h=fixture(mode);try{
  h.click('roundButton');h.click('openMenu');h.click(trigger);h.$('entryDialog').dispatchEvent(new h.w.Event('close'));assert.equal(h.$(id).open,true);assert.equal(h.club.blocked(),true);
  // Model the browser's default Escape action: cancel followed by native close.
  h.$(id).dispatchEvent(new h.w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Escape',code:'Escape'}));const cancel=new h.w.Event('cancel',{cancelable:true});h.$(id).dispatchEvent(cancel);if(!cancel.defaultPrevented)h.$(id).close();
  assert.equal(h.$('entryDialog').open,true);h.$(id).dispatchEvent(new h.w.Event('close'));assert.equal(h.$('entryDialog').open,true);assert.equal(h.club.blocked(),true);
  h.click('entryClose');h.click('roundButton');assert.equal(h.app.state.phase,'paused');h.d.dispatchEvent(new h.w.KeyboardEvent('keyup',{bubbles:true,key:'Escape',code:'Escape'}));await drain();assert.equal(h.app.state.phase,'paused');
  h.click('openMenu');h.click(trigger);for(const type of ['pagehide','pageshow'])h.w.dispatchEvent(new h.w.PageTransitionEvent(type,{persisted:true}));await drain();assert.equal(h.d.querySelectorAll('dialog[open]').length,0);assert.equal(h.club.blocked(),false);assert.equal(h.app.state.phase,'paused');h.click('roundButton');assert.equal(h.app.state.phase,'waiting');
 }finally{h.close()}
});
for(const mode of ['catch','duel'])for(const [trigger] of children)test(`${mode} initial Help child ${trigger} returns to Start after BFCache, never starts gameplay`,async()=>{
 const h=fixture(mode,{seen:false,queued:true});try{h.click(trigger);h.flushClose();const state=h.app.state;for(const type of ['pagehide','pageshow'])h.w.dispatchEvent(new h.w.PageTransitionEvent(type,{persisted:true}));h.flushClose();await drain();assert.equal(h.$('entryDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.club.seen,false);assert.equal(h.app.state,state);h.click('entryStart');h.flushClose();await drain();assert.equal(h.club.blocked(),false)}finally{h.close()}
});
for(const mode of ['catch','duel'])test(`${mode} duplicate child ranking close cannot return to a result behind still-open Help`,async()=>{
 const h=fixture(mode);try{h.finish();h.click('openMenu');h.click('entryRanking');h.click('levelRankingReturn');assert.equal(h.$('entryDialog').open,true);h.$('levelRankingDialog').dispatchEvent(new h.w.Event('close'));await drain();assert.equal(h.$('entryDialog').open,true);assert.equal(h.$('summary').open,false);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.click('entryClose');await drain();assert.equal(h.$('summary').open,true)}finally{h.close()}
});
for(const mode of ['catch','duel'])test(`${mode} an obsolete Settings close cannot steal a sibling Ranking or its return context`,async()=>{
 const h=fixture(mode);try{
  h.finish();const state=h.app.state;h.click('openMenu');h.click('entrySettings');h.click('settingsClose');h.click('entryRanking');
  h.$('settingsDialog').dispatchEvent(new h.w.Event('close'));await drain();assert.equal(h.$('entryDialog').open,false);assert.equal(h.$('levelRankingDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.app.state,state);
  h.click('levelRankingReturn');h.click('entryClose');await drain();assert.equal(h.$('summary').open,true);
  h.click('headerSettings');for(const type of ['pagehide','pageshow'])h.w.dispatchEvent(new h.w.PageTransitionEvent(type,{persisted:true}));await drain();assert.equal(h.$('summary').open,true);
  h.click('openMenu');h.click('entryRanking');h.$('settingsDialog').dispatchEvent(new h.w.Event('close'));await drain();assert.equal(h.$('entryDialog').open,false);assert.equal(h.$('levelRankingDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);h.click('levelRankingReturn');h.click('entryClose');await drain();assert.equal(h.$('summary').open,true);assert.equal(h.app.state,state);
 }finally{h.close()}
});
for(const mode of ['catch','duel'])test(`${mode} BFCache's actual queued Settings close cannot steal a newer first-entry Ranking`,async()=>{
 const h=fixture(mode,{seen:false,queued:true});try{
  h.click('entrySettings');h.flushClose();for(const type of ['pagehide','pageshow'])h.w.dispatchEvent(new h.w.PageTransitionEvent(type,{persisted:true}));
  assert.equal(h.$('entryDialog').open,true);h.click('entryRanking');h.flushClose();await drain();assert.equal(h.$('entryDialog').open,false);assert.equal(h.$('levelRankingDialog').open,true);assert.equal(h.d.querySelectorAll('dialog[open]').length,1);assert.equal(h.club.seen,false);assert.equal(h.app.state.phase,'idle');h.click('levelRankingReturn');h.flushClose();assert.equal(h.$('entryDialog').open,true);h.click('entryStart');h.flushClose();await drain();assert.equal(h.club.blocked(),false);
 }finally{h.close()}
});

for(const mode of ['catch','duel'])for(const queued of [false,true])for(const action of ['close','escape','start'])for(const input of ['keyboard','space','pointer'])test(`${mode} first ${action} drains ${input} before manual practice (${queued?'queued':'immediate'})`,async()=>{
 const h=fixture(mode,{seen:false,queued});try{
  const trigger=h.$(action==='start'?'entryStart':'entryClose'),key=action==='escape'?'Escape':input==='space'?'Space':'Enter',state=h.app.state;
  function send(type){const event=input!=='pointer'?new h.w.KeyboardEvent(type,{key,code:key,bubbles:true,cancelable:true}):new h.w.Event(type,{bubbles:true,cancelable:true});if(input==='pointer')Object.defineProperty(event,'pointerId',{value:4});trigger.dispatchEvent(event);}
  assert.equal(h.$('entryClose').hidden,false);assert.equal(h.$('restartButton').hidden,false);assert.equal(h.$('restartButton').disabled,true);
  send(input!=='pointer'?'keydown':'pointerdown');
  if(action==='escape'){const cancel=new h.w.Event('cancel',{cancelable:true});h.$('entryDialog').dispatchEvent(cancel);if(!cancel.defaultPrevented)h.$('entryDialog').close();}else trigger.click();
  h.flushClose();assert.equal(h.$('entryDialog').open,false);assert.equal(h.club.blocked(),true);h.click('roundButton');h.click('restartButton');h.click('actionButton');h.tick(h.now+2000);assert.equal(h.app.state,state);
  send(input!=='pointer'?'keyup':'pointerup');h.$('roundButton').dispatchEvent(new h.w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await drain();
  assert.equal(h.app.state,state);assert.equal(h.app.state.practice,true);assert.equal(h.app.state.phase,'idle');assert.equal(h.club.blocked(),false);assert.equal(h.d.activeElement,h.$('roundButton'));assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
  h.click('roundButton');assert.equal(h.app.state.phase,'waiting');assert.equal(h.$('restartButton').disabled,false);assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
  h.click('restartButton');assert.equal(h.app.state.phase,'idle');assert.equal(h.$('restartButton').disabled,true);assert.equal(h.$('restartButton').hidden,false);
 }finally{h.close()}
});
