import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountLeaderboard} from '../public/games/shared/leaderboard.mjs';

const rounds={
 'long-jump':{phase:'done',valid:true,legalAdventureKm:4},
 hurdles:{phase:'done',t:20},
 'high-jump':{phase:'done',success:true,height:2},
 'pole-vault':{phase:'done',ruleset:'real-altitude-v3',maxHeight:3,scoreSnapshot:{height:3,ruleset:'real-altitude-v3'}},
 'shot-put':{phase:'done',valid:true,distance:7},
 discus:{phase:'done',foul:false,score:8},
 'reaction-rod':{phase:'done',caught:8,rating:7},
 'beer-slide':{phase:'done',raw:8},
 'tower-climb':{phase:'done',finished:true,floor:10,time:30}
};
const rect=(top,height)=>({top,bottom:top+height,left:0,right:300,width:300,height,x:0,y:top,toJSON(){return this;}});
function geometry(node,{top=20,height=200,scrollHeight=1000,overflow='auto',clientTop=0}={}){
 node.style.overflowY=overflow;
 Object.defineProperties(node,{clientHeight:{configurable:true,value:height},scrollHeight:{configurable:true,value:scrollHeight},clientTop:{configurable:true,value:clientTop}});
 node.getBoundingClientRect=()=>rect(top,height+2*clientTop);
 node.getClientRects=()=>[node.getBoundingClientRect()];
 const calls=[];
 // JSDOM has no layout or scrollTo implementation. Model only that browser boundary.
 node.scrollTo=options=>{calls.push(options);node.scrollTop=options.top;};
 return calls;
}
function fixture(t,{game='hurdles',realDOM=false,nested=false,reduced=false,actionContainer=false,uploadContainer=false,raf=true}={}){
 const html=realDOM?readFileSync(new URL(`../public/games/${game}/index.html`,import.meta.url),'utf8'):
  '<dialog open id="dialog"><section id="result"><button id="again">Again</button><div id="actions"></div></section></dialog>';
 const dom=new JSDOM(html,{url:'https://qa.example/',runScripts:'outside-only'}),win=dom.window,doc=win.document;
 t.after(()=>win.close());
 // This fixture starts at a completed round. Exercise the real startup handoff
 // before entering that phase; JSDOM does not fetch external deferred scripts.
 if(realDOM){
  const entry=doc.createElement('dialog');entry.dataset.pfEntry='';entry.open=true;doc.body.append(entry);
  win.eval(readFileSync(new URL('../public/games/shared/startup.js',import.meta.url),'utf8'));
  assert.equal(doc.documentElement.dataset.pfStartup,'ready');entry.remove();
 }
 const result=doc.getElementById(game==='long-jump'&&realDOM?'overlay':'result'),dialog=result.closest('dialog');
 for(let node=result;node&&node!==doc.body;node=node.parentElement){node.hidden=false;node.style.display='block';}
 dialog.open=true;
 const frames=new Map();let nextFrame=0;
 const enqueue=fn=>{const id=++nextFrame;frames.set(id,fn);return id;};
 if(raf){win.requestAnimationFrame=enqueue;win.cancelAnimationFrame=id=>frames.delete(id);}
 else {win.requestAnimationFrame=undefined;win.cancelAnimationFrame=undefined;win.setTimeout=enqueue;win.clearTimeout=id=>frames.delete(id);}
 const frame=()=>{const current=[...frames];frames.clear();for(const [,fn] of current)fn(0);};
 const flush=async()=>{await Promise.resolve();for(let i=0;i<4;i++){frame();await Promise.resolve();}};
 win.matchMedia=query=>({matches:reduced&&query==='(prefers-reduced-motion: reduce)'});
 const forbidden=[];
 win.scrollTo=()=>forbidden.push('window');doc.body.scrollTo=()=>forbidden.push('body');doc.documentElement.scrollTo=()=>forbidden.push('html');
 win.Element.prototype.scrollIntoView=()=>forbidden.push('scrollIntoView');
 doc.body.scrollTop=17;doc.documentElement.scrollTop=23;
 const calls=geometry(dialog),network=[];
 if(result!==dialog){result.getClientRects=()=>[rect(20,800)];result.getBoundingClientRect=()=>rect(20,800);}
 const innerCalls=nested?geometry(result,{top:40,height:100,scrollHeight:900}):[];
 const options=actionContainer?{resultActionContainer:doc.getElementById('actions'),resultActionLabel:'榮譽榜'}:{};
 if(uploadContainer){let slot=doc.getElementById('resultUpload');if(!slot){slot=doc.createElement('div');slot.id='resultUpload';result.append(slot);}options.resultUploadContainer=slot;}
 const board=mountLeaderboard({document:doc,game,enabled:true,result,...options,fetcher:async(url,options)=>{network.push({url,options});return {ok:true,json:async()=>({entries:[],own:null})};}});
 board.setResult(rounds[game]);
 const panel=result.querySelector('details.pf-leaderboard'),summary=panel.querySelector('summary'),label=panel.querySelector('label'),cancel=panel.querySelector('[data-cancel]');
 let layout={panelTop:300,panelHeight:180,labelTop:370,labelHeight:50,cancelTop:450,cancelHeight:30};
 const offset=()=>dialog.scrollTop+(nested?result.scrollTop:0);
 for(const [node,prefix] of [[panel,'panel'],[label,'label'],[cancel,'cancel']]){
  node.getBoundingClientRect=()=>rect(layout[prefix+'Top']-offset(),layout[prefix+'Height']);
  node.getClientRects=()=>[node.getBoundingClientRect()];
 }
 const active=doc.createElement('button');result.prepend(active);active.focus();
 return {win,doc,result,dialog,board,panel,summary,label,cancel,calls,innerCalls,network,forbidden,active,frame,flush,setLayout:values=>Object.assign(layout,values)};
}

