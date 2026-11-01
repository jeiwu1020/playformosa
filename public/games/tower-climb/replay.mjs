// Adapted from long-jump's read-only snapshot replay. Never re-run simulation or scoring.
export function createResultReplay(){
 let frames=[],active=false,paused=false,time=0,index=0,complete=false;
 function reset(){frames=[];active=false;paused=false;time=0;index=0;complete=false;}
 function record(state,camera=null){
  if(active||complete||!['play','done'].includes(state.phase)||!Number.isFinite(state.time))return;
  const t=state.time,last=frames.at(-1);
  if(last&&t-last.t<1/30&&state.phase!=='done')return;
  if(last&&t===last.t)frames.pop();
  frames.push({t,state:structuredClone(state),camera:camera?{...camera}:null});
  while(frames.length>1&&frames[1].t<=t-5)frames.shift();
  while(frames.length>152)frames.shift();
  complete=state.phase==='done';
 }
 function start(){if(!complete||frames.length<2)return false;active=true;paused=false;time=frames[0].t;index=0;return true;}
 function stop(){active=false;paused=false;}
 function advance(seconds){if(!active||paused||!Number.isFinite(seconds)||seconds<=0)return;time=Math.min(frames.at(-1).t,time+seconds);while(index+1<frames.length&&frames[index+1].t<=time)index++;if(time>=frames.at(-1).t)stop();}
 return{record,start,stop,advance,reset,setPaused:v=>{if(active)paused=!!v;},get ready(){return complete&&frames.length>1;},get size(){return frames.length;},get firstTime(){return frames[0]?.t;},get current(){return frames[index];},get time(){return time;},get active(){return active;},get paused(){return paused;}};
}
