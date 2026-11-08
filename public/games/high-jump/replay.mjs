// Replay clock is simulation seconds, never a frame-count-derived playback rate.
export function selectReplay(history,seconds=5.8){
 const eligible=history.filter(s=>s.phase!=='countdown'&&Number.isFinite(s.t));if(!eligible.length)return null;
 const end=eligible.at(-1).t,frames=eligible.filter(s=>s.t>=end-seconds);
 return{frames,start:frames[0].t,duration:end-frames[0].t};
}
export function replayFrame(clip,time){
 if(!clip?.frames.length)return null;const target=clip.start+Math.max(0,time);let lo=0,hi=clip.frames.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(clip.frames[mid].t<=target+1e-9)lo=mid;else hi=mid-1;}return clip.frames[lo];
}