// Missing expansion handling would leave the upload controls below every game's result viewport.
for(const game of Object.keys(rounds))test(`${game}: manual upload expansion reveals controls inside the existing result dialog`,async t=>{
 const f=fixture(t,{game,realDOM:true});assert.equal(f.panel.parentElement,f.result,'default placement stays unchanged');f.summary.click();
 assert.equal(f.panel.open,true);assert.equal(f.dialog.scrollTop,0,'wait for expanded layout');
 await f.flush();
 assert.equal(f.dialog.scrollTop,268,'expanded 300..480 panel moves into 20..220 viewport with 8px inset');
 assert.equal(f.network.length,0,'opening upload is not a submission or ranking fetch');
 assert.equal(f.doc.activeElement,f.active,'opening upload must not summon nickname keyboard');
 assert.deepEqual(f.forbidden,[]);assert.equal(f.doc.body.scrollTop,17);assert.equal(f.doc.documentElement.scrollTop,23);
});

test('expansion measures after layout rather than using the collapsed or first-frame height',async t=>{
 const f=fixture(t);f.summary.click();f.frame();assert.equal(f.dialog.scrollTop,0);
 f.setLayout({panelTop:400,panelHeight:180,labelTop:470,cancelTop:550});await f.flush();
 assert.equal(f.dialog.scrollTop,368);
});

test('oversized upload reveals nickname and submit/cancel area on a short result viewport',async t=>{
 const f=fixture(t);f.setLayout({panelTop:300,panelHeight:420,labelTop:550,labelHeight:50,cancelTop:650,cancelHeight:30});
 f.summary.click();await f.flush();assert.equal(f.dialog.scrollTop,468);
 assert.ok(f.label.getBoundingClientRect().top>=28);assert.ok(f.cancel.getBoundingClientRect().bottom<=212);
});

test('nested result scroll containers reveal the upload without scrolling the page',async t=>{
 const f=fixture(t,{nested:true});f.setLayout({panelTop:300,panelHeight:80,labelTop:320,labelHeight:20,cancelTop:350,cancelHeight:20});
 f.summary.click();await f.flush();assert.equal(f.result.scrollTop,248);assert.equal(f.dialog.scrollTop,0);
 assert.deepEqual(f.forbidden,[]);
});

test('a scrollable result section can reveal upload without any dialog ancestor',async t=>{
 const f=fixture(t);f.doc.body.append(f.result);geometry(f.result);f.summary.click();await f.flush();
 assert.equal(f.result.scrollTop,268);assert.equal(f.dialog.scrollTop,0);assert.deepEqual(f.forbidden,[]);
});

test('reduced motion uses immediate element scrolling even if CSS requests smooth scrolling',async t=>{
 const f=fixture(t,{reduced:true});f.dialog.style.scrollBehavior='smooth';f.summary.click();await f.flush();
 assert.equal(f.dialog.scrollTop,268);assert.equal(f.calls[0].behavior,'instant');
});

