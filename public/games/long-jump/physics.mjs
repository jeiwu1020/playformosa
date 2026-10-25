import {selectVerdict} from './verdicts.mjs';
export const START=-9, BOARD=10, PIT=10.45, PIT_END=42, DT=1/120, BEST_KEY='pf-longjump-best-v5';
export const BONES=Object.freeze({upperArm:.34,foreArm:.32,thigh:.55,shin:.55});
export const cameraCenter=x=>Math.max(START+2,Math.min(PIT_END-2,x+2));
export const toKmh=v=>v*3.6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fresh(){return {x:START,y:1.12,vx:0,vy:0,lean:0,spin:0,t:0,phase:'run',j:[0,0,0,0],energy:[1,1],legReady:[false,false],lastLeg:-1,runPair:-1,runPairTime:0,runHint:0,crouch:0,airTime:0,foul:false,mark:Infinity,landingPart:'',landTime:0,strokes:0,airBoosts:0,airImpulse:0,airCandidate:-1,airDwell:0,airLastPose:-1,airPrimed:-1,boostSide:-1,firstMark:Infinity,markPart:'',takeoffSpeed:null,momentum:0,flips:0,flipAnchor:0,airRotation:0,glideRemaining:0,glideUsed:0,torqueSide:0,torqueDwell:0};}
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
export function inertia(s){return .6+.7*(1-(s.j[2]+s.j[3])*.5);}
function rotateAir(s,dt,input){
 // A brief skew while changing opposite pairs is not a request to somersault.
 const side=Math.sign(Number(input[0])-Number(input[1])+Number(input[2])-Number(input[3]));
 if(side!==s.torqueSide){s.torqueSide=side;s.torqueDwell=0;}else s.torqueDwell+=dt;
 const torque=s.torqueDwell>=.14?((s.j[0]-s.j[1])+(s.j[2]-s.j[3]))*14:0;
 s.momentum=clamp((s.momentum+torque*dt)*Math.exp(-.18*dt),-8,8);
 s.spin=clamp(s.momentum/inertia(s),-10,10);s.momentum=s.spin*inertia(s);
 const delta=s.spin*dt;s.lean+=delta;s.airRotation+=delta;
}
export function step(s,input,dt=DT){
 if(s.phase==='done')return; const previousPose=s.phase==='air'?pose(s):null;dt=clamp(dt,0,1/60); s.t+=dt;
 const old=[...s.j]; for(let i=0;i<4;i++) s.j[i]+=((input[i]?1:0)-s.j[i])*Math.min(1,dt*14);
 const both=input[2]&&input[3];
 for(let i=0;i<2;i++)s.energy[i]=clamp(s.energy[i]+dt*.85,0,1);
 if(s.phase==='run'){
  const pair=input[2]&&!input[3]&&input[1]&&!input[0]?0:input[3]&&!input[2]&&input[0]&&!input[1]?1:-1;
  if(pair!==s.runPair){s.runPair=pair;s.runPairTime=0;}else if(pair>=0)s.runPairTime+=dt;
  if(pair>=0)s.runHint=s.runPairTime>=.30?1-pair:pair;
  const support=pose(s);s.y+=.02-Math.min(support.foot0.y,support.foot1.y);
  s.crouch=both?clamp(s.crouch+dt*3,0,1):s.crouch;
  const groundedFeet=Object.entries(pose(s)).filter(([name,p])=>name.startsWith('foot')&&p.y<=.18);
  if(groundedFeet.some(([,p])=>p.x+.22>BOARD))s.foul=true;
  const jump=s.crouch>.45&&!input[2]&&!input[3];
  if(jump){s.phase='air';s.vy=3.1+s.crouch*3.6; s.vx*=.99; s.spin+=s.lean*.8+(s.j[0]-s.j[1])*.25;s.crouch=0;s.takeoffSpeed=s.vx;s.momentum=s.spin*inertia(s);}
  else {
   for(let i=0;i<2;i++){
    const j=i+2;
    if(s.j[j]>.65)s.legReady[i]=true;
    // Extending a bent leg against the track does work. Recovered energy and alternating stance reward rhythm, not key-repeat.
    if(s.legReady[i]&&!both&&!input[j]&&old[j]>.10&&s.j[j]<old[j]&&s.crouch<.45){
     const ext=old[j]-s.j[j], alternate=s.lastLeg!==i?1:.48;
     const work=ext*s.energy[i]*alternate;
     s.vx+=work*5.4*Math.max(.15,Math.cos(s.lean)); s.energy[i]=Math.max(0,s.energy[i]-ext*.9);
     if(old[j]>.5&&s.j[j]<=.5){s.lastLeg=i;s.strokes++;}
     if(s.j[j]<=.1)s.legReady[i]=false;
    }
   }
   if(!both)s.crouch=Math.max(0,s.crouch-dt*.9);
   s.vx=Math.max(0,s.vx-dt*(.28+s.vx*.14+(both?.25:0)));s.vx=Math.min(s.vx,8.5);
   const support=pose(s);s.y+=.02-Math.min(support.foot0.y,support.foot1.y);
   const asym=((s.j[2]-s.j[3])+(s.j[0]-s.j[1]))*.9;
   s.spin+=(asym-s.lean*7-s.spin*4)*dt;s.lean=clamp(s.lean+s.spin*dt,-.85,.85);

   if(s.x>PIT){s.phase='air';s.vy=0;}
  }
 }
 if(s.phase==='air'){
  s.airTime+=dt;const floating=Math.min(dt,s.glideRemaining);s.glideRemaining=Math.max(0,s.glideRemaining-floating);s.glideUsed+=floating;s.vy-=9.8*(dt-floating+floating*.35);s.y+=s.vy*dt;
  rotateAir(s,dt,input);
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
  // Only award while genuinely airborne, after collision checks. The earned reward adds a bounded horizontal impulse and finite reduced-gravity window.
  if(s.phase==='air'){
   // Count only after this step is confirmed free of ground contact. Reversing a partial turn cannot farm a flip.
   while(Math.abs(s.airRotation-s.flipAnchor)>=Math.PI*2){const dir=Math.sign(s.airRotation-s.flipAnchor);s.flips++;s.flipAnchor+=dir*Math.PI*2;}
   airStride(s,dt);
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
}
function airStride(s,dt){
 if(s.airBoosts>=2)return;
 const j=s.j;
 const next=j[2]>.6&&j[3]<.4&&j[1]>.6&&j[0]<.4?0:j[3]>.6&&j[2]<.4&&j[0]>.6&&j[1]<.4?1:-1;
 if(next!==s.airCandidate){s.airCandidate=next;s.airDwell=0;}
 else if(next>=0)s.airDwell+=dt;
 if(next<0||s.airDwell<.025||next===s.airLastPose)return;
 s.airLastPose=next;
 if(s.airPrimed<0){s.airPrimed=next;return;}
 if(next!==s.airPrimed){s.vx+=.65;s.airImpulse+=.65;s.airBoosts++;s.glideRemaining+=.22;s.boostSide=next;s.airPrimed=next;}
}
const PARTS={foot0:'左腳',foot1:'右腳',hand0:'左手',hand1:'右手',hip:'屁股',head:'額頭',knee0:'左膝',knee1:'右膝',elbow0:'左肘',elbow1:'右肘',shoulder:'肩膀'};
export function result(s){
 const rawDistance=Number.isFinite(s.mark)?Math.max(0,s.mark-BOARD):null,valid=!s.foul&&rawDistance!==null,distance=valid?rawDistance:0;
 return{valid,distance,rawDistance,landingLoss:Number.isFinite(s.firstMark)&&rawDistance!==null?Math.max(0,s.firstMark-s.mark):0,badge:s.flips>0?'空中翻轉 '+s.flips+' 圈':s.airBoosts===2?'空中續杯選手':null,title:selectVerdict({firstContact:s.landingPart,nearestPart:s.markPart,rawDistance,foul:s.foul,flips:s.flips,airTime:s.airTime,glides:s.airBoosts})};
}
export function readBest(storage){try{const n=Number(storage.getItem(BEST_KEY));return Number.isFinite(n)&&n>=0&&n<=PIT_END-BOARD?n:0;}catch{return 0;}}
export function saveBest(storage,n){try{storage.setItem(BEST_KEY,String(n));}catch{}}

export function nextRunPair(s){return s.runHint;}
