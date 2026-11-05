import {sampleTimeline,smooth} from './timeline.mjs';
// The demonstration is illustrative, and never enters the scoring reducer.
export function demo3D(milliseconds){
 const ms=Number.isFinite(milliseconds)?milliseconds:0,t=((ms%7000)+7000)%7000/1000,sample=sampleTimeline(t);
 const phase=t<.7?'armed':t<1.95?'outbound':t<3.15?'returning':'success';
 const controlX=t<.7?.1:t<1.95?.18+.64*smooth((t-.8)/.85):t<3.15?.82-.64*smooth((t-2.05)/.9):.1;
 return {sample,state:{phase,controlX,x:controlX,elapsedMs:0,dropPx:0,pickupAt:t>=1.95?1950:null,catchAt:t>=3.15?3150:null},scoring:false,label:sample.label,finishAge:Math.max(0,(t-3.15)*1000)};
}
export async function loadGameStage(canvas,options){
 const [{createGameStage},{sampleForRun}]=await Promise.all([import('./stage.mjs'),import('./game-motion.mjs')]);
 return {stage:createGameStage(canvas,options),sampleForRun};
}
