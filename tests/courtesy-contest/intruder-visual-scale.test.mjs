import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './helpers/scene-harness.mjs';

const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} !== ${expected}`);
function frameBounds(x,y,scale,degrees){
 const r=degrees*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 const corners=[[-181,-362],[181,-362],[-181,0],[181,0]].map(([dx,dy])=>({x:x+(dx*c-dy*s)*scale,y:y+(dx*s+dy*c)*scale}));
 const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y));
 return{x:left,y:top,width:Math.max(...corners.map(p=>p.x))-left,height:Math.max(...corners.map(p=>p.y))-top};
}
function setup(width,mobile){
 const h=harness({variation:true}),s=h.s;h.window.matchMedia=()=>({matches:mobile});
 s.scale.width=width;s.scale.height=width/(mobile?1.8:2.65);s.layout();s.intruder.setOrigin(.5,1);
 s.intruder.getBounds=()=>frameBounds(s.intruder.x,s.intruder.y,s.intruder.scaleX,s.intruder.angle);
 h.node('game').offsetTop=0;return h;
}

// A visual-only change must not shrink or move the legacy tap target, or move
// the planted foot when running artwork tilts around its bottom-centre origin.
for(const [width,mobile]of [[290,true],[356,true],[640,true],[660,false],[926,false]])for(const type of [0,1,2])for(const side of [-1,1])for(const elapsed of [0,1.1]){
 test(`${width}px type ${type} side ${side} ${elapsed?'running':'waiting'}: smaller art keeps original tap rectangle and foot point`,()=>{
  const h=setup(width,mobile),s=h.s;s.threat={type,side,elapsed,windup:.8,duration:2.8,travelMs:2000};
  const originalScale=Math.min(s.baseScale*1.25,s.W*.40/280),edge=originalScale*181+5;
  const from=side<0?Math.max(s.W*.14,edge):Math.min(s.W*.86,s.W-edge),progress=Math.max(0,Math.min(1,(elapsed-.8)/2));
  const x=from+(s.seatX-from)*progress*.88,angle=elapsed>=.8?side*9:0,bob=elapsed>=.8?Math.sin(elapsed*24)*3:0;
  const y=s.floorY+9*originalScale+bob,bounds=frameBounds(x,y,originalScale,angle);
  s.positionIntruder();
  close(s.intruder.scaleX,originalScale*.9,'visual width scale');close(s.intruder.scaleY,originalScale*.9,'visual height scale');
  assert.equal(s.intruder.frame.name,type*4+(elapsed>=.8?2:1));assert.equal(s.intruder.flipX,side>0);
  const r=angle*Math.PI/180;
  close(s.intruder.x+9*s.intruder.scaleX*Math.sin(r),x+9*originalScale*Math.sin(r),'foot x');
  close(s.intruder.y-9*s.intruder.scaleY*Math.cos(r),y-9*originalScale*Math.cos(r),'foot y');
  const target=h.node('intruder-hit').style,targetWidth=Math.max(84,bounds.width),targetHeight=Math.max(130,bounds.height);
  close(parseFloat(target.width),targetWidth,'hit width');close(parseFloat(target.height),targetHeight,'hit height');
  close(parseFloat(target.left),Math.min(s.W-targetWidth,Math.max(0,bounds.x)),'hit left');
  close(parseFloat(target.top),Math.min(s.H-targetHeight,Math.max(48,bounds.y)),'hit top');
  assert.ok(targetWidth>=84&&targetHeight>=130);
  // The next frame must not compound the 10% reduction.
  s.positionIntruder();close(s.intruder.scaleX,originalScale*.9,'stable repeat scale');
 });
}
for(const [width,mobile]of [[356,true],[926,false]])for(const type of [0,1,2]){
 test(`${width}px type ${type}: stolen seated pose shrinks once and keeps the same hip anchor after resize`,()=>{
  const h=setup(width,mobile),s=h.s;s.threat={type};s.steal();
  const hip=[280,279,282][type];
  close(s.intruder.scaleX,s.baseScale*1.22*.9,'seated scale');close(s.intruder.x,s.seatX,'seat x');
  close(s.intruder.y-(362-hip)*s.intruder.scaleY,s.seatY,'hip at seat');assert.equal(s.intruder.frame.name,type*4);
  s.scale.width=width*.82;s.scale.height=s.scale.width/(mobile?1.8:2.65);s.layout();
  close(s.intruder.scaleX,s.baseScale*1.22*.9,'resized seated scale');close(s.intruder.x,s.seatX,'resized seat x');
  close(s.intruder.y-(362-hip)*s.intruder.scaleY,s.seatY,'resized hip at seat');
 });
 test(`${width}px type ${type}: repelled pose keeps the reduced art scale`,()=>{
  const h=setup(width,mobile),s=h.s;s.threat={type,side:1,elapsed:0,windup:.8,duration:2.8,startedAtMs:0,expiresAtMs:2800};s.positionIntruder();s.repel();
  close(s.intruder.scaleX,Math.min(s.baseScale*1.25,s.W*.40/280)*.9,'repelled scale');
  assert.equal(s.intruder.frame.name,type*4+3);assert.equal(h.node('intruder-hit').hidden,true);
 });
}
