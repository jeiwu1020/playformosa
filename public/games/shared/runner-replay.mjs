// Data-only render snapshots. Never call the engine or its RNG during playback.
export function copyRace(value){
 if(Array.isArray(value))return value.map(copyRace);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>typeof v!=='function').map(([k,v])=>[k,copyRace(v)]));
 return value;
}
// Explicit root allowlist: renderers/HUD use these fields and bounded runner/supply arrays.
// Never copy the 1500m engine's unbounded inputs audit trail, RNG or simulation accumulator.
const renderKeys=['phase','time','clock','paused','falseStarts','event','eventUntil','countdown','runners','supplies'];
function renderSnapshot(race){return Object.fromEntries(renderKeys.filter(k=>Object.hasOwn(race,k)).map(k=>[k,copyRace(race[k])]));}
export function createFinishRecorder({before=5,after=1,fps=30}={}){
 const limit=Math.ceil((before+after)*fps)+3;let frames=[],last=-Infinity,finish=null;
 function capture(race,time,force=false){if(finish!==null&&time>finish+after+1e-8)return;if(!force&&time-last<1/fps-1e-8)return;last=time;frames.push({time,race:renderSnapshot(race)});const floor=(finish??time)-before;while(frames.length>1&&frames[1].time<floor)frames.shift();while(frames.length>limit)frames.shift();}
 return{capture,finish(race,time){if(finish!==null)return;finish=time;capture(race,time,true);},get size(){return frames.length;},clip(){if(finish===null||!frames.length)return null;return{start:frames[0].time,end:frames.at(-1).time,playerFinish:finish,frames:copyRace(frames)};}};
}
export function sampleFinishClip(clip,time){if(!clip?.frames?.length)return null;let lo=0,hi=clip.frames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(clip.frames[mid].time<=time)lo=mid;else hi=mid-1;}return copyRace(clip.frames[lo].race);}
