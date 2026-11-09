import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';

test('late thank input settles timeout before any sitting transition',()=>{for(const when of [30000,30500]){const h=harness();h.now=when;h.s.thank();assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,false);assert.equal(h.s.reason,'timer');assert.equal(h.s.player.pose,5);}});
test('accepted press survives deadline while the full seating animation completes',()=>{const h=harness();h.now=29800;h.s.thank();assert.equal(h.s.phase,'seating');assert.equal(h.s.seatReady,false);assert.equal(h.s.seated,true);h.tick(200);assert.equal(h.s.phase,'seating');h.tick(100);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,true);});
test('press exactly at deadline loses, press before deadline succeeds',()=>{for(const [start,safe]of [[30000,false],[29999,true]]){const h=harness();h.now=start;h.s.thank();h.tick(300);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,safe);assert.equal(h.s.reason,safe?'thanks':'timer');}});
test('foreground stall uses elapsed monotonic time instead of capped frame delta',()=>{const h=harness();h.stall(31000,{callbacks:false});assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,false);assert.equal(h.s.remaining,0);});
test('late delayed callback cannot manufacture a safe seat before scene update',()=>{const h=harness();h.s.busy=true;h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;let ran=false;h.s.later(1,()=>{ran=true;h.s.busy=false;h.s.seatReady=true;});h.stall(30000);assert.equal(ran,false);assert.equal(h.s.seated,false);assert.equal(h.s.phase,'depart');});
test('visible seated pose without accepted thanks always fails at deadline',()=>{for(const offer of [false,true]){const h=harness();h.s.count=8;h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;h.s.seatReady=true;h.s.busy=false;h.now=29900;if(offer){h.s.offer();assert.equal(h.s.seatReady,false);}h.tick(100);assert.equal(h.s.seated,false);}});
test('hidden seating freezes callbacks and clock until explicit Continue',()=>{const h=harness();h.now=1000;h.s.thank();h.tick(100);const remaining=h.s.roundClock.remaining(h.now),frame=h.s.player.pose;h.document.hidden=true;h.s.handleVisibilityChange();assert.equal(h.paused,true);assert.equal(h.music.audio.paused,true);h.tick(10000);assert.equal(h.s.roundClock.remaining(h.now),remaining);assert.equal(h.s.player.pose,frame);h.document.hidden=false;h.s.handleVisibilityChange();h.tick(10000);assert.equal(h.s.tabPaused,true);assert.equal(h.s.roundClock.remaining(h.now),remaining);h.s.thank();h.s.offer();assert.equal(h.s.phase,'seating');h.s.resumeRound();assert.equal(h.s.tabPaused,false);assert.equal(h.s.tweens.baselineResets,1);h.tick(200);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,true);});
test('hiding after the deadline settles failure before freezing',()=>{const h=harness();h.now=30000;h.document.hidden=true;h.s.handleVisibilityChange();assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,false);assert.equal(h.s.tabPaused,true);});
test('departure fall and result callbacks still run after deadline and after a pause',()=>{const h=harness();h.tick(30000);assert.equal(h.s.phase,'depart');h.tick(100);h.document.hidden=true;h.s.handleVisibilityChange();h.tick(10000);assert.equal(h.s.phase,'depart');h.document.hidden=false;h.s.handleVisibilityChange();h.tick(10000);assert.equal(h.s.phase,'depart');h.s.resumeRound();h.tick(200);assert.ok(h.audioCalls.includes('fall'));h.tick(1500);assert.equal(h.s.phase,'result');assert.equal(h.node('result-status-text').textContent,'屁股落地');});
test('successful departure result callbacks are not blocked by the paused round clock',()=>{const h=harness();h.s.thank();h.tick(300);assert.equal(h.s.seated,true);h.tick(1800);assert.equal(h.s.phase,'result');assert.equal(h.node('result-status-text').textContent,'安全入座');assert.ok(h.audioCalls.includes('win'));});
test('stale round callbacks cannot mutate a restarted round',()=>{const h=harness();let ran=false;h.s.later(10,()=>{ran=true;});const old=h.events[0];h.s.start();old.fn();assert.equal(ran,false);assert.equal(h.s.phase,'play');});
test('deadline synchronization must not discard threat or cooldown elapsed time',()=>{const h=harness();h.s.threat={type:0,elapsed:0,startedAt:0,side:-1};h.s.cooldown=4.2;h.s.cooldownUntil=4.2;h.now=1000;h.s.syncDeadline();h.s.update(1000,1000);assert.equal(h.s.threat.elapsed,1);assert.ok(Math.abs(h.s.cooldown-3.2)<1e-9);});