test('already visible upload is not moved or focused',async t=>{
 const f=fixture(t);f.setLayout({panelTop:40,panelHeight:160,labelTop:100,cancelTop:170,cancelHeight:20});
 f.summary.click();await f.flush();assert.equal(f.dialog.scrollTop,0);assert.equal(f.calls.length,0);assert.equal(f.doc.activeElement,f.active);
});

test('manual expansion still reveals upload without requestAnimationFrame support',async t=>{
 const f=fixture(t,{raf:false});f.summary.click();await f.flush();assert.equal(f.dialog.scrollTop,268);
});

test('programmatic open and setResult do not auto-scroll',async t=>{
 const f=fixture(t);await f.flush();assert.equal(f.dialog.scrollTop,0);
 f.panel.open=true;f.panel.dispatchEvent(new f.win.Event('toggle'));await f.flush();assert.equal(f.dialog.scrollTop,0);
 f.board.setResult(rounds.hurdles);await f.flush();assert.equal(f.dialog.scrollTop,0);
});

for(const action of ['collapse','cancel','reset','setResult','suspend','destroy','close','hide','detach'])test(`${action} invalidates a queued expansion scroll`,async t=>{
 const f=fixture(t);f.summary.click();f.frame();
 if(action==='collapse')f.summary.click();
 else if(action==='cancel')f.cancel.click();
 else if(action==='setResult')f.board.setResult(rounds.hurdles);
 else if(action==='close'){f.dialog.open=false;f.dialog.dispatchEvent(new f.win.Event('close'));}
 else if(action==='hide')f.dialog.hidden=true;
 else if(action==='detach')f.dialog.remove();
 else f.board[action]();
 await f.flush();assert.equal(f.calls.length,0);assert.equal(f.dialog.scrollTop,0);assert.deepEqual(f.forbidden,[]);
});

test('rapid open-close-open coalesces into only the latest manual expansion',async t=>{
 const f=fixture(t);f.summary.click();f.summary.click();f.summary.click();await f.flush();
 assert.equal(f.dialog.scrollTop,268);assert.equal(f.calls.length,1);
});

test('new round can expand after cancelling the previous round request',async t=>{
 const f=fixture(t);f.summary.click();f.board.setResult(rounds.hurdles);f.summary.click();await f.flush();
 assert.equal(f.dialog.scrollTop,268);assert.equal(f.calls.length,1);
});

test('closing then returning from replay does not resume a queued or programmatic scroll',async t=>{
 const f=fixture(t);f.summary.click();f.board.suspend();f.dialog.open=false;f.dialog.dispatchEvent(new f.win.Event('close'));
 f.dialog.open=true;await f.flush();assert.equal(f.calls.length,0);
});

for(const hide of ['hidden','aria-hidden','inert','display','visibility','closed'])test(`an upload in a ${hide} result cannot trigger scrolling`,async t=>{
 const f=fixture(t);
 if(hide==='hidden')f.result.hidden=true;
 else if(hide==='aria-hidden')f.dialog.setAttribute('aria-hidden','true');
 else if(hide==='inert')f.dialog.setAttribute('inert','');
 else if(hide==='display')f.dialog.style.display='none';
 else if(hide==='visibility')f.dialog.style.visibility='hidden';
 else f.dialog.open=false;
 f.summary.click();await f.flush();assert.equal(f.calls.length,0);
});

test('optional result action placement keeps the same ranking action outside upload details',async t=>{
 const f=fixture(t,{actionContainer:true});const actions=f.doc.getElementById('actions'),button=actions.querySelector('.pf-result-ranking');
 assert.ok(button,'existing ranking action is mounted in the requested action grid');assert.equal(button.textContent,'榮譽榜');
 assert.equal(f.result.querySelectorAll('.pf-result-ranking').length,1);assert.equal(f.panel.parentElement,f.result);
 button.click();await Promise.resolve();assert.equal(f.network[0]?.url,'/api/leaderboard?game=hurdles');assert.equal(f.panel.open,false);
 f.board.destroy();assert.equal(actions.children.length,0);
});

test('default ranking action placement and label stay unchanged for the other games',t=>{
 const f=fixture(t),button=f.result.querySelector('.pf-result-ranking');
 assert.equal(button.parentElement,f.result);assert.equal(button.textContent,'查看榮譽榜');
});

test('a queued expansion cannot resume after the result is hidden then restored',async t=>{
 const f=fixture(t);f.summary.click();f.dialog.hidden=true;f.dialog.hidden=false;await f.flush();
 assert.equal(f.calls.length,0);
});

