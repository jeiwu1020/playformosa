// Arcade time trial. All obstacle contacts use the same joint endpoints as the renderer.
export const DT=1/120,HOLD_TIME=.24,HURDLE_HEIGHT=1.067;
export const HURDLES=Object.freeze(Array.from({length:8},(_,i)=>18+i*11.5));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fresh(){return{x:0,y:1.18,vx:0,vy:0,t:0,phase:'run',lean:0,spin:0,held:[false,false,false,false],holdTimes:[0,0],legArmed:[false,false],j:[0,0,0,0],kick:[0,0],charging:false,charge:0,lastLeg:-1,lastStep:-10,lastArm:-1,stumble:0,stumbleLock:0,airTime:0,leadLeg:1,takeoffLeg:0,launchVy:5.3,flightGravity:11.8,airPress:[-Infinity,-Infinity],landingBuffer:null,landingHeld:null,landingTime:0,landingLeg:1,landingPhase:1,events:[],hurdles:HURDLES.map(x=>({x,hit:false,passed:false,angle:0,hitTime:0,part:''})),stats:{hits:0,clears:0,steps:0,jumps:0,rescues:0,armSwings:0,maxSpeed:0,alternations:0,landings:0,nearMisses:0,bufferedSteps:0},cue:'四肢就位，準備出發。',cueUntil:2};}
export function cancelMotion(s){s.held.fill(false);s.holdTimes.fill(0);s.legArmed.fill(false);s.charging=false;s.charge=0;s.airPress.fill(-Infinity);s.landingBuffer=null;s.landingHeld=null;}
const link=(p,l,a)=>({x:p.x+l*Math.sin(a),y:p.y-l*Math.cos(a)});
// Angles describe actual joints, not a detached cosmetic animation. Each launch
// fixes support/trail and lead identities; input can refine, never swap, the pose.
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const GAIT=[
 [0, .82,1.25, -.48,.18,0],
 [.18,1.52,.18, -.82,2.12,.75],
 [.42,1.48,.12, -.65,2.32,.92],
 [.62,1.08,.16, .45,2.12,.75],
 [.82,.28,.10, 1.00,1.85,.30],
 [1,.06,.14, .80,1.65,.08]
];
function hurdleAngles(s,i){
 const phase=s.phase==='air'?s.airTime/(2*(s.launchVy||5.3)/(s.flightGravity||11.8)):s.landingPhase;
 let n=1;while(n<GAIT.length-1&&phase>GAIT[n][0])n++;
 const a=GAIT[n-1],b=GAIT[n],q=smooth((phase-a[0])/(b[0]-a[0]));
 const v=k=>a[k]+(b[k]-a[k])*q,lead=i===s.leadLeg;
 return {hip:v(lead?1:3)+(lead?.08:.12)*s.j[i+2],knee:v(lead?2:4)+s.j[i+2]*(lead?.12:.20),ab:lead?.025:v(5)};
}
export function pose(s){
 const local={hip:{x:0,y:0,z:0},shoulder:{x:0,y:.65,z:0},head:{x:0,y:1.01,z:0}};
 const airborne=s.phase==='air',handoff=!airborne&&s.landingTime>0;
 for(let i=0;i<2;i++){
  const arm=s.j[i],leg=s.j[i+2],kick=s.kick[i]||0;
  let a=-.4+arm*1.75+(s.stumble>0?.45:0),elbow=.3+arm*1.2;
  let hip=leg*.9-kick*.75,knee=.12+leg*.95+kick*.4,ab=0;
  if(airborne||handoff){const g=hurdleAngles(s,i),blend=airborne?1:smooth(s.landingTime/.18);hip+=(g.hip-hip)*blend;knee+=(g.knee-knee)*blend;ab=g.ab*blend;
   const counter=i===s.leadLeg?-.65:1.0;a+=(counter-a)*.65*blend;elbow+=(1.15-elbow)*.65*blend;
  }
  local['elbow'+i]=link(local.shoulder,.34,a);local['hand'+i]=link(local['elbow'+i],.32,a+elbow);
  const sign=i===0?1:-1,legLink=(p,angle,spread)=>({x:p.x+.55*Math.sin(angle),y:p.y-.55*Math.cos(angle)*Math.cos(spread),z:p.z+sign*.55*Math.cos(angle)*Math.sin(spread)});
  local['knee'+i]=legLink(local.hip,hip,ab);local['foot'+i]=legLink(local['knee'+i],hip-knee,ab*.28);
 }
 const a=s.lean,ca=Math.cos(a),sa=Math.sin(a);
 return Object.fromEntries(Object.entries(local).map(([k,p])=>[k,{x:s.x+p.x*ca+p.y*sa,y:s.y+p.y*ca-p.x*sa,z:p.z||0}]));
}
const PARTS=[['hip','knee0','左大腿'],['knee0','foot0','左腳'],['hip','knee1','右大腿'],['knee1','foot1','右腳'],['hip','shoulder','身體'],['shoulder','head','額頭'],['shoulder','elbow0','左手'],['elbow0','hand0','左手'],['shoulder','elbow1','右手'],['elbow1','hand1','右手']];
function crosses(a,b,x,height,r=.09){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,q=d?clamp(((x-a.x)*dx+(height-a.y)*dy)/d,0,1):0;return Math.hypot(a.x+dx*q-x,a.y+dy*q-height)<r;}
export function contactHurdle(previous,current,x){for(const [a,b,label]of PARTS){if(crosses(current[a],current[b],x,HURDLE_HEIGHT,.10))return label;for(const p of[a,b])if(crosses(previous[p],current[p],x,HURDLE_HEIGHT,.11))return label;}return null;}
function say(s,text){s.cue=text;s.cueUntil=s.t+1.8;}
// Only a fresh short press in the last 100ms can connect a landing stride.
const LANDING_BUFFER=.10;
function stride(s,i){const alternating=s.lastLeg!==i&&s.lastLeg!==-1,tooFast=s.t-s.lastStep<.10;const boost=tooFast?.08:alternating?.92:.34;s.vx=clamp(s.vx+boost*(s.stumbleLock>0?.12:s.stumble>0?.36:1),0,9.7);s.lastLeg=i;s.lastStep=s.t;s.stats.steps++;s.stats.alternations+=Number(alternating);s.kick[i]=1;s.events.push('step');s.spin+=(i===0?.045:-.045);}
export function step(s,raw=[],dt=DT){
 if(s.phase==='done'||s.phase==='dnf')return;dt=clamp(Number.isFinite(dt)?dt:DT,0,1/30);if(!dt)return;
 const input=[0,1,2,3].map(i=>!!raw[i]),before=pose(s),prior=[...s.held];s.events=[];s.t+=dt;
 if(s.t>=180){s.phase='dnf';cancelMotion(s);s.events.push('dnf');return;}
 const grounded=s.phase==='run';
 for(let i=0;i<2;i++){
  if(input[i]&&!prior[i]){s.stats.armSwings++;if(s.stumble>0){s.stumble=Math.max(0,s.stumble-(s.lastArm!==i?.35:.1));s.stats.rescues++;say(s,'手忙腳亂，也是一種自救。');}s.lastArm=i;s.spin+=(i===0?-.13:.13);}
  if(s.phase==='air'){s.legArmed[i]=false;s.holdTimes[i]=0;if(input[i+2]&&!prior[i+2])s.airPress[i]=s.t;if(!input[i+2]&&prior[i+2]){if(s.t-s.airPress[i]<=LANDING_BUFFER)s.landingBuffer={leg:i,at:s.airPress[i]};s.airPress[i]=-Infinity;}}if(input[i+2]&&!prior[i+2]&&s.phase==='run')s.legArmed[i]=true;
  if(s.phase==='run'&&s.landingHeld?.leg===i&&!input[i+2]&&prior[i+2]){if(s.t-s.landingHeld.at<HOLD_TIME&&s.stumble===0){stride(s,i);s.stats.bufferedSteps++;}s.landingHeld=null;}
  if(input[i+2]&&s.legArmed[i]&&s.phase==='run')s.holdTimes[i]+=dt;
  else if(prior[i+2]){
   const held=s.holdTimes[i];s.holdTimes[i]=0;s.legArmed[i]=false;
   if(s.phase==='run'&&held>=HOLD_TIME&&s.stumble<.7){const power=clamp((held-HOLD_TIME)/.42,0,1);s.vy=5.25+power*.75;s.flightGravity=20.5-power*8.7;s.vx*=.995;s.airPress.fill(-Infinity);s.landingBuffer=null;s.landingHeld=null;s.phase='air';s.airTime=0;s.takeoffLeg=i;s.leadLeg=1-i;s.launchVy=s.vy;s.landingTime=0;s.stats.jumps++;s.events.push('jump');say(s,power>.8?'起飛！腳也記得帶上。':'跨出去，別把欄杆帶走。');}
   else if(s.phase==='run'&&held>0){stride(s,i);}
  }
 }
 s.held=input;s.charging=s.phase==='run'&&Math.max(...s.holdTimes)>=HOLD_TIME;s.charge=s.charging?clamp((Math.max(...s.holdTimes)-HOLD_TIME)/.42,0,1):0;
 for(let i=0;i<4;i++)s.j[i]+=(Number(input[i])-s.j[i])*Math.min(1,dt*14);
 for(let i=0;i<2;i++)s.kick[i]*=Math.exp(-dt*7);
 s.landingTime=Math.max(0,s.landingTime-dt);s.stumble=Math.max(0,s.stumble-dt);s.stumbleLock=Math.max(0,s.stumbleLock-dt);if(s.stumbleLock>0)s.vx=Math.min(s.vx,1.4);
 const asym=(s.j[0]-s.j[1])*.55+(s.j[2]-s.j[3])*.18;
 const target=s.stumble>0?.85+Math.sin(s.t*19)*.12:s.phase==='air'?.04+asym*.4:.04+s.vx*.012+asym*.22;
 s.spin+=(target-s.lean)*15*dt;s.spin*=Math.exp(-dt*6);s.lean=clamp(s.lean+s.spin*dt,-.6,1.1);
 s.vx=Math.max(0,s.vx-dt*(.25+.013*s.vx*s.vx+(s.charging?.32:0)+(s.stumble>0?.2:0)));s.x+=s.vx*dt;
 if(s.phase==='air'){s.airTime+=dt;s.vy-=s.flightGravity*dt;s.y+=s.vy*dt;const p=pose(s),low=p['foot'+s.leadLeg].y;if(low<=.10&&s.vy<0){s.y+=.10-low;s.landingPhase=s.airTime/(2*(s.launchVy||5.3)/(s.flightGravity||11.8));s.landingTime=.18;s.landingLeg=s.leadLeg;s.phase='run';s.vy=0;s.stats.landings++;s.events.push('land');if(s.stumble===0&&Math.abs(s.lean)<=.47){if(s.landingBuffer&&s.t-s.landingBuffer.at<=LANDING_BUFFER){stride(s,s.landingBuffer.leg);s.stats.bufferedSteps++;}else{const i=s.airPress.findIndex((at,i)=>input[i+2]&&s.t-at<=LANDING_BUFFER);if(i>=0)s.landingHeld={leg:i,at:s.t};}}s.landingBuffer=null;s.airPress.fill(-Infinity);if(Math.abs(s.lean)>.47){s.stumble=Math.max(s.stumble,.65);s.vx*=.82;say(s,'落地不優雅，至少還活躍。');}}}
 else {s.y=1.18-(s.charging?.10+s.charge*.12:0)-(s.stumble>0?.15:0);const p=pose(s);s.y+=.10-Math.min(p.foot0.y,p.foot1.y);}
 const after=pose(s);
 for(const h of s.hurdles){
  if(h.hit){h.angle=Math.min(Math.PI/2,(s.t-h.hitTime)*4);}
  if(!h.hit&&!h.passed&&Math.abs(s.x-h.x)<1.8){const part=contactHurdle(before,after,h.x);if(part){h.hit=true;h.hitTime=s.t;h.part=part;s.stats.hits++;s.landingHeld=null;s.landingBuffer=null;s.airPress.fill(-Infinity);s.stumble=Math.max(s.stumble,1.85);s.stumbleLock=.8;s.vx*=.30;s.spin+=.8;s.events.push('impact');say(s,part+'：我跟欄杆有個約。');}}
  if(!h.passed&&s.x>h.x+.95){h.passed=true;if(!h.hit){s.stats.clears++;s.events.push('clear');say(s,['欄杆：謝謝你沒有碰我。','這次，四肢有開會。','乾淨通過！先別得意。','身體過去了，自信也回來了。'][s.stats.clears%4]);}}
 }
 s.stats.maxSpeed=Math.max(s.stats.maxSpeed,s.vx);
 if(s.x>=110){s.x=110;s.phase='done';s.vy=0;cancelMotion(s);s.events.push('finish');}
}
export function verdict(s){
 const a=s.stats;let title,subtitle;
 if(s.phase==='dnf'){title='四肢會議，宣布延長。';subtitle='先休息一下，下次再跟終點談。';}
 else if(a.hits===0&&s.t<24){title='四肢難得全票通過。';subtitle='八道欄杆，只收到你的風。';}
 else if(a.hits===0){title='禮貌跨欄，零碰觸。';subtitle='每一道欄杆都想給你五星。';}
 else if(a.hits===HURDLES.length){title='欄杆拆除，工程驗收。';subtitle='終點到了，八道欄杆也下班了。';}
 else if(a.hits>=6){title='你是來跨欄，還是來拆遷？';subtitle='跑道很乾淨，欄杆很有意見。';}
 else if(a.rescues>12){title='手的工作，比腳還多。';subtitle='一邊跑，一邊把自己救回來。';}
 else if(a.jumps>=20){title='這是跨欄，不是袋鼠聯賽。';subtitle='起飛次數很多，出場費只有一份。';}
 else if(a.hits>=4){title='一路有撞，仍然有望。';subtitle='沒有完美姿勢，只有不放棄的膝蓋。';}
 else if(s.t<26){title='速度到位，四肢偶爾離線。';subtitle='快得很有道理，撞得略帶感情。';}
 else if(a.hits<=2){title='只差一點，就很像選手。';subtitle='欄杆很緊張，你也沒比較放鬆。';}
 else if(s.t>60){title='慢慢跨，終點又不會搬家。';subtitle='你讓觀眾完整認識了每一道欄杆。';}
 else {title='四肢各有想法，至少同個方向。';subtitle='歪歪斜斜，也是抵達的一種方式。';}
 return{title,subtitle,detail:`乾淨通過 ${a.clears} ／ 撞倒 ${a.hits} ／ 起跳 ${a.jumps}`,badge:a.hits===0?'零碰撞俱樂部':a.rescues>=6?'自救達人':a.jumps>=15?'彈跳辦公室':a.hits>=6?'欄杆好朋友':'全力抵達',time:s.t.toFixed(2)};
}
