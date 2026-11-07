import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';

// Visible body bounds measured from the shipped seated art (alpha > 160),
// independent of the placement implementation and transparent sprite frames.
const bodies={0:{left:95,right:290,anchor:181},1:{left:72,right:281,anchor:181},2:{left:69,right:255,anchor:181},3:{left:219,right:573,anchor:405},4:{left:147,right:528,anchor:353},5:{left:97,right:482,anchor:302}};
function bounds(p){const b=bodies[p.type],s=p.sprite;return {left:s.x+(b.left-b.anchor)*s.scaleX,right:s.x+(b.right-b.anchor)*s.scaleX};}
for(const [label,w,h] of [['wide desktop',1568,468],['desktop cover',680,470],['desktop result',970,680],['phone',375,415],['short phone result',343,180]]){
 test(`${label} seats every visible passenger inside the poles in all page phases`,()=>{
  const harn=harness({variation:true});const s=harn.s;
  for(const phase of ['intro','play','depart','result']){
   s.phase=phase;s.scale.width=w;s.scale.height=h;s.layout();
   const visible=s.spectators.filter(p=>p.sprite.visible);
   for(const p of visible){const b=bounds(p);assert.ok(b.left>=w*.085-1,`${phase} type ${p.type}: body starts on left pole at ${b.left}`);assert.ok(b.right<=w*.915+1,`${phase} type ${p.type}: body ends on right pole at ${b.right}`);}
   for(const side of [visible.filter(p=>p.sprite.x<w/2),visible.filter(p=>p.sprite.x>w/2)])for(let i=1;i<side.length;i++){
    const gap=bounds(side[i]).left-bounds(side[i-1]).right;
    assert.ok(gap>=(w<650?-w*.065:-1),`${phase} seated bodies overlap by ${-gap}`);
    assert.ok(gap<=w*.02,`${phase} adjacent passengers are ${gap}px apart`);
   }
  }
 });
}
test('phone keeps four passengers, while desktop restores all six',()=>{
 const {s}=harness({variation:true});s.scale.width=375;s.scale.height=415;s.layout();assert.equal(s.spectators.filter(p=>p.sprite.visible).length,4);
 s.scale.width=1500;s.scale.height=450;s.layout();assert.equal(s.spectators.filter(p=>p.sprite.visible).length,6);
});
test('seated chain gestures keep the same seat anchors and do not repack the row',()=>{
 const {s}=harness({variation:true});s.scale.width=1200;s.scale.height=400;s.layout();
 for(const p of s.spectators){const {x,y}=p.sprite;p.chainGesture=true;s.spectatorPose(p);assert.equal(p.sprite.x,x);assert.equal(p.sprite.y,y);}
});
