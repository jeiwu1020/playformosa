import test from 'node:test';import assert from 'node:assert/strict';
import {bestKey,readBest,saveBest} from '../../public/games/fast-hands/records.mjs';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
test('keys isolate modes and old gameplay',()=>{assert.notEqual(bestKey('mouse'),bestKey('touch'));assert.notEqual(bestKey('mouse'),'fast-note-duck-v2:mouse');assert.match(bestKey('mouse'),/shuttle-v3/);});
test('save only finite positive successful durations',()=>{const a=storage();for(const ms of [NaN,Infinity,0,-1])assert.equal(saveBest(a,'mouse',ms),null);assert.equal(a.m.size,0);});
test('best improves only downward',()=>{const a=storage();assert.equal(saveBest(a,'mouse',400),400);assert.equal(saveBest(a,'mouse',500),400);assert.equal(saveBest(a,'mouse',300),300);});
test('old record untouched and invalid records ignored',()=>{const a=storage();a.setItem('fast-note-duck-v2:mouse','1');a.setItem(bestKey('mouse'),'NaN');assert.equal(readBest(a,'mouse'),null);saveBest(a,'mouse',300);assert.equal(a.getItem('fast-note-duck-v2:mouse'),'1');});
test('blocked localStorage does not break game',()=>{const a={getItem(){throw Error();},setItem(){throw Error();}};assert.equal(readBest(a,'touch'),null);assert.equal(saveBest(a,'touch',300),null);});
