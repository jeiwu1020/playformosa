import {runningArm,runnerVisualMotion} from '../shared/runner-arm-pose.mjs';
// Articulated joints adapt the preserved 100m procedural character, in metres.
export function runnerPose(r,time){
 const motion=runnerVisualMotion(r,time,'1500m'),running=r.v>.35, tired=Math.max(0,1-r.energy/30), wobble=r.wobble||0;
 const phase=time*(6+r.v*1.45)+r.id*1.3;
 const lean=.065+motion.finish*.62+tired*.12+Math.sin(phase*.6)*wobble*.045;
 const hip={x:0,y:1.12+(running?Math.sin(phase*2)*.028:Math.sin(time*3)*.012)};
 const shoulder={x:Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65};
 const head={x:Math.sin(lean)*.98,y:hip.y+Math.cos(lean)*.98};const points={hip,shoulder,head};
 for(let i=0;i<2;i++){const a=phase+i*Math.PI,swing=running?Math.sin(a):0,lift=running?Math.max(0,Math.cos(a))*.32:0;
  points['knee'+i]={x:swing*.35,y:.64+lift*.25};points['foot'+i]={x:swing*.57,y:.11+lift};
  const arm=runningArm(shoulder,{phase:a+Math.PI,activity:motion.activity,fatigue:tired,lean,finish:motion.finish,side:i===0?1:-1});
  points['elbow'+i]=arm.elbow;points['hand'+i]=arm.hand;
 }
 return{points,state:{lean,phase:running?'run':'standing'}};
}
