// Read-only baseline for DOM-input tolerance comparison; only verdict import relocated.
import {selectVerdict} from '../../dist/verdicts.mjs';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const RUN_START=-26.6;
export const BAR_BODY_RESERVE=1.10,BAR_START_HEIGHT=1;
export const MAX_TARGET=50,TAKEOFF={min:-2.3,max:-1,ideal:-1.6};
// The final curved section stays unchanged; added approach is straight.
export function approachZ(x){return -1.4*Math.pow(clamp((-x-1)/8.2,0,1),2);}
export const KEYS=['A','S','J','K'],HOLD_TIME=.34;
export function createRound(target){const s={phase:'countdown',t:0,countdown:3,x:RUN_START,y:1.23,z:-1.4,target:clamp(Number(target)||2,2,50),barHeight:target===undefined?BAR_START_HEIGHT:clamp(Number(target)||2,2,50),barSettled:target!==undefined,barRiseDuration:0,autoHeight:target===undefined,barLocked:target!==undefined,clearanceComplete:false,limbs:[0,0,0,0],held:[false,false,false,false],holdTimes:[0,0],energy:1,speed:0,balance:0,spin:0,crouch:0,charging:false,chargeFoot:-1,pendingRelease:-1,fallen:false,recoveries:0,wasWobbling:false,peakLean:0,lastFoot:-1,launches:0,paused:false,air:0,peak:0,hit:false,hitPart:null,underBar:false,success:false,height:0,barDrop:0,landTime:0,feedback:'彎腿、放開，讓自己動起來。'};const p=pose(s);s.y+=.11-Math.min(p.foot0.y-footRadius(p,0),p.foot1.y-footRadius(p,1));return s;}
export function snapshot(s){return{...s,limbs:[...s.limbs],held:[...s.held],holdTimes:[...s.holdTimes]};}
// Same conservative shoe envelope as the formal long-jump ground model.
export function footRadius(p,i){const f=p['foot'+i],k=p['knee'+i],a=Math.atan2(f.x-k.x,k.y-f.y);return .22*Math.abs(Math.sin(a))+.10*Math.abs(Math.cos(a));}
const footClearance=(p,i)=>p['foot'+i].y-footRadius(p,i)-.09;
export function supported(s,i){const p=pose(s);return s.phase==='run'&&footClearance(p,i)<.35;}
export function cancelMotion(s){s.held.fill(false);s.holdTimes.fill(0);s.charging=false;s.crouch=0;s.chargeFoot=-1;s.pendingRelease=-1;}
export function setLimb(s,key,down,{cancel=false}={}){const i=KEYS.indexOf(key);if(i<0||s.paused&&!cancel)return false;const was=s.held[i];s.held[i]=Boolean(down);if(cancel){if(i<2){s.holdTimes[i]=0;if(s.pendingRelease===i)s.pendingRelease=-1;if(s.chargeFoot===i){s.charging=false;s.crouch=0;s.chargeFoot=-1;}}return false;}if(!was||down||i>1||s.phase!=='run')return false;
 if(s.holdTimes[i]>=HOLD_TIME&&s.charging){s.pendingRelease=Math.max(s.pendingRelease,i);return true;}s.holdTimes[i]=0;return false;
}
function launch(s,i){const p=pose(s),quality=clamp(1-Math.abs(s.balance)*.5-Math.max(0,footClearance(p,i)-.15)*.7,.4,1);
 // Same intentional hold/release trigger; high jump converts approach into vertical power.
 const power=(s.crouch*(.28+.72*clamp(s.speed/5,0,1))*quality)**3;
 s.takeoffQuality=quality;s.takeoffSpeed=s.speed;s.launchPower=power;s.launchX=s.x;s.launchY=s.y;s.vy=5.3+27*power;s.vx=2.25/(1+4*power);s.apexTime=s.vy/7.8;
 if(s.autoHeight){s.target=clamp(Math.floor((s.launchY+s.vy*s.vy/15.6-BAR_BODY_RESERVE-3.9*(BAR_BODY_RESERVE/s.vx)**2)*10)/10,.5,MAX_TARGET);s.barLocked=true;}s.barRiseDuration=s.autoHeight?Math.min(s.apexTime*.65,Math.max(0,(-s.launchX-.98)/s.vx)):0;s.barSettled=s.barRiseDuration===0;if(s.barSettled)s.barHeight=s.target;s.launchBalance=s.balance;s.air=0;s.phase='air';s.launches++;s.holdTimes.fill(0);s.charging=false;s.crouch=0;s.chargeFoot=-1;s.feedback='手腳還是自己的：彎腿收腳，手臂調平衡。';}
