import {NOTE_FLOOR_MS} from './challenge.mjs';
import {snapshot} from './shuttle.mjs';
import {FINISH_MOTION_MS} from './finish-timing.mjs';

/** Local, one-round presentation data. This module never runs input/scoring reducers,
 * writes records, plays sound, or sends data. Keep it separate from live apply(). */
export const MAX_REPLAY_SAMPLES=4096;
const freeze=Object.freeze,finite=Number.isFinite,EPSILON=1e-7;
const recorders=new WeakMap(),clips=new WeakSet();
const phases=new Set(['armed','outbound','returning','success','failed','cancelled']);
const terminal=phase=>['success','failed','cancelled'].includes(phase);
const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
const rank={armed:0,outbound:1,returning:2,success:3,failed:3,cancelled:3};
const same=(a,b)=>a===b||(finite(a)&&finite(b)&&Math.abs(a-b)<EPSILON);

function validState(s,at){
 if(!s||!phases.has(s.phase)||!finite(s.x)||!finite(at)||at<0||!finite(s.lastAt)||s.lastAt<0||s.lastAt>at+EPSILON)return false;
 if(!finite(s.elapsedMs)||s.elapsedMs<0||s.elapsedMs>NOTE_FLOOR_MS+EPSILON)return false;
 for(const field of ['startAt','pickupAt','catchAt'])if(s[field]!==null&&(!finite(s[field])||s[field]<0||s[field]>s.lastAt+EPSILON))return false;
 if(s.reason!==null&&typeof s.reason!=='string')return false;
 if(terminal(s.phase)?s.pointerId!==null:!Number.isInteger(s.pointerId))return false;
 if(s.startAt===null)return ['armed','cancelled'].includes(s.phase)&&s.elapsedMs===0&&s.pickupAt===null&&s.catchAt===null;
 if(s.phase==='armed'||(s.pickupAt!==null&&s.pickupAt<s.startAt))return false;
 if(s.phase==='outbound'&&s.pickupAt!==null)return false;
 if(['returning','success'].includes(s.phase)&&s.pickupAt===null)return false;
 if(s.phase==='success')return s.catchAt!==null&&s.catchAt>=s.pickupAt&&s.elapsedMs>0&&same(s.elapsedMs,s.catchAt-s.startAt);
 return s.catchAt===null&&same(s.elapsedMs,Math.min(s.lastAt-s.startAt,NOTE_FLOOR_MS));
}

function copyState(s){
 return freeze({phase:s.phase,x:s.x,pointerId:s.pointerId,lastAt:s.lastAt,startAt:s.startAt,pickupAt:s.pickupAt,catchAt:s.catchAt,elapsedMs:s.elapsedMs,reason:s.reason});
}

/** Only a concrete input mode can be recorded. An opaque frozen handle prevents
 * later preference changes from relabeling an already recorded round. */
export function createReplayRecorder(options={}){
 if(!options||typeof options!=='object')return null;
 const {mode,maxSamples=MAX_REPLAY_SAMPLES}=options;
 if(!['mouse','touch'].includes(mode)||!Number.isInteger(maxSamples)||maxSamples<2||maxSamples>MAX_REPLAY_SAMPLES)return null;
 const handle=freeze({mode});
 recorders.set(handle,{mode,maxSamples,samples:[],lastSource:null,invalid:false,clip:null});
 return handle;
}

/** Record only a changed, accepted reducer state, starting with arm(). `at` is
 * the original pointer sample timestamp, not receipt/render time. In particular,
 * pass it for move(): a timeout can cap state.lastAt before the input timestamp.
 * A bad sequence/overflow disables the clip rather than silently losing input. */
