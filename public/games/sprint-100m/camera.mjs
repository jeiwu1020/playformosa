import{viewport,cameraOffset}from'./pose3d.mjs';
const lanes=[3.3,-3.3,-1.1,1.1],mix=(a,b,t)=>a+(b-a)*t;
export function smoother(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*t*(t*(t*6-15)+10);}
const softMax=(a,b)=>.5*(a+b+Math.sqrt((a-b)**2+.0016));
// Replay-time-only functions: seeking cannot inherit a previous camera or speed.
export function finishReplayRate(time,finish,enabled=true){if(!enabled||!Number.isFinite(finish))return 1;const t=time-finish,slow=smoother(-.18,-.04,t)*(1-smoother(.25,1,t));return 1-.75*slow;}
export function cameraPlan(race,width,height,replay=null){const p=race.runners[0],base=viewport(width,height,p.x);if(!replay||replay.mode==='full'||replay.allView)return{...base,targetZ:0,offset:cameraOffset,label:replay?'四跑道全景':'比賽鏡頭'};
 const t=replay.time-replay.playerFinish,push=smoother(-1.1,-.05,t),pull=smoother(.3,1.8,t),close=push*(1-pull),aspect=width/Math.max(1,height);
 const rival=race.runners.find(r=>r.id===replay.rival),weight=rival?1-smoother(2,5,Math.abs(rival.x-p.x)):0;
 const pairX=(p.x+(rival?.x??p.x)*weight)/(1+weight),pairZ=(lanes[p.id]+(lanes[rival?.id]??lanes[p.id])*weight)/(1+weight);
 const line=smoother(-.25,-.10,t)*(1-smoother(.65,1.8,t));
 const aimLine=smoother(0,.35,t)*(1-smoother(.65,1.8,t));
 const closeX=(pairX+100*aimLine)/(1+aimLine)+.1;
 const targetX=mix(base.targetX,closeX,close),targetY=mix(base.targetY,1.05,close),targetZ=mix(0,pairZ,close);
 const offset={x:mix(mix(5,2,pull),3.5,close),y:mix(13,8,close),z:mix(18,17,close)};
 let viewHeight=mix(base.viewHeight,6.4,close);
 // Smooth conservative framing envelope: full body, nearby actual rival, and finish
 // stripe around the crossing. No hard zoom/subject switches at distance thresholds.
 const points=[];const add=(x,z)=>{for(const dx of[-1.35,1.35])for(const y of[-.15,2.65])for(const dz of[-.5,.5])points.push([x+dx,y,z+dz]);};add(p.x,lanes[p.id]);
 if(rival)add(mix(p.x,rival.x,weight),mix(lanes[p.id],lanes[rival.id],weight));
 points.push([mix(p.x,100,line),0,lanes[p.id]]);
 const ox=offset.x,oy=offset.y-targetY,oz=offset.z,h=Math.hypot(ox,oz),d=Math.hypot(h,oy);let required=0;
 for(const [x,y,z]of points){const dx=x-targetX,dy=y-targetY,dz=z-targetZ,sx=(oz*dx-ox*dz)/h,sy=(-ox*oy*dx/h+h*dy-oz*oy*dz/h)/d;required=softMax(required,2*Math.sqrt(sy*sy+.0025));required=softMax(required,2*Math.sqrt(sx*sx+.0025)/aspect);}
 viewHeight=softMax(viewHeight,required*1.07);
 return{viewHeight,viewWidth:viewHeight*aspect,targetX,targetY,targetZ,offset,label:'連續轉播鏡頭',closeWeight:close,rivalWeight:weight};
}
