import test from 'node:test';
import assert from 'node:assert/strict';
import {resultFor,seatedAtDeparture,seatProgress} from '../../public/games/courtesy-contest/rules.js';
test('Thank you immediately is safe but gets C with no exchanges',()=>{assert.equal(resultFor(0,true).grade,'C');assert.equal(resultFor(1,true).grade,'C');});
test('More exchanges raise safe ratings at exact thresholds',()=>{for(const [n,r] of [[2,'B'],[5,'A'],[8,'S'],[12,'SSS'],[19,'SSS']])assert.equal(resultFor(n,true).grade,r);});
test('Timeout while standing or mid-offer falls even with high score',()=>{for(const frame of [0,1,2,3,5])assert.equal(seatedAtDeparture(frame,false),false);assert.equal(seatedAtDeparture(4,true),false);assert.equal(resultFor(12,false).grade,'F+');});
test('Only accepted thanks and a completed seated pose may depart safely',()=>{assert.equal(seatedAtDeparture(4,false),false);assert.equal(seatedAtDeparture(4,false,true),true);assert.equal(seatedAtDeparture(4,true,true),false);assert.equal(resultFor(8,true).grade,'S');});
test('Exchange count never creates natural seating progress',()=>{for(const count of [0,3,4,7,8,99])assert.equal(seatProgress(count),0);});
