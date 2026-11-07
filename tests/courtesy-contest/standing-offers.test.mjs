import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';
import {courtesyMotion} from '../../public/games/courtesy-contest/comic-events.js';
import {seatProgress,seatedAtDeparture} from '../../public/games/courtesy-contest/rules.js';
test('all counts retain opening motion and no natural seating progress',()=>{
 for(const count of [0,3,4,7,8,10,29,30,99,Number.MAX_SAFE_INTEGER]){assert.deepEqual(courtesyMotion(count),courtesyMotion(0));assert.equal(seatProgress(count),0);}
 assert.equal(seatedAtDeparture(4,false),false);
});
test('30 completed exchanges retain identical standing pose and anchor until deadline failure',()=>{
 const h=harness();
 for(let i=0;i<30;i++){
  h.s.offer();if(h.s.threat)h.s.repel();h.tick(970);
  assert.equal(h.s.count,i+1);assert.equal(h.s.player.pose,2);assert.equal(h.s.aunt.pose,1);assert.equal(h.s.player.x,h.s.px);assert.equal(h.s.seatReady,false);assert.equal(h.s.seated,false);
 }
 h.tick(900);assert.equal(h.s.phase,'depart');assert.equal(h.s.seated,false);assert.equal(h.s.reason,'timer');
});
test('high-count offers use identical pose sequences and movement as opening exchange',()=>{
 const snapshots=[];
 for(const count of [0,4,8,20,999]){const h=harness();h.s.count=count;h.s.offer();if(h.s.threat)h.s.repel();const frames=[];for(let i=0;i<97;i++){h.tick(10);frames.push([h.s.player.pose,h.s.aunt.pose,h.s.player.x,h.s.aunt.x,h.s.player.angle,h.s.player.lift]);}snapshots.push(frames);}
 for(const frames of snapshots.slice(1))assert.deepEqual(frames,snapshots[0]);
});
test('high-count resize preserves standing anchor and thanks remains the only success route',()=>{
 const h=harness();h.s.count=29;h.s.layout();assert.equal(h.s.player.x,h.s.px);h.s.scale.width=390;h.s.scale.height=370;h.s.layout();assert.equal(h.s.player.x,h.s.px);
 h.now=29999;h.s.thank();assert.equal(h.s.seated,true);h.tick(300);assert.equal(h.s.player.pose,4);assert.equal(h.s.player.x,h.s.seatX);assert.equal(h.s.count,29);
});
test('forged natural seated pose cannot succeed without accepted thanks',()=>{
 const h=harness();h.s.pose(h.s.player,4);h.s.player.x=h.s.seatX;h.s.seatReady=true;h.s.busy=false;h.now=30000;h.s.syncDeadline();assert.equal(h.s.seated,false);
});
