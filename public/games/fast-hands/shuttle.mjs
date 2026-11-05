import {NOTE_FLOOR_MS,CONFIG as PHYSICS} from './challenge.mjs';

export const TRACK=Object.freeze({home:.18,far:.82});
export const RULES_VERSION='shuttle-v3';
const freeze=Object.freeze,finite=Number.isFinite;
const terminal=s=>['success','failed','cancelled'].includes(s.phase);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const crossAt=(s,x,at,gate)=>s.lastAt+(at-s.lastAt)*(gate-s.x)/(x-s.x);
const valid=(s,at)=>s&&finite(at)&&at>=s.lastAt&&!terminal(s);
const missed=(time,deadline)=>time>=deadline-1e-8;

export function noteDropPx(ms){
 const t=clamp(finite(ms)?ms:0,0,NOTE_FLOOR_MS)/1000;
 return Math.min(283,PHYSICS.g*PHYSICS.tau*(t-PHYSICS.tau*(1-Math.exp(-t/PHYSICS.tau)))*PHYSICS.pxPerM);
}
export function newRun(now=0){return freeze({phase:'idle',x:.1,pointerId:null,lastAt:finite(now)?now:0,startAt:null,pickupAt:null,catchAt:null,elapsedMs:0,reason:null});}
export function arm(s,{x,at,id}){
 if(!valid(s,at)||s.phase!=='idle'||!finite(x)||x<0||x>TRACK.home||id===undefined||id===null)return s;
 return freeze({...s,phase:'armed',x,pointerId:id,lastAt:at});
}
function fail(s,at,reason='note-floor'){
 return freeze({...s,phase:reason==='note-floor'?'failed':'cancelled',reason,pointerId:null,lastAt:at,elapsedMs:s.startAt===null?0:Math.min(Math.max(0,at-s.startAt),NOTE_FLOOR_MS)});
}
export function move(s,{x,at,id}){
 if(!valid(s,at)||at===s.lastAt||!finite(x)||id!==s.pointerId||s.phase==='idle')return s;
 let n={...s,x,lastAt:at};
 // Preparation may be arbitrarily long. Never infer movement between a stationary
 // preparation sample and first observed departure. Timing begins at that input.
 const departing=s.phase==='armed'&&s.x<=TRACK.home&&x>TRACK.home;
 if(departing){n.startAt=at;n.phase='outbound';}
 if(n.startAt===null)return freeze(n);
 const deadline=n.startAt+NOTE_FLOOR_MS;
 if(n.phase==='outbound'&&s.x<TRACK.far&&x>=TRACK.far){
  const pickup=departing?at:crossAt(s,x,at,TRACK.far);
  if(missed(pickup,deadline))return fail({...n,pickupAt:null},deadline);
  n.pickupAt=pickup;n.phase='returning';
 }
 if(s.phase==='returning'&&s.x>TRACK.home&&x<=TRACK.home){
  const caught=crossAt(s,x,at,TRACK.home);
  if(missed(caught,deadline))return fail(n,deadline);
  return freeze({...n,phase:'success',catchAt:caught,elapsedMs:caught-n.startAt,pointerId:null});
 }
 if(missed(at,deadline))return fail(n,deadline);
 n.elapsedMs=Math.max(0,at-n.startAt);return freeze(n);
}
export function release(s,{at,id}){
 if(!valid(s,at)||id!==s.pointerId||s.phase==='idle')return s;
 if(s.startAt!==null&&missed(at,s.startAt+NOTE_FLOOR_MS))return fail(s,s.startAt+NOTE_FLOOR_MS);
 return fail(s,at,'released');
}
export function cancel(s,at,reason='cancelled'){
 if(!s||!finite(at)||terminal(s)||s.phase==='idle')return s;
 return fail(s,Math.max(at,s.lastAt),reason);
}
/** Rendering never commits a timeout. A delayed event may contain a valid earlier crossing. */
export function snapshot(s,now){
 const elapsed=s.startAt===null?0:terminal(s)?s.elapsedMs:Math.min(Math.max(0,(finite(now)?now:s.lastAt)-s.startAt),NOTE_FLOOR_MS);
 const timedOut=!terminal(s)&&s.startAt!==null&&elapsed>=NOTE_FLOOR_MS;
 return freeze({...s,phase:timedOut?'failed':s.phase,reason:timedOut?'note-floor':s.reason,elapsedMs:elapsed,dropPx:noteDropPx(elapsed),controlX:clamp(s.x)});
}
