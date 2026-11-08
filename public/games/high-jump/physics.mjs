import {selectVerdict} from './verdicts.mjs';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const RUN_START=-26.6;
export const BAR_BODY_RESERVE=1.10,BAR_START_HEIGHT=1;
export const MAX_TARGET=50,TAKEOFF={min:-2.3,max:-1,ideal:-1.6};
// One C1 centerline: straight approach then a gradual J bend through the bar.
export function approachZ(x){const u=clamp((x+4)/4,0,1);return -1.8+1.8*u*u;}
export const KEYS=['A','S','J','K'],HOLD_TIME=.34;
export function createRound(target){const s={phase:'countdown',t:0,countdown:3,x:RUN_START,y:1.23,z:approachZ(RUN_START),target:clamp(Number(target)||2,2,50),barHeight:target===undefined?BAR_START_HEIGHT:clamp(Number(target)||2,2,50),barSettled:target!==undefined,barRiseDuration:0,autoHeight:target===undefined,barLocked:target!==undefined,clearanceComplete:false,limbs:[0,0,0,0],held:[false,false,false,false],holdTimes:[0,0],energy:1,speed:0,balance:0,spin:0,crouch:0,charging:false,chargeFoot:-1,pendingRelease:-1,fallen:false,recoveries:0,wasWobbling:false,peakLean:0,lastFoot:-1,launches:0,paused:false,air:0,peak:0,hit:false,hitPart:null,underBar:false,success:false,height:0,barDrop:0,landTime:0,feedback:'彎腿、放開，讓自己動起來。'};const p=pose(s);s.y+=.11-Math.min(p.foot0.y-footRadius(p,0),p.foot1.y-footRadius(p,1));return s;}
export function snapshot(s){return{...s,limbs:[...s.limbs],held:[...s.held],holdTimes:[...s.holdTimes]};}
// Same conservative shoe envelope as the formal long-jump ground model.
export function footRadius(p,i){const f=p['foot'+i],k=p['knee'+i],a=Math.atan2(f.x-k.x,k.y-f.y);return .22*Math.abs(Math.sin(a))+.10*Math.abs(Math.cos(a));}
const footClearance=(p,i)=>p['foot'+i].y-footRadius(p,i)-.09;
export function supported(s,i){const p=pose(s);return s.phase==='run'&&footClearance(p,i)<.35;}
export function cancelMotion(s){s.held.fill(false);s.holdTimes.fill(0);s.charging=false;s.crouch=0;s.chargeFoot=-1;s.pendingRelease=-1;}
export function setLimb(s,key,down,{cancel=false}={}){const i=KEYS.indexOf(key);if(i<0||s.paused&&!cancel)return false;const was=s.held[i];s.held[i]=Boolean(down);if(cancel){if(i<2){s.holdTimes[i]=0;if(s.pendingRelease===i)s.pendingRelease=-1;if(s.chargeFoot===i){s.charging=false;s.crouch=0;s.chargeFoot=-1;}}return false;}if(!was||down||i>1||s.phase!=='run')return false;
 if(s.holdTimes[i]>=HOLD_TIME&&s.charging){s.pendingRelease=Math.max(s.pendingRelease,i);return true;}s.holdTimes[i]=0;return false;
}
function launch(s,i){const p=pose(s);
 // Releasing a charged leg is the intent; the already-charged supporting legs supply the push.
 // This is evaluated on the first physics step, with no extra delay or release-order lottery.
 const eligible=[0,1].filter(f=>s.holdTimes[f]>=HOLD_TIME),plant=eligible.reduce((best,f)=>footClearance(p,f)<footClearance(p,best)?f:best,i);
 const quality=clamp(1-Math.abs(s.balance)*.5-Math.max(0,footClearance(p,plant)-.15)*.7,.4,1);s.takeoffFoot=plant;
 // Same intentional hold/release trigger; high jump converts approach into vertical power.
 const power=Math.pow(s.crouch,2)*(.28+.72*clamp(s.speed/5,0,1))*Math.pow(quality,.65);
 s.takeoffQuality=quality;s.takeoffSpeed=s.speed;s.launchPower=power;s.launchX=s.x;s.launchY=s.y;s.vy=5.3+8*power;s.apexTime=s.vy/7.8;
 // Keep momentum; only a bounded takeoff conversion uses the actual bar distance.
 const forward=clamp(s.speed*.22,.7,3),towardBar=(Math.max(.4,-s.x)+.35)/s.apexTime;
 s.vx=clamp(towardBar,forward*.5,forward*1.25);
 if(s.autoHeight){s.target=s.barHeight=BAR_START_HEIGHT;s.barLocked=false;s.barSettled=false;}
 s.barRiseDuration=0;s.launchBalance=s.balance;s.air=0;s.backTurn=0;s.phase='air';s.launches++;s.holdTimes.fill(0);s.charging=false;s.crouch=0;s.chargeFoot=-1;
 // A body already through the bar before takeoff cannot retroactively clear it.
 if(Object.keys(partNames).some(name=>p[name].x>=0))s.underBar=true;
 if(s.autoHeight){const plan=planBar(s);s.barGoal=plan.height;s.barLockTime=plan.lockTime;s.barRiseY=plan.riseY;}
 s.feedback='先用雙手帶頭肩過桿，髖部過去再收雙腿。';}

