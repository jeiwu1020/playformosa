// Deterministic, fixed-step reduced-order model; not a fluid solver.
export const CFG=Object.freeze({gravity:9.81,mu:.105,startZ:3.55,releaseZ:1.55,targetZ:-2.8,tableHalfWidth:1.9,tableHalfLength:5.35,radius:.37,rim:1.04,beerHeight:.88,emptyMass:.48,beerMass:.5});
export const CONDITIONS=Object.freeze([Object.freeze({id:'wood',name:'普通木桌',hint:'平順推杯，抓準停杯距離。',volumeMl:500,mu:.105}),Object.freeze({id:'full',name:'滿杯考驗',hint:'同樣木桌，酒更滿：溫柔加速。',volumeMl:535,mu:.105}),Object.freeze({id:'slick',name:'濕滑桌面',hint:'500 mL，桌更滑：提早收力。',volumeMl:500,mu:.072})]);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createState(condition=0){const config=typeof condition==='number'?CONDITIONS[condition]:condition;return {config:config||CONDITIONS[0],releaseTime:0,quietTime:0,x:0,z:CFG.startZ,vx:0,vz:0,fill:1,spilled:0,sloshX:0,sloshZ:0,sloshVX:0,sloshVZ:0,tiltX:0,tiltZ:0,tiltVX:0,tiltVZ:0,ax:0,az:0,fallen:false,fallTime:0,released:false,cancelled:false,invalidReason:null,settleTime:0,time:0,lastSpill:0};}
export function release(s){if(s.cancelled)return;s.released=true;s.settleTime=0;s.releaseTime=0;s.quietTime=0;}
export function cancelGesture(s){s.cancelled=true;s.released=false;s.vx=0;s.vz=0;s.ax=0;s.az=0;}
export function step(s,dt,hand=null){
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/60);s.time+=dt;s.lastSpill=0;if(s.released)s.releaseTime+=dt;
 if(s.fallen){s.fallTime+=dt;const loss=Math.min(s.fill,dt*1.8);s.fill-=loss;s.spilled+=loss;s.lastSpill=loss;s.x+=s.vx*dt;s.z+=s.vz*dt;return;}
 if(s.cancelled)return;
 if(s.invalidReason)hand=null;
 const ox=s.vx,oz=s.vz;
 const mass=CFG.emptyMass+s.config.volumeMl/1000*s.fill;
 if(hand){let fx=(hand.x-s.x)*42-s.vx*4.4,fz=(hand.z-s.z)*42-s.vz*4.4;const f=Math.hypot(fx,fz),maxForce=13.5;if(f>maxForce){fx*=maxForce/f;fz*=maxForce/f;}s.vx+=fx/mass*dt;s.vz+=fz/mass*dt;}
 const speed=Math.hypot(s.vx,s.vz),dv=s.config.mu*CFG.gravity*dt;
 if(speed<=dv){s.vx=0;s.vz=0;}else{s.vx*=1-dv/speed;s.vz*=1-dv/speed;}
 s.ax=(s.vx-ox)/dt;s.az=(s.vz-oz)/dt;s.x+=s.vx*dt;s.z+=s.vz*dt;
 if(hand&&s.z<CFG.releaseZ){s.invalidReason='late-release';s.released=true;hand=null;}
 // Liquid surface: damped gravity-wave mode driven by container acceleration.
 for(const axis of ['X','Z']){const a=axis==='X'?s.ax:s.az,sl='slosh'+axis,sv='sloshV'+axis,t='tilt'+axis,tv='tiltV'+axis;s[sv]+=(-52*(s[sl]+a/CFG.gravity)-4.2*s[sv])*dt;s[sl]=clamp(s[sl]+s[sv]*dt,-2.2,2.2);s[tv]+=(-95*(s[t]+a*.012)-7*s[tv])*dt;s[t]=clamp(s[t]+s[tv]*dt,-.35,.35);}
 const slope=Math.hypot(s.sloshX,s.sloshZ),height=.08+CFG.beerHeight*(s.config.volumeMl/500)*s.fill,overflow=Math.max(0,height+CFG.radius*slope-CFG.rim);
 // Rim overflow discharge proportional to head^(3/2); removed volume never returns.
 const loss=Math.min(s.fill,4.6*Math.pow(overflow,1.5)*dt);s.fill-=loss;s.spilled+=loss;s.lastSpill=loss;
 if(Math.abs(s.x)>CFG.tableHalfWidth||Math.abs(s.z)>CFG.tableHalfLength){s.fallen=true;s.fallTime=0;}
 if(!hand&&s.released&&Math.hypot(s.vx,s.vz)<.015)s.settleTime+=dt;else s.settleTime=0;
 const quiet=Math.hypot(s.vx,s.vz)<.025&&Math.hypot(s.sloshX,s.sloshZ)<.025&&Math.hypot(s.sloshVX,s.sloshVZ)<.07&&s.lastSpill<1e-6;
 s.quietTime=!hand&&s.released&&quiet?s.quietTime+dt:0;
}
export function isSettled(s){if(s.fallen)return s.fallTime>1.2;return s.released&&s.releaseTime>.65&&(s.quietTime>.45||(s.settleTime>5&&Math.hypot(s.sloshX,s.sloshZ)<.08&&s.lastSpill<1e-6));}
export function score(s){const distance=Math.hypot(s.x,s.z-CFG.targetZ),accuracy=Math.exp(-Math.pow(distance/.85,1.4)),retention=clamp(s.fill,0,1),total=(s.fallen||s.invalidReason||s.cancelled)?0:Math.round(1000*accuracy*Math.pow(retention,1.8));return {total,distance,spillMl:Math.round((1-retention)*s.config.volumeMl),retention,success:!s.fallen&&!s.invalidReason&&!s.cancelled&&distance<.35&&retention>.75};}
