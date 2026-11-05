import {finishTimelineAge} from '../finish-timing.mjs';
import {TRACK,noteDropPx} from '../shuttle.mjs';
import {sampleTimeline,smooth,clamp01} from './timeline.mjs';

const NOTE_TOP=1.332,NOTE_HEIGHT=.204,TABLE_TOP=.85,DROP_PX=283;
const READY=[.18,1.21,.28];
// The approved pickup wrist puts the original palm anchor exactly on the duck.
const GRAB=[.48-(.022*Math.cos(-1.2)-.066*Math.sin(-1.2)),.90-(.022*Math.sin(-1.2)+.066*Math.cos(-1.2)),.172];
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
const KNOWN=new Set(['idle','armed','outbound','returning','success','failed','cancelled']);

/**
 * Pure presentation adapter. Pass a shuttle.snapshot() and visual-only finish age.
 * No game transition, score, deadline, event time or input state is changed here.
 * Demo playback continues to use the untouched sampleTimeline(seconds).
 */
export function sampleForRun(state,finishAgeMs=0){
 const s=state&&typeof state==='object'?state:{};
 const phase=KNOWN.has(s.phase)?s.phase:'idle';
 const stopped=phase==='failed'||phase==='cancelled';
 if(phase==='idle'||phase==='armed'||(stopped&&s.startAt===null))return sampleTimeline(0);

 const fraction=clamp01(finite(s.dropPx,noteDropPx(finite(s.elapsedMs)))/DROP_PX);
 const noteTop=NOTE_TOP-(NOTE_TOP-TABLE_TOP-NOTE_HEIGHT)*fraction;
 const freePoint=[.145,noteTop,.323];
 if(phase==='success'){
  const age=finishTimelineAge(finishAgeMs);
  const sample=sampleTimeline(3.25+age/1000);
  // Start exactly on the real caught note. Restore the approved height during
  // regrip, before the original two hands descend into the table-resting pose.
  sample.hand.wrist[1]+=(noteTop-1.272)*(1-smooth(age/550));
  sample.bill.freePoint=freePoint;
  return sample;
 }

 const x=finite(s.controlX,finite(s.x,TRACK.home));
 const q=clamp01((x-TRACK.home)/(TRACK.far-TRACK.home));
 const u=smooth(q);
 const carrying=phase==='returning'||(stopped&&Number.isFinite(s.pickupAt));
 const target=carrying?[.18,noteTop-.122,.28]:READY;
 const wrist=mix(target,GRAB,u);
 if(!carrying)wrist[1]+=Math.sin(u*Math.PI)*.045;
 const rz=-1.2*u;
 const sample=sampleTimeline(0);
 sample.time=Math.max(0,finite(s.elapsedMs))/1000;
 sample.phase=phase;
 sample.label=stopped?(phase==='failed'?'鈔票落桌':'挑戰中斷'):carrying?'同手帶鴨回來':'伸向小鴨';
 sample.progress=carrying?1-q:q;
 sample.overallProgress=carrying?.5+(1-q)*.5:q*.5;
 sample.hand={wrist,rotation:[0,0,rz],quaternion:[0,0,Math.sin(rz/2),Math.cos(rz/2)],
  pinch:carrying?smooth((.22-q)/.22):1-smooth(q/.16),duckGrip:carrying?1:smooth((q-.8)/.2)};
 sample.torso={yaw:.065*Math.sin(Math.PI*u)*(carrying?u:1),lean:.018*u};
 sample.bill={attached:false,freePoint,
  flutter:Math.sin(Math.PI*fraction)*Math.sin(fraction*Math.PI*4)*.012*(carrying?smooth(q/.22):1),rotation:[0,0,0]};
 sample.duck={attached:carrying};
 return sample;
}
