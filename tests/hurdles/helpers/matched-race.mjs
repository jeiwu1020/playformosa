import {fresh,step,DT} from '../../../public/games/hurdles/physics.mjs';
// All strategies use exactly this common ground cadence and arm schedule.
// Only the hurdle maneuver differs: none, correctly timed, early, or late.
export function matchedRace(strategy='clean',{hold=.30,factor=.60,cadence=.28}={}){
 const s=fresh(),trace=[],contacts=[],flights=[],gaps=[];let charging=false,age=0,wasAir=false,attempt=-1,launch=null,landing=null;
 const offset={clean:0,early:2.2,late:-1.0}[strategy]??0;
 for(let i=0;i<21600&&!['done','dnf'].includes(s.phase);i++){
  const t=i*DT,phase=t%cadence,keys=[false,false,false,false];keys[Math.floor(t/.24)%2]=phase<.12;
  const next=s.hurdles.findIndex(h=>!h.passed&&h.x>s.x-.7),h=s.hurdles[next],d=h?h.x-s.x:999;
  if(s.phase==='air'){if(strategy!=='none')keys[2]=keys[3]=true;charging=false;wasAir=true;}
  else if(wasAir){wasAir=false;}
  else{
   if(strategy!=='none'&&!charging&&next!==attempt&&d<Math.max(2.4,s.vx*factor)+offset&&d>.15&&s.stumble<.4){charging=true;age=0;attempt=next;if(landing)gaps.push({seconds:s.t-landing.t,steps:s.stats.steps-landing.steps,speed:s.vx});}
   if(charging){age+=DT;keys[2]=age<hold;if(age>hold+.02)charging=false;}
   else keys[2+Math.floor(t/cadence)%2]=phase<.13;
  }
  const before=s.vx;step(s,keys,DT);if(s.events.includes('jump'))launch={x:s.x,t:s.t,v:s.vx};if(s.events.includes('land')&&launch){flights.push({seconds:s.t-launch.t,distance:s.x-launch.x,start:launch.v,end:s.vx});landing={t:s.t,steps:s.stats.steps};}if(s.events.includes('impact'))contacts.push({t:s.t,x:s.x,before,after:s.vx});
  if(i%12===0)trace.push({t:+s.t.toFixed(3),x:+s.x.toFixed(3),speed:+s.vx.toFixed(3),phase:s.phase});
 }
 return {strategy,time:+s.t.toFixed(3),phase:s.phase,...s.stats,contacts,trace,flights,gaps};
}
