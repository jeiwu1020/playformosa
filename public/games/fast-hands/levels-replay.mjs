// Read-only presentation tape. No reducer, score, sound, storage or network calls.
import {levelMotionDuration} from './levels-motion.mjs';
const finite=Number.isFinite;
function freezeCopy(value){
 if(Array.isArray(value))return Object.freeze(value.map(freezeCopy));
 if(value&&typeof value==='object')return Object.freeze(Object.fromEntries(Object.entries(value).map(([key,item])=>[key,freezeCopy(item)])));
 return value;
}
export function createLevelReplayRecorder({mode}={}){
 if(!['catch','duel'].includes(mode))throw new TypeError('Unknown replay mode');
 return {mode,origin:null,round:null,frames:[],phase:null,clip:null};
}
function snapshot(state,recorder,{pressedAt=null,settledAt=null}={}){
 const settled=['feedback','done'].includes(state.phase),round=recorder.round;
 const result=settled?state.results?.at(-1):null;
 const item=result?.item||state.items?.[Math.min(round-1,(state.items?.length||1)-1)];
 const value={...state,items:item?[item]:[],results:result?[result]:[],replayRound:round};
 for(const key of ['startedAt','readyAt','liveAt','targetAt'])value[key]=finite(state[key])?state[key]-recorder.origin:null;
 value.presentation={pressedAt:finite(pressedAt)?pressedAt-recorder.origin:null,settledAt:finite(settledAt)?settledAt-recorder.origin:null,suppressCelebration:true};
 return freezeCopy(value);
}
export function recordLevelReplay(recorder,state,{now,pressedAt=null,settledAt=null}={}){
 if(!recorder||!state||state.mode!==recorder.mode||!finite(now))return;
 if(state.phase==='idle'||state.phase==='paused'){
  recorder.origin=null;recorder.frames=[];recorder.phase=null;
  if(state.phase==='idle')recorder.clip=null;
  return;
 }
 if(state.phase==='waiting'&&(recorder.origin!==state.startedAt||recorder.phase!=='waiting')){
  recorder.origin=finite(state.startedAt)?state.startedAt:now;recorder.round=(state.results?.length||0)+1;recorder.frames=[];recorder.phase=null;
 }
 if(recorder.origin===null||state.phase===recorder.phase)return;
 if(!['waiting','live','feedback','done'].includes(state.phase))return;
 const settled=['feedback','done'].includes(state.phase);
 const observedAt=settled&&finite(settledAt)?settledAt:now;
 const at=Math.max(0,observedAt-recorder.origin);
 const frame=freezeCopy({at,state:snapshot(state,recorder,{pressedAt,settledAt:settled?observedAt:null})});
 recorder.frames.push(frame);recorder.phase=state.phase;
 if(settled){
  recorder.clip=freezeCopy({mode:recorder.mode,round:recorder.round,label:recorder.mode==='catch'?`第 ${recorder.round} 關重播`:`第 ${recorder.round} 回合重播`,frames:recorder.frames,durationMs:at+levelMotionDuration(frame.state),scoring:false});
 }
}
export function finishLevelReplay(recorder){return recorder?.clip||null;}
export function sampleLevelReplay(clip,elapsedMs=0){
 if(!clip?.frames?.length)return null;
 const elapsed=finite(elapsedMs)?Math.max(0,elapsedMs):0,now=Math.min(elapsed,clip.durationMs);
 let frame=clip.frames[0];for(const candidate of clip.frames){if(candidate.at>now)break;frame=candidate;}
 return Object.freeze({state:frame.state,presentation:frame.state.presentation,now,done:elapsed>=clip.durationMs,label:clip.label,scoring:false});
}
