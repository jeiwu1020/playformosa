export const START=-9, BOARD=10, PIT=10.45, DT=1/120, BEST_KEY='pf-longjump-best-v3';
export const BONES=Object.freeze({upperArm:.34,foreArm:.32,thigh:.55,shin:.55});
export const cameraCenter=x=>Math.max(START+2,Math.min(24,x+2));
export const toKmh=v=>v*3.6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fresh(){return {x:START,y:1.12,vx:0,vy:0,lean:0,spin:0,t:0,phase:'run',j:[0,0,0,0],energy:[1,1],lastLeg:-1,crouch:0,airTime:0,foul:false,mark:Infinity,landingPart:'',landTime:0,strokes:0,airBoosts:0,airImpulse:0,airCandidate:-1,airDwell:0,airLastPose:-1,airPrimed:-1,boostSide:-1,firstMark:Infinity,markPart:'',takeoffSpeed:null,momentum:0,flips:0,flipAnchor:0,airRotation:0};}
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
function rotateAir(s,dt){
 const torque=((s.j[0]-s.j[1])+(s.j[2]-s.j[3]))*10;
 s.momentum=clamp((s.momentum+torque*dt)*Math.exp(-.18*dt),-8,8);
 s.spin=clamp(s.momentum/inertia(s),-10,10);s.momentum=s.spin*inertia(s);
 const delta=s.spin*dt;s.lean+=delta;s.airRotation+=delta;
}
export function step(s,input,dt=DT){
 if(s.phase==='done')return; dt=clamp(dt,0,1/60); s.t+=dt;
 const old=[...s.j]; for(let i=0;i<4;i++) s.j[i]+=((input[i]?1:0)-s.j[i])*Math.min(1,dt*14);
 const both=input[2]&&input[3];
 for(let i=0;i<2;i++)s.energy[i]=clamp(s.energy[i]+dt*.85,0,1);
 if(s.phase==='run'){
  const support=pose(s);s.y+=.02-Math.min(support.foot0.y,support.foot1.y);
  s.crouch=both?clamp(s.crouch+dt*2.2,0,1):s.crouch;
  const groundedFeet=Object.entries(pose(s)).filter(([name,p])=>name.startsWith('foot')&&p.y<=.18);
  if(groundedFeet.some(([,p])=>p.x+.22>BOARD))s.foul=true;
  const jump=s.crouch>.35&&!input[2]&&!input[3];
  if(jump){s.phase='air';s.vy=3.1+s.crouch*3.6; s.vx*=.96; s.spin+=s.lean*.8+(s.j[0]-s.j[1])*.25;s.crouch=0;s.takeoffSpeed=s.vx;s.momentum=s.spin*inertia(s);}
  else {
   for(let i=0;i<2;i++){
    const j=i+2;
    // Extending a bent leg against the track does work. Recovered energy and alternating stance reward rhythm, not key-repeat.
    if(!both&&!input[j]&&old[j]>.10&&s.j[j]<old[j]&&s.crouch<.35){
     const ext=old[j]-s.j[j], alternate=s.lastLeg!==i?1:.48;
     const work=ext*s.energy[i]*alternate;
     s.vx+=work*5.4*Math.max(.15,Math.cos(s.lean)); s.energy[i]=Math.max(0,s.energy[i]-ext*.9);
     if(old[j]>.5&&s.j[j]<=.5){s.lastLeg=i;s.strokes++;}
    }
   }
   if(!both)s.crouch=Math.max(0,s.crouch-dt*.9);
   s.vx=Math.max(0,s.vx-dt*(.28+s.vx*.14+(both?.9:0)));s.vx=Math.min(s.vx,8.5);
   const support=pose(s);s.y+=.02-Math.min(support.foot0.y,support.foot1.y);
   const asym=((s.j[2]-s.j[3])+(s.j[0]-s.j[1]))*.9;
   s.spin+=(asym-s.lean*7-s.spin*4)*dt;s.lean=clamp(s.lean+s.spin*dt,-.85,.85);

   if(s.x>PIT){s.phase='air';s.vy=0;}
  }
 }
 if(s.phase==='air'){
  s.airTime+=dt;s.vy-=9.8*dt;s.y+=s.vy*dt;
  rotateAir(s,dt);
  const p=pose(s), contacts=Object.entries(p).map(([key,point])=>[PARTS[key],point]);
  const touching=contacts.filter(([,pt])=>pt.y<.10&&s.vy<0);
  if(touching.length){
   const sand=touching.filter(([,pt])=>pt.x>=PIT).sort((a,b)=>a[1].x-b[1].x);
   const [name,pt]=sand[0]||touching[0];
   if(sand.length){s.mark=Math.min(s.mark,pt.x);s.firstMark=pt.x;s.landingPart=name;s.markPart=name;}
   s.phase='land';s.landTime=0;s.y+=.1-Math.min(...touching.map(([,p])=>p.y));s.vy=0;s.spin=name.includes('腳')?.3:1.8;
  }
  // Only award while genuinely airborne, after collision checks. This stylized boost is horizontal only.
  if(s.phase==='air'){
   // Count only after this step is confirmed free of ground contact. Reversing a partial turn cannot farm a flip.
   while(Math.abs(s.airRotation-s.flipAnchor)>=Math.PI*2){const dir=Math.sign(s.airRotation-s.flipAnchor);s.flips++;s.flipAnchor+=dir*Math.PI*2;}
   airStride(s,dt);
  }
 }
 if(s.phase==='land'){
  s.landTime+=dt; s.vx*=Math.exp(-dt*8);s.lean+=s.spin*dt;s.spin*=Math.exp(-dt*4);
  s.y+=(.5-s.y)*Math.min(1,dt*5);
  for(const [name,pt] of Object.entries(pose(s))){if(pt.y<.16&&pt.x>=PIT&&pt.x<s.mark){s.mark=pt.x;s.markPart=PARTS[name];if(!Number.isFinite(s.firstMark))s.firstMark=pt.x;}}
  if(s.landTime>.9)s.phase='done';
 }
 s.x+=s.vx*dt;
 if(s.t>30||s.x>28)s.phase='done';
}
function airStride(s,dt){
 if(s.airBoosts>=2)return;
 const j=s.j;
 const next=j[2]>.72&&j[3]<.28&&j[1]>.72&&j[0]<.28?0:j[3]>.72&&j[2]<.28&&j[0]>.72&&j[1]<.28?1:-1;
 if(next!==s.airCandidate){s.airCandidate=next;s.airDwell=0;}
 else if(next>=0)s.airDwell+=dt;
 if(next<0||s.airDwell<.05||next===s.airLastPose)return;
 s.airLastPose=next;
 if(s.airPrimed<0){s.airPrimed=next;return;}
 if(next!==s.airPrimed){s.vx+=.65;s.airImpulse+=.65;s.airBoosts++;s.boostSide=next;s.airPrimed=-1;}
}
const PARTS={foot0:'左腳',foot1:'右腳',hand0:'左手',hand1:'右手',hip:'屁股',head:'額頭',knee0:'左膝',knee1:'右膝',elbow0:'左肘',elbow1:'右肘',shoulder:'肩膀'};
export function result(s){const valid=!s.foul&&Number.isFinite(s.mark);const distance=valid?Math.max(0,s.mark-BOARD):0;return {valid,distance,landingLoss:Number.isFinite(s.firstMark)&&Number.isFinite(s.mark)?Math.max(0,s.firstMark-s.mark):0,badge:s.flips>0?'空中翻轉 '+s.flips+' 圈':s.airBoosts===2?'空中腳踏車選手':s.airBoosts===1?'學會一圈空中踏步':Math.abs(s.lean)>.8?'四肢自由發揮':null,title:s.foul?'腳趾比你更想出發':!Number.isFinite(s.mark)?'原地思考型選手':s.markPart.includes('手')?'手先到，禮貌滿分':s.markPart==='屁股'?'沙坑沙發試坐員':s.markPart==='額頭'?'用頭腦參加比賽':distance>4?'四肢終於達成共識':distance>2?'有點帥，差點更帥':'今天先跟沙子交朋友'};}
export function readBest(storage){try{const n=Number(storage.getItem(BEST_KEY));return Number.isFinite(n)&&n>=0&&n<30?n:0;}catch{return 0;}}
export function saveBest(storage,n){try{storage.setItem(BEST_KEY,String(n));}catch{}}
