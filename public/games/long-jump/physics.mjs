import {selectVerdict} from './verdicts.mjs';
// Deliberately exaggerated arcade aerodynamics, not a model of human flight.
export const DT=1/120,START=-23,BOARD=10,PIT=10.45,PIT_END=65,MAX_AIR_FORCE=14;
export const BEST_KEY='pf-longjump-best-v7';
export const BONES={upperArm:.34,foreArm:.32,thigh:.55,shin:.55};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fresh(){const s={x:START,y:1.12,vx:0,vy:0,lean:0,spin:0,momentum:0,j:[0,0,0,0],controlJ:[0,0,0,0],landingPose:0,landingRequested:false,airSpaceReady:false,takeoffSpeed:null,firstMark:Infinity,landingPart:'',energy:1,crouch:0,charging:false,previousSpace:false,phase:'run',t:0,airTime:0,landTime:0,jumped:false,fallen:false,foul:false,mark:Infinity,markPart:'',firstPart:'',maxAirForce:0,airEffort:0,airWork:0,rotations:0,rotationTravel:0,peakLean:0};const points=pose(s);s.y+=.02-Math.min(points.foot0.y-skinRadius(s,'foot0',points),points.foot1.y-skinRadius(s,'foot1',points));return s;}
export function cancelMotion(s){s.charging=false;s.crouch=0;s.previousSpace=false;s.landingRequested=false;s.landingPose=0;s.airSpaceReady=false;}
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
const parts={foot0:'左腳',foot1:'右腳',hand0:'左手',hand1:'右手',hip:'屁股',head:'額頭',knee0:'左膝',knee1:'右膝',elbow0:'左肘',elbow1:'右肘',shoulder:'肩膀'};
// Conservative skin envelopes follow the rendered shoe orientation; bones stay fixed.
function skinRadius(s,key,points){
 if(key.startsWith('foot')){const foot=points[key],knee=points['knee'+key.at(-1)],angle=Math.atan2(foot.x-knee.x,knee.y-foot.y);return .22*Math.abs(Math.sin(angle))+.10*Math.abs(Math.cos(angle));}
 if(key==='head')return Math.max(.30,.34*Math.abs(Math.sin(s.lean))+(Math.cos(s.lean)>=0?.30:.41)*Math.abs(Math.cos(s.lean)));
 return key==='hip'?.25:key==='shoulder'?.22:key.startsWith('hand')?.12:.105;
}
function mark(s,p){for(const[key,pt]of Object.entries(p))if(pt.y-skinRadius(s,key,p)<.06&&pt.x>=PIT&&pt.x<=PIT_END&&pt.x<s.mark){s.mark=pt.x;s.markPart=parts[key];}}
export function step(s,input,dt=DT){if(s.phase==='done')return;s.airEffort=0;dt=clamp(dt,0,1/60);s.t+=dt;const old=[...s.controlJ],space=Boolean(input[4]),freshSpace=space&&!s.previousSpace;
 if(s.phase==='run'){
  if(space&&!s.previousSpace){s.charging=true;s.crouch=0;}
  if(s.charging&&space)s.crouch=clamp(s.crouch+dt*2.7,0,1);
  if(s.charging&&!space){const p=pose(s);if(Object.entries(p).some(([k,v])=>k.startsWith('foot')&&v.y-skinRadius(s,k,p)<.08&&v.x+.22>BOARD))s.foul=true;s.charging=false;if(s.crouch>.25){s.phase='air';s.jumped=true;s.vy=3.7+s.crouch*3.1;s.vx*=.98;s.takeoffSpeed=s.vx;s.momentum=s.spin*1.1;s.airSpaceReady=false;}s.crouch=0;}
 }
 if(s.phase==='air'){
  if(!space){s.airSpaceReady=true;s.landingRequested=false;}
  if(freshSpace&&s.airSpaceReady)s.landingRequested=true;
 }else s.landingRequested=false;
 s.landingPose+=((s.landingRequested?1:0)-s.landingPose)*Math.min(1,dt*7);
 s.previousSpace=space;
 for(let i=0;i<4;i++){const target=s.charging&&i>=2?.75*s.crouch:(input[i]?1:0);s.controlJ[i]+=(target-s.controlJ[i])*Math.min(1,dt*10);const bias=.55*s.landingPose;s.j[i]=s.controlJ[i]*(1-bias)+(i>=2?.85:.3)*bias;}
 // Only visible player-driven travel does work. Derivatives of the Space assist
 // are excluded, so toggling the assisted pose cannot manufacture propulsion.
 const velocity=s.controlJ.map((j,i)=>(j-old[i])/Math.max(dt,1e-6)*(1-.55*s.landingPose));
 if(s.phase==='run'){
  const p=pose(s),low=Math.min(p.foot0.y-skinRadius(s,'foot0',p),p.foot1.y-skinRadius(s,'foot1',p));s.y+=.02-low;const grounded=pose(s),feet=['foot0','foot1'].filter(key=>grounded[key].y-skinRadius(s,key,grounded)<.2).map(key=>grounded[key]),support=feet.reduce((n,p)=>n+p.x,0)/Math.max(1,feet.length);
  if(feet.some(pt=>pt.x+.22>BOARD))s.foul=true;
  const com=grounded.hip.x*.65+grounded.shoulder.x*.25+(grounded.hand0.x+grounded.hand1.x)*.05;
  const asym=(s.j[2]-s.j[3 ])*3.1+(s.j[0]-s.j[1])*2.5;
  const help=12*Math.max(0,1-(s.lean/.75)**2);
  s.spin+=(asym+2*(com-support)+5*Math.sin(s.lean)-help*s.lean-s.spin*2.1)*dt;s.lean+=s.spin*dt;
  let groundImpulse=0;
  for(let i=0;i<2;i++)if(!s.charging){const contact=grounded['foot'+i].y-skinRadius(s,'foot'+i,grounded)<.22?1:.25,work=Math.max(0,old[i+2]-s.controlJ[i+2]);groundImpulse+=work*4*contact*s.energy*Math.max(.1,Math.cos(s.lean));s.energy=clamp(s.energy-work*.045,0,1);}
  // Limited traction/inertia: genuine joint extension still supplies all propulsion.
  s.vx+=Math.min(groundImpulse,dt*4.5);
  s.vx=Math.max(0,s.vx-dt*(.18+.018*s.vx*s.vx+(s.charging?.25:0)));s.vx=Math.min(s.vx,12);
  s.energy=clamp(s.energy+dt*.16,0,1);s.peakLean=Math.max(s.peakLean,Math.abs(s.lean));
  if(Math.abs(s.lean)>1.05){s.fallen=true;s.phase='fall';s.charging=false;s.crouch=0;s.vy=0;}
  else if(s.x>PIT){s.phase='air';s.vy=0;s.momentum=s.spin;s.charging=false;s.crouch=0;s.airSpaceReady=false;}
 }
 if(s.phase==='air'){
  s.airTime+=dt;
  // Differential joint travel moves arcade airflow. Symmetric all-button mashing cancels,
  // while lift/drag and metabolic cost stay continuous rather than discrete combo rewards.
  const flow=(Math.abs(velocity[0]-velocity[1])+Math.abs(velocity[2]-velocity[3]))*.15;
  const effort=clamp(flow,0,3.5)*s.energy;s.airEffort=effort;
  const area=.4+.15*(2-s.j[0]-s.j[1])+.15*(2-s.j[2]-s.j[3]);
  const lift=clamp((effort*5.4+.009*s.vx*s.vx*area)*(.25+.75*Math.cos(s.lean)**2),0,MAX_AIR_FORCE);
  s.maxAirForce=Math.max(s.maxAirForce,lift);s.airWork+=effort*dt;
  s.energy=clamp(s.energy-effort*dt*.42,0,1);
  s.vx+=dt*(effort*2.8*Math.cos(s.lean)-.018*s.vx*Math.abs(s.vx)*area);s.vx=clamp(s.vx,-8,16);
  s.vy+=dt*(-9.8+lift);s.y+=s.vy*dt;
  s.momentum+=dt*((velocity[0]+velocity[2]-velocity[1]-velocity[3 ])*3.1+(s.j[0]+s.j[2]-s.j[1]-s.j[3])*.9);s.momentum=clamp(s.momentum*Math.exp(-dt*.06),-9,9);
  const inertia=.7+.65*(1-(s.j[2]+s.j[3])*.5)+.2*(1-(s.j[0]+s.j[1])*.5);s.spin=clamp(s.momentum/inertia,-10,10);const turn=s.spin*dt;s.lean+=turn;s.rotationTravel+=turn;
  const p=pose(s),touching=Object.entries(p).filter(([key,pt])=>pt.y-skinRadius(s,key,p)<.02&&s.vy<0);
  if(touching.length){touching.sort((a,b)=>(a[1].y-skinRadius(s,a[0],p))-(b[1].y-skinRadius(s,b[0],p)));s.firstPart=parts[touching[0][0]];s.landingPart=s.firstPart;mark(s,p);s.firstMark=s.mark;s.phase='land';s.landTime=0;s.y+=.02-Math.min(...touching.map(([key,pt])=>pt.y-skinRadius(s,key,p)));s.vy=0;s.spin*=.35;}
  else s.rotations=Math.floor(Math.abs(s.rotationTravel)/(Math.PI*2));
 }
 if(s.phase==='fall'){
  s.vy-=9.8*dt;s.y+=s.vy*dt;s.spin+=Math.sin(s.lean)*dt*3;s.lean+=s.spin*dt;
  const fallenPose=pose(s),body=Object.entries(fallenPose).filter(([key,pt])=>!key.startsWith('foot')&&pt.y-skinRadius(s,key,fallenPose)<.02).sort((a,b)=>(a[1].y-skinRadius(s,a[0],fallenPose))-(b[1].y-skinRadius(s,b[0],fallenPose)));
  if(body.length){s.firstPart=parts[body[0][0]];s.y+=.02-(body[0][1].y-skinRadius(s,body[0][0],fallenPose));s.phase='land';s.landTime=0;s.vy=0;s.spin*=.3;}
 }
 if(s.phase==='land'){s.landTime+=dt;s.vx*=Math.exp(-dt*6);s.lean+=s.spin*dt;s.spin*=Math.exp(-dt*4);s.y+=(.4-s.y)*Math.min(1,dt*5);if(!s.fallen)mark(s,pose(s));const settled=pose(s);const clearance=Math.min(...Object.entries(settled).map(([key,pt])=>pt.y-skinRadius(s,key,settled)));s.y+=Math.max(0,.02-clearance);if(s.landTime>1)s.phase='done';}
 s.x+=s.vx*dt;if(s.t>30||s.airTime>10||s.x>PIT_END+4||s.x<START-12)s.phase='done';
}
export function result(s){
 const rawDistance=Number.isFinite(s.mark)?Math.max(0,s.mark-BOARD):null,valid=!s.foul&&!s.fallen&&rawDistance!==null;
 return {valid,distance:valid?rawDistance:0,rawDistance,landingLoss:Number.isFinite(s.firstMark)&&rawDistance!==null?Math.max(0,s.firstMark-s.mark):0,badge:s.rotations?'空中翻轉 '+s.rotations+' 圈':null,title:s.fallen?'還沒起飛，先跟跑道打招呼':selectVerdict({firstContact:s.landingPart||s.firstPart,nearestPart:s.markPart,rawDistance,foul:s.foul,flips:s.rotations,airTime:s.airTime,glides:0})};
}
export const toKmh=v=>v*3.6;
export function cameraFrame(s,width,height){const points=pose(s),high=Math.max(2.7,...Object.values(points).map(p=>p.y+.48)),low=Math.min(-.25,...Object.values(points).map(p=>p.y-.34)),centerY=(high+low)/2;let halfH=Math.max(3.3,(high-low)/2+.9);const halfW=Math.max(4.8,halfH*Math.max(1,width)/Math.max(1,height));halfH=halfW*Math.max(1,height)/Math.max(1,width);return{centerX:Math.max(START-10,Math.min(PIT_END+2,s.x+1.8)),centerY,halfW,halfH};}
export function readBest(storage){try{const n=Number(storage.getItem(BEST_KEY));return Number.isFinite(n)&&n>=0&&n<=PIT_END-BOARD?n:0;}catch{return 0;}}
export function saveBest(storage,n){try{storage.setItem(BEST_KEY,String(n));}catch{}}
