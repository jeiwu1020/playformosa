import * as T from './vendor/three.module.min.js';
export const KICK_AT=1.2,IMPACT_HOLD=.4,PULL_OUT_AT=KICK_AT+IMPACT_HOLD,OPENING_SECONDS=PULL_OUT_AT+1.45;
export const pulloutDuration=comfort=>comfort?1.8:1.45;
export function advanceOpening(time,dt){const next=time+Math.min(.2,Math.max(0,dt));for(const boundary of[KICK_AT,PULL_OUT_AT,OPENING_SECONDS])if(time<boundary&&next>=boundary)return boundary;return next;}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export const openingFinished=(time,impactAt,comfort=false)=>impactAt!==null&&time>=impactAt+IMPACT_HOLD+pulloutDuration(comfort);
let cache;
export function openingPose(full,w,h,time,comfort=false,impactAt=null){
 const key=JSON.stringify([w,h,full.fov]);
 if(cache?.key!==key){
  // Side shot stays upstream of the tall copier and separates the two silhouettes.
  const target=new T.Vector3(0,1.5,-11.8).applyAxisAngle(new T.Vector3(1,0,0),.035),direction=new T.Vector3(1,.72,.12).normalize(),c=new T.PerspectiveCamera(full.fov,w/h,.1,500);let lo=4,hi=35;
  for(let n=0;n<22;n++){const d=(lo+hi)/2;c.position.copy(target).addScaledVector(direction,d);c.lookAt(target);c.updateMatrixWorld();let fits=true;for(const x of[-1.35,1.35])for(const y of[0,3.15])for(const z of[-13.5,-8.7]){const p=new T.Vector3(x,y,z).applyAxisAngle(new T.Vector3(1,0,0),.035).project(c);if(Math.abs(p.x)>.76||Math.abs(p.y)>.68)fits=false;}if(fits)hi=d;else lo=d;}
  cache={key,pose:{target:target.toArray(),position:target.clone().addScaledVector(direction,hi).toArray(),fov:full.fov}};
 }
 const from=cache.pose;if(impactAt===null||time<=impactAt+IMPACT_HOLD)return from;
 if(openingFinished(time,impactAt,comfort))return full;
 const t=ease((time-impactAt-IMPACT_HOLD)/pulloutDuration(comfort));return{position:from.position.map((v,n)=>v+(full.position[n]-v)*t),target:from.target.map((v,n)=>v+(full.target[n]-v)*t),fov:full.fov};
}
export function poseOpeningBoss(boss,time,impactAt){
 boss.rotation.y=Math.PI;boss.rotation.x=0;boss.position.z=3.55;
 const leg=boss.getObjectByName('kickLeg');
 if(impactAt===null){const swing=ease((time-1.15)/.25);leg.rotation.x=time<1.15?-.5*ease(time/1.15):-.5+1.85*swing;}
 else{leg.rotation.x=1.35*Math.max(0,1-(time-impactAt)/.6);boss.position.z=3.55*(1-ease((time-impactAt-IMPACT_HOLD)/1.45));}
}
export function openingContact(boss,worker){const shoe=boss.getObjectByName('rightShoe');if(!shoe)return{touching:false,distance:Infinity};const foot=shoe.getWorldPosition(new T.Vector3()),target=worker.localToWorld(new T.Vector3(0,-.5,.3)),distance=foot.distanceTo(target);return{touching:distance<=.45&&boss.getObjectByName('kickLeg').rotation.x>.65,distance,foot:foot.toArray(),target:target.toArray()};}
export function openingFlight(launch,time,impactAt,comfort=false){const elapsed=Math.max(0,time-impactAt),duration=IMPACT_HOLD+pulloutDuration(comfort),progress=Math.min(1,(1-Math.exp(-2.5*elapsed))/(1-Math.exp(-2.5*duration))),speed=Math.hypot(launch.vx,launch.vz)||1;return{x:launch.x+launch.vx/speed*2.6*progress,z:launch.z+launch.vz/speed*2.6*progress,hop:Math.sin(progress*Math.PI)*.8,tilt:-progress*.65};}
