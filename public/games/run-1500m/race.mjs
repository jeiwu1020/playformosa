// A standalone fixed-step 1500m prototype. One world unit is one metre.
export const RULES='1500m-rival-tiers-v5';
// Four complete schedules, selected once at the start; no mid-race difficulty roll.
export const RACE_PLANS=Object.freeze([
 [0,0,0],[6,0,0],[12,0,0],[18,0,0]
].map((offsets,id)=>Object.freeze({id,seed:150015+(id+2)*101,offsets:Object.freeze(offsets)})));
export function randomRacePlan(){return Math.min(RACE_PLANS.length-1,Math.floor(Math.random()*RACE_PLANS.length))}
export const ARCADE_SCALE=1.9;
export const SUPPLIES=Object.freeze([{id:'can-340',s:340,lane:2},{id:'can-740',s:740,lane:1},{id:'can-1140',s:1140,lane:2}].map(Object.freeze));
export const TRACK=Object.freeze({length:400,radius:36,straight:(400-2*Math.PI*36)/2,laneWidth:1.45,lanes:4,start:100});
export const FIXED_DT=1/120;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function trackPoint(s,lane=0){
 const {length,radius:r,straight:l,laneWidth:w}=TRACK;let u=((s%length)+length)%length,x,z,tx,tz,curve=false;
 if(u<l){x=-l/2+u;z=-r;tx=1;tz=0}
 else if((u-=l)<Math.PI*r){const a=-Math.PI/2+u/r;x=l/2+r*Math.cos(a);z=r*Math.sin(a);tx=-Math.sin(a);tz=Math.cos(a);curve=true}
 else if((u-=Math.PI*r)<l){x=l/2-u;z=r;tx=-1;tz=0}
 else{u-=l;const a=Math.PI/2+u/r;x=-l/2+r*Math.cos(a);z=r*Math.sin(a);tx=-Math.sin(a);tz=Math.cos(a);curve=true}
 // Reflect the complete world, not only the map: infield is now runner-left.
 return{x:x+tz*lane*w,z:-(z-tx*lane*w),tx,tz:-tz,nx:tz,nz:tx,curve};
}
export function pathScale(s,lane){return trackPoint(s).curve?1+lane*TRACK.laneWidth/TRACK.radius:1}
function random(r){r.seed|=0;r.seed=r.seed+0x6D2B79F5|0;let t=Math.imul(r.seed^r.seed>>>15,1|r.seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
function runner(id){return{id,name:['你','爆衝阿火','穩穩阿青','尾速阿紫'][id],color:['#ed782e','#db5a5e','#258d7b','#9471bb'][id],s:0,v:0,lane:[1,0,2,3][id],targetLane:[1,0,2,3][id],energy:100,cadence:.48,lastStep:-10,lastLeg:-1,steps:0,started:false,reaction:null,held:{a:false,s:false,j:false,k:false},handChord:false,tucking:false,lean:0,wobble:0,slip:0,slipSeconds:0,laneChanges:0,blocked:0,finished:null,finishRaceTime:null,penalty:0,aiNext:.28+id*.06,aiLook:1.2,aiRecover:false,aiPassUntil:0,tactic:'就位',splits:[],lastSplit:0,pose:0,cansCollected:[],splash:0};}
export function createRace(planId=0){if(!Number.isInteger(planId)||!RACE_PLANS[planId])throw new RangeError('Unknown race plan');const plan=RACE_PLANS[planId];return{rules:RULES,planId,initialSeed:plan.seed,distance:1500,startStyle:'standing',seed:plan.seed,phase:'ready',time:0,clock:0,countdown:3.35,paused:false,falseStarts:0,accumulator:0,event:'站好，留一點力氣給最後一圈。',eventUntil:0,runners:[0,1,2,3].map(id=>{const p=runner(id);if(id)p.seed=id===1?plan.seed:150015+id*101;return p}),supplies:SUPPLIES,inputs:[]}}
export function startRace(r){if(r.phase!=='ready')return;r.phase='countdown';r.event='站姿就位。槍響後 A／S 交替邁步。';}
function announce(r,text,duration=2){r.event=text;r.eventUntil=r.time+duration}
export function cancelInput(r){for(const p of r.runners){for(const k of Object.keys(p.held))p.held[k]=false;p.handChord=false;p.tucking=false}}
export function requestLane(r,p,direction){
 if(p.finished!==null||r.phase!=='race')return false;
 const to=clamp(p.targetLane+direction,0,TRACK.lanes-1);
 if(to===p.targetLane||Math.abs(p.lane-p.targetLane)>.12){if(p.id===0)announce(r,'先站穩這一線，再找下一個空檔。',1.2);return false}
 const occupied=r.runners.some(q=>q!==p&&q.finished===null&&Math.abs(q.s-p.s)<1.9&&(Math.abs(q.lane-to)<.65||q.targetLane===to));
 if(occupied){p.blocked=.9;if(p.id===0)announce(r,'旁邊有人！先錯開，再切進去。');return false}
 p.targetLane=to;p.laneChanges++;p.energy=Math.max(0,p.energy-.38);if(p.id===0)announce(r,direction<0?'內線省路，但要留意前面的人。':'拉到外線，找機會超車。',1.4);return true;
}
export function input(r,key,down,id=0){
 const p=r.runners[id];if(!p||!(key in p.held)||r.paused||p.held[key]===down||p.finished!==null)return;
 p.held[key]=down;
 if(id===0)r.inputs.push([Math.round(r.clock*120),key,down?1:0]);
 if(r.phase!=='race'){
  if(r.phase==='countdown'&&down&&(key==='a'||key==='s')){r.falseStarts++;p.penalty+=1;announce(r,'搶跑！本場加 1 秒，等槍響再動腳。',3)}return;
 }
 if(key==='j'||key==='k'){
  if(down&&p.held.j&&p.held.k){p.handChord=true;p.tucking=true;return}
  if(!down){if(p.handChord){p.tucking=p.held.j&&p.held.k;if(!p.held.j&&!p.held.k)p.handChord=false}else requestLane(r,p,key==='j'?-1:1)}return;
 }
 if(!down)return;
 const side=key==='a'?0:1,gap=r.time-p.lastStep;
 if(!p.started){p.started=true;p.reaction=r.time;p.v=Math.max(p.v,1.6);p.cadence=.48;}
 if(gap<.12){p.energy=Math.max(0,p.energy-.35);p.wobble=Math.min(1,p.wobble+.14);if(id===0)announce(r,'腳比腦快了！放慢一點，交替踩。',1.5);return}
 const alternating=side!==p.lastLeg;
 if(!alternating){p.v*=.89;p.energy=Math.max(0,p.energy-1.1);p.wobble=Math.min(1,p.wobble+.35);if(id===0)announce(r,'同一隻腳加班了！換另一腳。',1.6)}
 else{if(gap<1.25)p.cadence=clamp(p.cadence*.25+gap*.75,.12,.85);else p.cadence=.58;p.wobble=Math.max(0,p.wobble-.16);p.energy=Math.max(0,p.energy-(.025+Math.max(0,.38-gap)*.6));}
 p.lastLeg=side;p.lastStep=r.time;p.steps++;p.pose+=Math.PI;
}
export function slipstream(r,p){
 if(r.time-p.lastStep>.85||p.v<2||!p.started)return 0;
 let best=0;for(const q of r.runners){const gap=q.s-p.s;if(q===p||q.finished!==null||gap<.95||gap>5||Math.abs(q.lane-p.lane)>.42)continue;best=Math.max(best,clamp(1-Math.abs(gap-2)/3.2,.12,1));}return best;
}
// Every rival obeys the same foot, energy, lane and collision rules as the player.
// Plans depend on distance and resources, never on the player's lead or finish time.
export function aiPlan(r,p){
 if(p.energy<23)p.aiRecover=true;
 if(p.energy>49)p.aiRecover=false;
 const offset=RACE_PLANS[r.planId].offsets[p.id-1],distance=p.s+offset;
 let interval=p.id===1?(distance<220?.33:distance<650?.395:distance<790?.34:distance<1180?.405:.34)
  :p.id===2?(distance<1080?.45:distance<1320?.43:.40)
  :(distance<850?.54:distance<1230?.50:.46);
 let tactic=interval<.36?'加速進攻':'巡航蓄力';
 if(p.aiRecover){interval=.59;tactic='慢跑回氣'}
 else if(r.time<p.aiPassUntil&&p.energy>35){interval=Math.min(interval,[0,.335,.405,.46][p.id]);tactic='外線超車'}
 else if(p.slip>.3&&p.s<1180&&p.energy<76){interval=Math.max(interval,.40);tactic='跟跑省力'}
 if(r.time<1)interval=.43;
 return{interval,tactic};
}
function ai(r,p){
 const plan=aiPlan(r,p);p.tactic=plan.tactic;
 if(r.time>=p.aiNext){const key=p.lastLeg===0?'s':'a';input(r,key,true,p.id);input(r,key,false,p.id);p.aiNext=r.time+plan.interval+(random(p)-.5)*.012;}
 if(r.time>=p.aiLook){
  p.aiLook=r.time+.48+random(p)*.18;
  const can=nextSupply(r,p),wantCan=can&&can.s-p.s<48&&p.energy<74;
  const ahead=r.runners.filter(q=>q!==p&&q.finished===null&&q.s>p.s&&q.s-p.s<6&&Math.abs(q.lane-p.lane)<.48).sort((a,b)=>a.s-b.s)[0];
  if(wantCan&&p.targetLane!==can.lane)requestLane(r,p,p.targetLane<can.lane?1:-1);
  else if(ahead){
   // Hold a useful wake until a scheduled attack or a slower leader closes the gap.
   const desired=Math.min(clamp(4.6+(1/plan.interval-1.6)*1.9,3.4,10.7),p.energy<22?4.2+p.energy/22*3.1:7.3)*ARCADE_SCALE;
   const pass=!p.aiRecover&&(plan.interval<.36||(p.blocked>.1&&desired>ahead.v+.8)||ahead.energy<20);
   if(pass&&ahead.s-p.s<2.4){if(requestLane(r,p,1)||requestLane(r,p,-1))p.aiPassUntil=r.time+3.2+RACE_PLANS[r.planId].offsets[p.id-1]/90;}
  }else if(p.targetLane>0&&!wantCan){
   // Rejoin the shortest line only with room behind: no last-moment blocking cut-ins.
   const clear=r.runners.every(q=>q===p||q.finished!==null||Math.abs(q.lane-(p.targetLane-1))>.65||Math.abs(q.s-p.s)>3.2);
   if(clear)requestLane(r,p,-1);
  }
 }
 p.tucking=p.s>=1490;
}
export function chest(p){return p.s+p.lean*.42}
function tick(r,dt){
 r.clock+=dt;
 if(r.phase==='ready')return;
 if(r.phase==='countdown'){r.countdown-=dt;if(r.countdown<=0){r.phase='race';r.time=0;cancelInput(r);announce(r,'砰！A／S 交替，先找到舒服的節奏。',3)}return}
 if(r.phase==='done')return;r.time+=dt;
 for(const p of r.runners)if(p.id&&p.finished===null)ai(r,p);
 const before=r.runners.map(p=>({s:p.s,chest:chest(p),lane:p.lane}));
 for(const p of r.runners){
  if(p.finished!==null){p.v*=Math.exp(-1.2*dt);p.s+=p.v*dt;continue}
  p.splash=Math.max(0,p.splash-dt);p.wobble=Math.max(0,p.wobble-dt*.4);p.blocked=Math.max(0,p.blocked-dt);p.lean+=(Number(p.tucking)-p.lean)*Math.min(1,dt*12);
  const previousLane=p.lane;p.lane+=clamp(p.targetLane-p.lane,-dt*1.8,dt*1.8);
  const recent=r.time-p.lastStep;
  if(!p.started){p.energy=clamp(p.energy+2.6*dt,0,100);continue;}
  p.slip=slipstream(r,p);p.slipSeconds+=p.slip*dt;
  const frequency=1/Math.max(.12,p.cadence);
  let target=clamp(4.6+(frequency-1.6)*1.9,3.4,10.7);
  const attack=clamp((frequency-2.3)/.75,0,1);
  if(recent>.82)target*=Math.exp(-(recent-.82)*2.6);
  const cap=p.energy<22?4.2+p.energy/22*3.1:7.3;
  target=Math.min(target,cap)*(1+p.slip*.055)*(1-p.wobble*.15);
  target*=ARCADE_SCALE;
  if(p.tucking&&p.s<1490)target*=.72;
  p.v+=(target-p.v)*Math.min(1,dt*(target>p.v?.9:1.7));
  const cost=recent<.85?(.32+attack*attack*1.45+clamp((.325-p.cadence)*6,0,.8))*(1-p.slip*.45):0;
  const recovery=recent>=1.1?2.6:recent<.85&&p.cadence>=.51?2.4:0;
  p.energy=clamp(p.energy+(recovery-cost)*dt,0,100);
  const lateral=(p.lane-previousLane)*TRACK.laneWidth/dt;
  let ds=Math.sqrt(Math.max(p.v*p.v-lateral*lateral,p.v*p.v*.45))*dt/pathScale(TRACK.start+p.s,p.lane);
  for(const q of r.runners){if(q===p||q.finished!==null||Math.abs(q.lane-p.lane)>.48)continue;const gap=before[q.id].s-before[p.id].s;if(gap>0&&gap<1.02+ds){ds=Math.max(0,gap-.98);p.v=Math.min(p.v,q.v);p.blocked=.25;}}
  p.s+=ds;
  for(const can of r.supplies){if(!p.cansCollected.includes(can.id)&&before[p.id].s<=can.s&&p.s>=can.s){const alpha=(can.s-before[p.id].s)/(ds||1),lane=previousLane+(p.lane-previousLane)*alpha;if(Math.abs(lane-can.lane)<=.42){p.cansCollected.push(can.id);p.energy=clamp(p.energy+22,0,100);p.splash=1.6;if(p.id===0)announce(r,'補給 +22！喝進去一半，另一半在臉上。',2.4)}}}
  const segment=Math.floor(Math.min(p.s,1499.999)/300);
  if(segment>p.lastSplit){p.splits.push({distance:segment*300,time:r.time});p.lastSplit=segment}
  if(chest(p)>=1500){const part=clamp((1500-before[p.id].chest)/(chest(p)-before[p.id].chest||1),0,1);p.finishRaceTime=r.time-dt+part*dt;p.finished=p.finishRaceTime+p.penalty;p.splits.push({distance:1500,time:p.finishRaceTime});if(p.id===0){announce(r,'到線！四肢終於達成共識。',10);cancelInput(r)}}
 }
 if(r.runners.every(p=>p.finished!==null))r.phase='done';
}
export function step(r,dt){if(r.paused||!Number.isFinite(dt)||dt<=0)return;r.accumulator+=dt;while(r.accumulator+1e-10>=FIXED_DT){tick(r,FIXED_DT);r.accumulator=Math.max(0,r.accumulator-FIXED_DT)}}
export function standings(r){return [...r.runners].sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity)||b.s-a.s)}
export function resultOf(r){const p=r.runners[0];if(p.finished===null)return null;return{game:'1500m',rules:RULES,mode:'local-prototype',timeBasis:'actual-game-seconds',courseDistance:1500,arcadeScale:ARCADE_SCALE,cansCollected:p.cansCollected.length,seed:r.initialSeed,planId:r.planId,status:'done',time:Math.round(p.finished*100)/100,elapsed:Math.round(p.finishRaceTime*1000)/1000,penalty:p.penalty,steps:p.steps,energy:Math.round(p.energy),slipSeconds:Math.round(p.slipSeconds),laneChanges:p.laneChanges,splits:p.splits.map(x=>({...x})),points:null};}
export function displayDistance(p){return p.finished!==null?1500:Math.min(1500,Math.max(0,p.s))}

export function finalRank(r,p){const score=Math.round(p.finished*100);return 1+r.runners.filter(q=>q!==p&&q.finished!==null&&Math.round(q.finished*100)<score).length}

export function nextSupply(r,p=r.runners[0]){return r.supplies.find(can=>can.s>=p.s&&!p.cansCollected.includes(can.id))??null}
