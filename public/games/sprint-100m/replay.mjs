// Read-only replay: captures actual render states and authoritative finish events.
// Never imports race simulation, RNG, input or persistence.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const omitted=new Set(['ai','random']);
function copy(value,depth=0){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(depth>5)return null;
 if(Array.isArray(value))return Object.freeze(value.map(v=>copy(v,depth+1)));
 if(value&&typeof value==='object'){const out={};for(const[k,v]of Object.entries(value)){if(!omitted.has(k)&&typeof v!=='function'&&v!==undefined)out[k]=copy(v,depth+1);}return Object.freeze(out);}
 return null;
}
function frameOf(race,visualTime,renderRunners){return Object.freeze({visualTime,time:race.time,clock:race.clock,phase:race.phase,paused:false,runners:Object.freeze(renderRunners.map(r=>copy({...r,finished:race.runners.find(actual=>actual.id===r.id)?.finished??null})))})}
export function createRecorder({fps=30,maxSeconds=180,before=5,after=2}={}){
 fps=clamp(Number(fps)||30,1,60);maxSeconds=clamp(Number(maxSeconds)||180,1,600);before=clamp(Number(before)||5,0,10);after=clamp(Number(after)||2,0,5);
 const interval=1/fps,maxFrames=Math.ceil(maxSeconds*fps)+2,maxHighlightFrames=Math.ceil((before+after)*fps)+8;
 let full=[],highlight=[],events=[],seen=new Set(),started=false,origin=null,lastAccepted=-Infinity,lastVisual=-Infinity,playerFinish=null,playerFinishTime=null,doneAt=null,fullReady=false,highlightReady=false,truncated=false,previousSource=null;
 function capture(race,visualTime,renderRunners=race?.runners){
  if(!race||!Array.isArray(race.runners)||!Array.isArray(renderRunners)||race.paused||!Number.isFinite(visualTime))return;
  if(visualTime<lastVisual-1e-8)return; // Seeking a player never feeds historical data back into recorder.
  lastVisual=visualTime;
  if(!started){if(race.phase!=='race'&&race.phase!=='done')return;started=true;origin=visualTime;}
  if(fullReady&&highlightReady&&race.runners.every(r=>!Number.isFinite(r.finished)||seen.has(r.id)))return;
  const sourceFrame=frameOf(race,visualTime,renderRunners);
  for(const r of race.runners){if(Number.isFinite(r.finished)&&!seen.has(r.id)){
   const eventTime=visualTime-Math.max(0,race.time-r.finished);
   const now=sourceFrame.runners.find(p=>p.id===r.id),prior=previousSource?.runners.find(p=>p.id===r.id)??now;
   const span=visualTime-(previousSource?.visualTime??visualTime),f=span>0?clamp((eventTime-previousSource.visualTime)/span,0,1):1;
   const crossing=blend(prior,now,f);crossing.lean=Number.isFinite(crossing.lean)?crossing.lean:0;crossing.x=crossing.actualX=100-.24-.48*crossing.lean;crossing.runoutAge=0;crossing.finishVisualTime=eventTime;crossing.finished=r.finished;
   const event=Object.freeze({id:r.id,name:r.name,time:r.finished,raceTime:r.finished,visualTime:eventTime,crossing:copy(crossing)});events.push(event);seen.add(r.id);
   if(r.id===0){playerFinish=eventTime;playerFinishTime=r.finished;}
  }}
  previousSource=sourceFrame;
  if(race.phase==='done'&&doneAt===null)doneAt=race.runners.every(r=>Number.isFinite(r.finished))?Math.max(...events.map(e=>e.visualTime)):visualTime;
  const reachFullEnd=doneAt!==null&&visualTime>=doneAt+after-1e-8;
  const reachHighlightEnd=playerFinish!==null&&visualTime>=playerFinish+after-1e-8;
  const forceEndpoint=(!fullReady&&reachFullEnd)||(!highlightReady&&reachHighlightEnd);
  if(visualTime-lastAccepted<interval-1e-8&&!forceEndpoint)return;
  // One snapshot per accepted source frame: no synthetic intermediate simulation.
  const frame=sourceFrame;lastAccepted=visualTime;
  if(!fullReady){if(visualTime-origin<=maxSeconds+1e-8&&full.length<maxFrames)full.push(frame);else{truncated=true;fullReady=true;}if(reachFullEnd)fullReady=true;}
  if(!highlightReady){highlight.push(frame);const cutoff=(playerFinish??visualTime)-before;
   // Keep one bracketing frame before the requested beginning for interpolation.
   while(highlight.length>1&&highlight[1].visualTime<cutoff)highlight.shift();
   while(highlight.length>maxHighlightFrames)highlight.shift();
   if(reachHighlightEnd)highlightReady=true;
  }
 }
 function clip(mode='full'){
  const finish=mode==='finish',frames=finish?highlight:full;
  const rawStart=frames[0]?.visualTime??0,rawEnd=frames.at(-1)?.visualTime??rawStart;
  const start=finish&&playerFinish!==null?Math.max(rawStart,playerFinish-before):rawStart;
  const end=finish&&playerFinish!==null?Math.min(rawEnd,playerFinish+after):rawEnd;
  return Object.freeze({mode:finish?'finish':'full',frames:Object.freeze([...frames]),events:Object.freeze([...events].sort((a,b)=>a.raceTime-b.raceTime||a.id-b.id)),start,end,duration:Math.max(0,end-start),playerFinish,playerFinishTime,ready:finish?highlightReady:fullReady,truncated:finish?false:truncated,fps,origin,frameLimit:finish?maxHighlightFrames:maxFrames});
 }
 return Object.freeze({capture,clip});
}
const discreteNumbers=new Set(['id','finished','reaction','steps','falls','lastLeg','armSide','lastArm','lastStep']);
function blend(a,b,f,key=''){
 if(typeof a==='number'&&typeof b==='number'&&!discreteNumbers.has(key))return a+(b-a)*f;
 if(Array.isArray(a))return a.map((v,i)=>blend(v,b?.[i],f,String(i)));
 if(a&&typeof a==='object'){const out={};for(const[k,v]of Object.entries(a))out[k]=blend(v,b?.[k],f,k);if(f>=1&&b&&typeof b==='object')for(const[k,v]of Object.entries(b))if(!(k in out))out[k]=blend(v,v,0,k);return out;}
 return f>=1&&b!==undefined?b:a;
}
export function sampleClip(clip,time){
 if(!clip?.frames?.length)return null;
 const t=clamp(Number.isFinite(time)?time:clip.start,clip.start,clip.end),frames=clip.frames;
 let low=0,high=frames.length-1;while(low<high){const mid=Math.ceil((low+high)/2);if(frames[mid].visualTime<=t)low=mid;else high=mid-1;}
 const a=frames[low],b=frames[Math.min(low+1,frames.length-1)],fraction=b.visualTime>a.visualTime?clamp((t-a.visualTime)/(b.visualTime-a.visualTime),0,1):0;
 const state=blend(a,b,fraction);state.visualTime=t;state.paused=false;state.replay=true;
 for(let i=0;i<state.runners.length;i++){let r=state.runners[i];const event=clip.events.find(e=>e.id===r.id);
  if(event?.crossing&&event.visualTime>=a.visualTime-1e-9&&event.visualTime<=b.visualTime+1e-9){
   if(t<=event.visualTime){const span=event.visualTime-a.visualTime;r=blend(a.runners[i],event.crossing,span>0?clamp((t-a.visualTime)/span,0,1):1);}
   else{const span=b.visualTime-event.visualTime;r=blend(event.crossing,b.runners[i],span>0?clamp((t-event.visualTime)/span,0,1):1);}
   state.runners[i]=r;
  }
  r.finished=event&&t>=event.visualTime-1e-9?event.raceTime:null;
 }
 return state;
}
export function nearestFinishedRival(clip){
 const own=clip?.events?.find(e=>e.id===0);if(!own)return null;
 return clip.events.filter(e=>e.id!==0&&Number.isFinite(e.raceTime)).sort((a,b)=>Math.abs(a.raceTime-own.raceTime)-Math.abs(b.raceTime-own.raceTime)||a.id-b.id)[0]??null;
}
