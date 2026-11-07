import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';

function completeOffers(h,count){for(let i=0;i<count;i++){h.s.offer();if(h.s.threat)h.s.repel();h.tick(1000);assert.equal(h.s.busy,false);}}
function resizeDuringEighthOffer(){
 const h=harness();completeOffers(h,7);h.s.offer();h.tick(600);
 h.s.scale.width=390;h.s.scale.height=370;h.s.layout();h.tick(400);return h;
}

test('control: eight completed offers without resize visibly occupy the current seat',()=>{
 const h=harness();completeOffers(h,8);
 assert.equal(h.s.player.pose,4);assert.equal(h.s.player.x,h.s.seatX);assert.equal(h.s.seatReady,true);
 h.tick(22000);assert.equal(h.s.seated,true);assert.equal(h.s.reason,'timer');
});

test('resize during the eighth return tween must not mark an off-seat player safe',()=>{
 const h=resizeDuringEighthOffer();
 assert.equal(h.s.player.pose,4);
 assert.ok(!h.s.seatReady||Math.abs(h.s.player.x-h.s.seatX)<1,
  `seatReady=${h.s.seatReady}, player.x=${h.s.player.x}, current seatX=${h.s.seatX}`);
});

test('natural departure cannot award safety to a player away from the current seat',()=>{
 const h=resizeDuringEighthOffer();
 const visiblySeatedBeforeDeparture=h.s.player.pose===4&&Math.abs(h.s.player.x-h.s.seatX)<1;
 h.tick(22000);
 assert.ok(!h.s.seated||visiblySeatedBeforeDeparture,
  'departure awarded success and teleported an off-seat player into place');
});

test('control: Thanks after a resize completes at the current seat',()=>{
 const h=harness();h.s.thank();h.tick(150);h.s.scale.width=390;h.s.scale.height=370;h.s.layout();h.tick(150);
 assert.equal(h.s.seated,true);assert.equal(h.s.player.pose,4);assert.equal(h.s.player.x,h.s.seatX);
});

// Fault-injection contract: normal scene paths currently avoid this pose mutation,
// but the deadline must not trust stale occupancy if a future animation changes it.
test('departure must reject a stale seatReady flag after the displayed pose changes',()=>{
 const h=harness();completeOffers(h,8);h.s.pose(h.s.player,2);h.tick(22000);
 assert.equal(h.s.seated,false,'a stale boolean must not override the actual displayed pose');
});


test('resize while paused cannot restore the old seat position after Continue',()=>{
 const h=harness();completeOffers(h,7);h.s.offer();h.tick(600);
 h.document.hidden=true;h.s.pauseRound();const remaining=h.s.roundClock.remaining(h.now);
 h.s.scale.width=390;h.s.scale.height=370;h.s.layout();h.tick(10000);
 assert.equal(h.s.roundClock.remaining(h.now),remaining);
 h.document.hidden=false;h.s.resumeRound();h.tick(400);
 assert.ok(!h.s.seatReady||Math.abs(h.s.player.x-h.s.seatX)<1,
  `after Continue: seatReady=${h.s.seatReady}, player.x=${h.s.player.x}, seatX=${h.s.seatX}`);
});

test('control: Thanks interrupts an eighth offer and invalidates its old callbacks and tweens',()=>{
 const h=harness();completeOffers(h,7);h.s.offer();h.tick(600);h.s.thank();h.tick(300);h.tick(1000);
 assert.equal(h.s.seated,true);assert.equal(h.s.reason,'thanks');
 assert.equal(h.s.player.pose,4);assert.equal(h.s.player.x,h.s.seatX);
});


test('departure rejects stale readiness when the actual seat display is invalid',()=>{
 const cases=[
  ['standing pose',s=>s.pose(s.player,2)],
  ['wrong texture',s=>s.player.setTexture('people',4)],
  ['wrong atlas frame',s=>s.player.setFrame(0)],
  ['horizontal gap',s=>s.player.x+=30],
  ['vertical gap',s=>s.player.y-=30],
  ['unbalanced angle',s=>s.player.angle=20],
  ['stolen seat',s=>s.stolen=true]
 ];
 for(const [label,mutate]of cases){
  const h=harness();completeOffers(h,8);assert.equal(h.s.seatReady,true);
  mutate(h.s);h.now=30000;h.s.syncDeadline();
  assert.equal(h.s.seated,false,label+' must not receive a safe result');
  assert.equal(h.s.player.pose,5,label+' must play the failed departure');
 }
});

test('an unverified success request cannot turn a standing player into a winner',()=>{
 const h=harness();h.s.seatReady=true;h.s.depart(true);
 assert.equal(h.s.seated,false);assert.equal(h.s.player.pose,5);
});
