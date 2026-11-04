// A seven-second illustrative choreography, not a physical timing measurement.
export const DURATION=7;
export const KEY_POSES=[{time:.30,label:'捏住鈔票'},{time:.90,label:'放開鈔票'},{time:1.98,label:'抓住小鴨'},{time:3.25,label:'接回兩物'},{time:5.70,label:'完成挑戰'}];
export const PHASES=[[0,.55,'ready','捏住鈔票'],[.55,.8,'release','鬆手放鈔'],[.8,1.65,'reach','伸向小鴨'],[1.65,2.05,'grab','抓住小鴨'],[2.05,2.95,'return','同手帶鴨回來'],[2.95,3.25,'catch','接回鈔票'],[3.25,4.9,'success','兩樣都接住了！'],[4.9,7,'signature','換你挑戰！']];
export const clamp01=n=>Math.max(0,Math.min(1,n));export const smooth=n=>{const u=clamp01(n);return u*u*(3-2*u)};
const mix=(a,b,u)=>a+(b-a)*u,vecMix=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const READY=[.18,1.21,.28],GRAB=[.48-(.022*Math.cos(-1.2)-.066*Math.sin(-1.2)),.90-(.022*Math.sin(-1.2)+.066*Math.cos(-1.2)),.172],CATCH=[.18,1.15,.28];
function yawed(q,y){const s=Math.sin(y/2),c=Math.cos(y/2);return[c*q[0]+s*q[2],c*q[1]+s*q[3],c*q[2]-s*q[0],c*q[3]-s*q[1]]}
const RIGHT_GUN=yawed([.5,-.5,-.5,.5],.28),LEFT_GUN=yawed([.5,.5,.5,.5],-.28),REST_Q=[Math.SQRT1_2*Math.cos(-.06),-Math.SQRT1_2*Math.sin(-.06),Math.SQRT1_2*Math.sin(-.06),Math.SQRT1_2*Math.cos(-.06)];
function slerp(a,b,t){let dot=a.reduce((s,v,i)=>s+v*b[i],0);if(dot<0){b=b.map(v=>-v);dot=-dot;}if(dot>.9995){const q=vecMix(a,b,t),len=Math.hypot(...q);return q.map(v=>v/len)}const angle=Math.acos(Math.min(1,dot)),s=Math.sin(angle);return a.map((v,i)=>(v*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/s)}
export function sampleTimeline(seconds){
 const time=Number.isFinite(seconds)?Math.max(0,Math.min(DURATION,seconds)):0,p=PHASES.find(([a,b])=>time>=a&&time<b)||PHASES.at(-1),progress=clamp01((time-p[0])/(p[1]-p[0]));
 const out=smooth((time-.8)/.85),back=smooth((time-2.05)/.9),regrip=smooth((time-3.25)/.55),signature=smooth((time-3.8)/1.1),restLift=smooth((time-3.25)/.4);
 let wrist=time<2.05?vecMix(READY,GRAB,out):vecMix(GRAB,CATCH,back);if(time>=.8&&time<1.65)wrist[1]+=Math.sin(out*Math.PI)*.045;
 wrist=vecMix(wrist,[.30,.902,.21],signature);
 const rz=time<2.05?-1.2*out:-1.2*(1-back),quaternion=slerp([0,0,Math.sin(rz/2),Math.cos(rz/2)],RIGHT_GUN,signature);
 const restRaised=vecMix([-.36,.889,.21],[-.30,1.12,.24],restLift),restWrist=vecMix(restRaised,[-.30,.902,.21],signature);
 const pinch=time<.7?1:time<.8?1-smooth((time-.7)/.1):smooth((time-2.95)/.2),duckGrip=smooth((time-1.67)/.25),fall=clamp01((time-.7)/(3.15-.7));
 return{time,phase:p[2],label:p[3],progress,overallProgress:time/DURATION,activeHand:'right',poseStage:time<3.25?'action':time<3.8?'regrip':time<4.9?'lower':'signature',regrip,signature,
  hand:{wrist,rotation:[0,0,rz],quaternion,pinch,duckGrip},restHand:{wrist:restWrist,quaternion:slerp(REST_Q,LEFT_GUN,signature),gun:smooth((time-3.5)/.9)},
  torso:{yaw:.065*Math.sin(Math.PI*out)*(1-back),lean:.018*out*(1-back)},
  bill:{attached:time<.7||time>=3.15,freePoint:[.145+.003*Math.sin(Math.PI*fall),mix(1.332,1.272,.75*fall+.25*fall*fall),.323],flutter:Math.sin(Math.PI*fall)*Math.sin(fall*Math.PI*4)*.018,rotation:[-Math.PI/2*regrip,0,0]},
  duck:{attached:time>=1.95}};
}
