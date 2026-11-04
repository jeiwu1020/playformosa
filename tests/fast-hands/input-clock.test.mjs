import test from 'node:test';import assert from 'node:assert/strict';
import {eventTime,orderedSamples} from '../../public/games/fast-hands/input-clock.mjs';
test('performance based and epoch timestamps convert to the same clock',()=>{assert.equal(eventTime({timeStamp:120},1000000000000,150),120);assert.equal(eventTime({timeStamp:1000000000120},1000000000000,150),120);});
test('invalid or far future timestamps fallback to receipt time',()=>{for(const t of [NaN,-1,Infinity,10000])assert.equal(eventTime({timeStamp:t},0,150),150);});
test('coalesced samples include parent and preserve event order',()=>{const a={timeStamp:10},b={timeStamp:11},e={timeStamp:12,getCoalescedEvents:()=>[a,b]};assert.deepEqual(orderedSamples(e),[a,b,e]);});
test('unsupported or throwing coalesced events fallback safely',()=>{const e={getCoalescedEvents(){throw Error();}};assert.deepEqual(orderedSamples(e),[e]);assert.deepEqual(orderedSamples({}),[{}]);});
test('small future clock rounding is clamped to receipt time',()=>assert.equal(eventTime({timeStamp:1004},0,1000),1000));
