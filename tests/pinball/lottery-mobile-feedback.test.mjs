import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../public/games/overtime-pinball/',import.meta.url);
const mobile=readFileSync(new URL('mobile-ui.css',root),'utf8');
const polish=readFileSync(new URL('play-polish.css',root),'utf8');
const main=readFileSync(new URL('main.js',root),'utf8');

test('mobile exposes only the active raffle popup above the generic hidden comic cue',()=>{
 const hidden=mobile.indexOf('body.pf-game.playing #comic,');
 const visible=mobile.indexOf('body.pf-game.playing #comic.raffle-pop.pop');
 assert.ok(hidden>=0&&visible>hidden,'active raffle override follows the general mobile hide rule');
 const rule=mobile.slice(visible,mobile.indexOf('}',visible));
 assert.match(rule,/display:block!important/);
 assert.match(rule,/visibility:visible!important/);
 assert.match(rule,/left:50%!important/);
 assert.match(rule,/pointer-events:none/);
 assert.match(polish,/comic\.raffle-pop\{[^}]*font-size:clamp\(24px,/);
});

test('raffle prompt has a close-up overlay style on both phone and short landscape screens',()=>{
 assert.match(mobile,/lottery-prompt-active #lotteryStatus\{[^}]*position:fixed/);
 assert.match(mobile,/lottery-prompt-active #lotteryStatus\{[^}]*font:[^}]*text-align:center/);
 assert.match(mobile,/orientation:landscape\) and \(max-height:600px\)[\s\S]*lottery-prompt-active #lotteryStatus/);
 assert.match(main,/game\.lotteryPrompt\?\{stage:'work',dock:game\.lotteryPrompt\.dock,from:game\.lotteryPrompt\.from\}/);
});

test('fixed cue stays out of the close-up confirmation overlay',async()=>{
 const {mobileFocus}=await import('../../public/games/overtime-pinball/mobile-ui.js');
 const doc={body:{classList:{contains:name=>name==='lottery-prompt-active'}}};
 assert.equal(mobileFocus(doc),null);
});
