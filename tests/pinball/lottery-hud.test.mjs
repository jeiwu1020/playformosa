import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLotteryStatus,lotteryStatusText,lotteryPromptText,lotteryStatusPresentation,lotteryPromptPresentation} from '../../public/games/overtime-pinball/lottery-hud.js';
import {mobileFocus} from '../../public/games/overtime-pinball/mobile-ui.js';

const root=new URL('../../public/games/overtime-pinball/',import.meta.url);
const mobile=readFileSync(new URL('mobile-ui.css',root),'utf8');
const polish=readFileSync(new URL('play-polish.css',root),'utf8');
const main=readFileSync(new URL('main.js',root),'utf8');

test('lottery status stays concise for ready, drawing, and prize states',()=>{
 assert.equal(lotteryStatusText({phase:'ready'},0),'');
 const status=createLotteryStatus(),ready={phase:'ready'};
 assert.equal(status.presentation(ready,0),null);
 assert.equal(status.presentation(ready,16),null);
 const active={phase:'active',prize:'busy',drawId:1,until:25};
 assert.equal(status.presentation(active,17)?.phase,'active');
 assert.equal(status.presentation(active,18.99)?.phase,'active');
 assert.equal(status.presentation(active,19),null);
 assert.equal(lotteryStatusText({phase:'drawing'},0),'尾牙摸彩 · 抽獎中 · 人人有獎 · 獎項即將揭曉');
 for(const prize of ['gate','upgrade','busy'])assert.match(lotteryStatusText({phase:'active',prize,until:9},1),/摸彩中獎.*8 秒/);
 assert.equal(lotteryStatusText({phase:'ended'},0),'');
});

test('lottery box prompt avoids camera copy and keeps a short L/R countdown',()=>{
 assert.equal(lotteryPromptText({ready:false}),'準備抽獎…');
 assert.equal(lotteryPromptText({ready:true,remaining:2.1}),'按 L／R 開始抽獎 · 3 秒後自動抽獎');
 assert.equal(lotteryPromptText(null),'');
 assert.deepEqual(lotteryPromptPresentation({ready:true,remaining:2.1}),{phase:'prompt',kicker:'尾牙摸彩',headline:'輪到你抽獎了',detail:'按 L／R 開始抽獎 · 3 秒後自動抽獎'});
});

test('lottery result presentation gives the winning prize a clear, designed hierarchy',()=>{
 const result=lotteryStatusPresentation({phase:'active',prize:'busy',until:9},1);
 assert.equal(result.phase,'active');assert.equal(result.kicker,'✦ 摸彩中獎');assert.equal(result.headline,'全公司都在裝忙');assert.match(result.detail,/撞一台，全公司一起演！ · 8 秒/);
});

test('lottery messages share a readable, anchored arcade result card on every device',()=>{
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*position:fixed/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*font:[^}]*13px/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*background:#173d40f2/);
 assert.match(mobile,/body\.pf-game\.playing #lotteryStatus\{[^}]*border:1px solid #d8c77f/);
 assert.match(mobile,/lottery-status__headline[^}]*font-size:20px/);
 assert.match(mobile,/lottery-status__detail[^}]*font-size:14px/);
 assert.match(mobile,/lottery-status-active #lotteryStatus[^}]*top:clamp\(96px,17vh,180px\)/);
 assert.match(mobile,/body\.pf-game\.playing\.lottery-prompt-active #lotteryStatus:not\(\[hidden\]\)[^{]*\{[^}]*visibility:visible!important/);
 assert.match(mobile,/lottery-status-active #lotteryStatus:not\(\[hidden\]\)[^{]*\{[^}]*left:calc\(50% \+ 122px\)/);
 assert.doesNotMatch(mobile,/lottery-prompt-active #controls \.flipper/);
 assert.doesNotMatch(mobile,/#comic\.raffle-pop\.pop/);
 assert.doesNotMatch(polish,/\.raffle-pop/);
});

test('desktop and mobile route lottery events through the shared anchored cue',()=>{
 assert.match(main,/lotteryStatus\.presentation\(game\.lottery,game\.playClock,\{enabled:mode==='playing'/);
 assert.doesNotMatch(main,/raffle-pop|raffle:true/);
 assert.match(main,/document\.body\.append\(lotteryStatusNode\)/);
 assert.match(main,/lotteryStatusKicker\.textContent/);
 assert.match(main,/lotteryDrawActorUntil/);
});

test('fixed gameplay cue stays out of the close-up confirmation overlay',()=>{
 const doc={body:{classList:{contains:name=>name==='lottery-prompt-active'}}};
 assert.equal(mobileFocus(doc),null);
});
