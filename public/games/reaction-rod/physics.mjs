import {rememberFinalMoment} from './final-moment.mjs';
// SI world: one unit = one meter; all time is seconds. No adaptive gravity.
export const CONFIG=Object.freeze({lanes:[-.6,-.3,0,.3,.6],count:10,spawnY:2.275,rodLength:.35,rodRadius:.022,gravity:9.81,handSpeed:4.5,handAcceleration:45,handHalfWidth:.06,handHalfHeight:.06,minX:-.63,maxX:.63,minY:1.65,maxY:1.95,readyY:1.8,shoulderY:1.4,shoulderX:.18,armLength:.72,floorY:.045,fixedStep:1/240,inputDeadzone:.004,inputSmooth:.016,warningStrain:.55,fallStrain:1.15,fallDuration:1.1,recoveryGuard:.3,crouchDepth:.45,crouchAcceleration:16,crouchSpeed:3,legLength:.445,supportHold:.38});
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function schedule(seed){const rng=random(seed);let last=-1;return Array.from({length:10},(_,i)=>{let lane=Math.floor(rng()*5);if(lane===last)lane=(lane+1+Math.floor(rng()*4))%5;last=lane;const p=i/9;return{lane,gap:i===0?1.0:(rng()<.22?.45+rng()*.25:.2-p*.07+rng()*(.24-p*.09)),gravity:CONFIG.gravity};});}
function makeHand(side){return{side,x:side*.16,y:CONFIG.readyY,vx:0,vy:0,tx:side*.16,ty:CONFIG.readyY,ax:0,ay:0};}
export function makeWorld(seed=1){const hands=[makeHand(-1),makeHand(1)];return{seed,plan:schedule(seed),state:'ready',time:0,wait:0,index:0,caught:0,missed:0,streak:0,bestStreak:0,hands,activeHand:1,hand:hands[1],input:{x:.16,y:1.8,engaged:false},body:{crouch:0,crouchV:0,x:0,feet:[-.15,.15],comX:0,supportLeft:-.225,supportRight:.225,phase:'upright',angle:0,omega:0,strain:0,warningTime:0,fallTime:0,falls:0,guard:0},rod:null,events:[],catches:[],finishWait:0};}
export function start(w){if(w.state!=='ready')return false;w.state='playing';w.wait=w.plan[0].gap;return true;}
export function pause(w){if(w.state!=='playing')return false;w.state='paused';return true;}
export function resume(w){if(w.state!=='paused')return false;w.state='playing';return true;}
export function aim(w,x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||w.state==='paused'||w.body.phase!=='upright')return false;x=clamp(x,CONFIG.minX,CONFIG.maxX);y=clamp(y,CONFIG.minY-CONFIG.crouchDepth,CONFIG.maxY);if(w.input.engaged&&Math.hypot(x-w.input.x,y-w.input.y)<CONFIG.inputDeadzone)return false;w.input.x=x;w.input.y=y;w.input.engaged=true;if(x<-.055)w.activeHand=0;else if(x>.055)w.activeHand=1;else{const distances=w.hands.map(h=>Math.hypot(x-h.x,y-h.y)),other=1-w.activeHand;if(distances[other]+.04<distances[w.activeHand])w.activeHand=other;}w.hand=w.hands[w.activeHand];return true;}
export function releaseInput(w){w.input.engaged=false;}
// One shared pose defines physical reach and rendered joints; never scale the hero.
export function bodyPose(w){
 const b=w.body,fallProgress=b.phase==='upright'?0:b.fallTime<.55?Math.min(1,b.fallTime/.17):Math.max(0,1-(b.fallTime-.55)/.55);
 const crouch=b.phase==='rising'?b.crouch*fallProgress:b.crouch;
 const angle=b.angle,torso={x:b.x,y:1.04-crouch-fallProgress*(.86-crouch),z:.02};
 // Both straight legs must be reachable even when the pelvis leans sideways.
 for(let i=0;i<2;i++){const side=i?1:-1,hipX=torso.x+side*.105*Math.cos(angle)-.03*Math.sin(angle),hipLocalY=-side*.105*Math.sin(angle)-.03*Math.cos(angle),dx=hipX-b.feet[i],dz=.055-(.10+.55*fallProgress);const maximum=.13+Math.sqrt(Math.max(0,(2*CONFIG.legLength)**2-dx*dx-dz*dz))-hipLocalY-.001;torso.y=Math.min(torso.y,maximum);}
 return{torso,angle,fallProgress,feet:b.feet.slice()};
}
export function shoulder(w,side){const p=bodyPose(w),a=-p.angle;return{x:p.torso.x+side*.16*Math.cos(a)-.43*Math.sin(a),y:p.torso.y+side*.16*Math.sin(a)+.43*Math.cos(a),z:p.torso.z+.08};}
export function legPose(w,side){
 const p=bodyPose(w),a=-p.angle,hip={x:p.torso.x+side*.105*Math.cos(a)+.03*Math.sin(a),y:p.torso.y+side*.105*Math.sin(a)-.03*Math.cos(a),z:.055},ankle={x:p.feet[side<0?0:1],y:.13,z:.10+.55*p.fallProgress};
 const dx=ankle.x-hip.x,dy=ankle.y-hip.y,dz=ankle.z-hip.z,d=Math.hypot(dx,dy,dz),half=d/2,bend=Math.sqrt(Math.max(0,CONFIG.legLength**2-half**2)),ux=dx/d,uy=dy/d,uz=dz/d;
 // Forward squat knees blend into raised seated knees as feet slide forward on the floor.
 const by=p.fallProgress,bz=1-p.fallProgress,dot=by*uy+bz*uz,nx=-dot*ux,ny=by-dot*uy,nz=bz-dot*uz,n=Math.hypot(nx,ny,nz)||1;
 return{hip,knee:{x:(hip.x+ankle.x)/2+bend*nx/n,y:(hip.y+ankle.y)/2+bend*ny/n,z:(hip.z+ankle.z)/2+bend*nz/n},ankle};
}
export function clampReach(w,h,x,y){
 x=clamp(x,h.side<0?CONFIG.minX:-.055,h.side<0?.055:CONFIG.maxX);
 const pose=bodyPose(w),lowering=w.body.phase==='upright'?w.body.crouch:1.04-pose.torso.y;
 y=clamp(y,CONFIG.minY-lowering,CONFIG.maxY-lowering);
 const s=shoulder(w,h.side),dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),radius=Math.sqrt(CONFIG.armLength**2-(.20-s.z)**2);
 if(d>radius){const k=radius/d;x=s.x+dx*k;y=s.y+dy*k;}return{x,y};
}
export function catchOverlap(hand,rod){const nearest=clamp(hand.y,rod.y-CONFIG.rodLength/2+CONFIG.rodRadius,rod.y+CONFIG.rodLength/2-CONFIG.rodRadius),dx=(hand.x-rod.x)/(CONFIG.handHalfWidth+CONFIG.rodRadius),dy=(hand.y-nearest)/(CONFIG.handHalfHeight+CONFIG.rodRadius);return dx*dx+dy*dy<=1;}
function moveHand(w,h,dt){const active=w.body.phase==='upright'&&w.input.engaged&&w.hands[w.activeHand]===h;const target=clampReach(w,h,active?w.input.x:h.side*.16+w.body.x,active?w.input.y:CONFIG.readyY-(w.body.phase==='upright'?w.body.crouch:1.04-bodyPose(w).torso.y));const smooth=1-Math.exp(-dt/CONFIG.inputSmooth);h.tx+=(target.x-h.tx)*smooth;h.ty+=(target.y-h.ty)*smooth;const dx=h.tx-h.x,dy=h.ty-h.y,d=Math.hypot(dx,dy),speed=Math.min(CONFIG.handSpeed,Math.sqrt(2*CONFIG.handAcceleration*d)),vx=d>1e-6?dx/d*speed:0,vy=d>1e-6?dy/d*speed:0;const oldVx=h.vx,oldVy=h.vy,dvx=vx-h.vx,dvy=vy-h.vy,dv=Math.hypot(dvx,dvy),k=dv?Math.min(1,CONFIG.handAcceleration*dt/dv):0;h.vx+=dvx*k;h.vy+=dvy*k;const px=h.x+h.vx*dt,py=h.y+h.vy*dt;const pos=clampReach(w,h,px,py);h.x=pos.x;h.y=pos.y;if(Math.hypot(dx,dy)<.0015&&Math.hypot(h.vx,h.vy)<.18){const settled=clampReach(w,h,h.tx,h.ty);h.x=settled.x;h.y=settled.y;h.vx=h.vy=0;}h.ax=clamp((h.vx-oldVx)/dt,-CONFIG.handAcceleration,CONFIG.handAcceleration);h.ay=clamp((h.vy-oldVy)/dt,-CONFIG.handAcceleration,CONFIG.handAcceleration);}
function resolve(w,type,hand=null,reason='floor'){const r=w.rod;if(!r)return;rememberFinalMoment(w,type,reason);w.events.push({type,reason,x:r.x,y:r.y,handY:hand?.y??0,handIndex:hand?w.hands.indexOf(hand):-1,elapsed:r.age,lane:r.lane,at:w.time});if(type==='catch'){w.caught++;w.streak++;w.bestStreak=Math.max(w.bestStreak,w.streak);w.catches.push({height:hand.y,elapsed:r.age});}else{w.missed++;w.streak=0;}w.rod=null;w.index++;if(w.index===10)w.finishWait=.72;else w.wait=w.plan[w.index].gap;}
function fall(w){const b=w.body;b.phase='sitting';b.fallTime=0;b.falls++;w.events.push({type:'fall',at:w.time});resolve(w,'miss',null,'fall');releaseInput(w);}
function axisStep(position,velocity,target,acceleration,speed,dt){const delta=target-position,wanted=Math.sign(delta)*Math.min(speed,Math.sqrt(2*acceleration*Math.abs(delta)));velocity+=clamp(wanted-velocity,-acceleration*dt,acceleration*dt);const next=position+velocity*dt;if((target-position)*(target-next)<=0)return[target,0];return[next,velocity];}
function moveBody(w,dt){
 const b=w.body;
 if(b.phase!=='upright'){b.fallTime+=dt;b.phase=b.fallTime<.55?'sitting':'rising';b.angle*=Math.exp(-8*dt);b.omega=0;b.strain*=Math.exp(-4*dt);b.x*=Math.exp(-6*dt);b.crouchV=0;if(b.fallTime>=CONFIG.fallDuration){b.phase='upright';b.crouch=0;b.strain=0;b.warningTime=0;b.guard=CONFIG.recoveryGuard;w.events.push({type:'recovered',at:w.time});}return;}
 const targetCrouch=w.input.engaged?clamp(CONFIG.minY-w.input.y,0,CONFIG.crouchDepth):0;
 [b.crouch,b.crouchV]=axisStep(b.crouch,b.crouchV,targetCrouch,CONFIG.crouchAcceleration,CONFIG.crouchSpeed,dt);
 if(b.crouch<=0){b.crouch=0;b.crouchV=Math.max(0,b.crouchV);}else if(b.crouch>=CONFIG.crouchDepth){b.crouch=CONFIG.crouchDepth;b.crouchV=Math.min(0,b.crouchV);}
 const direction=w.input.engaged?w.input.x/CONFIG.maxX:0,crouchFraction=b.crouch/CONFIG.crouchDepth;
 b.x+=clamp(direction*.11-b.x,-.55*dt,.55*dt);
 for(let i=0;i<2;i++){const target=(i?.15:-.15)+direction*.04;b.feet[i]+=clamp(target-b.feet[i],-.18*dt,.18*dt);}
 const reachHeight=clamp((w.input.y-CONFIG.minY)/(CONFIG.maxY-CONFIG.minY),0,1);
 const overreach=clamp((Math.abs(w.input.x)-.60)/.03,0,1);
 const targetAngle=-direction*(.28+.08*overreach)*(.72+.28*reachHeight)*(1-.55*crouchFraction),oldAngle=b.angle;
 b.angle+=clamp(targetAngle-b.angle,-1.4*dt,1.4*dt);b.omega=(b.angle-oldAngle)/dt;
 // Approximate mass-weighted lateral COM: torso plus reaching arm mass.
 b.comX=b.x-Math.sin(b.angle)*(.35-.12*crouchFraction)+(w.hands[0].x+w.hands[1].x-2*b.x)*.16;
 b.supportLeft=b.feet[0]-.075;b.supportRight=b.feet[1]+.075;
 const excursion=Math.max(b.supportLeft-b.comX,b.comX-b.supportRight,0),outside=excursion>.008;
 if(outside&&w.input.engaged){if(b.warningTime===0)w.events.push({type:'warning',at:w.time});b.warningTime+=dt;}else b.warningTime=Math.max(0,b.warningTime-dt*3);
 b.strain=b.warningTime>0?CONFIG.warningStrain+(CONFIG.fallStrain-CONFIG.warningStrain)*clamp(b.warningTime/CONFIG.supportHold,0,1):0;
 if(b.warningTime>=CONFIG.supportHold&&b.guard<=0)fall(w);
 if(b.guard>0)b.guard=Math.max(0,b.guard-dt);
}
function step(w,dt){if(w.state==='done'||w.state==='paused')return;if(w.state==='playing'){w.time+=dt;moveBody(w,dt);}for(const h of w.hands)moveHand(w,h,dt);if(w.state!=='playing')return;if(w.body.phase!=='upright')return;if(w.index>=10){w.finishWait-=dt;if(w.finishWait<=0){w.state='done';w.events.push({type:'done',at:w.time});}return;}if(!w.rod){if(w.body.guard>0)return;w.wait-=dt;if(w.wait<=0){const p=w.plan[w.index];w.rod={x:CONFIG.lanes[p.lane],y:CONFIG.spawnY,vy:0,age:0,lane:p.lane,gravity:CONFIG.gravity};w.events.push({type:'drop',lane:p.lane,at:w.time});}return;}const r=w.rod;r.age+=dt;r.y-=(-r.vy*dt+CONFIG.gravity*dt*dt/2);r.vy-=CONFIG.gravity*dt;const hand=w.hands.find(h=>catchOverlap(h,r));if(r.y-CONFIG.rodLength/2>CONFIG.floorY&&hand)resolve(w,'catch',hand);else if(r.y-CONFIG.rodLength/2<=CONFIG.floorY)resolve(w,'miss');}
export function advance(w,dt){if(!Number.isFinite(dt)||dt<=0||w.state==='paused'||w.state==='done')return;let left=Math.min(dt,.12);while(left>1e-9){const d=Math.min(left,CONFIG.fixedStep);step(w,d);left-=d;}}
export function result(w){const n=w.catches.length,meanHeight=n?w.catches.reduce((s,c)=>s+c.height,0)/n:0,meanElapsed=n?w.catches.reduce((s,c)=>s+c.elapsed,0)/n:0;const finesse=clamp((meanHeight-CONFIG.minY)/(CONFIG.maxY-CONFIG.minY),0,1);return{caught:w.caught,missed:w.missed,meanHeight,meanElapsed,bestStreak:w.bestStreak,falls:w.body.falls,rating:clamp(w.caught/10*(8+2*finesse),0,10)};}
export function verdict(caught,falls=0){if(falls)return[caught>=8?'接棒有料，坐姿也有料':'你的手很快，屁股更快',`接住 ${caught} 根、坐倒 ${falls} 次。老闆：椅子錢省了。`];return caught===10?['夜市快手傳說','手接住棒子，雙腳接住了尊嚴。']:caught>=8?['手速有在練喔','老闆開始懷疑，你的手有裝渦輪。']:caught>=5?['手掌已經暖機','眼睛：我看到了！手：我正在路上。']:caught>=1?['至少不是地板全拿','沒接到的不是棒子，是老闆的期待。']:['地板大獲全勝','你的手很淡定。地板今天很忙。'];}
export function cameraBounds(width,height){const aspect=Math.max(.2,width/Math.max(height,1)),spanY=Math.max(2.95,2.05/aspect),spanX=spanY*aspect;return{left:-spanX/2,right:spanX/2,top:1.3+spanY/2,bottom:1.3-spanY/2};}
export function screenToWorld(clientX,clientY,rect,bounds,pointerType='mouse'){const offset=pointerType==='touch'?Math.min(60,rect.height*.12):0;return{x:bounds.left+(clientX-rect.left)/rect.width*(bounds.right-bounds.left),y:bounds.top-(clientY-rect.top-offset)/rect.height*(bounds.top-bounds.bottom)};}
