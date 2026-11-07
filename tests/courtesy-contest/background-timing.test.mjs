import test from 'node:test';
import assert from 'node:assert/strict';
import {ActiveRoundClock,departureIsSafe} from '../../public/games/courtesy-contest/round-clock.js';
test('Background time freezes the full active-time budget until explicit resume',()=>{const c=new ActiveRoundClock(20);c.start(1000);assert.equal(c.remaining(6000),15);c.pause(6000);assert.equal(c.remaining(66000),15);c.resume(66000);assert.equal(c.remaining(69000),12);});
test('Repeated pause/resume cannot create or lose gameplay time',()=>{const c=new ActiveRoundClock(20);c.start(0);c.pause(3000);c.pause(8000);c.resume(20000);c.resume(23000);assert.equal(c.remaining(24000),13);});
test('Expired clocks stay expired and reject late seat claims',()=>{const c=new ActiveRoundClock(20);c.start(0);assert.equal(c.expired(20000),true);c.pause(22000);c.resume(40000);assert.equal(c.remaining(41000),0);assert.equal(departureIsSafe({seatReady:false,busy:false}),false);assert.equal(departureIsSafe({seatReady:true,busy:true}),false);assert.equal(departureIsSafe({seatReady:true,busy:false,accepted:true}),true);});
test('A fresh round does not inherit the previous pause',()=>{const c=new ActiveRoundClock(20);c.start(0);c.pause(1000);c.start(20000);assert.equal(c.remaining(21000),19);assert.equal(c.paused,false);});
test('a seated pose alone cannot bypass explicit accepted thanks',()=>{assert.equal(departureIsSafe({seatReady:true,busy:false}),false);assert.equal(departureIsSafe({seatReady:true,busy:false,accepted:true}),true);});
