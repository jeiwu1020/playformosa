import test from 'node:test';
import assert from 'node:assert/strict';
import {resultFor,seatedAtDeparture,seatProgress} from '../../public/games/courtesy-contest/rules.js';
test('Thank you immediately is safe but gets C with no exchanges',()=>{assert.equal(resultFor(0,true).grade,'C');assert.equal(resultFor(1,true).grade,'C');});
test('More exchanges raise safe ratings at exact thresholds',()=>{for(const [n,r] of [[2,'B'],[5,'A'],[8,'S'],[12,'SSS'],[19,'SSS']])assert.equal(resultFor(n,true).grade,r);});
test('Timeout while standing or mid-offer falls even with high score',()=>{for(const frame of [0,1,2,3,5])assert.equal(seatedAtDeparture(frame,false),false);assert.equal(seatedAtDeparture(4,true),false);assert.equal(resultFor(12,false).grade,'F+');});
test('Actual fully seated pose may naturally survive departure',()=>{assert.equal(seatedAtDeparture(4,false),true);assert.equal(resultFor(8,true).grade,'S');});
test('Progress reaches safe sitting after eight completed exchanges',()=>{assert.equal(seatProgress(0),0);assert.equal(seatProgress(3),0);assert.equal(seatProgress(4),1);assert.equal(seatProgress(7),1);assert.equal(seatProgress(8),2);assert.equal(seatProgress(99),2);});
