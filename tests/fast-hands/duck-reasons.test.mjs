import test from 'node:test';import assert from 'node:assert/strict';
import {describeResult} from '../../public/games/fast-hands/result-copy.mjs';
import {arm,move,newRun,release} from '../../public/games/fast-hands/shuttle.mjs';
for(const pickupAt of [null,undefined,NaN])test(`missing observation ${pickupAt}`,()=>{const r=describeResult({phase:'cancelled',reason:'released',pickupAt,elapsedMs:100});assert.equal(r.comment,'No duck-zone entry detected before release.');assert.equal(r.timeText,'未完成');assert.equal(r.success,false);});
for(const pickupAt of [0,110])test(`observed pickup ${pickupAt}`,()=>{assert.equal(describeResult({phase:'cancelled',reason:'released',pickupAt}).comment,'Duck zone detected. Return to bill zone not detected.');});
const cases=[
['pointercancel','Input interrupted. Please try again.'],['lost-capture','Input interrupted. Please try again.'],['lostpointercapture','Input interrupted. Please try again.'],
['blur','Game window inactive. Round interrupted.'],['hidden','Game window inactive. Round interrupted.'],
['resize','Screen size changed. Round interrupted.'],
...['help','ranking','intro','settings','mode-change'].map(r=>[r,'Menu opened or mode changed. Round interrupted.']),
['unknown','Round incomplete. Please try again.']];
for(const [reason,comment] of cases)test(reason,()=>{const r=describeResult({phase:'cancelled',reason,elapsedMs:40});assert.equal(r.comment,comment);assert.equal(r.timeText,'未完成');assert.equal(r.success,false);});
for(const pickupAt of [null,100])test(`timeout is explicit ${pickupAt}`,()=>{assert.equal(describeResult({phase:'failed',reason:'note-floor',pickupAt}).comment,pickupAt===null?'Time up. No duck-zone entry detected.':'Time up. Return to bill zone not detected.');});
test('equal-time ignored input not blamed on player',()=>{let s=arm(newRun(),{x:.1,at:100,id:7});s=move(s,{x:.5,at:110,id:7});s=move(s,{x:.9,at:110,id:7});s=move(s,{x:.1,at:210,id:7});s=release(s,{at:220,id:7});assert.equal(describeResult(s).comment,'No duck-zone entry detected before release.');});
