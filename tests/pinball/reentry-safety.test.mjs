import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,BUMPERS,FIELD} from '../../public/games/overtime-pinball/physics.js';
import {stationShapes,sweepCircle,sweepRect} from '../../public/games/overtime-pinball/contact.js';
import {SOLID_PROPS} from '../../public/games/overtime-pinball/board-features.js';
import {ASSIST_OBSTACLES} from '../../public/games/overtime-pinball/assist-machines.js';
const tick=(g,seconds,input={})=>{for(let n=0;n<Math.round(seconds/STEP);n++)g.update(STEP,input);};
const create=(limit,view='reverse')=>{const g=new Game({roundLimit:limit,view,patrol:false});g.start();g.drainEvents();return g;};
function drain(g,x=0){Object.assign(g.ball,{x,z:50.01,vx:0,vz:12});g.update(STEP);assert.ok(g.round.reentry);}
for(const limit of [60,180])for(const view of ['reverse','original'])test(`${limit}s ${view}: all exit lanes return into clear upper-office space with reaction time`,()=>{
 for(const x of [-8,-3,0,3,8]){
  const g=create(limit,view);drain(g,x);tick(g,1.5);assert.equal(g.round.reentry,null);
  assert.ok(g.ball.z<0,'return must start in upper office, not directly above exit');assert.ok(FIELD.drain-g.ball.z>50,'at least a full upper-field exit buffer');
  for(const o of [...BUMPERS,...SOLID_PROPS,...ASSIST_OBSTACLES])for(const shape of stationShapes(o,view))assert.equal(shape.hx?sweepRect(g.ball,g.ball,shape,g.ball.r):sweepCircle(g.ball,g.ball,shape,g.ball.r),null,`clear of ${o.id}`);
  assert.ok(Math.hypot(g.ball.vx,g.ball.vz)<20,'controlled return, not a full-power ricochet');
  const side=g.ball.vx;g.drainEvents();tick(g,.8);
  assert.equal(g.round.reentries,1);assert.equal(g.state,'playing');assert.ok(g.ball.z<15);
  assert.equal(g.drainEvents().some(e=>['hit','propHit','interactionStart','mailStart','bossKick'].includes(e.type)),false,'initial travel leaves time before equipment contact');
  assert.ok(side!==0,'launch toward a side aisle, not directly at copier');
 }
});
for(const limit of [60,180])test(`${limit}s repeated returns preserve awards and cooldowns, count down, and alternate center exits`,()=>{
 const g=create(limit);g.award('work',1200);g.stationReady.copier=99;g.specialReady=90;g.mailReady=80;g.comboRoutes.ready.paper=70;g.lamps=[true,false,true];g.workflow.lights=[true,false,true];
 let lastSide=0;for(let n=0;n<8;n++){
  g.combo=4;drain(g);const paid=g.time,score=g.score,remaining=g.round.remaining;tick(g,1.5,{left:true,right:true});
  assert.equal(g.time,paid);assert.equal(g.score,score);assert.ok(Math.abs(g.round.remaining-(remaining-1.5))<1e-6);assert.equal(g.combo,0);
  assert.equal(g.stationReady.copier,99);assert.equal(g.mailReady,80);assert.equal(g.specialReady,90);assert.equal(g.comboRoutes.ready.paper,70);assert.deepEqual(g.lamps,[true,false,true]);assert.deepEqual(g.workflow.lights,[true,false,true]);
  assert.equal(g.ball.x,0);if(lastSide)assert.equal(Math.sign(g.ball.vx),-lastSide);lastSide=Math.sign(g.ball.vx);
  assert.equal(g.tapQueue.length,0);assert.equal(g.flipperStroke.left,0);assert.equal(g.flipperStroke.right,0);
 }
 assert.equal(g.round.reentries,8);assert.equal(g.bonus,1200);
});
test('timeout during the return still cancels travel and settles exactly once',()=>{
 const g=create(60);g.round.remaining=.5;drain(g);const score=g.score;tick(g,3);
 assert.equal(g.state,'over');assert.equal(g.round.reason,'time');assert.equal(g.round.reentry,null);assert.equal(g.score,score);
 const es=g.drainEvents();assert.equal(es.filter(e=>e.type==='reentryEnd').length,0);assert.equal(es.filter(e=>e.type==='over').length,1);
});
test('unlimited mode never receives a return or grace period and drains once',()=>{
 const g=create(0);Object.assign(g.ball,{x:0,z:50.01,vx:0,vz:12});g.update(STEP);const score=g.score;tick(g,5);
 assert.equal(g.state,'over');assert.equal(g.round.reason,'drain');assert.equal(g.round.reentry,null);assert.equal(g.round.reentries,0);assert.equal(g.score,score);assert.equal(g.drainEvents().filter(e=>e.type==='over').length,1);
});

test('return animation stays inside existing horizontal camera envelope without running collisions',()=>{
 for(const view of ['reverse','original'])for(const x of [-17.35,-8,0,8,17.35]){
  const g=create(60,view);drain(g,x);const score=g.score;g.drainEvents();
  while(g.round.reentry){g.update(STEP);assert.ok(Math.abs(g.ball.x)<=24.5,`camera envelope x=${g.ball.x}`);assert.equal(g.score,score);}
  const es=g.drainEvents();assert.equal(es.some(e=>['hit','propHit','interactionStart','mailStart','lamp'].includes(e.type)),false);
 }
});
test('both timed modes survive the first two seconds after return with neutral or held controls',()=>{
 for(const view of ['reverse','original'])for(const limit of [60,180])for(const x of [-8,0,8])for(const input of [{},{left:true},{right:true},{left:true,right:true}]){
  const g=create(limit,view);drain(g,x);tick(g,1.5);tick(g,2,input);assert.equal(g.state,'playing');assert.equal(g.round.reentries,1,'no immediate repeat drain');
 }
});