test('Both actors fall on failed departure; only safe departure selects the existing-handle pose',()=>{for(const safe of [false,true]){const h=harness();if(safe){h.s.seatAcceptedAtMs=0;h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;h.s.seatReady=true;h.s.busy=false;}h.s.depart(safe);assert.equal(h.s.player.pose,safe?4:5);assert.equal(h.s.aunt.pose,safe?6:5);}});
test('The aunt gripping hand lands on the existing background handle',()=>{const h=harness();const p=h.s.gripPlacement(),m=h.s.auntFrames[1];assert.ok(Math.abs((p.x-(m.handX-m.anchorX)*p.scale)-h.s.W*1056/1536)<1e-9);assert.ok(Math.abs((p.y-(m.height-m.handY)*p.scale)-h.s.H*211/1024)<1e-9);});
test('Late repel cannot cancel a threat whose active-time deadline already passed',()=>{const h=harness();h.s.threat={type:0,elapsed:0,startedAt:0,side:-1};h.now=3000;h.s.repel();assert.equal(h.s.phase,'depart');assert.equal(h.s.reason,'stolen');assert.equal(h.s.seated,false);});
test('A hidden threat retains its full remaining reaction window',()=>{const h=harness();h.s.threat={type:1,elapsed:0,startedAt:0,side:-1};h.tick(700);h.document.hidden=true;h.s.pauseRound();h.tick(10000);h.document.hidden=false;h.s.handleVisibilityChange();h.tick(5000);assert.equal(h.s.threat.elapsed,.7);h.s.resumeRound();h.tick(100);assert.ok(Math.abs(h.s.threat.elapsed-.8)<1e-9);assert.equal(h.s.phase,'play');});


