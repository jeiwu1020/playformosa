import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLotteryStatus,lotteryStatusText,lotteryPromptText} from '../../public/games/overtime-pinball/lottery-hud.js';
import {mobileFocus} from '../../public/games/overtime-pinball/mobile-ui.js';

const root=new URL('../../public/games/overtime-pinball/',import.meta.url);
const mobile=readFileSync(new URL('mobile-ui.css',root),'utf8');
const polish=readFileSync(new URL('play-polish.css',root),'utf8');
const main=readFileSync(new URL('main.js',root),'utf8');

test('lottery status stays concise for ready, drawing, and prize states',()=>{
 assert.equal(lotteryStatusText({phase:'ready'},0),'摸彩箱就緒 · 碰箱開獎');
 assert.equal(lotteryStatusText({phase:'drawing'},0),'摸彩開獎中');
 for(const prize of ['gate','upgrade','busy'])assert.match(lotteryStatusText({phase:'active',prize,until:9},1),/中獎.*8秒/);
 assert.equal(lotteryStatusText({phase:'ended'},0),'');
});

test('lottery box prompt avoids camera copy and keeps a short L/R countdown',()=>{
 assert.equal(lotteryPromptText({ready:false}),'摸彩箱啟動中');
 assert.equal(lotteryPromptText({ready:true,remaining:2.1}),'按 L／R 抽獎 · 3 秒後自動抽獎');
 assert.equal(lotteryPromptText(null),'');
});

test('lottery messages share one fixed, restrained arcade cue on every device',()=>{
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*position:fixed/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*font:[^}]*13px/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*background:#173d40f2/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*border:1px solid #d8c77f/);
 assert.match(mobile,/body\.pf-game\.playing\.lottery-prompt-active #lotteryStatus:not\(\[hidden\]\)[^{]*\{[^}]*visibility:visible!important/);
 assert.match(mobile,/lottery-status-active #lotteryStatus:not\(\[hidden\]\)[^{]*\{[^}]*top:calc\(var\(--pf-header-height,60px\) \+ 40px\)/);
 assert.match(mobile,/min-width:1000px[\s\S]*lottery-status-active #lotteryStatus:not\(\[hidden\]\)[^{]*\{left:calc\(50% \+ 122px\)/);
 assert.doesNotMatch(mobile,/lottery-prompt-active #controls \.flipper/);
 assert.doesNotMatch(mobile,/#comic\.raffle-pop\.pop/);
 assert.doesNotMatch(polish,/\.raffle-pop/);
});

test('desktop and mobile route lottery events through the shared anchored cue',()=>{
 assert.match(main,/lotteryStatus\.update\(game\.lottery,game\.playClock,\{enabled:mode==='playing'/);
 assert.doesNotMatch(main,/raffle-pop|raffle:true/);
 assert.match(main,/document\.body\.append\(lotteryStatusNode\)/);
});

test('fixed gameplay cue stays out of the close-up confirmation overlay',()=>{
 const doc={body:{classList:{contains:name=>name==='lottery-prompt-active'}}};
 assert.equal(mobileFocus(doc),null);
});
