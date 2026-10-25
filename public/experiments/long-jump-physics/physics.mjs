// Deliberately exaggerated arcade aerodynamics, not a model of human flight.
export const DT=1/120,START=-8,BOARD=10,PIT=10.45,PIT_END=45,MAX_AIR_FORCE=6.5;
export const BEST_KEY='pf-longjump-physics-experiment-v1';
export const BONES={upperArm:.34,foreArm:.32,thigh:.55,shin:.55};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fresh(){return{x:START,y:1.12,vx:0,vy:0,lean:0,spin:0,momentum:0,j:[0,0,0,0],energy:1,crouch:0,charging:false,previousSpace:false,phase:'run',t:0,airTime:0,landTime:0,jumped:false,fallen:false,foul:false,mark:Infinity,markPart:'',firstPart:'',maxAirForce:0,airWork:0,rotations:0,rotationTravel:0,peakLean:0};}
export function cancelMotion(s){s.charging=false;s.crouch=0;s.previousSpace=false;}
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
function mark(s,p){for(const[key,pt]of Object.entries(p))if(pt.y<.16&&pt.x>=PIT&&pt.x<=PIT_END&&pt.x<s.mark){s.mark=pt.x;s.markPart=parts[key];}}
export function step(s,input,dt=DT){if(s.phase==='done')return;dt=clamp(dt,0,1/60);s.t+=dt;const old=[...s.j],space=Boolean(input[4]);
 if(s.phase==='run'){
  if(space&&!s.previousSpace){s.charging=true;s.crouch=0;}
  if(s.charging&&space)s.crouch=clamp(s.crouch+dt*2.7,0,1);
  if(s.charging&&!space){const p=pose(s);if(Object.entries(p).some(([k,v])=>k.startsWith('foot')&&v.y<.18&&v.x+.22>BOARD))s.foul=true;s.charging=false;if(s.crouch>.25){s.phase='air';s.jumped=true;s.vy=3.7+s.crouch*3.1;s.vx*=.98;s.momentum=s.spin*1.1;}s.crouch=0;}
 }
 s.previousSpace=space;
 for(let i=0;i<4;i++){const target=s.charging&&i>=2?.75*s.crouch:(input[i]?1:0);s.j[i]+=(target-s.j[i])*Math.min(1,dt*10);}
 const velocity=s.j.map((j,i)=>(j-old[i])/Math.max(dt,1e-6));
 if(s.phase==='run'){
  const p=pose(s),low=Math.min(p.foot0.y,p.foot1.y);s.y+=.02-low;const grounded=pose(s),feet=[grounded.foot0,grounded.foot1].filter(pt=>pt.y<.2),support=feet.reduce((n,p)=>n+p.x,0)/Math.max(1,feet.length);
  if(feet.some(pt=>pt.x+.22>BOARD))s.foul=true;
  const com=grounded.hip.x*.65+grounded.shoulder.x*.25+(grounded.hand0.x+grounded.hand1.x)*.05;
  const asym=(s.j[2]-s.j[3])*2.6+(s.j[0]-s.j[1])*2.5;
  const help=9*Math.max(0,1-Math.abs(s.lean)/.85);
  s.spin+=(asym+2*(com-support)+5*Math.sin(s.lean)-help*s.lean-s.spin*2.1)*dt;s.lean+=s.spin*dt;
  for(let i=0;i<2;i++)if(!s.charging){const contact=grounded['foot'+i].y<.22?1:.25,work=Math.max(0,old[i+2]-s.j[i+2]);s.vx+=work*5.8*contact*s.energy*Math.max(.1,Math.cos(s.lean));s.energy=clamp(s.energy-work*.12,0,1);}
  s.vx=Math.max(0,s.vx-dt*(.18+.018*s.vx*s.vx+(s.charging?.25:0)));s.vx=Math.min(s.vx,12);
  s.energy=clamp(s.energy+dt*.22,0,1);s.peakLean=Math.max(s.peakLean,Math.abs(s.lean));
  if(Math.abs(s.lean)>1.05){s.fallen=true;s.phase='fall';s.charging=false;s.crouch=0;s.vy=0;}
  else if(s.x>PIT){s.phase='air';s.vy=0;s.momentum=s.spin;s.charging=false;s.crouch=0;}
 }
 if(s.phase==='air'){
  s.airTime+=dt;
  // Differential joint travel moves arcade airflow. Symmetric all-button mashing cancels,
  // while lift/drag and metabolic cost stay continuous rather than discrete combo rewards.
  const flow=(Math.abs(velocity[0]-velocity[1])+Math.abs(velocity[2]-velocity[3]))*.15;
  const effort=clamp(flow,0,3.5)*s.energy;
  const area=.4+.15*(2-s.j[0]-s.j[1])+.15*(2-s.j[2]-s.j[3]);
  const lift=clamp((effort*2.2+.012*s.vx*s.vx*area)*(.25+.75*Math.cos(s.lean)**2),0,MAX_AIR_FORCE);
  s.maxAirForce=Math.max(s.maxAirForce,lift);s.airWork+=effort*dt;
  s.energy=clamp(s.energy+dt*.06-effort*dt*.32,0,1);
  s.vx+=dt*(effort*1.5*Math.cos(s.lean)-.018*s.vx*Math.abs(s.vx)*area);s.vx=clamp(s.vx,-8,16);
  s.vy+=dt*(-9.8+lift);s.y+=s.vy*dt;
  s.momentum+=dt*((velocity[0]+velocity[2]-velocity[1]-velocity[3])*2.6+(s.j[0]+s.j[2]-s.j[1]-s.j[3])*.9);s.momentum=clamp(s.momentum*Math.exp(-dt*.12),-9,9);
  const inertia=.7+.65*(1-(s.j[2]+s.j[3])*.5)+.2*(1-(s.j[0]+s.j[1])*.5);s.spin=clamp(s.momentum/inertia,-10,10);const turn=s.spin*dt;s.lean+=turn;s.rotationTravel+=turn;
  const p=pose(s),touching=Object.entries(p).filter(([,pt])=>pt.y<.1&&s.vy<0);
  if(touching.length){touching.sort((a,b)=>a[1].y-b[1].y);s.firstPart=parts[touching[0][0]];mark(s,p);s.phase='land';s.landTime=0;s.y+=.1-Math.min(...touching.map(([,pt])=>pt.y));s.vy=0;s.spin*=.35;}
  else s.rotations=Math.floor(Math.abs(s.rotationTravel)/(Math.PI*2));
 }
 if(s.phase==='fall'){
  s.vy-=9.8*dt;s.y+=s.vy*dt;s.spin+=Math.sin(s.lean)*dt*3;s.lean+=s.spin*dt;
  const body=Object.entries(pose(s)).filter(([key,pt])=>!key.startsWith('foot')&&pt.y<.1).sort((a,b)=>a[1].y-b[1].y);
  if(body.length){s.firstPart=parts[body[0][0]];s.y+=.1-body[0][1].y;s.phase='land';s.landTime=0;s.vy=0;s.spin*=.3;}
 }
 if(s.phase==='land'){s.landTime+=dt;s.vx*=Math.exp(-dt*6);s.lean+=s.spin*dt;s.spin*=Math.exp(-dt*4);s.y+=(.4-s.y)*Math.min(1,dt*5);if(!s.fallen)mark(s,pose(s));const settled=pose(s);const clearance=Math.min(...Object.entries(settled).map(([key,pt])=>pt.y-(key==='head'?.30:key==='hip'?.25:key==='shoulder'?.20:.10)));s.y+=Math.max(0,.02-clearance);if(s.landTime>1)s.phase='done';}
 s.x+=s.vx*dt;if(s.t>30||s.airTime>7||s.x>PIT_END+4||s.x<START-12)s.phase='done';
}
export function result(s){const raw=Number.isFinite(s.mark)?Math.max(0,s.mark-BOARD):0,valid=!s.foul&&!s.fallen&&Number.isFinite(s.mark);const part=s.firstPart||s.markPart;let title=s.fallen?'還沒起飛，先跟跑道打招呼':part==='額頭'?'額頭搶先辦理登陸':part==='屁股'?'屁股已抵達目的地':part.includes('手')?'手比腳更想下班':s.rotations?'旋轉服務，著陸另計':raw>15?'地心引力剛才沒看見':'四肢暫時達成共識';if(s.foul)title='越線了，'+title;return{valid,distance:valid?raw:0,rawDistance:raw,title};}