export function recordReplay(recorder,state,at=state?.lastAt){
 const r=recorders.get(recorder);
 if(!r||r.invalid||r.clip||state===r.lastSource||terminal(r.samples.at(-1)?.state.phase))return false;
 const previous=r.samples.at(-1),p=previous?.state;
 const invalid=!validState(state,at)||(!p&&state.phase!=='armed')||(p&&(
  at<previous.at||state.lastAt<p.lastAt||rank[state.phase]<rank[p.phase]||
  (!terminal(state.phase)&&state.pointerId!==p.pointerId)||
  (p.startAt!==null&&state.startAt!==p.startAt)||
  (p.startAt===null&&state.startAt!==null&&!same(state.startAt,at))||
  (p.pickupAt!==null&&state.pickupAt!==p.pickupAt)||
  (state.phase==='success'&&p.phase!=='returning')
 ));
 if(invalid||r.samples.length>=r.maxSamples){r.invalid=true;r.samples=[];return false;}
 r.samples.push(freeze({at,state:copyState(state)}));r.lastSource=state;
 return true;
}

/** Complete clips only. Preparation is excluded once departure was observed;
 * its final home position remains at t=0, alongside the departure sample.
 * A very long cancelled preparation cannot be shown at original speed within
 * the round's time bound, so it is deliberately unavailable. */
export function finishReplay(recorder){
 const r=recorders.get(recorder);
 if(!r||r.invalid)return null;
 if(r.clip)return r.clip;
 const finalState=r.samples.at(-1)?.state;
 if(!finalState||!terminal(finalState.phase)||r.samples.length<2)return null;
 const started=finalState.startAt!==null;
 const originAt=started?finalState.startAt:r.samples[0].at;
 const durationMs=started?finalState.elapsedMs:finalState.lastAt-originAt;
 if(!finite(durationMs)||durationMs<0||durationMs>NOTE_FLOOR_MS+EPSILON)return null;
 const departure=started?r.samples.findIndex(item=>item.state.startAt!==null):0;
 const samples=freeze(r.samples.slice(Math.max(0,departure-1)).map(item=>freeze({...item,timeMs:Math.max(0,item.at-originAt)})));
 const clip=freeze({version:1,mode:r.mode,startAt:finalState.startAt,originAt,durationMs,elapsedMs:finalState.elapsedMs,playbackDurationMs:durationMs+FINISH_MOTION_MS,samples,finalState});
 r.clip=clip;clips.add(clip);return clip;
}

/** Sample the observed piecewise input path at original speed. State milestones
 * use the recorded pickup/catch timestamps; they are never recalculated from
 * the interpolated path. snapshot() alone supplies note position and elapsed
 * display time. Returned views are detached, immutable, and non-interactive. */
export function sampleReplay(clip,elapsedMs=0){
 if(!clips.has(clip))return null;
 const playbackAt=clamp(finite(elapsedMs)?elapsedMs:0,0,clip.playbackDurationMs);
 const actionAt=Math.min(playbackAt,clip.durationMs),at=clip.originAt+actionAt;
 let lo=0,hi=clip.samples.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(clip.samples[mid].at<=at)lo=mid+1;else hi=mid;}
 const left=clip.samples[Math.max(0,lo-1)],right=clip.samples[lo];
 const fraction=right&&right.at>left.at?clamp((at-left.at)/(right.at-left.at)):0;
 const controlX=clamp(left.state.x+(right?right.state.x-left.state.x:0)*fraction);
 const final=clip.finalState,ended=actionAt>=clip.durationMs;
 let authoritative=ended?final:left.state;
 if(!ended&&clip.startAt!==null){
  const picked=final.pickupAt!==null&&at>=final.pickupAt;
  authoritative={...left.state,phase:picked?'returning':'outbound',startAt:clip.startAt,pickupAt:picked?final.pickupAt:null,catchAt:null,reason:null};
 }
 const state=freeze({...snapshot(authoritative,at),controlX});
 return freeze({state,finishAge:Math.max(0,playbackAt-clip.durationMs),done:playbackAt>=clip.playbackDurationMs,mode:clip.mode,scoring:false,interactive:false,label:'本次操作重播 · 原速 · 不計分'});
}
