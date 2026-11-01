import{stairPoint,STAIRS}from'./stairs.mjs';import{updateRail}from'./rail.mjs';
export const FREE_RULES=Object.freeze({name:'室內樓梯',code:'UP-07-I',stepsPerFloor:10,total:100,floors:10,timeLimit:60});
export const DT=1/240;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),approach=(x,target,d)=>x+clamp(target-x,-d,d),keys={j:0,k:1,a:2,s:3};
function foot(){return{...stairPoint(0),index:0,origin:0,target:0,destination:0,phase:'ground',contact:true,cancelled:false,disarmed:false,flex:0};}
export function createFree(now=0){return{mode:'indoor',physicsVersion:3,phase:'countdown',paused:false,lastNow:now,countdown:3,time:0,pending:0,progress:0,floor:0,stamina:100,held:[false,false,false,false],holdAge:[0,0,0,0],lastPress:[-10,-10,-10,-10],strain:0,stumbleUntil:0,stumbles:0,drive:1,coordination:0,coordWork:0,arms:[0,0],feet:[foot(),foot()],body:{x:stairPoint(0).x,y:1.059},lean:0,spin:0,facingYaw:0,landings:[],effort:0,wobbleWork:0,bothDemand:0,marches:0,rescues:0,armRescues:0,recoveryArmWork:0,wasWobbling:false,score:0,finished:false,reason:null,falling:false,fallSeverity:0,fallTarget:0,falls:0,recoveryUntil:0,turning:false,cornerRisk:0,maxProgress:0,braceCrouch:0,railGrip:false,railRescues:0,railHands:[{point:null,reach:0,contact:false},{point:null,reach:0,contact:false}],message:'按住 A／S 提膝，放開踩穩；J／K 幫忙移重心。',messageUntil:0,perfect:0,good:0,miss:0,brace:false,lane:0,offer:null,interactions:[],hazard:null,dodged:0,mistakes:0,lockUntil:0};}
function settleDestination(f,cancel){if(cancel)return f.origin;if(f.reached)return f.target;let best=f.origin,dist=Infinity;for(let n=f.origin;n<=f.target;n++){const p=stairPoint(n),d=Math.abs(p.x-f.x);if(d<dist){dist=d;best=n;}}return best;}
export function cancelFree(s,limb=null){const ids=limb===null?[0,1,2,3]:[limb];for(const i of ids){s.held[i]=false;s.holdAge[i]=0;if(i<2){s.railHands[i].contact=false;s.railGrip=s.railHands.some(r=>r.contact);}if(i>=2){const f=s.feet[i-2];if(!f.contact||f.index>s.progress){f.contact=false;f.cancelled=true;f.destination=f.origin;f.phase='settle';}f.disarmed=true;}}}
function finish(s,reason){s.phase='done';s.reason=reason;s.finished=reason==='summit';s.score=s.finished?s.time:s.progress;s.floor=Math.floor(s.progress/10);s.held.fill(false);}
function fall(s,severity=2){if(s.falling)return;cancelFree(s);s.falling=true;s.fallSeverity=severity;s.falls++;s.fallTarget=Math.max(0,s.progress-severity);s.cornerRisk=0;s.strain=0;s.stumbleUntil=s.time+.8;}
function step(s,dt){
dt=Math.min(dt,Math.max(0,FREE_RULES.timeLimit-s.time));
for(let i=0;i<4;i++)s.holdAge[i]=s.held[i]?s.holdAge[i]+dt:0;
const bothFeet=s.held[2]&&s.held[3],overhold=Math.max(0,...s.holdAge.map(x=>x-.85));
s.strain=Math.max(0,s.strain-dt*.7)+(bothFeet?dt*2.8:0)+Math.min(overhold,2)*dt*.55;
if(s.strain>1&&s.time>=s.stumbleUntil&&!s.falling){s.stumbles++;s.spin+=s.lean>=0?.22:-.22;fall(s,Math.abs(s.lean)>.25?4:2);}
const oldArms=[...s.arms],oldFlex=s.feet.map(f=>f.flex);for(let i=0;i<2;i++){s.arms[i]=approach(s.arms[i],s.held[i]?1:0,dt*5);s.feet[i].flex=approach(s.feet[i].flex,s.held[i+2]?1:0,dt*5);}
const legAsym=s.feet[0].flex-s.feet[1].flex,armAsym=s.arms[0]-s.arms[1],armVelocity=((s.arms[0]-oldArms[0])-(s.arms[1]-oldArms[1]))/dt;
s.spin=clamp(s.spin+(legAsym*2.2+armAsym*2.8+armVelocity*.08-s.lean*6-s.spin*3.5)*dt,-1.5,1.5);s.lean=clamp(s.lean+s.spin*dt,-.42,.42);if(Math.abs(s.lean)>.26)s.wasWobbling=true;if(s.wasWobbling&&armAsym*s.lean<0)s.recoveryArmWork+=Math.abs(armAsym)*dt;if(s.wasWobbling&&Math.abs(s.lean)<.12){s.wasWobbling=false;s.rescues++;if(s.recoveryArmWork>.02)s.armRescues++;s.recoveryArmWork=0;}
const freshArm=(s.held[0]&&s.holdAge[0]<.85)||(s.held[1]&&s.holdAge[1]<.85);
// Opposite arm and leg counterbalance mechanically. No beat or input count awards a step.
s.coordination=freshArm?clamp(-legAsym*armAsym,0,1):0;
const stumbling=s.time<s.stumbleUntil;
const targetDrive=s.railGrip?.65:s.falling?.85:stumbling?.55:bothFeet?.55:1+s.coordination*(s.stamina>12?.85:.15);
s.drive=approach(s.drive,targetDrive,dt*7);
const fatigue=s.falling?1:.55+.45*clamp(s.stamina/25,0,1),stability=clamp(1-Math.abs(s.lean)*1.7-Math.abs(s.spin)*.08,.35,1)*s.drive*fatigue,liftSpeed=7.2*stability,reachSpeed=6.2*stability;let travel=0;
if(s.falling&&s.feet.every(f=>f.contact)){const candidates=s.feet.map((f,i)=>({f,i})).filter(({f})=>f.index>s.fallTarget).sort((a,b)=>b.f.index-a.f.index);if(candidates.length){const {f,i}=candidates[0];f.origin=f.index;f.target=Math.max(s.fallTarget,s.feet[1-i].index-1);f.contact=false;f.phase='lift';f.cancelled=false;f.reached=false;f.forced=true;}else{s.falling=false;s.recoveryUntil=s.time+.3;s.progress=s.fallTarget;}}
for(let i=0;i<2;i++){const f=s.feet[i],other=s.feet[1-i],held=f.forced?!f.reached:s.held[i+2]&&!s.falling&&s.time>=s.recoveryUntil,old={x:f.x,y:f.y};if(!held)f.disarmed=false;
 if(f.contact&&held&&!f.disarmed&&other.contact&&!s.falling){f.origin=f.index;f.target=Math.max(f.index,Math.min(f.index+2,other.index+1));f.contact=false;f.phase='lift';f.cancelled=false;f.reached=false;}
 if(!f.contact&&!f.forced&&!f.cancelled&&held&&!f.reached&&s.coordination>.22&&s.holdAge[i+2]>.09&&s.stamina>12){const k=other.index%10,boundary=Math.floor(other.index/10)*10+8;if(k<8)f.target=Math.min(other.index+2,boundary,FREE_RULES.total);}
 if(!f.contact){const target=stairPoint(f.target),origin=stairPoint(f.origin),top=Math.max(origin.y,target.y)+STAIRS.clearance;
  if(!held||f.cancelled){if(f.phase!=='settle'){f.destination=settleDestination(f,false);f.phase='settle';}const dest=stairPoint(f.destination);
   if(Math.abs(f.x-dest.x)>1e-9){if(f.y<top-1e-9)f.y=approach(f.y,top,dt*liftSpeed);else f.x=approach(f.x,dest.x,dt*reachSpeed);}
   else{f.y=approach(f.y,dest.y,dt*5.8*stability);if(Math.abs(f.y-dest.y)<1e-9){f.contact=true;f.phase='ground';f.index=f.destination;f.forced=false;if(f.index<=f.origin&&!f.cancelled)s.marches++;s.landings.push({time:s.time,index:f.index,foot:i,cancelled:f.cancelled});if(f.cancelled)f.disarmed=true;f.cancelled=false;}}
  }else{if(f.y<top-1e-9){f.phase='lift';f.y=approach(f.y,top,dt*liftSpeed);}else{f.phase='reach';f.x=approach(f.x,target.x,dt*reachSpeed);if(Math.abs(f.x-target.x)<1e-9)f.reached=true;}}
 }
 travel+=Math.hypot(f.x-old.x,f.y-old.y);
}
// World anchors remain authoritative. The supported body follows their feasible
// leg-circle intersection, not a keypress, music phase or pre-counted stair.
const [a,b]=s.feet,midX=(a.x+b.x)/2,midY=(a.y+b.y)/2,groundFlex=s.feet.reduce((v,f)=>v+(f.contact?f.flex:0),0);const planted=s.feet.filter(f=>f.contact);let supportX=midX;if(planted.length===1){const support=planted[0],moving=s.feet.find(f=>!f.contact);supportX=support.x+clamp((moving.x-support.x)*.25,-.30,.30);if(s.falling&&moving.phase==='settle'){const dest=stairPoint(moving.destination);if(dest.y<support.y-.3)supportX=dest.x+Math.sign(support.x-dest.x)*.32;}}else if(planted.length===2&&Math.abs(a.x-b.x)>.75&&Math.abs(a.y-b.y)>.3){const low=a.y<b.y?a:b,high=low===a?b:a;supportX=low.x+Math.sign(high.x-low.x)*.32;}s.body.x+=(supportX-s.body.x)*(1-Math.exp(-dt*18));
let ceiling=Infinity;for(const f of s.feet)ceiling=Math.min(ceiling,f.y+.099+Math.sqrt(Math.max(.02,1.07**2-(f.x-s.body.x)**2)));
const platform=s.feet.every(f=>f.contact&&(f.index%10>=8||f.index%10===0))&&Math.abs(a.y-b.y)<.01;const bracing=platform&&!s.held[2]&&!s.held[3]&&(s.held[0]||s.held[1])&&!s.falling;s.braceCrouch=approach(s.braceCrouch,bracing?.36:0,dt*1.8);const goalY=Math.min(midY+1.059-.07*groundFlex-s.braceCrouch,ceiling);s.body.y+=(goalY-s.body.y)*(1-Math.exp(-dt*20));s.body.y=Math.min(s.body.y,ceiling);updateRail(s,dt);
const loaded=s.feet.filter(f=>f.contact&&f.flex<.7&&Math.abs(s.body.x-f.x)<.67&&s.body.y-f.y>.55);if(loaded.length){const actual=Math.max(...loaded.map(f=>f.index));if(s.falling)s.progress=Math.min(s.progress,actual);else if(actual>s.progress){s.progress=Math.min(FREE_RULES.total,actual);s.good++;}}s.floor=Math.floor(s.progress/10);s.maxProgress=Math.max(s.maxProgress,s.progress);
const desiredYaw=Math.floor(s.progress/10)%2?Math.PI:0;s.turning=Math.abs(desiredYaw-s.facingYaw)>.2;s.facingYaw=approach(s.facingYaw,desiredYaw,dt*7);
s.cornerRisk=Math.max(0,s.cornerRisk+dt*(s.turning&&!s.railGrip&&s.drive>1.55&&s.feet.some(f=>!f.contact)&&!s.falling?3:-3));if(s.cornerRisk>.36)fall(s,3);
const jointWork=s.feet.reduce((v,f,i)=>v+Math.abs(f.flex-oldFlex[i])*.45,0)+s.arms.reduce((v,j,i)=>v+Math.abs(j-oldArms[i])*.12,0),both=s.held[2]&&s.held[3]?1:0,wobble=(s.lean*s.lean*9+Math.abs(s.spin)*.12)*dt;
const efficiency=1-s.coordination*.35;const cost=(.18+both*2.2+Math.min(overhold,2)*1.4+(stumbling?1.5:0)+(Number(s.held[2])+Number(s.held[3]))*.12)*dt+(travel*.75+jointWork)*efficiency*.28+wobble;s.coordWork+=s.coordination*dt;s.effort+=cost;s.wobbleWork+=wobble;s.bothDemand+=both*dt;const resting=!s.falling&&!s.held[2]&&!s.held[3]&&s.feet.every(f=>f.contact);s.time+=dt;s.stamina=clamp(s.stamina-cost+(resting?dt*3:0),0,100);if(s.progress>=FREE_RULES.total)finish(s,'summit');else if(s.time>=FREE_RULES.timeLimit-1e-9){s.time=FREE_RULES.timeLimit;finish(s,'timeout');}

}
export function advanceFree(s,now,flush=false){now=Number.isFinite(now)?Math.max(s.lastNow,now):s.lastNow;let dt=(now-s.lastNow)/1000;s.lastNow=now;if(s.phase==='done'||s.paused)return s;if(s.phase==='countdown'){const used=Math.min(dt,s.countdown);s.countdown-=used;dt-=used;if(s.countdown>1e-9)return s;s.countdown=0;s.phase='play';}s.pending+=dt;while(s.pending>=DT-1e-10&&s.phase==='play'){s.pending=Math.max(0,s.pending-DT);step(s,DT);}if(flush&&s.pending>1e-10&&s.phase==='play'){const partial=s.pending;s.pending=0;step(s,partial);}return s;}
export function actionFree(s,type,now){advanceFree(s,now,true);if(s.phase!=='play'||s.paused)return false;const m=/^([jkas])-(down|up|cancel)$/.exec(type);if(!m)return false;const i=keys[m[1]];if(m[2]==='cancel')cancelFree(s,i);else{const down=m[2]==='down';if(down&&(s.falling||s.time<s.recoveryUntil))return false;if(down&&!s.held[i]){if(s.time-s.lastPress[i]<.24)s.strain+=.65;s.lastPress[i]=s.time;}s.held[i]=down;if(!down)s.holdAge[i]=0;}return true;}
export function pauseFree(s,value,now){advanceFree(s,now,false);if(value)cancelFree(s);s.paused=Boolean(value)&&s.phase!=='done';s.pending=0;return s;}
export function freeVerdict(s){
 // Result, score card and sharing all call this same deterministic selector.
 // Struggling takes priority over praise, even when coordination work is high.
 if(s.finished){
  if(s.falls>=3)return '十樓照樣簽收，途中還試乘了溜滑梯。';
  if(s.time<40)return '十樓已到，電梯還在樓下等人。';
  if(s.time>=55)return '十樓壓線簽收，雙腿準時下班。';
  return '十樓到頂，今天雙腿是主角。';
 }
 const floor=Math.max(0,Math.min(9,Math.floor(s.floor||0)));
 const label=['零','一','二','三','四','五','六','七','八','九'][floor]+'樓';
 if(s.falls>=3)return `${label}暫停營業，剛才順便試了溜滑梯。`;
 if(s.falls>0)return `${label}打卡，跌倒也沒取消上樓的行程。`;
 if(s.stumbles>8)return `${label}先歇腳，四肢的協調會議還沒散場。`;
 if(s.bothDemand>3)return `${label}收到，兩隻腳別搶同一班電梯。`;
 if(s.armRescues>2||s.railRescues>2)return `${label}已到，手臂今天兼任救火隊。`;
 if(s.marches>s.progress)return `${label}先打卡，雙腳的忙碌還在換算里程。`;
 if(s.coordWork>8)return `${label}打卡，左右部門終於肯合作了。`;
 return [
  '零樓先暖身，雙腳正在交換聯絡方式。',
  '一鼓作氣到一樓，雙腳正式開張。',
  '二話不說到二樓，樓梯開始認識你。',
  '三樓來報到，三步併兩步先留給高手。',
  '四樓已簽收，四肢還在排值班表。',
  '五樓是半場，雙腿申請中場休息。',
  '六樓過半了，雙腿正在協商續約。',
  '七樓已到，七上八下先完成七上。',
  '八樓看風景，八仙過海也得自己爬。',
  '九樓差一步，十樓已讀你的登頂申請。'
 ][floor];
}
