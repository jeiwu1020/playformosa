import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';
for(const at of [0,29699,29700,29999,29999.999])test(`valid thanks at ${at} locks score before animation/deadline`,()=>{
 const h=harness();h.now=at;h.s.thank();assert.equal(h.s.seated,true);assert.equal(h.s.seatAcceptedAtMs,at);assert.equal(h.s.phase,'seating');
 h.tick(299);assert.equal(h.s.phase,'seating');h.tick(1);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,true);assert.equal(h.s.seatAcceptedAtMs,at);
 h.tick(1800);assert.equal(h.s.phase,'result');assert.match(h.node('result-remaining').textContent,/按下謝謝時剩/);
});
test('unfinished offer and repeated inputs never alter locked count or press time',()=>{
 const h=harness();h.s.offer();h.tick(400);h.s.thank();const at=h.s.seatAcceptedAtMs;h.s.thank();h.s.offer();h.tick(300);h.tick(1800);assert.equal(h.s.count,0);assert.equal(h.s.seatAcceptedAtMs,at);assert.equal(h.s.seated,true);
});
test('already seated thanks records this press, not earlier mutual-offer seating',()=>{
 const h=harness();h.s.count=8;h.s.seatReady=true;h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;h.s.seatSettledAtMs=10000;h.now=29999;h.s.thank();assert.equal(h.s.seatAcceptedAtMs,29999);h.tick(300);assert.equal(h.s.seated,true);
});
test('accepted final-millisecond seat survives hidden pause and resumes animation only',()=>{
 const h=harness();h.now=29999;h.s.thank();h.tick(100);h.document.hidden=true;h.s.pauseRound();h.tick(20000);assert.equal(h.s.phase,'seating');assert.equal(h.s.seatAcceptedAtMs,29999);h.document.hidden=false;h.s.resumeRound();h.tick(199);assert.equal(h.s.phase,'seating');h.tick(1);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,true);
});
test('intruder at exact expiry beats thanks but earlier thanks cancels threat',()=>{
 for(const at of [1799.999,1800]){const h=harness();h.s.threat={type:0,elapsed:0,startedAtMs:0,expiresAtMs:1800,side:-1};h.now=at;h.s.thank();assert.equal(h.s.seated,at<1800);assert.equal(h.s.seatAcceptedAtMs,at<1800?at:null);}
});
test('restart invalidates accepted animation and its score',()=>{
 const h=harness();h.s.thank();const old=[...h.events];h.s.start();for(const e of old)e.fn();h.tick(300);assert.equal(h.s.phase,'play');assert.equal(h.s.seated,false);assert.equal(h.s.seatAcceptedAtMs,null);
});
test('foreground stall after accepted press cannot undo success at animation completion',()=>{
 const h=harness();h.now=29999;h.s.thank();h.stall(1000);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,true);assert.equal(h.s.seatAcceptedAtMs,29999);
});
for(const [at,display] of [[0,'30.00'],[29699.999,'0.31'],[29700,'0.30'],[29989.999,'0.02'],[29990,'0.01'],[29999.999,'0.01']])test(`press-time display rounds remaining upward at ${at}ms`,()=>{
 const h=harness();h.now=at;h.s.thank();h.tick(300);h.tick(1800);assert.equal(h.node('result-remaining').textContent,`按下謝謝時剩 ${display} 秒`);
});
