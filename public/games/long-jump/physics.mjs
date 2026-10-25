import {selectVerdict} from './verdicts.mjs';
export const START=-9, BOARD=10, PIT=10.45, PIT_END=42, DT=1/120, BEST_KEY='pf-longjump-best-v6';
export const BONES=Object.freeze({upperArm:.34,foreArm:.32,thigh:.55,shin:.55});
export const cameraCenter=x=>Math.max(START+2,Math.min(PIT_END-2,x+2));
export const toKmh=v=>v*3.6;
export const cameraLift=s=>Math.max(0,Math.min(.65,s.y-2));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fresh(){return {x:START,y:1.12,vx:0,vy:0,lean:0,spin:0,t:0,phase:'run',j:[0,0,0,0],previousInput:[false,false,false,false],legAge:[1,1],legPower:[0,0],armAge:1,armSide:0,lastLeg:-1,lastStepAt:-Infinity,lastStepPhase:'',stepMatched:false,pendingArmAt:-Infinity,pendingArmTorque:0,lastArmAt:-Infinity,stepBonus:0,chargeActive:false,airSpaceReady:false,landingPose:false,crouch:0,airTime:0,foul:false,mark:Infinity,landingPart:'',landTime:0,strokes:0,airBoosts:0,airImpulse:0,boostSide:-1,lastAirRewardSide:-1,pendingAirBonus:false,firstMark:Infinity,markPart:'',takeoffSpeed:null,momentum:0,flips:0,flipAnchor:0,airRotation:0,glideRemaining:0,glideUsed:0};}
export function pose(s){
 const ca=Math.cos(s.lean),sa=Math.sin(s.lean);
 const local={hip:{x:0,y:0},shoulder:{x:0,y:.65},head:{x:0,y:1.01}};
 const link=(p,length,angle)=>({x:p.x+length*Math.sin(angle),y:p.y-length*Math.cos(angle)});
 for(let i=0;i<2;i++){
  const a=clamp(s.j[i],0,1),l=clamp(s.j[i+2],0,1);
  // Hinge angles: elbow always bends forward; knee always folds backwards relative to the thigh.
  const shoulder=-.2+a*1.1,elbow=.12+a*1.85,hip=.04+l*1.36,knee=.08+l*1.47;
  local['elbow'+i]=link(local.shoulder,BONES.upperArm,shoulder);
  local['hand'+i]=link(local['elbow'+i],BONES.foreArm,shoulder+elbow);
  local['knee'+i]=link(local.hip,BONES.thigh,hip);
  local['foot'+i]=link(local['knee'+i],BONES.shin,hip-knee);
 }
 return Object.fromEntries(Object.entries(local).map(([name,p])=>[name,{x:s.x+p.x*ca+p.y*sa,y:s.y+p.y*ca-p.x*sa}]));
}
export function inertia(s){return .65+.55*(1-(s.j[2]+s.j[3])*.5)+.12*(1-(s.j[0]+s.j[1])*.5);}
function matchArm(s){
 if(s.stepMatched||s.t-s.lastStepAt>.16||s.lastStepPhase!==s.phase)return false;
 s.stepMatched=true;s.armSide=1-s.lastLeg;
 if(s.phase==='run'){s.vx=Math.min(8.5,s.vx+.48);s.stepBonus++;}
 else if(s.phase==='air'){s.momentum-= (s.lastLeg===0?1:-1)*1.8;if(s.t-s.pendingArmAt<=.16)s.momentum-=s.pendingArmTorque*Math.exp(-.12*(s.t-s.pendingArmAt));s.pendingArmTorque=0;s.pendingAirBonus=true;}
 return true;
}
function intents(s,input,rise,dt){
 const space=Boolean(input[1]);
 if(s.phase==='run'){
  if(rise[1]){s.chargeActive=true;s.crouch=0;s.legPower=[0,0];}
  if(s.chargeActive&&space)s.crouch=clamp(s.crouch+dt*3,0,1);
  if(s.chargeActive&&!space){
   s.chargeActive=false;
   if(s.crouch>=.3){s.phase='air';s.vy=3.5+s.crouch*3.2;s.vx*=.99;s.takeoffSpeed=s.vx;s.momentum=s.spin*inertia(s);s.airSpaceReady=true;s.pendingArmAt=-Infinity;s.lastStepAt=-Infinity;s.pendingAirBonus=false;}
   s.crouch=0;
  }
 }else if(s.phase==='air'){
  if(!space){s.airSpaceReady=true;s.landingPose=false;}
  if(rise[1]&&s.airSpaceReady){s.landingPose=true;s.pendingAirBonus=false;s.pendingArmAt=-Infinity;}
 }
 if(s.phase!=='run'&&s.phase!=='air')return;
 if(s.chargeActive||s.landingPose)return;
 for(let i=0;i<2;i++)if(rise[i+2]&&s.t-s.lastStepAt>=.18&&s.legAge[i]>=.27){
  const alternate=s.lastLeg!==i;s.lastLeg=i;s.lastStepAt=s.t;s.lastStepPhase=s.phase;s.stepMatched=false;s.pendingAirBonus=false;s.legAge[i]=0;s.legPower[i]=alternate?1.9:1.0;s.strokes++;
  if(s.phase==='air')s.momentum+=(i===0?1:-1)*1.8;
  if(s.t-s.pendingArmAt<=.16){s.armAge=0;matchArm(s);s.pendingArmAt=-Infinity;}
 }
 if(rise[0]&&s.t-s.lastArmAt>=.18){
  s.lastArmAt=s.t;s.armAge=0;s.armSide=1-Math.max(0,s.lastLeg);
  if(!matchArm(s)){s.pendingArmAt=s.t;if(s.phase==='air'){s.pendingArmTorque=(s.lastLeg===1?-1:1)*.65;s.momentum+=s.pendingArmTorque;}}
 }
}
export function step(s,input,dt=DT){
 if(s.phase==='done')return;dt=clamp(dt,0,1/60);const previousPose=s.phase==='air'?pose(s):null;s.t+=dt;
 const rise=input.map((v,i)=>Boolean(v)&&!s.previousInput[i]);s.previousInput=input.map(Boolean);
 if(s.phase==='run'&&Object.entries(pose(s)).some(([name,p])=>name.startsWith('foot')&&p.y<=.18&&p.x+.22>BOARD))s.foul=true;
 intents(s,input,rise,dt);
 for(let i=0;i<2;i++)s.legAge[i]+=dt;s.armAge+=dt;
 const wave=age=>age<.32?Math.sin(Math.PI*age/.32):0;
 const arm=wave(s.armAge);
 const target=[s.armSide===0?arm:arm*.15,s.armSide===1?arm:arm*.15,wave(s.legAge[0]),wave(s.legAge[1])];
 if(s.chargeActive){target[2]=target[3]=.8*s.crouch;}
 if(s.landingPose){target[2]=target[3]=.9;target[0]=target[1]=.35;}
 for(let i=0;i<4;i++)s.j[i]+=(target[i]-s.j[i])*Math.min(1,dt*22);
 if(s.phase==='run'){
  for(let i=0;i<2;i++)if(!s.chargeActive&&s.legAge[i]>.14&&s.legAge[i]<=.30)s.vx+=s.legPower[i]*dt/.16*Math.max(.3,Math.cos(s.lean));
  s.vx=clamp(s.vx-dt*(s.chargeActive?.45:.25+s.vx*.13),0,8.5);
  const asym=(s.j[2]-s.j[3]+s.j[0]-s.j[1])*.6;s.spin+=(asym-s.lean*7-s.spin*4)*dt;s.lean=clamp(s.lean+s.spin*dt,-.85,.85);
  const support=pose(s);s.y+=.02-Math.min(support.foot0.y,support.foot1.y);
  const feet=Object.entries(pose(s)).filter(([name,p])=>name.startsWith('foot')&&p.y<=.18);
  if(feet.some(([,p])=>p.x+.22>BOARD))s.foul=true;
  if(s.x>PIT){s.phase='air';s.vy=0;s.momentum=s.spin*inertia(s);s.airSpaceReady=!input[1];s.chargeActive=false;s.crouch=0;s.pendingArmAt=-Infinity;s.lastStepAt=-Infinity;}
 }
 if(s.phase==='air'){
  s.airTime+=dt;const floating=Math.min(dt,s.glideRemaining);s.glideRemaining=Math.max(0,s.glideRemaining-floating);s.glideUsed+=floating;s.vy-=9.8*(dt-floating+floating*.35);s.y+=s.vy*dt;
  s.momentum=clamp(s.momentum*Math.exp(-.12*dt),-7,7);s.spin=clamp(s.momentum/inertia(s),-9,9);s.lean+=s.spin*dt;s.airRotation+=s.spin*dt;
  const p=pose(s), contacts=Object.entries(p).map(([key,point])=>[PARTS[key],point]);
  const touching=contacts.filter(([,pt])=>pt.y<.10&&s.vy<0);
  if(touching.length){
   const sand=touching.filter(([,pt])=>pt.x>=PIT&&pt.x<=PIT_END).sort((a,b)=>a[1].x-b[1].x);
   const contactTime=([name,pt])=>{const key=Object.keys(PARTS).find(k=>PARTS[k]===name),prior=previousPose?.[key];return prior&&prior.y>pt.y?clamp((prior.y-.1)/(prior.y-pt.y),0,1):0;};
   s.landingPart=[...touching].sort((a,b)=>contactTime(a)-contactTime(b))[0][0];
   const [name,pt]=sand[0]||touching[0];
   if(sand.length){s.mark=Math.min(s.mark,pt.x);s.firstMark=pt.x;s.markPart=name;}
   s.phase='land';s.glideRemaining=0;s.landTime=0;s.y+=.1-Math.min(...touching.map(([,p])=>p.y));s.vy=0;s.spin=name.includes('腳')?.3:1.8;
  }
  if(s.phase==='air'){
   while(Math.abs(s.airRotation-s.flipAnchor)>=Math.PI*2){const dir=Math.sign(s.airRotation-s.flipAnchor);s.flips++;s.flipAnchor+=dir*Math.PI*2;}
   if(s.pendingAirBonus&&!s.landingPose&&s.legAge[s.lastLeg]>=.12){
    s.pendingAirBonus=false;
    if(s.airBoosts<2&&s.lastAirRewardSide!==s.lastLeg){s.lastAirRewardSide=s.lastLeg;s.vx+=.65;s.airImpulse+=.65;s.airBoosts++;s.glideRemaining+=.22;s.boostSide=s.lastLeg;}
   }
  }
 }
 if(s.phase==='land'){
  s.landTime+=dt; s.vx*=Math.exp(-dt*8);s.lean+=s.spin*dt;s.spin*=Math.exp(-dt*4);
  s.y+=(.5-s.y)*Math.min(1,dt*5);
  for(const [name,pt] of Object.entries(pose(s))){if(pt.y<.16&&pt.x>=PIT&&pt.x<=PIT_END&&pt.x<s.mark){s.mark=pt.x;s.markPart=PARTS[name];if(!Number.isFinite(s.firstMark))s.firstMark=pt.x;}}
  if(s.landTime>.9)s.phase='done';
 }
 s.x+=s.vx*dt;
 if(s.t>30||s.x>PIT_END+4)s.phase='done';
}const PARTS={foot0:'左腳',foot1:'右腳',hand0:'左手',hand1:'右手',hip:'屁股',head:'額頭',knee0:'左膝',knee1:'右膝',elbow0:'左肘',elbow1:'右肘',shoulder:'肩膀'};
export function result(s){
 const rawDistance=Number.isFinite(s.mark)?Math.max(0,s.mark-BOARD):null,valid=!s.foul&&rawDistance!==null,distance=valid?rawDistance:0;
 return{valid,distance,rawDistance,landingLoss:Number.isFinite(s.firstMark)&&rawDistance!==null?Math.max(0,s.firstMark-s.mark):0,badge:s.flips>0?'空中翻轉 '+s.flips+' 圈':s.airBoosts===2?'空中續杯選手':null,title:selectVerdict({firstContact:s.landingPart,nearestPart:s.markPart,rawDistance,foul:s.foul,flips:s.flips,airTime:s.airTime,glides:s.airBoosts})};
}
export function readBest(storage){try{const n=Number(storage.getItem(BEST_KEY));return Number.isFinite(n)&&n>=0&&n<=PIT_END-BOARD?n:0;}catch{return 0;}}
export function saveBest(storage,n){try{storage.setItem(BEST_KEY,String(n));}catch{}}
