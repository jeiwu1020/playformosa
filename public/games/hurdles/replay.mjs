import {pose} from './physics.mjs';

// Presentation snapshots only: never inputs to step(), scoring, storage or capture().
// At 120Hz five seconds need 601 frames; the cap also bounds unexpected dense callers.
const WINDOW=5,LIMIT=602;
export function createHurdlesReplay(){
 let frames=[],complete=false,active=false,paused=false,time=0,index=0;
 function record(state){
  if(active||complete||!Number.isFinite(state.t))return;
  if(frames.length&&state.t<=frames.at(-1).t)return;
  while(frames.length&&frames[0].t<state.t-WINDOW-1e-9)frames.shift();
  if(frames.length>=LIMIT)frames.shift();
  frames.push({t:state.t,state:structuredClone(state),points:pose(state)});
  complete=state.phase==='done'||state.phase==='dnf';
 }
 function stop(){active=false;paused=false;}
 function reset(){frames=[];complete=false;stop();time=0;index=0;}
 function start(){if(!complete||frames.length<2)return false;active=true;paused=false;time=frames[0].t;index=0;return true;}
 function advance(seconds){
  if(!active||paused||!Number.isFinite(seconds)||seconds<=0)return;
  time=Math.min(frames.at(-1).t,time+seconds);
  while(index+1<frames.length&&frames[index+1].t<=time+1e-9)index++;
  if(time>=frames.at(-1).t-1e-9){time=frames.at(-1).t;index=frames.length-1;stop();}
 }
 return {record,start,advance,stop,reset,setPaused:value=>{if(active)paused=Boolean(value);},get ready(){return complete&&frames.length>1;},get active(){return active;},get paused(){return paused;},get current(){return frames[index];},get time(){return time;},get firstTime(){return frames[0]?.t;},get size(){return frames.length;}};
}
