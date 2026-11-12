import {javelinPose} from './pose.mjs';
import {crossedLine} from './shoe-contact.mjs';
/** Deterministic, simplified game rules: forward landing inside 28.96° sector,
 * descending point first; athlete must stop fully behind line. No random wind.
 * Distances measured from straight prototype foul line, not official curved arc. */
// BODY_FRONT retained only for old diagnostics; scoring uses visible grounded shoe geometry.
export const START_X=-23, LINE_X=0, BODY_FRONT=.95, GRAVITY=9.81;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function createState(){return {phase:'ready',time:0,x:START_X,v:0,stability:.65,draw:0,braceTime:null,releaseTime:null,held:{a:false,s:false,j:false,k:false},downAt:{},lastLeg:null,lastStep:-1,lastArm:-1,steps:0,lastStrideAlternate:false,jPulse:0,lastBalanceTime:-1,balanceStep:0,balanceRoll:0,balanceHits:0,balanceMisses:0,balanceCue:'ready',balanceFeedback:'A／S 交替落腳後，立刻點 J 擺左臂。',armAngle:18*Math.PI/180,projectile:null,launch:null,stopped:false,distance:0,foul:false,reason:'',feedback:[],grade:'',resultTime:null,recoveryTime:null,footCrossing:null};}
export function press(s,key){key=key.toLowerCase();if(!(key in s.held)||s.held[key]||s.phase==='result')return;s.held[key]=true;s.downAt[key]=s.time;if(s.phase==='ready')s.phase='run';if(key==='j')balanceArm(s);if(s.phase!=='run'||s.braceTime!==null)return;
 if(key==='a'||key==='s'){const interval=s.time-s.lastStep;if(interval<.14)return;const alternate=s.lastLeg!==key;const cadence=interval>=.14&&interval<=.65;const quality=alternate?(cadence?1:.65):.25;s.v=clamp(s.v+.95*quality,0,8.4);s.stability=clamp(s.stability-(alternate?.018:.14),.1,1);s.balanceRoll=clamp(s.balanceRoll+(key==='a'?1:-1)*(.07+(1-s.stability)*.13),-.35,.35);s.lastStrideAlternate=alternate;s.lastLeg=key;s.lastStep=s.time;s.steps++;}
}
// One left-arm correction per alternating stride. A hold keeps the pose, not the bonus.
function balanceArm(s){const gap=s.time-s.lastBalanceTime;s.lastBalanceTime=s.time;s.lastArm=s.time;s.jPulse=1;
 if(s.phase!=='run'||s.braceTime!==null){s.balanceCue='support';s.balanceFeedback='左臂撐開；前腳已支撐，放開 K 出手。';return;}
 const rapid=gap<.20||s.balanceStep===s.steps&&s.steps>0,coordinated=!rapid&&s.lastStrideAlternate&&s.steps>0&&s.time-s.lastStep<=.18;
 if(coordinated){s.stability=clamp(s.stability+.10);s.balanceRoll*=.22;s.balanceStep=s.steps;s.balanceHits++;s.balanceCue='good';s.balanceFeedback='配合落腳！左臂拉回平衡。';}
 else{s.stability=clamp(s.stability-(rapid?.055:.035),.1,1);s.balanceMisses++;s.balanceCue=rapid?'rapid':'late';s.balanceFeedback=rapid?'J 太密了：每次落腳配一次，不必連按。':'J 沒跟上腳步：A／S 落腳後立刻點一下。';}
}
export function release(s,key){key=key.toLowerCase();if(!(key in s.held)||!s.held[key])return;s.held[key]=false;
 if(key==='k'&&s.phase==='run'){if(s.draw>=.32)launch(s);else{s.stability=clamp(s.stability+.045);s.lastArm=s.time;s.draw=0;}}
 // A brace is planted, not cancelled by finger release; both legs still brake after throw.
}
export function launchParams(s){
 const delay=s.braceTime===null?null:s.time-s.braceTime,prep=clamp(s.draw/1.05),brace=delay===null?.2:clamp(1-Math.abs(delay-.27)/.65,.15,1),run=clamp(s.braceSpeed??s.v,0,8.4),stability=clamp(s.stability);
 const balanceTransfer=.72+.28*stability,baseSpeed=(7+run*(.75+.3*stability)+5*prep+5*brace)*balanceTransfer;
 // A bounded kinetic-chain bonus rewards all four skills together. Merely
 // holding K longer, running fast without J, or omitting the brace cannot farm it.
 const runQuality=clamp((run-4.5)/3.9),balanceQuality=clamp((stability-.55)/.45),timing=delay===null?0:clamp(1-Math.abs(delay-.27)/.24),chain=runQuality*balanceQuality*prep*timing,chainBonus=6.7*chain,speed=baseSpeed+chainBonus;
 return {speed,angle:s.armAngle,draw:s.draw,braceDelay:delay,stability,runSpeed:run,prep,brace,balanceTransfer,balanceHits:s.balanceHits,chain,chainBonus,runQuality,balanceQuality,timing};
}
function launch(s){s.launch=launchParams(s);s.releaseTime=s.time;s.phase='flight';const {speed,angle}=s.launch;const yaw=(1-s.stability)*.12; s.projectile={x:s.x+1.6*Math.cos(angle),y:1.75+1.6*Math.sin(angle),z:-.205,vx:speed*Math.cos(angle)*Math.cos(yaw),vy:speed*Math.sin(angle),vz:speed*Math.cos(angle)*Math.sin(yaw),angle,landed:false};}
function foul(s,why){s.foul=true;s.reason ||= why;}
function recover(s){s.phase='recover';s.recoveryTime=s.time;s.held={a:false,s:false,j:false,k:false};}
function finish(s){s.phase='result';s.resultTime=s.time;const l=s.launch;s.feedback=[];if(!l){s.grade='犯規';s.feedback=[s.reason,'未完成出手：提早引槍，在起擲線前約 6–7 公尺支撐並放開 K。'];return;}
 s.feedback.push(`助跑 ${l.runSpeed.toFixed(1)} m/s · 穩定 ${Math.round(l.stability*100)}%`);
 s.feedback.push(l.stability<.55?'平衡不足：A／S 交替落腳後立刻點 J；長按或連按不會更穩。':`左臂協調 ${l.balanceHits} 次：身體保持穩定，出手力量保留較多。`);
 s.feedback.push(l.draw<.85?'引槍偏短：提早按住 K，讓右臂充分向後伸展。':'引槍充分：右臂已累積完整出手準備。');
 s.feedback.push(l.braceDelay===null?'沒有前腳支撐：最後 7 公尺內按住 A，再放開 K。':l.braceDelay<.14?'出手偏早：前腳剛落地，身體力量尚未傳到右臂。':l.braceDelay>.5?'出手偏晚：手臂已抬太高，力量偏向天空。':'支撐接力順暢：前腳踩穩，再由右臂送出。');
 s.feedback.push(`出手 ${(l.angle*180/Math.PI).toFixed(0)}° · ${l.speed.toFixed(1)} m/s`);
 if(s.foul)s.feedback.push(s.reason.includes('越線')?'出手後立刻按住 A＋S 煞停；下次提早一點支撐。':s.reason);
 if(!s.foul&&s.distance>=98.48)s.feedback.push('98.48 m 遊戲挑戰達成（遊戲成績，非真實世界紀錄）。');
 s.grade=s.foul?'犯規':s.distance>=90?'S':s.distance>=70?'A':s.distance>=50?'B':'C';
}
export function step(s,dt){if(s.phase==='ready'||s.phase==='result')return s;if(!Number.isFinite(dt)||dt<=0)return s;let remaining=Math.min(dt,.25);while(remaining>1e-8){const h=Math.min(remaining,1/120);advance(s,h);remaining-=h;if(s.phase==='result')break;}return s;}
function advance(s,h){s.time+=h;s.jPulse=Math.max(0,1-(s.time-s.lastBalanceTime)/.30);
 const rollTarget=s.phase==='run'&&s.braceTime===null&&s.v>.2?(s.lastLeg==='a'?1:-1)*(1-s.stability)*.42:0;s.balanceRoll+=(rollTarget-s.balanceRoll)*(1-Math.exp(-h*8));
 if(s.phase==='run'){
  if(s.held.k)s.draw+=h;
  if(s.braceTime===null&&s.x>-7&&s.held.a&&s.time-s.downAt.a>=.12){s.braceTime=s.time;s.braceSpeed=s.v;}
  if(s.braceTime!==null)s.armAngle=clamp(18+(s.time-s.braceTime)*95,18,75)*Math.PI/180;
  else s.armAngle=18*Math.PI/180;
  s.stability=clamp(s.stability-h*(s.draw>.32?.014:.025),.1,1);
 }
 const brake=s.phase==='flight'&&s.held.a&&s.held.s;const drag=s.phase==='recover'?12:brake?16:s.phase==='run'&&s.braceTime!==null&&s.held.a?8:s.phase==='flight'?1.1:.32;const oldV=s.v;s.v=Math.max(0,s.v-drag*h);s.x+=(oldV+s.v)*.5*h;s.stopped=s.v<.03;
 const contact=crossedLine(javelinPose(s),LINE_X-.07);if(contact&&!s.footCrossing){s.footCrossing={...contact,time:s.time};foul(s,'越線：接地鞋底踩到起擲線或線外，這一投不計成績。');if(s.phase==='run')recover(s);}
 if(s.phase==='recover'&&s.stopped&&s.time-s.recoveryTime>=.8){finish(s);return;}
 const p=s.projectile;if(p&&!p.landed){const old={x:p.x,y:p.y,z:p.z};p.x+=p.vx*h;p.y+=p.vy*h-.5*GRAVITY*h*h;p.z+=p.vz*h;p.vy-=GRAVITY*h;p.angle=Math.atan2(p.vy,Math.hypot(p.vx,p.vz));if(p.y<=0){const f=old.y/(old.y-p.y);p.x=old.x+(p.x-old.x)*f;p.z=old.z+(p.z-old.z)*f;p.y=0;p.landed=true;s.distance=Math.hypot(p.x,p.z);if(p.x<=0)foul(s,'標槍未落到投擲線前方。');else if(Math.abs(Math.atan2(p.z,p.x))>14.48*Math.PI/180)foul(s,'標槍落在扇形有效區之外。');else if(p.vy>=0)foul(s,'槍尖沒有向下先落地。');}}
 if(s.phase==='flight'&&p.landed&&s.stopped)finish(s);
 if(s.phase==='run'&&s.time>35){foul(s,'未在時限內完成出手。');recover(s);}
}
export function snapshot(s){return structuredClone(s);}
