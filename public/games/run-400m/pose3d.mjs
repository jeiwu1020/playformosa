import {runningArm,reachArm,smoothBlend,runnerVisualMotion} from '../shared/runner-arm-pose.mjs';
// Render-only joint adapter. Race physics, AI, timing and chest crossing stay in race.mjs.
const mix=(a,b,t)=>a+(b-a)*t;
export function prepared(race){return race.phase==='set'||race.phase==='race'||race.phase==='done'||race.runners[0].held[2]&&race.runners[0].held[3];}
export function sprintPose(r,time=0,phase='ready',isPrepared=r.held[2]&&r.held[3]||phase==='set'||phase==='race'){
 const crouch=!r.started&&isPrepared,motion=runnerVisualMotion(r,time,'400m');
 let lean=crouch?1.18:motion.finish*.67+(r.imbalance>.55?Math.sin(time*15)*.13:.07);
 const hip={x:r.x,y:crouch?.48:1.12+(r.v>1?Math.sin(time*22)*.025:0)};
 const shoulder={x:hip.x+Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65};
 const head={x:hip.x+Math.sin(lean)*.98,y:hip.y+Math.cos(lean)*.98};
 const p={hip,shoulder,head};
 const runout=motion.finishAge;
 if(runout>1.2){const breathe=Math.sin((runout-1.2)*5)*.014*Math.min(1,runout-1.2);shoulder.y+=breathe;head.y+=breathe;}
 const fatigue=Math.max(0,Math.min(1,r.fatigue??(1-(r.stamina??100)/100)));
 for(let i=0;i<2;i++){
  const s=i?1:-1,phase=time*19+r.id*1.4+i*Math.PI;
  if(crouch){p['knee'+i]={x:r.x+(i?-.32:.40),y:i?.15:.32};p['foot'+i]={x:r.x+(i?-.95:-.05),y:.11};const arm=reachArm(shoulder,{x:shoulder.x+.14,y:.12,z:(i===0?1:-1)*.015},{side:i===0?1:-1});p['elbow'+i]=arm.elbow;p['hand'+i]=arm.hand;}
  else{const swing=r.v>1?Math.sin(phase):0;const lift=r.v>1?Math.max(0,Math.cos(phase))*.32:0;
   p['knee'+i]={x:r.x+swing*.35,y:.64+lift*.25};p['foot'+i]={x:r.x+swing*.57,y:.11+lift};
   const arm=runningArm(shoulder,{phase:phase+Math.PI,activity:motion.activity,fatigue,lean,finish:motion.finish,active:1-smoothBlend(time-r.lastArm,.35,.9),side:i===0?1:-1});
   p['elbow'+i]=arm.elbow;p['hand'+i]=arm.hand;
  }
 }
 // Rotate the complete skeleton about its hip, using the same angle as the
 // torso/neck mesh. Flattening/clamping each joint separately detached the head.
 if(r.fall>0){
  const progress=Math.min(1,r.fall/.32),amount=progress*progress*(3-2*progress);
  const origin={...hip},turn=(1.72-lean)*amount,c=Math.cos(turn),s=Math.sin(turn),height=mix(origin.y,.54,amount);
  for(const q of Object.values(p)){const dx=q.x-origin.x,dy=q.y-origin.y;q.x=origin.x+dx*c+dy*s;q.y=height-dx*s+dy*c;}
  lean+=turn;
  // Lift the whole pose if a hand/foot would cross the track, never detach a joint.
  const lift=Math.max(0,.10-Math.min(...Object.values(p).map(q=>q.y)),.39-p.head.y);
  if(lift)for(const q of Object.values(p))q.y+=lift;
 }

 return{points:p,state:{lean,phase:r.finished!==null?'done':r.fall>0?'land':'run'}};
}
export function viewport(width,height,playerX){const aspect=width/Math.max(1,height),viewHeight=aspect<.8?13:aspect<1.2?10:8.2;return{viewHeight,viewWidth:viewHeight*aspect,targetX:Math.max(.65,playerX+(aspect<.8?.5:2)),targetY:.8};}

// Lower broadcast view, still elevated enough to separate the four lanes.
export const cameraOffset={x:2,y:13,z:18};