// These exercise the real scene's rendering requests. Fixed seated frames are
// 0, 4, 8, 0; the other atlas frames belong to non-seated poses.
function spectatorState(s){return s.spectators.map(p=>({
 frame:p.sprite.frame.name,x:p.sprite.x,y:p.sprite.y,angle:p.sprite.angle,
 scaleX:p.sprite.scaleX,scaleY:p.sprite.scaleY
}));}
function assertSeatedFrames(s,label){
 assert.deepEqual(Array.from(s.spectators,p=>p.sprite.frame.name),[0,4,8,0],label);
}
for(const kind of ['courtesy','steal','repel']){
 test(`${kind} reactions keep every background passenger in its seated frame`,()=>{
  const h=harness(),before=spectatorState(h.s);
  h.s.react(kind);
  assertSeatedFrames(h.s,`${kind} must not select a standing, crouching, or sneaking frame`);
  assert.deepEqual(spectatorState(h.s),before,'reactions must preserve the seated body placement');
  assert.ok(h.s.spectators.every(p=>p.reaction?.active),'seated passengers can still react with speech marks');
  h.tick(1250);
  assertSeatedFrames(h.s,'reaction cleanup must preserve seated frames');
 });
 test(`${kind} reactions never animate background passenger bodies off their seat anchors`,()=>{
  const h=harness();h.s.react(kind);
  for(const p of h.s.spectators){
   for(const tween of h.tweens){
    const targets=Array.isArray(tween.targets)?tween.targets:[tween.targets];
    if(!targets.includes(p.sprite))continue;
    for(const key of ['x','y','angle','scaleX','scaleY']){
     if(key in tween)assert.equal(tween[key],p.sprite[key],`${kind} reaction moves spectator ${p.slot} via ${key}`);
    }
   }
  }
 });
}
test('interrupted spectator reactions stay seated through thanks, departure, resize, and replay',()=>{
 const h=harness();h.s.react('steal');h.s.thank();h.tick(300);
 assert.equal(h.s.phase,'depart');assertSeatedFrames(h.s,'thanks invalidates old callbacks without unseating spectators');
 h.s.scale.width=390;h.s.scale.height=370;h.s.layout();
 assertSeatedFrames(h.s,'resize keeps background passengers seated');
 for(const p of h.s.spectators){
  const hip=[265,270,279][p.type];
  assert.ok(Math.abs(p.sprite.y-(362-hip)*p.sprite.scaleY-h.s.seatY)<1e-9,'resized hips remain on the bench');
 }
 h.tick(1800);assert.equal(h.s.phase,'result');assertSeatedFrames(h.s,'result spectators remain seated');
 h.s.start();assert.equal(h.s.phase,'play');assertSeatedFrames(h.s,'replay spectators remain seated');
});
test('independent intruders retain standing, moving, repelled, and stolen-seat frames',()=>{
 for(const type of [0,1,2]){
  const h=harness();h.s.intruder.setTexture('intruders',type*4+1);
  h.s.threat={type,elapsed:0,startedAt:0,side:-1};h.s.positionIntruder();
  assert.equal(h.s.intruder.frame.name,type*4+1);
  h.s.threat.elapsed=1;h.s.positionIntruder();assert.equal(h.s.intruder.frame.name,type*4+2);
  h.s.repel();assert.equal(h.s.intruder.frame.name,type*4+3);
  assert.equal(h.s.intruder.texture.key,'intruders');
  h.s.threat={type,elapsed:3,startedAt:0,side:-1};h.s.steal();
  assert.equal(h.s.intruder.frame.name,type*4);assert.equal(h.s.stolen,true);
 }
});

test('reopened pause and result overlays begin at the top, not stale previous scroll',()=>{
 const h=harness();h.node('pause-overlay').scrollTop=200;h.s.pauseRound();
 assert.equal(h.node('pause-overlay').scrollTop,0);
 h.s.resumeRound();h.node('result').scrollTop=200;h.s.thank();h.tick(300);h.tick(1800);
 assert.equal(h.node('result').scrollTop,0);
});

test('departure retires action controls; ending uses full layout and replay restores play UI',()=>{
 const h=harness();h.s.thank();h.tick(300);
 assert.equal(h.node('controls').hidden,true);
 h.tick(1800);assert.equal(h.node('app').classList.contains('is-result'),true);
 h.s.start();assert.equal(h.node('controls').hidden,false);
 assert.equal(h.node('app').classList.contains('is-result'),false);
});


