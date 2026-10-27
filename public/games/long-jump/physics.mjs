import {selectVerdict} from './verdicts.mjs';
import {regionAt,windAt,journeyLabel,adventureAt} from './world.mjs';
// Intentionally impossible arcade flight. Bounded instantaneous forces, no journey cap.
export const DT=1/120,START=-23,BOARD=10,PIT=10.45,MAX_AIR_FORCE=16,HOLD_TIME=.34;
export const BEST_KEY='pf-longjump-best-v9',JOURNEY_KEY='pf-longjump-journey-v9';
export const BONES={upperArm:.34,foreArm:.32,thigh:.55,shin:.55};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const worldX=s=>(s.origin||0)+s.x;
export function fresh(){const s={x:START,origin:0,y:1.12,vx:0,vy:0,lean:0,spin:0,momentum:0,j:[0,0,0,0],controlJ:[0,0,0,0],held:[false,false,false,false],holdTimes:[0,0],airReady:[false,false],airFresh:[false,false],brace:[0,0],landingPose:0,landingRequested:false,takeoffSpeed:null,takeoffQuality:0,firstMark:Infinity,landingPart:'',energy:1,crouch:0,charging:false,chargeFoot:-1,phase:'run',t:0,airTime:0,landTime:0,jumped:false,fallen:false,foul:false,mark:Infinity,markPart:'',firstPart:'',maxAirForce:0,airEffort:0,airWork:0,energyRecovered:0,rotations:0,forwardTurns:0,backwardTurns:0,turnProgress:0,turnDirection:0,rotationTravel:0,peakLean:0,recoveries:0,wasWobbling:false,maxDistance:0,visited:['taipei'],lastRegion:'taipei',rebaseCount:0,wind:windAt(0)};const points=pose(s);s.y+=.02-Math.min(points.foot0.y-skinRadius(s,'foot0',points),points.foot1.y-skinRadius(s,'foot1',points));return s;}
export function cancelMotion(s){s.charging=false;s.crouch=0;s.chargeFoot=-1;s.holdTimes=[0,0];s.held=[false,false,false,false];s.landingRequested=false;s.landingPose=0;s.brace=[0,0];s.airReady=[false,false];s.airFresh=[false,false];}
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
function mark(s,p){for(const[key,pt]of Object.entries(p)){const wx=pt.x+s.origin;if(pt.y-skinRadius(s,key,p)<.06&&wx>=PIT&&wx<s.mark){s.mark=wx;s.markPart=parts[key];}}}
function launch(s,input,foot){
 const points=pose(s),grounded=Object.entries(points).filter(([k,v])=>k.startsWith('foot')&&v.y-skinRadius(s,k,points)<.35);
 if(grounded.some(([,pt])=>pt.x+s.origin+.22>BOARD))s.foul=true;
 const support=points['foot'+foot].y-skinRadius(s,'foot'+foot,points),quality=clamp(1-Math.abs(s.lean)*.5-Math.max(0,support-.15)*.7,.4,1);
 s.takeoffQuality=quality;s.vy=(7.2+s.crouch*2.4)*quality;s.vx*=.95;s.takeoffSpeed=s.vx;s.phase='air';s.jumped=true;s.momentum=s.spin*1.1;
 s.charging=false;s.crouch=0;s.chargeFoot=-1;s.holdTimes=[0,0];s.airReady=[!input[2],!input[3]];s.airFresh=[false,false];
}
function inputIntent(s,input,dt){
 const prior=[...s.held],wasRun=s.phase==='run';
 if(wasRun){
  let release=-1;
  for(let f=0;f<2;f++){if(input[f+2])s.holdTimes[f]+=dt;else{if(prior[f+2]&&s.holdTimes[f]>=HOLD_TIME)release=f;s.holdTimes[f]=0;}}
  if(release>=0&&s.charging)launch(s,input,release);
  else{const f=s.holdTimes[0]>=s.holdTimes[1]?0:1,age=s.holdTimes[f];s.charging=age>=HOLD_TIME;s.chargeFoot=s.charging?f:-1;s.crouch=s.charging?clamp(.25+(age-HOLD_TIME)*1.8,0,1):0;}
 }
 if(s.phase==='air')for(let f=0;f<2;f++){
  const key=f+2;
  if(!input[key]){s.airReady[f]=true;s.airFresh[f]=false;s.holdTimes[f]=0;}
  else if(!wasRun){if(!prior[key]&&s.airReady[f])s.airFresh[f]=true;if(s.airFresh[f])s.holdTimes[f]+=dt;}
  const target=s.airFresh[f]&&s.holdTimes[f]>=HOLD_TIME?1:0;s.brace[f]+=(target-s.brace[f])*Math.min(1,dt*7);
 }
 s.landingPose=(s.brace[0]+s.brace[1])/2;s.landingRequested=s.landingPose>.1;s.held=input.map(Boolean);
}
function rebase(s){if(Math.abs(s.x)>512){const shift=Math.trunc(s.x/256)*256;s.x-=shift;s.origin+=shift;s.rebaseCount++;}}
export function step(s,rawInput,dt=DT){
 if(s.phase==='done')return;dt=clamp(Number.isFinite(dt)?dt:DT,0,1/60);if(!dt)return;
 const input=Array.from({length:4},(_,i)=>Boolean(rawInput?.[i])),old=[...s.controlJ];s.airEffort=0;s.t+=dt;inputIntent(s,input,dt);
 for(let i=0;i<4;i++){
  let target=input[i]?1:0;
  if(s.phase==='run'&&s.charging&&i===s.chargeFoot+2)target=.4-.2*s.crouch;
  s.controlJ[i]+=(target-s.controlJ[i])*Math.min(1,dt*10);
  const bias=i>=2?.75*s.brace[i-2]:0;s.j[i]=s.controlJ[i]*(1-bias)+.82*bias;
 }
 // Only manually driven visible motion earns air work; bracing's own movement earns none.
 const velocity=s.controlJ.map((v,i)=>(v-old[i])/dt*(i>=2?1-.75*s.brace[i-2]:1));
 if(s.phase==='run'){
  const p=pose(s),low=Math.min(p.foot0.y-skinRadius(s,'foot0',p),p.foot1.y-skinRadius(s,'foot1',p));s.y+=.02-low;
  const q=pose(s),feet=['foot0','foot1'].filter(k=>q[k].y-skinRadius(s,k,q)<.2),support=feet.reduce((n,k)=>n+q[k].x,0)/Math.max(1,feet.length);
  if(feet.some(k=>q[k].x+s.origin+.22>BOARD))s.foul=true;
  const com=q.hip.x*.65+q.shoulder.x*.25+(q.hand0.x+q.hand1.x)*.05;
  const asym=(s.j[2]-s.j[3])*3.1+(s.j[0]-s.j[1])*2.5,help=9*Math.max(0,1-(s.lean/.7)**2);
  s.spin+=(asym+2*(com-support)+5*Math.sin(s.lean)-help*s.lean-s.spin*2)*dt;s.lean+=s.spin*dt;
  const extension=[Math.max(0,old[2]-s.controlJ[2]),Math.max(0,old[3]-s.controlJ[3])],together=Math.min(...extension);
  let impulse=0;for(let f=0;f<2;f++)if(!(s.charging&&s.chargeFoot===f)){const contact=q['foot'+f].y-skinRadius(s,'foot'+f,q)<.22?1:.18;impulse+=(extension[f]-.7*together)*4.8*contact*s.energy*Math.max(.1,Math.cos(s.lean));}
  s.vx+=Math.min(impulse,dt*5.2);s.vx=Math.max(0,s.vx-dt*(.17+.014*s.vx*s.vx+(s.charging?.65:0)));s.vx=Math.min(s.vx,13);
  s.energy=clamp(s.energy+dt*.2-impulse*.018,0,1);s.peakLean=Math.max(s.peakLean,Math.abs(s.lean));
  if(Math.abs(s.lean)>.45)s.wasWobbling=true;else if(s.wasWobbling&&Math.abs(s.lean)<.2){s.recoveries++;s.wasWobbling=false;}
  if(Math.abs(s.lean)>1.12){s.fallen=true;s.phase='fall';s.charging=false;s.crouch=0;s.vy=0;}
  else if(worldX(s)>PIT){s.phase='air';s.vy=0;s.momentum=s.spin;s.charging=false;s.crouch=0;s.holdTimes=[0,0];s.airReady=[!input[2],!input[3]];s.airFresh=[false,false];}
 }
 if(s.phase==='air'){
  s.airTime+=dt;const distance=Math.max(0,worldX(s)-BOARD);s.wind=windAt(distance);
  const flow=clamp((Math.abs(velocity[0]-velocity[1])+Math.abs(velocity[2]-velocity[3]))*.15,0,3.5);
  const upright=clamp(Math.cos(s.lean),0,1),control=upright*upright*(1-Math.min(1,Math.abs(s.spin)/9));
  const effort=flow*(.3+.7*s.energy);s.airEffort=effort;s.airWork+=effort*dt;
  const recovery=flow*control*.30*dt;s.energyRecovered+=recovery;s.energy=clamp(s.energy+recovery-effort*.20*dt-Math.abs(s.spin)*.007*dt,0,1);
  const area=.45+.12*(4-s.j.reduce((a,b)=>a+b,0))+.2*s.landingPose;
  const density=Math.exp(-.35*Math.max(0,s.y-4))/(1+Math.max(0,s.vy)*.25);
  const lift=clamp(effort*4.5*density*(.25+.75*Math.cos(s.lean)**2)+s.wind.lift,0,MAX_AIR_FORCE);s.maxAirForce=Math.max(s.maxAirForce,lift);
  s.vx+=dt*(effort*3.8*Math.cos(s.lean)+s.wind.push-.009*s.vx*Math.abs(s.vx)*area);s.vx=clamp(s.vx,-12,28);
  s.vy+=dt*(-4.8+lift-.032*s.vy*Math.abs(s.vy));s.vy=clamp(s.vy,-14,10);s.y+=s.vy*dt;
  s.momentum+=dt*((velocity[0]+velocity[2]-velocity[1]-velocity[3])*2.5+(s.j[0]+s.j[2]-s.j[1]-s.j[3])*.7);
  s.momentum=clamp(s.momentum*Math.exp(-dt*(.10+s.landingPose*.55)),-9,9);
  const inertia=.7+.65*(1-(s.j[2]+s.j[3])*.5)+.2*(1-(s.j[0]+s.j[1])*.5)+s.landingPose*.5;
  s.spin=clamp(s.momentum/inertia,-10,10);const turn=s.spin*dt;s.lean+=turn;s.rotationTravel+=turn;
  const p=pose(s),touching=Object.entries(p).filter(([key,pt])=>pt.y-skinRadius(s,key,p)<.02&&s.vy<0);
  if(touching.length){touching.sort((a,b)=>(a[1].y-skinRadius(s,a[0],p))-(b[1].y-skinRadius(s,b[0],p)));s.firstPart=parts[touching[0][0]];s.landingPart=s.firstPart;mark(s,p);s.firstMark=s.mark;s.landingWorldX=touching[0][1].x+s.origin;s.maxDistance=Math.max(s.maxDistance,s.landingWorldX-BOARD);s.phase='land';s.landTime=0;s.y+=.02-Math.min(...touching.map(([key,pt])=>pt.y-skinRadius(s,key,p)));s.vy=0;s.spin*=.35;}
  else if(Math.abs(turn)>1e-7){const direction=Math.sign(turn);if(direction!==s.turnDirection){s.turnDirection=direction;s.turnProgress=0;}s.turnProgress+=Math.abs(turn);const completed=Math.floor(s.turnProgress/(Math.PI*2));if(completed){s.turnProgress-=completed*Math.PI*2;if(direction>0)s.forwardTurns+=completed;else s.backwardTurns+=completed;s.rotations=s.forwardTurns+s.backwardTurns;}}
 }
 if(s.phase==='fall'){
  s.vy-=9.8*dt;s.y+=s.vy*dt;s.spin+=Math.sin(s.lean)*dt*3;s.lean+=s.spin*dt;
  const p=pose(s),touching=Object.entries(p).filter(([k,pt])=>!k.startsWith('foot')&&pt.y-skinRadius(s,k,p)<.02).sort((a,b)=>(a[1].y-skinRadius(s,a[0],p))-(b[1].y-skinRadius(s,b[0],p)));
  if(touching.length){s.firstPart=parts[touching[0][0]];s.y+=.02-(touching[0][1].y-skinRadius(s,touching[0][0],p));s.phase='land';s.landTime=0;s.vy=0;s.spin*=.3;}
 }
 if(s.phase==='land'){
  s.landTime+=dt;s.vx*=Math.exp(-dt*6);s.lean+=s.spin*dt;s.spin*=Math.exp(-dt*4);s.y+=(.4-s.y)*Math.min(1,dt*5);
  if(!s.fallen)mark(s,pose(s));const p=pose(s),clearance=Math.min(...Object.entries(p).map(([k,pt])=>pt.y-skinRadius(s,k,p)));s.y+=Math.max(0,.02-clearance);if(s.landTime>1)s.phase='done';
 }
 s.x+=s.vx*dt;rebase(s);s.maxDistance=Math.max(s.maxDistance,worldX(s)-BOARD);
 const region=regionAt(s.maxDistance);s.lastRegion=region.id;if(!s.visited.includes(region.id))s.visited.push(region.id);
}
export function result(s){
 const rawDistance=Number.isFinite(s.mark)?Math.max(0,s.mark-BOARD):null,valid=!s.foul&&!s.fallen&&rawDistance!==null;
 const journeyDistance=Math.max(0,(s.landingWorldX??worldX(s))-BOARD),adventure=adventureAt(journeyDistance),destination=adventure.region;
 return{valid,distance:valid?rawDistance:0,rawDistance,adventureKm:adventure.km,legalAdventureKm:valid?adventureAt(rawDistance).km:0,achievements:adventureAt(s.maxDistance).achievements,journeyDistance,landingLoss:Number.isFinite(s.firstMark)&&rawDistance!==null?Math.max(0,s.firstMark-s.mark):0,badge:s.rotations?'空中翻轉 '+s.rotations+' 圈':null,destination,journey:journeyLabel(Math.max(0,(s.landingWorldX??worldX(s))-BOARD)),exploredDistance:s.maxDistance,loops:regionAt(s.maxDistance).loop,title:s.verdict||selectVerdict({firstContact:s.landingPart||s.firstPart,nearestPart:s.markPart,rawDistance,foul:s.foul,flips:s.rotations,airTime:s.airTime,glides:0,fallen:s.fallen,region:destination.id,loops:destination.loop,recoveries:s.recoveries,landingLoss:Number.isFinite(s.firstMark)&&rawDistance!==null?s.firstMark-s.mark:0})};
}
export const toKmh=v=>v*3.6;
export function cameraFrame(s,width,height){const p=pose(s),high=Math.max(2.7,...Object.values(p).map(v=>v.y+.48)),low=Math.min(-.25,...Object.values(p).map(v=>v.y-.34)),centerY=(high+low)/2;let halfH=Math.max(3.3,(high-low)/2+.9);const halfW=Math.max(4.8,halfH*Math.max(1,width)/Math.max(1,height));halfH=halfW*Math.max(1,height)/Math.max(1,width);return{centerX:s.x+1.8,centerY,halfW,halfH};}
export function readBest(storage){try{const n=Number(storage.getItem(BEST_KEY));return Number.isFinite(n)&&n>=0?n:0;}catch{return 0;}}
export function saveBest(storage,n){if(!Number.isFinite(n)||n<0)return;try{storage.setItem(BEST_KEY,String(n));}catch{}}
export function readJourney(storage){try{const d=JSON.parse(storage.getItem(JOURNEY_KEY));return d&&Number.isFinite(d.distance)&&d.distance>=0?{distance:d.distance,visited:Array.isArray(d.visited)?d.visited.filter(x=>typeof x==='string'):[]}: {distance:0,visited:[]};}catch{return{distance:0,visited:[]};}}
export function saveJourney(storage,s){const old=readJourney(storage),next={adventureKm:adventureAt(Math.max(old.distance,s.maxDistance||0)).km,distance:Math.max(old.distance,s.maxDistance||0),visited:[...new Set([...old.visited,...s.visited])]};try{storage.setItem(JOURNEY_KEY,JSON.stringify(next));}catch{}return next;}