const point=(x,y)=>({x,y});
function knee(f,turn=0){const d=Math.max(.001,Math.hypot(f.x,f.y)),b=Math.sqrt(Math.max(0,.55**2-d*d/4));const side=Math.cos(turn*Math.PI);return {...point(f.x/2-f.y/d*b*side,f.y/2+f.x/d*b*side),z:b*Math.sin(turn*Math.PI)};}
const masses={hip:5,shoulder:3,head:2,knee0:1,knee1:1,foot0:.5,foot1:.5,elbow0:.4,elbow1:.4,hand0:.25,hand1:.25};
export function pose(s){const air=s.phase==='air',settled=['land','done'].includes(s.phase)&&s.launches>0;
 const landT=settled?clamp((s.landTime||0)/.35,0,1):0,landBlend=landT*landT*(3-2*landT);
 const l=settled?(s.landingLimbs||s.limbs).map((v,i)=>v+((i<2?1:.25)-v)*landBlend):s.limbs;
 const transition=air||settled?clamp(s.air/.3,0,1):0,blend=transition*transition*(3-2*transition);
 const q=air||settled?clamp((s.air/s.apexTime-.60)/.4,0,1):0,turn=q*q*(3-2*q),airRoll=air||settled?1.42*turn+blend*((l[2]-l[3])*.3+(l[0]-l[1])*.16)+(s.launchBalance||0)*(1-.65*blend):s.balance;
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
const segments=[['head','shoulder',.21],['shoulder','hip',.2],['hip','knee0',.09],['hip','knee1',.09],['knee0','foot0',.08],['knee1','foot1',.08],['shoulder','elbow0',.07],['elbow0','hand0',.06],['shoulder','elbow1',.07],['elbow1','hand1',.06]];
const partNames={head:'頭部',shoulder:'肩背',hip:'髖部',knee0:'左膝',knee1:'右膝',foot0:'左腳',foot1:'右腳',elbow0:'左手臂',elbow1:'右手臂',hand0:'左手',hand1:'右手'};
export const visibleBarHeight=s=>s.autoHeight===false?s.target:(s.barHeight??s.target);
export function barContact(s,p=pose(s)){const height=visibleBarHeight(s);for(const [name,r] of [['head',.34],['foot0',.2],['foot1',.2]]){const v=p[name];if(Math.hypot(v.x,v.y-height)<r+.045)return partNames[name];}for(const [aa,bb,r]of segments){const a=p[aa],b=p[bb],dx=b.x-a.x,dy=b.y-a.y,t=clamp((-a.x*dx+(height-a.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(a.x+dx*t,a.y+dy*t-height)<r+.045)return partNames[bb];}return null;}
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
 if(s.phase==='air'){s.air+=dt;s.x=s.launchX+s.vx*s.air;s.y=s.launchY+s.vy*s.air-3.9*s.air*s.air;s.z=0;s.peak=Math.max(s.peak,s.y);const currentPose=pose(s);
 // A recorded physical bar, not a render-only animation. Lock conservatively before contact.
 if(!s.barSettled){const front=Math.max(...Object.keys(partNames).map(name=>currentPose[name].x));const u=clamp(s.air/Math.max(.0001,s.barRiseDuration),0,1);s.barHeight=clamp(BAR_START_HEIGHT+(s.target-BAR_START_HEIGHT)*u*u*(3-2*u),Math.min(BAR_START_HEIGHT,s.target),Math.max(BAR_START_HEIGHT,s.target));if(u>=1||front>=-.55){s.barHeight=s.target;s.barSettled=true;}}
 for(const name of Object.keys(partNames)){const a=beforePose[name],b=currentPose[name];if(a.x<=0&&b.x>0&&a.y+(b.y-a.y)*(-a.x/(b.x-a.x))<visibleBarHeight(s))s.underBar=true;}
 if(Object.keys(partNames).every(name=>currentPose[name].x>.39))s.clearanceComplete=true;
 const contact=!s.hit?barContact(s,currentPose):null;if(contact){s.hit=true;s.hitPart=contact;s.feedback=`${contact}碰桿！橫桿：你先過，我先下班。`;}if(s.hit)s.barDrop+=dt;
 if(s.y<=1&&s.air>.3){s.y=1;s.landingLimbs=[...s.limbs];s.phase='land';s.landTime=0;s.success=!s.hit&&!s.underBar&&s.clearanceComplete&&Object.keys(partNames).every(name=>currentPose[name].x>.39);s.height=s.success?s.target:0;s.feedback=s.success?'膝蓋今天願意配合！':s.hit?s.feedback:s.underBar?'高度不夠，從橫桿下方經過。':'起跳位置差了一點，這次先練落地。';}return;}
 if(s.phase==='land'){s.landTime+=dt;if(s.hit)s.barDrop+=dt;if(s.landTime>.8)s.phase='done';}}
export function advance(s,dt){if(!Number.isFinite(dt)||dt<=0)return;let remaining=dt;while(remaining>1e-9){const step=Math.min(remaining,1/240);tick(s,step);remaining-=step;}}
export function verdict(s){return s.resultVerdict||selectVerdict(s);}
export function comparison(h){return h>=30?'像一棟十層樓高（示意）':h>=10?'超過三層樓（示意）':h>=5?'差不多一層半樓高（示意）':h>=3?'接近籃框高度':'比一般房門還高';}