test('fake sitting is visual only and keeps both action buttons usable',()=>{
 const h=harness();h.s.count=3;h.now=1000;h.s.startComicEvent('fake-sit');
 assert.equal(h.s.comic.kind,'fake-sit');assert.equal(h.s.busy,false);
 assert.equal(h.node('offer').disabled,false);assert.equal(h.node('thanks').disabled,false);
 h.tick(300);assert.equal(h.s.aunt.pose,4);assert.equal(h.s.seatReady,false);assert.equal(h.s.count,3);
 assert.equal(h.s.roundClock.remaining(h.now),28.7);
});
test('Thanks interrupts fake sitting immediately and stale comic callbacks cannot undo success',()=>{
 const h=harness();h.s.count=3;h.s.startComicEvent('fake-sit');h.tick(300);h.s.thank();
 assert.equal(h.s.comic,null);assert.equal(h.s.phase,'seating');h.tick(300);h.tick(1800);
 assert.equal(h.s.seated,true);assert.equal(h.s.aunt.pose,6);assert.equal(h.s.player.pose,4);
});
test('a new offer interrupts a comic moment without adding an extra input lock',()=>{
 const h=harness();h.s.count=3;h.s.startComicEvent('passenger-urge');h.s.offer();
 assert.equal(h.s.comic,null);assert.equal(h.s.count,3);assert.equal(h.s.busy,true);
 h.tick(540);h.tick(430);assert.equal(h.s.busy,false);
});
test('real intruders preempt harmless moments and retain their full reaction window',()=>{
 const h=harness();h.s.count=4;h.s.startComicEvent('fake-sit');h.s.threatChance=1;h.s.maybeThreat();
 assert.equal(h.s.comic,null);assert.ok(h.s.threat);assert.equal(h.s.threat.elapsed,0);
});
test('comic moments never start near departure or after a safe seat, and replay clears their budget',()=>{
 const h=harness();h.s.count=6;h.now=25000;h.s.startComicEvent('fake-sit');assert.equal(h.s.comic,null);
 h.s.start();h.s.count=8;h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;h.s.seatReady=true;h.s.startComicEvent('fake-sit');assert.equal(h.s.comic,null);
 h.s.seatReady=false;h.s.startComicEvent('passenger-urge');assert.equal(h.s.comicUsed,1);
 h.s.start();assert.equal(h.s.comicUsed,0);assert.equal(h.s.comic,null);
});
test('hidden-tab pause freezes comic progression and deadline without granting a seat',()=>{
 const h=harness();h.s.count=3;h.s.startComicEvent('fake-sit');h.tick(150);const frame=h.s.aunt.pose;
 h.document.hidden=true;h.s.pauseRound();h.tick(12000);assert.equal(h.s.aunt.pose,frame);
 h.document.hidden=false;h.s.resumeRound();h.tick(150);assert.equal(h.s.aunt.pose,4);assert.equal(h.s.seatReady,false);
});
test('later offers use identical body gestures and exchange schedule',()=>{
 const low=harness();low.s.offer();const high=harness();high.s.count=10;high.s.offer();
 const lowAngle=Math.max(...low.tweens.filter(t=>t.targets===low.s.player&&typeof t.angle==='number').map(t=>Math.abs(t.angle)));
 const highAngle=Math.max(...high.tweens.filter(t=>t.targets===high.s.player&&typeof t.angle==='number').map(t=>Math.abs(t.angle)));
 assert.equal(highAngle,lowAngle);high.tick(540);high.tick(430);assert.equal(high.s.busy,false);
});

test('resizing during either comic event restores the aunt to the current scene anchor',()=>{
 for(const kind of ['fake-sit','passenger-urge']){
  const h=harness();h.s.count=3;h.s.startComicEvent(kind);h.s.scale.width=390;h.s.scale.height=370;h.s.layout();h.tick(1100);
  assert.equal(h.s.comic,null);assert.equal(h.s.aunt.x,h.s.ax);assert.ok(h.s.aunt.x<390);
 }
});

test('layout cancels active comic motion before applying new scene coordinates',()=>{
 for(const kind of ['fake-sit','passenger-urge']){
  const h=harness();h.s.count=3;h.s.startComicEvent(kind);h.tick(120);
  h.s.scale.width=390;h.s.scale.height=370;h.s.layout();
  assert.equal(h.s.comic,null);assert.equal(h.s.aunt.x,h.s.ax);assert.equal(h.s.seatReady,false);
  h.s.thank();h.tick(300);assert.equal(h.s.seated,true);
 }
});
test('scene enforces the two-event round budget and three-exchange separation',()=>{
 const h=harness();h.s.count=3;assert.equal(h.s.startComicEvent('fake-sit'),true);h.s.cancelComicEvent();
 h.s.count=5;assert.equal(h.s.startComicEvent('passenger-urge'),false);
 h.s.count=6;assert.equal(h.s.startComicEvent('passenger-urge'),true);h.s.cancelComicEvent();
 h.s.count=9;assert.equal(h.s.startComicEvent('fake-sit'),false);assert.equal(h.s.comicUsed,2);
});
test('both harmless incident types lose normally after a foreground deadline stall',()=>{
 for(const kind of ['fake-sit','passenger-urge']){
  const h=harness();h.s.count=3;h.s.startComicEvent(kind);h.stall(31000);
  assert.equal(h.s.comic,null);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,false);assert.equal(h.s.player.pose,5);
 }
});
