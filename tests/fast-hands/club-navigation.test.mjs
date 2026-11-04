import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountClub} from '../../public/games/fast-hands/club.mjs';

const root=new URL('../../public/games/fast-hands/',import.meta.url);
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture({mode='duel',phase='live',practice=false,active=true,failModal=false}={}){
 const dom=new JSDOM(readFileSync(new URL(mode==='duck'?'index.html':`${mode}.html`,root),'utf8'),{url:`https://game.test/games/fast-hands/${mode==='duck'?'':mode+'.html'}`,pretendToBeVisual:true}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 w.sessionStorage.setItem('fast-hands:club-intro:v1','seen');
 w.HTMLDialogElement.prototype.showModal=function(){if(failModal)throw Error('unavailable');this.open=true};
 w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 let club,nativeCalls=0;const destinations=[],interrupts=[],changes=[];
 w.confirm=()=>{nativeCalls++;return false};
 d.addEventListener('clubchange',()=>{if(club)changes.push(club.blocked())});
 club=mountClub({document:d,window:w,mode,isActive:()=>active,getNavigationContext:()=>({phase,practice}),getResumeTarget:()=>$ (mode==='duck'?'retry':'roundButton'),onInterrupt:({reason})=>interrupts.push({reason,blocked:club?.blocked()}),onNavigate:href=>destinations.push(href)});
 function send(target,type,values={}){const e=new w.Event(type,{bubbles:true,cancelable:true});for(const [key,value]of Object.entries(values))Object.defineProperty(e,key,{value});target.dispatchEvent(e);return e}
 return {w,d,$,club,destinations,interrupts,changes,send,get nativeCalls(){return nativeCalls},open:href=>club.requestNavigation(href||'./catch.html?view=front#stage'),close(){club.destroy();w.close()}};
}

test('navigation becomes blocked before interrupt and opens an accessible non-native dialog',()=>{
 const f=fixture();try{assert.equal(f.open(),false);assert.deepEqual(f.interrupts,[{reason:'navigation',blocked:true}]);assert.equal(f.nativeCalls,0);assert.equal(f.$('clubNavigationDialog')?.open,true);assert.equal(f.$('clubNavigationDialog').getAttribute('aria-labelledby'),'clubNavigationTitle');assert.equal(f.$('clubNavigationDialog').getAttribute('aria-describedby'),'clubNavigationDescription');assert.equal(f.d.activeElement,f.$('clubNavigationStay'));assert.equal(f.club.navigationPending(),true);assert.ok(f.changes.includes(true));assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('one pending destination cannot be replaced or interrupted twice; confirm navigates exactly once',()=>{
 const f=fixture();try{f.open();assert.equal(f.open('./'),false);f.club.showIntro();assert.equal(f.interrupts.length,1);assert.equal(f.$('entryDialog').open,false);f.$('clubNavigationLeave').click();f.$('clubNavigationLeave').click();assert.deepEqual(f.destinations,['https://game.test/games/fast-hands/catch.html?view=front#stage']);assert.equal(f.club.blocked(),true);assert.equal(f.club.navigationPending(),false);}finally{f.close()}
});
test('cancel stays put and restores a safe control only after notification updates the screen',async()=>{
 const f=fixture();try{f.$('roundButton').hidden=true;f.d.addEventListener('clubchange',()=>{if(!f.club.navigationPending())f.$('roundButton').hidden=false});f.open();f.$('clubNavigationStay').click();assert.equal(f.$('clubNavigationDialog').open,false);assert.equal(f.d.activeElement,f.$('roundButton'));assert.equal(f.club.blocked(),true,'closing activation is drained');await tick();assert.equal(f.club.blocked(),false);assert.ok(f.changes.includes(false));assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('Escape means stay and its held key cannot activate the retry button after closing',async()=>{
 const f=fixture();try{f.open();let retries=0;f.$('roundButton').addEventListener('click',()=>retries++);f.send(f.$('clubNavigationStay'),'keydown',{key:'Escape',code:'Escape'});assert.equal(f.$('clubNavigationDialog').open,false);assert.equal(f.club.blocked(),true);f.$('roundButton').click();assert.equal(retries,0);assert.equal(f.send(f.$('roundButton'),'keyup',{key:'Escape',code:'Escape'}).defaultPrevented,true);await tick();f.$('roundButton').click();assert.equal(retries,1);assert.equal(f.destinations.length,0);}finally{f.close()}
});
test('native dialog cancel and unexpected close use the same stay cleanup',async()=>{
 for(const type of ['cancel','close']){const f=fixture();try{f.open();if(type==='cancel')f.send(f.$('clubNavigationDialog'),'cancel');else f.$('clubNavigationDialog').close();await tick();assert.equal(f.club.navigationPending(),false);assert.equal(f.club.blocked(),false);assert.equal(f.d.activeElement,f.$('roundButton'));assert.equal(f.destinations.length,0);}finally{f.close()}}
});
test('Tab and focus remain inside the pending dialog, including showModal fallback',()=>{
 for(const failModal of [false,true]){const f=fixture({failModal});try{f.open();f.$('clubNavigationLeave').focus();f.send(f.$('clubNavigationLeave'),'keydown',{key:'Tab',code:'Tab'});assert.equal(f.d.activeElement,f.$('clubNavigationStay'));f.send(f.$('clubNavigationStay'),'keydown',{key:'Tab',code:'Tab',shiftKey:true});assert.equal(f.d.activeElement,f.$('clubNavigationLeave'));f.$('roundButton').focus();assert.equal(f.d.activeElement,f.$('clubNavigationStay'));let calls=0;f.$('roundButton').addEventListener('click',()=>calls++);f.$('roundButton').click();assert.equal(calls,0);}finally{f.close()}}
});
test('opening activation key is consumed until release, then a fresh key can choose Stay',async()=>{
 const f=fixture();try{const nav=f.d.querySelector('a[data-club-mode="catch"]');f.send(nav,'keydown',{key:'Enter',code:'Enter'});f.open();assert.equal(f.send(f.$('clubNavigationStay'),'keydown',{key:'Enter',code:'Enter',repeat:true}).defaultPrevented,true);assert.equal(f.send(f.$('clubNavigationStay'),'keyup',{key:'Enter',code:'Enter'}).defaultPrevented,true);assert.equal(f.club.navigationPending(),true);f.send(f.$('clubNavigationStay'),'keydown',{key:'Enter',code:'Enter'});f.$('clubNavigationStay').click();f.send(f.$('roundButton'),'keyup',{key:'Enter',code:'Enter'});await tick();assert.equal(f.club.blocked(),false);assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('original held pointer and delayed compatibility click do not reach gameplay after cancellation',async()=>{
 const f=fixture();try{let inputs=0;for(const type of ['pointerup','click'])f.$('roundButton').addEventListener(type,()=>inputs++);f.send(f.$('actionButton'),'pointerdown',{pointerId:7});f.open();f.$('clubNavigationStay').click();assert.equal(f.club.blocked(),true);assert.equal(f.send(f.$('roundButton'),'pointerup',{pointerId:7}).defaultPrevented,true);await tick();const stale=new f.w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1});f.$('roundButton').dispatchEvent(stale);assert.equal(stale.defaultPrevented,true);assert.equal(inputs,0);f.send(f.$('roundButton'),'pointerdown',{pointerId:8});f.send(f.$('roundButton'),'pointerup',{pointerId:8});f.$('roundButton').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(inputs,2);}finally{f.close()}
});
test('copy distinguishes duck, practice, interrupted rounds and already settled feedback',()=>{
 for(const [options,include,exclude]of [[{mode:'duck'},/起點重試/,/已完成回合/],[{practice:true},/練習.*不計分/,/下一回合/],[{phase:'live'},/這回合.*不計分.*已完成回合/,/繼續下一回合/],[{phase:'paused'},/重新準備這一回/,/繼續下一回合/],[{phase:'feedback'},/已完成回合.*繼續下一回合/,/這回合.*不計分/]]){const f=fixture(options);try{f.open();assert.match(f.$('clubNavigationDescription').textContent,include);assert.doesNotMatch(f.$('clubNavigationDescription').textContent,exclude);}finally{f.close()}}
});
test('idle departure is still synchronous, blocked before interruption and never shows confirmation',()=>{
 const f=fixture({active:false});try{assert.equal(f.open(),true);assert.equal(f.interrupts[0].blocked,true);assert.equal(f.$('clubNavigationDialog').open,false);assert.equal(f.destinations.length,1);assert.equal(f.nativeCalls,0);}finally{f.close()}
});
test('invalid URL is ignored without interrupting the game',()=>{
 const f=fixture();try{assert.equal(f.open('http://['),false);assert.equal(f.open('javascript:alert(1)'),false);assert.deepEqual(f.interrupts,[]);assert.equal(f.club.blocked(),false);}finally{f.close()}
});
test('pagehide cancels pending UI and bfcache return cannot navigate from stale confirmation',()=>{
 const f=fixture();try{f.open();f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide',{persisted:true}));f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(f.$('clubNavigationDialog').open,false);assert.equal(f.club.blocked(),false);f.$('clubNavigationLeave').click();assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('destroy removes its dialog and handlers without executing a pending destination',()=>{
 const f=fixture();try{f.open();const leave=f.$('clubNavigationLeave');f.club.destroy();assert.equal(f.$('clubNavigationDialog'),null);leave.click();assert.equal(f.open(),false);assert.deepEqual(f.destinations,[]);}finally{f.close()}
});
test('late close event from an earlier dialog cannot cancel a newly opened confirmation',async()=>{
 const f=fixture();try{f.open();f.$('clubNavigationStay').click();await tick();f.open('./');f.send(f.$('clubNavigationDialog'),'close');assert.equal(f.club.navigationPending(),true);assert.equal(f.$('clubNavigationDialog').open,true);f.$('clubNavigationLeave').click();assert.deepEqual(f.destinations,['https://game.test/games/fast-hands/']);}finally{f.close()}
});
test('confirmation has readable game styling, scroll containment and large side-by-side actions',()=>{
 const f=fixture();try{const style=f.d.createElement('style');style.textContent=readFileSync(new URL('club.css',root),'utf8');f.d.head.append(style);f.open();const css=el=>f.w.getComputedStyle(el);assert.equal(css(f.$('clubNavigationDialog')).padding,'24px');assert.equal(css(f.$('clubNavigationDialog')).overflowY,'auto');assert.equal(css(f.d.querySelector('.club-navigation-actions')).display,'grid');assert.ok(parseFloat(css(f.$('clubNavigationStay')).minHeight)>=48);assert.ok(parseFloat(css(f.$('clubNavigationLeave')).minHeight)>=48);}finally{f.close()}
});
