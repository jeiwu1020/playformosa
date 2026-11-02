import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createEntryShell} from '../public/games/shared/entry-shell.mjs';
import {helpIsOpen} from '../public/games/shared/help-coordinator.mjs';

function setup(){const dom=new JSDOM('<!doctype html><body><main><button>scene</button></main></body>',{url:'https://example.test/'});return {dom,d:dom.window.document};}
// Catch missing pause admission, accidental resume on auxiliary return, and stale owner restoration.
test('shared pause owns one modal, returns from ranking paused, and resumes only on explicit continue',()=>{
 const {dom,d}=setup();let running=false,starts=0,resumes=0,restores=0;
 const shell=createEntryShell({document:d,title:'跨欄',goal:'跨過去',operations:['跑','跳'],onStart(){starts++;},onHelpEnter(){running=false;return ()=>{restores++;}},forceFallback:true});
 assert.equal(typeof shell.configurePause,'function');shell.configurePause({onContinue(){running=true;resumes++;},onRestart(){starts++;},canContinue:()=>true});
 shell.openPause();assert.equal(shell.active,true);assert.equal(helpIsOpen(d),true);assert.equal(d.querySelectorAll('dialog[open]').length,1);assert.equal(shell.dialog.querySelector('[data-pf-continue]').textContent,'繼續遊戲');
 assert.equal(shell.dialog.querySelector('.pf-pause-help'),null);assert.equal(shell.dialog.querySelector('[data-pf-pause]').textContent.includes('操作說明'),false);
 const board=d.createElement('section');board.textContent='實際榮譽榜';shell.setRankingAction(()=>shell.openView(board,{label:'榮譽榜'}));shell.dialog.querySelector('[data-pf-pause-ranking]').click();
 assert.equal(d.querySelectorAll('dialog[open]').length,1);shell.dialog.querySelector('[data-pf-view-return]').click();assert.equal(running,false);assert.equal(resumes,0);assert.ok(shell.dialog.querySelector('[data-pf-continue]'));
 shell.dialog.querySelector('[data-pf-continue]').click();assert.equal(running,true);assert.equal(resumes,1);assert.equal(starts,0);assert.equal(restores,0);assert.equal(helpIsOpen(d),false);assert.equal(d.querySelector('main').hasAttribute('inert'),false);shell.destroy();dom.window.close();
});
test('help return may open shared pause reentrantly without clobbering active state or focus',()=>{
 const{dom,d}=setup();let resumed=0;let shell;
 shell=createEntryShell({document:d,title:'跨欄',goal:'goal',operations:['a','b'],onStart(){},onHelpEnter(){return()=>shell.openPause();},forceFallback:true});
 assert.equal(typeof shell.configurePause,'function');shell.configurePause({onContinue(){resumed++;},onRestart(){}});shell.open({help:true});shell.dialog.querySelector('.pf-entry-start').click();
 assert.equal(shell.active,true);assert.equal(helpIsOpen(d),true);assert.equal(d.querySelectorAll('dialog[open]').length,1);assert.equal(d.activeElement,shell.dialog.querySelector('[data-pf-continue]'));assert.equal(resumed,0);shell.close({restoreView:false});shell.destroy();dom.window.close();
});
test('entry/result help ownership remains distinct and restart discards stale pause restore',()=>{
 const{dom,d}=setup();let starts=0,restores=0;const shell=createEntryShell({document:d,title:'x',goal:'g',operations:['a','b'],onStart(){starts++;},onHelpEnter(){return()=>restores++;},forceFallback:true});
 assert.equal(typeof shell.configurePause,'function');shell.configurePause({onContinue(){},onRestart(){starts++;}});
 shell.open();shell.open({help:true});shell.dialog.querySelector('.pf-entry-start').click();assert.equal(shell.active,true);assert.equal(starts,0);assert.equal(restores,0);assert.equal(shell.dialog.querySelector('.pf-entry-start').textContent,'開始遊戲');shell.close();
 shell.open({help:true});shell.dialog.querySelector('.pf-entry-start').click();assert.equal(restores,1);assert.equal(shell.active,false);
 shell.openPause();shell.dialog.querySelector('[data-pf-restart]').click();assert.equal(starts,1);assert.equal(restores,1);assert.equal(shell.active,false);shell.destroy();dom.window.close();
});

test('discarding a paused view clears panel suspension without reopening the old dialog',async()=>{
 const{createHelpCoordinator,suspendHelpPresentation}=await import('../public/games/shared/help-coordinator.mjs');const{dom,d}=setup(),panel=d.createElement('div');d.body.append(panel);let restored=0;
 const owner=createHelpCoordinator(d,()=>suspendHelpPresentation(d,{panels:[panel],after:()=>restored++}));owner.enter();assert.ok(panel.hasAttribute('data-pf-help-suspended'));owner.leave({restoreView:false});assert.equal(panel.hasAttribute('data-pf-help-suspended'),false);assert.equal(restored,0);dom.window.close();
});

test('canonical help request during pause swaps the same modal and returns to pause without resuming',()=>{
 const{dom,d}=setup();let resumes=0;const shell=createEntryShell({document:d,title:'x',goal:'g',operations:['跑','跳'],onStart(){},forceFallback:true});shell.configurePause({onContinue(){resumes++;},onRestart(){}});shell.openPause();shell.open({help:true});assert.equal(shell.dialog.querySelector('[data-pf-pause]').hidden,true);assert.equal(shell.dialog.querySelector('.pf-entry-operations').closest('[inert]'),null);assert.equal(d.querySelectorAll('dialog[open]').length,1);shell.dialog.querySelector('[data-pf-menu-stash] .pf-entry-start').click();assert.equal(shell.dialog.querySelector('[data-pf-pause]').hidden,false);assert.equal(d.activeElement,shell.dialog.querySelector('[data-pf-continue]'));assert.equal(resumes,0);shell.destroy();dom.window.close();
});

test('new pause opens from its own top rather than inheriting a scrolled entry/help view',()=>{const{dom,d}=setup(),shell=createEntryShell({document:d,title:'x',goal:'g',operations:[],onStart(){},forceFallback:true});shell.configurePause({onContinue(){},onRestart(){}});shell.open();shell.dialog.scrollTop=180;shell.close();shell.openPause();assert.equal(shell.dialog.scrollTop,0);shell.destroy();dom.window.close();});

test('explicit return-to-entry discards pause ownership and does not start or resume the game',()=>{const{dom,d}=setup();let starts=0,resumes=0;const shell=createEntryShell({document:d,title:'x',goal:'g',operations:[],onStart(){starts++},forceFallback:true});shell.configurePause({onContinue(){resumes++},onRestart(){starts++}});shell.openPause();shell.open();assert.equal(helpIsOpen(d),false);assert.equal(shell.dialog.classList.contains('pf-pause-dialog'),false);assert.equal(shell.dialog.querySelector('.pf-entry-start').textContent,'開始遊戲');assert.equal(starts,0);assert.equal(resumes,0);shell.destroy();dom.window.close();});