test('a queued expansion cannot resume after a programmatic panel close and reopen',async t=>{
 const f=fixture(t);f.summary.click();f.panel.open=false;f.panel.open=true;await f.flush();
 assert.equal(f.calls.length,0);
});

test('reset never leaves browser-owned smooth scrolling running into another round',async t=>{
 const f=fixture(t),animations=[];
 f.dialog.scrollTo=options=>{
  if(options.behavior==='smooth'||(options.behavior==='auto'&&f.dialog.style.scrollBehavior==='smooth'))animations.push(()=>f.dialog.scrollTop=options.top);
  else f.dialog.scrollTop=options.top;
 };
 f.dialog.style.scrollBehavior='smooth';f.summary.click();await f.flush();f.board.reset();
 const before=f.dialog.scrollTop;for(const finish of animations)finish();
 assert.equal(f.dialog.scrollTop,before,'no deferred native animation may move the reset/return view');
});

test('an offscreen nested result scroller is revealed from the inside out',async t=>{
 const f=fixture(t,{nested:true});geometry(f.dialog,{scrollHeight:2000});geometry(f.result,{top:1000,height:100,scrollHeight:900});
 f.setLayout({panelTop:1300,panelHeight:80,labelTop:1320,labelHeight:20,cancelTop:1350,cancelHeight:20});
 f.summary.click();await f.flush();assert.equal(f.result.scrollTop,288);assert.equal(f.dialog.scrollTop,880);assert.deepEqual(f.forbidden,[]);
});

test('visual viewport offsets constrain the reveal without panning the document',async t=>{
 const f=fixture(t);f.win.visualViewport={offsetTop:50,offsetLeft:12,height:140,width:300};
 geometry(f.dialog,{top:20,height:300,scrollHeight:1000,clientTop:2});
 f.setLayout({panelTop:300,panelHeight:420,labelTop:550,labelHeight:50,cancelTop:630,cancelHeight:30});
 f.summary.click();await f.flush();assert.equal(f.dialog.scrollTop,478);
 assert.deepEqual(f.win.visualViewport,{offsetTop:50,offsetLeft:12,height:140,width:300});assert.deepEqual(f.forbidden,[]);
 assert.equal(f.doc.body.scrollTop,17);assert.equal(f.doc.documentElement.scrollTop,23);
});

// Reparenting by duplication or scrolling a disconnected result would break this contract.
test('Rod upload slot keeps one live panel, nickname and scroll boundary across suspend and reopen',async t=>{
 const f=fixture(t,{game:'reaction-rod',realDOM:true,uploadContainer:true}),input=f.panel.querySelector('input'),submit=f.panel.querySelector('[data-submit]');
 assert.equal(f.panel.parentElement,f.doc.querySelector('#resultUpload'));assert.equal(f.result.querySelectorAll('details.pf-leaderboard').length,1);
 input.value='尚未提交的暱稱';f.summary.focus();f.summary.click();await f.flush();assert.equal(f.dialog.scrollTop,268);assert.equal(f.doc.activeElement,f.summary);assert.equal(input.value,'尚未提交的暱稱');assert.equal(f.network.length,0);
 let escaped=0;f.win.addEventListener('keydown',()=>escaped++);input.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'w',bubbles:true}));input.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(escaped,0);assert.equal(f.network.length,0);input.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));assert.equal(escaped,1);
 f.board.suspend();assert.equal(input.value,'尚未提交的暱稱');assert.equal(f.panel.open,true);assert.equal(f.panel.querySelector('[data-submit]'),submit);
 f.cancel.click();assert.equal(f.panel.open,false);f.summary.click();await f.flush();assert.equal(input.value,'尚未提交的暱稱');assert.equal(f.result.querySelectorAll('details.pf-leaderboard').length,1);assert.deepEqual(f.forbidden,[]);
 f.board.reset();await f.flush();assert.equal(f.panel.hidden,true);assert.equal(f.panel.open,false);assert.equal(f.panel.parentElement,f.doc.querySelector('#resultUpload'));
});
test('queued upload scroll is cancelled when its custom slot is hidden and restored',async t=>{const f=fixture(t,{uploadContainer:true});f.summary.click();const slot=f.panel.parentElement;slot.hidden=true;slot.hidden=false;await f.flush();assert.equal(f.calls.length,0);assert.equal(f.network.length,0);});