const point=(x,y)=>({x,y});
function desiredBackTurn(s){const q=clamp((s.air/s.apexTime-.60)/(.4+.6*(1-Math.min(s.limbs[2],s.limbs[3]))),0,1);return q*q*(3-2*q)*(.28+.72*Math.min(s.limbs[2],s.limbs[3]));}
// Hands can earn rotation, but lowering them cannot rewind the body's flight.
function retainBackTurn(s){s.backTurn=Math.max(s.backTurn||0,desiredBackTurn(s));}
function knee(f,turn=0){const d=Math.max(.001,Math.hypot(f.x,f.y)),b=Math.sqrt(Math.max(0,.55**2-d*d/4));const side=Math.cos(turn*Math.PI);return {...point(f.x/2-f.y/d*b*side,f.y/2+f.x/d*b*side),z:b*Math.sin(turn*Math.PI)};}
const masses={hip:5,shoulder:3,head:2,knee0:1,knee1:1,foot0:.5,foot1:.5,elbow0:.4,elbow1:.4,hand0:.25,hand1:.25};
export function pose(s){const air=s.phase==='air',settled=['land','done'].includes(s.phase)&&s.launches>0;
 const landT=settled?clamp((s.landTime||0)/.35,0,1):0,landBlend=landT*landT*(3-2*landT);
 const l=settled?(s.landingLimbs||s.limbs).map((v,i)=>v+((i<2?1:.25)-v)*landBlend):s.limbs;
 const transition=air||settled?clamp(s.air/.3,0,1):0,blend=transition*transition*(3-2*transition);
 const turn=air||settled?(s.backTurn??desiredBackTurn(s)):0,airRoll=air||settled?1.42*turn+blend*((l[2]-l[3])*.3+(l[0]-l[1])*.16)+(s.launchBalance||0)*(1-.65*blend):s.balance;
 const roll=settled?airRoll+(1.62-airRoll)*landBlend:airRoll;
 const facing=settled?1:blend;
 const arch=blend*(l[2]+l[3])*.5;
 const local={hip:point(0,0),shoulder:point((.06+.16*arch)*turn,.65-.08*blend),head:point((.12+.24*arch)*turn,1.01-.06*blend)};
 for(let i=0;i<2;i++){const flex=l[i],hip=.04+flex*1.36,k=.08+flex*1.47,ground=point(.55*Math.sin(hip)+.55*Math.sin(hip-k),-.55*Math.cos(hip)-.55*Math.cos(hip-k));
 const flying=point(-.12-.58*flex,-.91+.91*flex+(i?1:-1)*.018),mix=settled?1:air?blend:0;
 const f=point(ground.x+(flying.x-ground.x)*mix,ground.y+(flying.y-ground.y)*mix);local['foot'+i]=f;local['knee'+i]=knee(f,facing);
 const a=l[i+2],angle=(-.2+a*1.1)*(1-blend)+(-.25+a*1.65)*blend,bend=(.12+a*1.85)*(1-blend)+(.2+a*1.4)*blend,sh=local.shoulder;
 const el=point(sh.x+.34*Math.sin(angle),sh.y-.34*Math.cos(angle));const hand=point(el.x+.32*Math.sin(angle+bend),el.y-.32*Math.cos(angle+bend));
 const yaw=Math.PI*facing;for(const v of[el,hand]){const dx=v.x-sh.x;v.x=sh.x+dx*Math.cos(yaw);v.z=dx*Math.sin(yaw);}
 local['elbow'+i]=el;local['hand'+i]=hand;}
 // Recenter articulated mass around unchanged ballistic COM, rather than raising whole body.
 let cx=0,cy=0,cz=0,total=0;{for(const [name,m]of Object.entries(masses)){cx+=local[name].x*m;cy+=local[name].y*m;cz+=(local[name].z||0)*m;total+=m;}cx/=total;cy/=total;cz/=total;}
 const p={lean:roll};for(const [name,v]of Object.entries(local)){const u=v.x-cx,w=v.y-cy;p[name]={...point(s.x+u*Math.cos(roll)+w*Math.sin(roll),s.y-u*Math.sin(roll)+w*Math.cos(roll)),z:(v.z||0)-cz};}return p;
}
const segments=[['head','shoulder',.21],['shoulder','hip',.22],['hip','knee0',.09],['hip','knee1',.09],['knee0','foot0',.08],['knee1','foot1',.08],['shoulder','elbow0',.07],['elbow0','hand0',.06],['shoulder','elbow1',.07],['elbow1','hand1',.06]];
// Clothing is part of the visible body: the shorts extend outside the thigh/torso capsules.
const BAR_CONTACT_RADIUS=Math.SQRT2*.042; // Enclose the visible square bar and stripe corners.
const contactJoints=[['head',.34],['hip',.25],['foot0',.2],['foot1',.2]];
const partNames={head:'頭部',shoulder:'肩背',hip:'髖部',knee0:'左膝',knee1:'右膝',foot0:'左腳',foot1:'右腳',elbow0:'左手臂',elbow1:'右手臂',hand0:'左手',hand1:'右手'};
export const visibleBarHeight=s=>s.autoHeight===false?s.target:(s.barHeight??s.target);
export function barContact(s,p=pose(s)){const height=visibleBarHeight(s);for(const [name,r] of contactJoints){const v=p[name];if(Math.hypot(v.x,v.y-height)<r+BAR_CONTACT_RADIUS)return partNames[name];}for(const [aa,bb,r]of segments){const a=p[aa],b=p[bb],dx=b.x-a.x,dy=b.y-a.y,t=clamp((-a.x*dx+(height-a.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(a.x+dx*t,a.y+dy*t-height)<r+BAR_CONTACT_RADIUS)return partNames[bb];}return null;}
// Lowest point where a capsule intersects the bar plane. Same radii as collision.
function capsuleFloor(a,b,r){const dx=b.x-a.x,dy=b.y-a.y;let low=Infinity;
 const at=t=>{if(t<0||t>1)return;const x=a.x+dx*t;if(Math.abs(x)<=r+1e-9)low=Math.min(low,a.y+dy*t-Math.sqrt(Math.max(0,r*r-x*x)));};
 at(0);at(1);if(Math.abs(dx)>1e-9){at((-r-a.x)/dx);at((r-a.x)/dx);const m=dy/dx;at((-m*r/Math.sqrt(1+m*m)-a.x)/dx);}return low;
}
// A standard coordinated pose defines clearance once at takeoff, never from live input.
// Samples are geometry-only: no recursive physics, collisions, scoring or COM changes.
export function planBar(s){const q=snapshot(s);let low=Infinity,hipsPassed=false;const dt=1/240;
 for(let t=dt;t<6;t+=dt){
  hipsPassed ||= pose(q).hip.x>=0;
  for(let i=0;i<4;i++)q.limbs[i]+=((i<2?Number(hipsPassed):Number(q.air>=.12))-q.limbs[i])*(1-Math.exp(-12*dt));
  q.air=t;q.x=s.launchX+s.vx*t;q.y=s.launchY+s.vy*t-3.9*t*t;if(q.y<1)break;retainBackTurn(q);
  const p=pose(q);for(const [name,r]of contactJoints)low=Math.min(low,capsuleFloor(p[name],p[name],r+BAR_CONTACT_RADIUS));
  for(const[a,b,r]of segments)low=Math.min(low,capsuleFloor(p[a],p[b],r+BAR_CONTACT_RADIUS));
 }
 // Shorter beginner jumps retain extra geometric room, not a button exemption.
 const reserve=.10+.22*(1-clamp((s.launchPower-.15)/.45,0,1));
 const height=clamp(Math.floor(((Number.isFinite(low)?low:BAR_START_HEIGHT)-reserve)*10)/10,BAR_START_HEIGHT,MAX_TARGET);
 // A fixed COM-centred safety envelope, independent of the player's limbs.
 // Finish the rise before this envelope can meet the final bar, with 50ms lead.
 let lockTime=s.apexTime;for(let t=0;t<=s.apexTime;t+=dt){const x=s.launchX+s.vx*t,y=s.launchY+s.vy*t-3.9*t*t;if(Math.hypot(x,y-height)<=1.7){lockTime=Math.max(0,t-.05);break;}}
 if(height===BAR_START_HEIGHT||s.underBar)lockTime=0;
 return{height,lockTime,riseY:s.launchY+s.vy*lockTime-3.9*lockTime*lockTime};
}
export function touchesBar(s,p=pose(s)){return barContact(s,p)!==null;}
function tick(s,dt){if(s.paused||s.phase==='done')return;s.t+=dt;
 if(s.phase==='countdown'){s.countdown=Math.max(0,s.countdown-dt);if(s.countdown<1e-7){s.phase='run';s.holdTimes.fill(0);s.charging=false;s.crouch=0;s.chargeFoot=-1;}return;}
 if(s.phase==='run'&&s.pendingRelease>=0){const foot=s.pendingRelease;s.pendingRelease=-1;if(!s.held[foot]&&s.charging)launch(s,foot);}
 const beforePose=s.phase==='air'?pose(s):null;
 const old=[...s.limbs];
 if(s.phase==='run'){for(let f=0;f<2;f++)s.holdTimes[f]=s.held[f]?s.holdTimes[f]+dt:0;const f=s.holdTimes[0]>=s.holdTimes[1]?0:1,age=s.holdTimes[f];s.charging=age>=HOLD_TIME;s.chargeFoot=s.charging?f:-1;s.crouch=s.charging?clamp(.25+(age-HOLD_TIME)*1.8,0,1):0;}
 for(let i=0;i<4;i++){let target=Number(s.held[i]);if(s.phase==='run'&&s.charging&&i===s.chargeFoot)target=.4-.2*s.crouch;s.limbs[i]+=(target-s.limbs[i])*(s.phase==='run'||s.phase==='fall'?Math.min(1,dt*10):1-Math.exp(-12*dt));}
 if(s.phase==='run'){
 const p=pose(s),low=Math.min(footClearance(p,0),footClearance(p,1));s.y+=.02-low;
 const q=pose(s),feet=[0,1].filter(i=>footClearance(q,i)<.2),support=feet.reduce((n,i)=>n+q['foot'+i].x,0)/Math.max(1,feet.length),com=q.hip.x*.65+q.shoulder.x*.25+(q.hand0.x+q.hand1.x)*.05;
 const asym=(s.limbs[0]-s.limbs[1])*3.1+(s.limbs[2]-s.limbs[3])*2.5,help=9*Math.max(0,1-(s.balance/.7)**2);
 s.spin+=(asym+2*(com-support)+5*Math.sin(s.balance)-help*s.balance-s.spin*2)*dt;s.balance+=s.spin*dt;
 s.peakLean=Math.max(s.peakLean,Math.abs(s.balance));if(Math.abs(s.balance)>.45)s.wasWobbling=true;else if(s.wasWobbling&&Math.abs(s.balance)<.2){s.recoveries++;s.wasWobbling=false;}
 // Reference gait is hip-anchored vertically; keep its ground contact while storing COM.
 s.y+=q.hip.y-pose(s).hip.y;
 const extension=[Math.max(0,old[0]-s.limbs[0]),Math.max(0,old[1]-s.limbs[1])],together=Math.min(...extension);let impulse=0;
 for(let f=0;f<2;f++)if(!(s.charging&&s.chargeFoot===f)){const contact=footClearance(q,f)<.22?1:.18;impulse+=(extension[f]-.7*together)*4.8*contact*s.energy*Math.max(.1,Math.cos(s.balance));}
 s.speed+=Math.min(impulse,dt*5.2);s.speed=Math.max(0,s.speed-dt*(.17+.014*s.speed*s.speed+(s.charging?.65:0)));s.speed=Math.min(s.speed,13);s.energy=clamp(s.energy+dt*.2-impulse*.018,0,1);
 s.x+=s.speed*dt;s.z=approachZ(s.x);
 if(Math.abs(s.balance)>1.12){s.fallen=true;s.phase='fall';s.charging=false;s.crouch=0;s.vy=0;s.feedback='重心倒了！手臂和左右腿要一起協調。';}
 else if(s.x>.2){s.phase='land';s.feedback='一路走過去了，橫桿以為你是裁判。';}return;}
 if(s.phase==='fall'){s.vy-=9.8*dt;s.y+=s.vy*dt;s.spin+=Math.sin(s.balance)*dt*3;s.balance+=s.spin*dt;s.x+=s.speed*dt;s.z=approachZ(s.x);const p=pose(s),low=Math.min(...Object.keys(partNames).filter(k=>!k.startsWith('foot')).map(k=>p[k].y-(k==='head'?.34:k==='hip'?.25:.12)));if(low<.11){s.y+=.11-low;s.phase='land';s.landTime=0;}return;}
 if(s.phase==='air'){s.air+=dt;s.x=s.launchX+s.vx*s.air;s.y=s.launchY+s.vy*s.air-3.9*s.air*s.air;s.z=approachZ(s.x);s.peak=Math.max(s.peak,s.y);retainBackTurn(s);const currentPose=pose(s);
 // The launch owns difficulty. Actual rise animates one pose-independent physical bar.
 if(s.autoHeight&&!s.barLocked){const u=clamp((s.y-s.launchY)/Math.max(.001,s.barRiseY-s.launchY),0,1);
  s.barHeight=Math.max(s.barHeight,Math.floor((BAR_START_HEIGHT+(s.barGoal-BAR_START_HEIGHT)*u)*10+1e-7)/10);
  if(s.air>=s.barLockTime){s.barHeight=s.barGoal;s.barLocked=true;s.barSettled=true;}
  s.target=s.barHeight;
 }

 for(const name of Object.keys(partNames)){const a=beforePose[name],b=currentPose[name];if(a.x<=0&&b.x>0&&a.y+(b.y-a.y)*(-a.x/(b.x-a.x))<visibleBarHeight(s))s.underBar=true;}
 if(Object.keys(partNames).every(name=>currentPose[name].x>.39))s.clearanceComplete=true;
 const contact=!s.hit?barContact(s,currentPose):null;if(contact){s.hit=true;s.hitPart=contact;s.feedback=`${contact}碰桿！橫桿：你先過，我先下班。`;}if(s.hit)s.barDrop+=dt;
 if(s.y<=1&&s.air>.3){s.y=1;s.landingLimbs=[...s.limbs];s.phase='land';s.landTime=0;s.success=!s.hit&&!s.underBar&&s.clearanceComplete&&Object.keys(partNames).every(name=>currentPose[name].x>.39);s.height=s.success?s.target:0;s.feedback=s.success?'膝蓋今天願意配合！':s.hit?s.feedback:s.underBar?'高度不夠，從橫桿下方經過。':'起跳位置差了一點，這次先練落地。';}return;}
 if(s.phase==='land'){s.landTime+=dt;if(s.hit)s.barDrop+=dt;if(s.landTime>.8)s.phase='done';}}
export function advance(s,dt){if(!Number.isFinite(dt)||dt<=0)return;let remaining=dt;while(remaining>1e-9){const step=Math.min(remaining,1/240);tick(s,step);remaining-=step;}}
export function verdict(s){return s.resultVerdict||selectVerdict(s);}
export function comparison(h){return h>=30?'像一棟十層樓高（示意）':h>=10?'超過三層樓（示意）':h>=5?'差不多一層半樓高（示意）':h>=3?'接近籃框高度':'比一般房門還高';}
