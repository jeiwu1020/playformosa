import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {mountLeaderboard,eligibleResult} from '../public/games/shared/leaderboard.mjs';
const setup=()=>new JSDOM('<dialog open id="entry"><button>開始</button></dialog><section id="result"><button>再玩</button></section>',{url:'https://qa.example/'});
test('disabled gate adds no UI, touches no storage or network',()=>{const d=setup();let calls=0;const board=mountLeaderboard({document:d.window.document,game:'hurdles',enabled:false,fetcher:()=>calls++});assert.equal(board,null);assert.equal(calls,0);assert.equal(d.window.document.querySelector('.pf-leaderboard'),null);d.window.close();});
test('exact round score adapters exclude exploration, foul and DNF',()=>{
 assert.deepEqual(eligibleResult('long-jump',{phase:'done',valid:true,legalAdventureKm:3,adventureKm:999}),{score:3,status:'valid'});
 for(const x of [{phase:'done',valid:false,legalAdventureKm:4},{phase:'run',valid:true,legalAdventureKm:4}])assert.equal(eligibleResult('long-jump',x),null);
 assert.equal(eligibleResult('hurdles',{phase:'dnf',t:180}),null);assert.deepEqual(eligibleResult('hurdles',{phase:'done',t:20}),{score:20,status:'done'});
});
test('finish never uploads; explicit frozen payload retries same UUID; new round invalidates late response',async()=>{
 const d=setup(),doc=d.window.document,calls=[];let resolve;
 const board=mountLeaderboard({document:doc,game:'hurdles',enabled:true,entry:doc.querySelector('#entry'),result:doc.querySelector('#result'),fetcher:async(url,opts)=>{calls.push(JSON.parse(opts.body));return new Promise(r=>resolve=r);}});
 board.setResult({phase:'done',t:23});assert.equal(calls.length,0);
 const root=doc.querySelector('#result .pf-leaderboard');root.open=true;root.dispatchEvent(new d.window.Event('toggle'));const input=root.querySelector('input');input.value='小島';root.querySelector('[data-submit]').click();assert.equal(calls.length,1);
 root.querySelector('[data-submit]').click();assert.equal(calls.length,1);
 resolve({ok:false,status:503,json:async()=>({error:'busy'})});await new Promise(r=>setTimeout(r,0));root.querySelector('[data-submit]').click();assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
 board.reset();resolve({ok:true,json:async()=>({accepted:true})});await new Promise(r=>setTimeout(r,0));assert.equal(root.hidden,true);assert.equal(root.textContent.includes('已收錄'),false);d.window.close();
});
test('cancel does not submit and ranking names are plain text, no auto fetch',async()=>{
 const d=setup(),doc=d.window.document;let calls=0;const board=mountLeaderboard({document:doc,game:'long-jump',enabled:true,entry:doc.querySelector('#entry'),result:doc.querySelector('#result'),fetcher:async()=>{calls++;return {ok:true,json:async()=>({entries:[{nickname:'<img onerror=x>',score:5}]})};}});
 board.setResult({phase:'done',valid:true,legalAdventureKm:5});doc.querySelector('[data-cancel]').click();assert.equal(calls,0);
 const rank=doc.querySelector('#entry .pf-leaderboard');rank.open=true;rank.dispatchEvent(new d.window.Event('toggle'));await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);assert.equal(rank.querySelector('img[onerror]'),null);assert.ok(rank.textContent.includes('<img onerror=x>'));d.window.close();
});
test('typing game keys/IME/Enter stays in nickname and never submits; failed storage/random do not block play',()=>{
 const d=setup(),doc=d.window.document;let uploads=0,gameKeys=0;d.window.addEventListener('keydown',()=>gameKeys++);
 const b=mountLeaderboard({document:doc,game:'hurdles',enabled:true,entry:doc.querySelector('#entry'),result:doc.querySelector('#result'),fetcher:()=>{uploads++;}});b.setResult({phase:'done',t:20});const input=doc.querySelector('input');
 for(const code of ['KeyA','KeyS','KeyJ','KeyK','Space','Enter']){input.dispatchEvent(new d.window.KeyboardEvent('keydown',{code,key:code,bubbles:true,isComposing:true}));input.dispatchEvent(new d.window.KeyboardEvent('keyup',{code,bubbles:true}));}
 assert.equal(gameKeys,0);assert.equal(uploads,0);assert.equal(doc.querySelector('#result>button').disabled,false);d.window.close();
 const f=setup();Object.defineProperty(f.window,'localStorage',{get(){throw Error('blocked')}});Object.defineProperty(f.window.crypto,'randomUUID',{value(){throw Error('blocked')}});
 const fallback=mountLeaderboard({document:f.window.document,game:'hurdles',enabled:true,result:f.window.document.querySelector('#result')});fallback.setResult({phase:'done',t:20});assert.equal(f.window.document.querySelector('[data-submit]').disabled,true);assert.equal(f.window.document.querySelector('#result>button').disabled,false);f.window.close();
});
test('three manual attempts maximum and close-in-flight cannot paint a later round',async()=>{
 const d=setup(),doc=d.window.document;let calls=0;const b=mountLeaderboard({document:doc,game:'hurdles',enabled:true,result:doc.querySelector('#result'),fetcher:async()=>{calls++;throw Error('offline')}});b.setResult({phase:'done',t:20});const root=doc.querySelector('.pf-leaderboard'),submit=root.querySelector('[data-submit]');root.open=true;root.querySelector('input').value='島';
 for(let i=0;i<4;i++){submit.click();await new Promise(r=>setTimeout(r,0));}assert.equal(calls,3);assert.equal(submit.disabled,true);assert.match(root.textContent,/已達重試次數/);d.window.close();
});
test('suspend for help/replay invalidates pending UI but preserves exact retry payload; bad stored UUID self-recovers',async()=>{
 const d=setup(),doc=d.window.document;d.window.localStorage.setItem('pf-leaderboard-device-v1','------------------------------------');const bodies=[];let resolve;
 const b=mountLeaderboard({document:doc,game:'hurdles',enabled:true,result:doc.querySelector('#result'),fetcher:async(_url,options)=>{bodies.push(JSON.parse(options.body));return new Promise(r=>resolve=r);}});b.setResult({phase:'done',t:20});const p=doc.querySelector('.pf-leaderboard');p.open=true;p.querySelector('input').value='島';p.querySelector('[data-submit]').click();b.suspend();resolve({ok:true,json:async()=>({accepted:true})});await new Promise(r=>setTimeout(r,0));assert.equal(p.textContent.includes('已收錄本次'),false);p.querySelector('[data-submit]').click();assert.equal(bodies.length,2);assert.deepEqual(bodies[0],bodies[1]);assert.match(bodies[0].deviceId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);b.reset();d.window.close();
});
test('new result controls preserve native helper fallback Tab wrapping',async()=>{
 const {createDialogController}=await import('../public/games/long-jump/dialogs.mjs');const d=new JSDOM('<main>game</main><dialog id="result"><button id="retry">再玩</button></dialog>',{url:'https://qa.example/'}),w=d.window,doc=w.document;w.HTMLElement.prototype.getClientRects=()=>[{width:10,height:10}];const dialog=doc.querySelector('dialog');const b=mountLeaderboard({document:doc,game:'hurdles',enabled:true,result:dialog});b.setResult({phase:'done',t:20});dialog.querySelector('details').open=true;const modal=createDialogController(dialog,()=>{},{forceFallback:true});modal.open();const cancel=dialog.querySelector('[data-cancel]'),first=doc.querySelector('#retry');cancel.focus();const tab=new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});cancel.dispatchEvent(tab);assert.equal(tab.defaultPrevented,true);assert.equal(doc.activeElement,first);const back=new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true});first.dispatchEvent(back);assert.equal(back.defaultPrevented,true);assert.equal(doc.activeElement,cancel);modal.close();b.destroy();w.close();
});
test('real Hurdles result guard rejects held-contact submit until fresh released gesture',async()=>{
 const {createResultGuard,bindResultGuard}=await import('../public/games/hurdles/result-guard.mjs');const d=setup(),doc=d.window.document;let now=0,uploads=0;const guard=createResultGuard({now:()=>now});bindResultGuard(doc,guard,target=>target?.closest?.('button')?.matches?.('.pf-leaderboard [data-submit]')?target.closest('button'):null);
 const board=mountLeaderboard({document:doc,game:'hurdles',enabled:true,result:doc.querySelector('#result'),fetcher:async()=>{uploads++;return {ok:true,json:async()=>({accepted:true})}}});board.setResult({phase:'done',t:20});const panel=doc.querySelector('.pf-leaderboard');panel.open=true;panel.querySelector('input').value='島';const button=panel.querySelector('[data-submit]');doc.elementFromPoint=()=>button;
 const pointer=(type,target,id=1)=>{const e=new d.window.MouseEvent(type,{bubbles:true,clientX:10,clientY:10});Object.defineProperty(e,'pointerId',{value:id});target.dispatchEvent(e);};
 pointer('pointerdown',doc.body);guard.begin();now=1000;button.click();assert.equal(uploads,0);pointer('pointerup',doc.body);doc.body.dispatchEvent(new d.window.KeyboardEvent('keydown',{code:'Enter',bubbles:true}));now=2000;button.click();assert.equal(uploads,0);doc.body.dispatchEvent(new d.window.KeyboardEvent('keyup',{code:'Enter',bubbles:true}));now=3000;pointer('pointerdown',button,2);pointer('pointerup',button,2);button.dispatchEvent(new d.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));assert.equal(uploads,1);await new Promise(r=>setTimeout(r,0));d.window.close();
});
test('successful submit remains disabled after help/replay suspend',async()=>{
 const d=setup(),doc=d.window.document;const b=mountLeaderboard({document:doc,game:'hurdles',enabled:true,result:doc.querySelector('#result'),fetcher:async()=>({ok:true,json:async()=>({accepted:true})})});b.setResult({phase:'done',t:20});const p=doc.querySelector('.pf-leaderboard');p.open=true;p.querySelector('input').value='島';p.querySelector('[data-submit]').click();await new Promise(r=>setTimeout(r,0));b.suspend();assert.equal(p.querySelector('[data-submit]').disabled,true);b.reset();b.setResult({phase:'done',t:19});assert.equal(p.querySelector('[data-submit]').disabled,true,'new round retains the successful submission cooldown');d.window.close();
});
test('entry ranking stays after the primary start action',()=>{const d=setup(),doc=d.window.document;mountLeaderboard({document:doc,game:'hurdles',enabled:true,entry:doc.querySelector('#entry'),result:doc.querySelector('#result')});assert.equal(doc.querySelector('#entry').children[0].tagName,'BUTTON');assert.equal(doc.querySelector('#entry').lastElementChild.className,'pf-leaderboard');d.window.close();});

test('Hurdles result rank action is explicitly covered by its original guard resolver',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../public/games/hurdles/game.mjs',import.meta.url),'utf8');assert.match(source,/matches\?\.\('\.pf-leaderboard \[data-submit\], \.pf-result-ranking'\)/);});
