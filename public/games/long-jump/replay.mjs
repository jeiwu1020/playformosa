// Read-only snapshots, never simulation inputs or a second scoring run.
const copy=value=>structuredClone(value);
const WINDOW=5,PRE_LIMIT=602,TAIL_LIMIT=360;
export function createLandingReplay(){
 let frames=[],contact=null,contactIndex=-1,visual=null,active=false,paused=false,time=0,index=0,complete=false;
 function reset(){frames=[];contact=null;contactIndex=-1;visual=null;active=false;paused=false;time=0;index=0;complete=false;}
 function record(state){
  if(active||complete||!Number.isFinite(state.t))return;
  const t=state.t;
  if(frames.length&&t<=frames.at(-1).t)return;
  if(contact===null){
   while(frames.length>1&&frames[1].t<=t-WINDOW)frames.shift();
   if(state.phase==='land'||state.phase==='done'){contact=t;contactIndex=frames.length;}
   else if(frames.length>=PRE_LIMIT)frames.shift();
  }
  frames.push({t,state:copy(state),visual});
  // Current physics settles in ~1 s. Defensively decimate only the tail if a
  // future engine extends it: retain the pre-contact window and exact contact.
  if(contact!==null&&frames.length-contactIndex>TAIL_LIMIT){
   frames=frames.filter((_,i)=>i<=contactIndex||i===frames.length-1||(i-contactIndex)%2===0);
  }
  complete=state.phase==='done';
 }
 function attachVisual(value){visual=value;if(frames.length)frames.at(-1).visual=value;}
 function start(){if(!complete||contact===null||frames.length<2)return false;active=true;paused=false;time=frames[0].t;index=0;return true;}
 function stop(){active=false;paused=false;}
 function advance(seconds){
  if(!active||paused||!Number.isFinite(seconds)||seconds<=0)return;
  const slowStart=contact-.2,slowEnd=contact+.55,end=frames.at(-1).t;
  let left=seconds;
  while(left>1e-9&&time<end){
   const slow=time>=slowStart&&time<slowEnd,rate=slow?.45:1;
   const boundary=Math.min(end,time<slowStart?slowStart:slow?slowEnd:end);
   const used=Math.min(left,(boundary-time)/rate);time+=used*rate;left-=used;
  }
  while(index+1<frames.length&&frames[index+1].t<=time+1e-9)index++;
  if(time>=end){time=end;index=frames.length-1;stop();}
 }
 return {record,attachVisual,start,stop,advance,reset,setPaused:value=>{if(active)paused=Boolean(value);},get ready(){return complete&&contact!==null&&frames.length>1;},get size(){return frames.length;},get contactTime(){return contact;},get firstTime(){return frames[0]?.t;},get current(){return frames[index];},get active(){return active;},get paused(){return paused;},get time(){return time;}};
}
// Only transforms/visibility are recorded. Geometry/material pools stay shared;
// retained frames never own GPU resources, textures, DOM nodes or event handlers.
export function captureReplayObjects(objects){return objects.map(o=>({position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),visible:o.visible,opacity:o.material?.opacity,kind:o.userData?.kind}));}
export function restoreReplayObjects(objects,snapshot){snapshot?.forEach((s,i)=>{const o=objects[i];if(!o)return;o.position.fromArray(s.position);o.rotation.fromArray(s.rotation);o.scale.fromArray(s.scale);o.visible=s.visible;if(o.material&&s.opacity!==undefined)o.material.opacity=s.opacity;if(s.kind!==undefined)o.userData.kind=s.kind;});}
