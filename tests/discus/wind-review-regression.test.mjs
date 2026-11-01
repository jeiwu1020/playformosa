// Independent RED proof against frozen db3ff99. Intentionally failing; no product writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../public/games/discus/engine.mjs';
import {createDiscusPose,worldPosePoint,anchorBody} from '../../public/games/discus/pose.mjs';
import {audit,doc,winners} from './result-layout-audit.mjs';

function prepared(pattern,holdTicks,restTicks,steps,lastRestTicks){
 const s=E.createState(42);E.advance(s,3);E.setLimb(s,'k',true);
 for(let n=0;n<steps;n++){const k=pattern[n%pattern.length];E.setLimb(s,k,true);E.advance(s,holdTicks*E.STEP);E.setLimb(s,k,false);E.advance(s,(n===steps-1?lastRestTicks:restTicks)*E.STEP);}
 return s;
}
const feet=s=>[0,1].map(i=>{const p=worldPosePoint(createDiscusPose(s),'foot'+i,i);return{side:i,y:p.y,r:Math.hypot(p.x,p.z)};});
function cast(s){let crossing=null;E.setLimb(s,'k',false);while(s.phase==='cast'){E.advance(s,E.STEP);const f=feet(s).find(f=>f.y<=.121&&f.r>2);if(f)crossing={...f,castTime:s.castTime};}return crossing;}

test('invalid release remains foul even when later landing is inside the visible fixed sector',()=>{const s=E.createState();E.setLimb(s,'k',true);E.advance(s,1);s.yaw-=1;cast(s);assert.ok(Math.abs(s.releaseAngle)>E.LEGAL);s.route=[];s.discPosition={x:10,y:.081,z:0};s.velocity={x:0,y:-1,z:0};E.advance(s,.1);assert.ok(Math.abs(s.finalAngle)<E.LEGAL);assert.equal(s.foul,true);assert.equal(s.score,0);});
test('historical input sequence keeps geometric foul classification after damping changes',()=>{
 const s=prepared('ass',84,84,8,37);assert.equal(s.steppedOut,false);const before=feet(s);assert.ok(before.every(f=>f.r<=2));
 const crossing=cast(s);console.log('cast input evidence',JSON.stringify({before,crossing,steppedOut:s.steppedOut,releaseAngle:s.releaseAngle}));
 assert.equal(s.steppedOut,Boolean(crossing),'cast geometric crossing and sticky foot foul must agree');
});
test('RED: legal-body geometry fixture cannot earn a valid score after cast shoe crossing',()=>{
 const s=E.createState(42);E.advance(s,3);Object.assign(s,{anchor:{x:1.5,y:.12,z:0},yaw:3.3,omega:5,charge:1,j:[0,0,0,1]});s.held[3]=true;anchorBody(s);
 assert.ok(feet(s).every(f=>f.r<=2));let crossing=null;E.setLimb(s,'k',false);while(s.phase==='cast'){E.advance(s,E.STEP);const f=feet(s).find(f=>f.y<=.121&&f.r>2);if(f)crossing=f;}assert.ok(crossing);E.advance(s,30);
 console.log('cast geometry evidence',JSON.stringify({crossing,releaseAngle:s.releaseAngle,finalAngle:s.finalAngle,steppedOut:s.steppedOut,foul:s.foul,score:s.score}));
 assert.equal(s.score,0,'valid score issued after pre-separation grounded shoe left circle');
});
test('RED: current source audit must include every actual play-grid row',()=>{
 const a=audit(1280,720),group=doc.querySelector('.throw-result__play'),css=winners(group,1280,720),gap=parseFloat(css.gap.value);
 assert.equal(group.children.length,2);assert.equal(a.play.columns,2);
 const rows=[];for(let i=0;i<a.play.heights.length;i+=a.play.columns)rows.push(Math.max(...a.play.heights.slice(i,i+a.play.columns)));
 const required=rows.reduce((x,y)=>x+y,0)+gap*(rows.length-1);
 console.log('layout source evidence (NOT browser)',JSON.stringify({childCount:group.children.length,columns:a.play.columns,rowHeights:rows,gap,reported:a.play.height,required,missing:required-a.play.height}));
 assert.ok(a.play.height>=required,'source estimate silently drops second play row');
});
