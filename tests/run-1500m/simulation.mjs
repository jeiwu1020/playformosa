// Deterministic input scripts exercise the real fixed-step engine, not a timing model.
export const strategies=Object.freeze({cruise:()=>.43,attack:()=>.325,recover:p=>p.energy<25?.60:.35,late:p=>p.s<1150?.45:.33});
export function simulate(engine,{planId=0,strategy='cruise',scenario=0,alone=false}={}){
 const r=engine.createRace(planId);engine.startRace(r);engine.step(r,3.5);
 const p=r.runners[0],route=scenario%5;let next=.15+Math.floor(scenario/5)*.025,n=0,laneNext=0;
 if(alone)for(const q of r.runners.slice(1))q.finished=1;
 const snapshots=[];
 while(p.finished===null&&r.time<240){
  if(r.time>=laneNext){
   let lane=route===1?0:route===2?2:route===3?3:1;
   if(route===4){const can=engine.nextSupply(r,p);lane=can&&can.s-p.s<75?can.lane:0;}
   if(p.targetLane!==lane){const key=p.targetLane<lane?'k':'j';engine.input(r,key,true);engine.input(r,key,false);}
   laneNext=r.time+.6;
  }
  if(r.time>=next){const key=n++%2?'s':'a';engine.input(r,key,true);engine.input(r,key,false);next=r.time+strategies[strategy](p);}
  engine.step(r,1/120);
  if(snapshots.length<Math.floor(r.time/20))snapshots.push(r.runners.slice(1).map(q=>({s:q.s,lane:q.lane,energy:q.energy,tactic:q.tactic})));
 }
 if(!Number.isFinite(p.finished))throw Error('Simulation did not finish');
 return {seconds:p.finished,player:p,race:r,snapshots};
}
