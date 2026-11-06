import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,input,step,guidance,targetBank,FIXED_DT} from '../../public/games/run-400m/race.mjs';
const pulse=(r,key)=>{input(r,0,key,true);input(r,0,key,false);};
function running(distance=0){const r=createRace();r.phase='race';const p=r.runners[0];p.distance=distance;p.held[2]=true;input(r,0,2,false);return r;}
const advance=(r,time)=>{for(let i=0;i<Math.round(time/FIXED_DT);i++)step(r,FIXED_DT);};
function oneStride(distance,gap){const r=running(distance);advance(r,gap);const p=r.runners[0],before=p.v;pulse(r,2);return{r,p,impulse:p.v-before};}
test('same 0.27s stride is good at start but early during cruise; 0.46s reverses that',()=>{
 assert.equal(oneStride(0,.27).p.stepRating,'perfect');assert.equal(oneStride(100,.27).p.stepRating,'early');
 assert.equal(oneStride(100,.46).p.stepRating,'perfect');assert.equal(oneStride(0,.46).p.stepRating,'late');
 assert.equal(oneStride(350,.29).p.stepRating,'perfect');
});
test('fixed green window is reached faster at start and finish than mid-race',()=>{
 const a=running(0),b=running(100),c=running(350);for(const r of[a,b,c])r.time=.2;
 assert.ok(guidance(a).beat>guidance(b).beat*1.5);assert.ok(guidance(c).beat>guidance(b).beat*1.4);
 assert.equal(guidance(a).bandStart,guidance(b).bandStart);assert.equal(guidance(b).bandEnd,guidance(c).bandEnd);
 assert.ok(guidance(a).bandEnd-guidance(a).bandStart<.3);
});
test('slightly early steps still propel, but less than an on-time step',()=>{
 const on=oneStride(100,.46),early=oneStride(100,.33);assert.ok(early.impulse>0);assert.ok(early.impulse<on.impulse*.9);
});
test('crossing a phase boundary never moves the target for a step already underway',()=>{
 const r=running(19),p=r.runners[0];r.time=.15;const before=guidance(r);p.distance=35;assert.equal(guidance(r).beat,before.beat);
 r.time=.27;pulse(r,2);assert.equal(p.stepRating,'perfect');assert.ok(p.beatTarget>.27);
});
test('wrong-foot and sub-105ms spam cannot earn a green hit',()=>{
 const r=running(100),p=r.runners[0];r.time=.46;pulse(r,2);const count=p.perfectSteps;r.time=.5;pulse(r,3);assert.equal(p.perfectSteps,count);r.time=.92;pulse(r,2);assert.equal(p.stepRating,'wrong');assert.equal(p.perfectSteps,count);
});
test('phase logic never rescales the race clock or distance',()=>{
 for(const distance of [0,100,350]){const r=running(distance);r.runners[0].v=0;advance(r,1);assert.ok(Math.abs(r.time-1)<1e-10);assert.equal(r.runners[0].distance,distance);}
});
function lap(multiplier=1,steer=true){const r=createRace(42);input(r,0,2,true);input(r,0,3,true);let side=0,nextHand=0;for(let tick=0;tick<120*140;tick++){const p=r.runners[0];if(r.phase==='race'&&!p.started){input(r,0,2,false);input(r,0,3,false);}if(p.started&&p.finished===null){const target=p.beatTarget??.46;if(r.time-p.lastStep>=target*multiplier){pulse(r,2+side);side=1-side;}if(steer&&r.time>=nextHand){const d=targetBank(p)-p.bank;if(Math.abs(d)>.07)pulse(r,d>0?0:1);nextHand=r.time+.4;}if(p.distance>399){input(r,0,0,true);input(r,0,1,true);}}step(r,FIXED_DT);if(p.finished!==null)return p;}return r.runners[0];}
test('following phase coaching completes quickly, while offbeat still finishes more slowly',()=>{
 const good=lap(),off=lap(1.3);assert.notEqual(good.finished,null);assert.notEqual(off.finished,null);assert.equal(good.falls,0);assert.ok(good.finished<70);assert.ok(off.finished>good.finished+2);assert.ok(off.finished<140);
});
test('ignoring hands on bends causes a visible cost; corrections avoid falls',()=>{
 const good=lap(),noHands=lap(1,false);assert.ok(noHands.falls>=1);assert.ok(noHands.finished>good.finished+3);
});
test('green-window boundaries agree with the actual hit rating',()=>{
 for(const [gap,expected] of [[.38,'perfect'],[.46,'perfect'],[.54,'perfect'],[.36,'early'],[.56,'late']]){const r=running(100);r.time=gap;const shown=guidance(r);pulse(r,2);assert.equal(r.runners[0].stepRating,expected);assert.equal(shown.beat>=shown.bandStart&&shown.beat<=shown.bandEnd,expected==='perfect');}
});
test('pausing mid-stride freezes the marker and keeps the next hit timing',()=>{
 const r=running(100);advance(r,.2);r.paused=true;const before=guidance(r).beat;advance(r,5);assert.equal(guidance(r).beat,before);r.paused=false;advance(r,.26);pulse(r,2);assert.equal(r.runners[0].stepRating,'perfect');
});
test('fall recovery restarts the next step window instead of condemning the next step as late',()=>{
 const r=running(100),p=r.runners[0];p.fall=.2;r.time=10;advance(r,.3);assert.ok(r.time-p.lastStep<.12);assert.equal(p.lastLeg,-1);assert.equal(p.stepRating,null);const gap=p.beatTarget-(r.time-p.lastStep);advance(r,gap);pulse(r,2);assert.equal(p.stepRating,'perfect');
});
test('exact green edges score perfect in every phase, including nonzero race clocks',()=>{
 for(const distance of [0,25,40,100,290,300,310,350])for(const clock of [0,12.34,59.9])for(const edge of ['bandStart','bandEnd']){
  const r=running(distance),p=r.runners[0],g=guidance(r);p.lastStep=clock;r.time=clock+p.beatTarget*g[edge]/.68;
  const shown=guidance(r);pulse(r,2);
  assert.equal(p.stepRating,'perfect',`${distance}m ${clock}s ${edge}`);
  assert.equal(shown.beat,shown[edge],`marker must snap numerical roundoff to ${edge}`);
  assert.notEqual(shown.rhythm,'太晚，快換腳');
 }
});
test('gaps genuinely outside either green edge still score early or late in every phase',()=>{
 for(const distance of [0,25,40,100,290,300,310,350])for(const [edge,offset,rating] of [['bandStart',-1e-7,'early'],['bandEnd',1e-7,'late']]){
  const r=running(distance),p=r.runners[0],g=guidance(r);r.time=p.beatTarget*g[edge]/.68+offset;
  const shown=guidance(r);pulse(r,2);
  assert.equal(p.stepRating,rating,`${distance}m ${edge}`);
  assert.equal(shown.beat>=shown.bandStart&&shown.beat<=shown.bandEnd,false);
  if(rating==='late')assert.equal(shown.rhythm,'太晚，快換腳');
 }
});
