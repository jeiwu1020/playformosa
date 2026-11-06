// Independent deterministic simulation. Units match the 100 m prototype (metres, seconds).
export const RULES_VERSION='400m-prototype-v3';
export const FIXED_DT=1/120;
export const BANK_SAFE=.15;
export const RHYTHM=Object.freeze({center:.68,halfWidth:.12});
const RHYTHM_START=RHYTHM.center-RHYTHM.halfWidth,RHYTHM_END=RHYTHM.center+RHYTHM.halfWidth;
function rhythmPosition(gap,interval){
 const position=gap/interval*RHYTHM.center;
 // Snap only floating-point edge noise (less than 0.1 ns of a step).
 return Math.abs(position-RHYTHM_START)<=1e-10?RHYTHM_START:Math.abs(position-RHYTHM_END)<=1e-10?RHYTHM_END:position;
}
function rhythmRating(position){return position<RHYTHM_START?'early':position>RHYTHM_END?'late':'perfect';}
export function rhythmPlan(distance){
 if(distance<20)return{stage:'start',label:'起跑加速',interval:.27};
 if(distance<40)return{stage:'settle',label:'放穩步伐',interval:.27+(.46-.27)*(distance-20)/20};
 if(distance<290)return{stage:'cruise',label:'中段巡航',interval:.46};
 if(distance<310)return{stage:'build',label:'準備衝刺',interval:.46-(.46-.29)*(distance-290)/20};
 return{stage:'finish',label:'最後衝刺',interval:.29};
}
function setBeat(r){const plan=rhythmPlan(r.distance);r.beatTarget=plan.interval;r.beatStage=plan.stage;r.beatLabel=plan.label;}
export const TRACK=Object.freeze({length:400,straight:100,radius:200/(Math.PI*2),laneWidth:2.2});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const laneLength=lane=>200+2*Math.PI*(TRACK.radius+lane*TRACK.laneWidth);
export function trackPoint(distance,lane=0){
 const radius=TRACK.radius+lane*TRACK.laneWidth,total=laneLength(lane),half=Math.PI*radius;
 let s=((distance+total-400)%total+total)%total;
 if(s<half){const a=Math.PI/2-s/radius;return{x:50+radius*Math.cos(a),z:radius*Math.sin(a),tx:Math.sin(a),tz:-Math.cos(a),curve:true,radius};}
 s-=half;if(s<100)return{x:50-s,z:-radius,tx:-1,tz:0,curve:false,radius};
 s-=100;if(s<half){const a=-Math.PI/2-s/radius;return{x:-50+radius*Math.cos(a),z:radius*Math.sin(a),tx:Math.sin(a),tz:-Math.cos(a),curve:true,radius};}
 s-=half;return{x:-50+s,z:radius,tx:1,tz:0,curve:false,radius};
}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function createRace(seed=42400){const random=rng(seed);return{seed,random,phase:'ready',time:0,clock:0,readyFor:0,wait:1.3+random()*1.1,paused:false,falseStarts:0,event:'按住 A＋S 蹲好，等槍響再放開。',runners:['你','爆衝阿火','穩穩阿青','後追阿紫'].map((name,id)=>({id,name,lane:[1,0,2,3][id],color:['#ed782e','#e15759','#299c91','#8a73bd'][id],distance:0,v:0,bank:0,imbalance:0,stamina:100,effort:0,cadence:0,beatTarget:.27,beatStage:'start',beatLabel:'起跑加速',stepRating:null,stepQuality:1,perfectSteps:0,lean:0,fall:0,falls:0,steps:0,started:false,reaction:null,finished:null,lastLeg:-1,lastStep:-9,lastArm:-9,armSide:-1,held:[false,false,false,false],splits:[],nextStep:.18+random()*.15,aiSide:0,aiBankAt:0,runout:0}))};}
export function clearInputs(race){for(const r of race.runners)r.held.fill(false);if(race.phase==='ready'||race.phase==='set'){race.phase='ready';race.readyFor=0;race.event='按住 A＋S 蹲好，等槍響再放開。';}}
export function input(race,id,limb,down){
 const r=race.runners[id];if(!r||race.paused||r.finished!==null||r.held[limb]===down)return;
 r.held[limb]=down;
 if(id===0&&race.phase==='set'&&limb>=2&&!down){race.phase='ready';race.readyFor=0;race.falseStarts++;r.held.fill(false);race.event='搶跑！還沒開飯，先蹲回去。';return;}
 if(race.phase!=='race')return;
 if(!r.started&&limb>=2&&!down){r.started=true;r.reaction=race.time;r.lastStep=race.time;setBeat(r);r.v=1.7;if(id===0)race.event='出發！A／S 交替，J／K 調整傾斜。';return;}
 if(!r.started||!down||r.fall>0)return;
 if(limb<2){r.lastArm=race.time;r.armSide=limb;if(!(r.held[0]&&r.held[1]))r.bank=clamp(r.bank+(limb===0?.09:-.09),-1.2,1.2);return;}
 const gap=race.time-r.lastStep;if(gap<.105)return; // browser repeat / over-fast tapping cannot manufacture propulsion
 const side=limb-2;
 if(side===r.lastLeg){r.stepRating='wrong';r.stepQuality=.2;r.v*=.9;r.imbalance=clamp(r.imbalance+.19,0,1.5);if(id===0)race.event='同一腳踩太多次了！左右交替。';}
 else{
  const frequency=1/Math.max(.13,gap);r.cadence=r.cadence*.55+frequency*.45;
  const ratio=gap/r.beatTarget,error=Math.abs(ratio-1),tolerance=RHYTHM.halfWidth/RHYTHM.center;
  r.stepRating=rhythmRating(rhythmPosition(gap,r.beatTarget));
  r.stepQuality=r.stepRating==='perfect'?1:clamp(1-Math.max(0,error-tolerance)*1.7,.28,1);
  if(r.stepRating==='perfect')r.perfectSteps++;
  const baseEffort=r.beatStage==='cruise'?.5:.68;
  r.effort=clamp(baseEffort+Math.max(0,1/Math.max(.18,ratio)-1)*1.1,0,1.8);
  // Mistiming still gives propulsion, but rapid off-beat taps cannot multiply a full stride.
  const earnedStride=(2.15+1.8*clamp(gap-.32,0,.4))*r.stepQuality*Math.min(1,ratio);
  const stride=Math.max(earnedStride,3.6*Math.min(gap,.75)*(.75+.25*r.stepQuality)+.15);
  r.v=Math.min(10.7,r.v+stride*(.75+.25*Math.pow(r.stamina/100,.4)));
  r.steps++;
 }
 r.lastLeg=side;r.lastStep=race.time;setBeat(r);
}
export function targetBank(r){const p=trackPoint(r.distance,r.lane);return p.curve?Math.atan(r.v*r.v/(9.81*p.radius)):0;}
function fall(r){r.fall=1.25;r.falls++;r.v*=.25;r.imbalance=.22;r.bank=.05;r.stamina=Math.max(0,r.stamina-3);}
function ai(race,r){
 if(!r.started&&race.time>=r.nextStep){r.held[2]=true;input(race,r.id,2,false);r.nextStep=race.time+.3;}
 if(!r.started)return;
 if(race.time>=r.nextStep){let gap=r.beatTarget*(r.id===1?.96:r.id===2?1.02:r.distance<290?1.08:.98);
  if(r.stamina<20)gap*=1.08;
  const bad=race.random()<(r.id===1?.035:.008),side=bad&&r.lastLeg>=0?r.lastLeg:r.aiSide;
  input(race,r.id,2+side,true);input(race,r.id,2+side,false);r.aiSide=1-side;r.nextStep=race.time+gap+(race.random()-.5)*.016;
 }
 if(race.time>=r.aiBankAt){const delta=targetBank(r)-r.bank;if(Math.abs(delta)>.055){const key=delta>0?0:1;input(race,r.id,key,true);input(race,r.id,key,false);}r.aiBankAt=race.time+(r.id===1?.48:.3);}
 if(r.distance>398.8){r.held[0]=true;r.held[1]=true;}
}
function recordCrossing(race,r,previousDistance,previousChest,previousTime,dt){
 const chest=r.distance+r.lean*.48;
 for(let split=(r.splits.length+1)*100;split<=Math.min(r.distance,300);split+=100)r.splits.push(previousTime+dt*clamp((split-previousDistance)/Math.max(.00001,r.distance-previousDistance),0,1));
 if(chest>=400){r.finished=previousTime+dt*clamp((400-previousChest)/Math.max(.00001,chest-previousChest),0,1);r.distance=400;r.v=0;r.splits.push(r.finished);if(r.id===0)race.event='胸口先到了，腿還在跟人生談判。';}
}
export function step(race,dt){
 if(race.paused)return;dt=clamp(dt,0,.05);race.clock+=dt;
 if(race.phase==='done'){for(const r of race.runners)r.runout+=dt;return;}
 const player=race.runners[0];
 if(race.phase==='ready'){if(player.held[2]&&player.held[3]){race.readyFor+=dt;if(race.readyFor>=.35){race.phase='set';race.readyFor=0;race.event='預備…聽槍響，不是看別人的腳！';}}else race.readyFor=0;return;}
 if(race.phase==='set'){race.readyFor+=dt;if(race.readyFor>=race.wait){race.phase='race';race.time=0;race.event='砰！放開一腳，出發！';}return;}
 const previousTime=race.time;race.time+=dt;
 for(const r of race.runners){
  if(r.finished!==null){r.runout+=dt;continue;}
  if(r.id)ai(race,r);if(!r.started)continue;
  const previousDistance=r.distance,before=r.distance+r.lean*.48;
  if(r.fall>0){r.fall=Math.max(0,r.fall-dt);r.v*=Math.exp(-7*dt);r.distance+=r.v*dt;recordCrossing(race,r,previousDistance,before,previousTime,dt);if(!r.fall){r.lastStep=race.time;r.lastLeg=-1;r.stepRating=null;setBeat(r);if(r.id===0&&r.finished===null)race.event='四肢重新連線，跟著綠區繼續跑！';}continue;}
  const sinceStep=race.time-r.lastStep;if(sinceStep>.75){r.effort*=Math.exp(-3*dt);r.cadence*=Math.exp(-3*dt);}
  const leaning=r.held[0]&&r.held[1];r.lean+=(Number(leaning)-r.lean)*Math.min(1,dt*12);
  const pos=trackPoint(r.distance,r.lane),desired=targetBank(r);
  r.bank-=pos.curve?r.v*r.v/pos.radius*.008*dt:r.bank*.5*dt;
  const miss=Math.abs(r.bank-desired),safe=BANK_SAFE;
  r.imbalance=clamp(r.imbalance+(miss>safe?(miss-safe)*1.45:-.6)*dt,0,1.5);
  if(Math.abs(r.bank)>.86||r.imbalance>=1){fall(r);if(r.id===0)race.event='腳說向前，身體說先躺一下。';continue;}
  const load=.35+1.1*r.effort*r.effort+7*Math.pow(Math.max(0,r.effort-.72),2);
  r.stamina=clamp(r.stamina+(r.v<1?.7:r.effort<.45?.2:-load)*dt,0,100);
  const cap=(5.2+5.5*Math.pow(r.stamina/100,.38))*(.55+.45*r.stepQuality);
  const drag=2.8+r.v*.06+(leaning?2.4:0)+Math.max(0,miss-BANK_SAFE)*2.3+(r.imbalance>.55?.7:0);
  r.v=Math.max(0,Math.min(cap,r.v-drag*dt));r.distance+=r.v*dt;
  recordCrossing(race,r,previousDistance,before,previousTime,dt);
 }
 if(race.runners.every(r=>r.finished!==null)||(player.finished!==null&&race.time>player.finished+20)){race.phase='done';}
}
export function standings(race){return [...race.runners].sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity)||b.distance-a.distance);}
export function addRecord(previous,item){
 const valid=x=>x&&x.event==='400m'&&x.rulesVersion===RULES_VERSION&&x.valid===true&&Number.isFinite(x.seconds)&&x.seconds>=30&&x.seconds<3600;
 const clean=(Array.isArray(previous)?previous:[]).filter(valid);if(valid(item))clean.push({...item,verification:'local-unverified',scoringVersion:null,decathlonSession:null});return clean.sort((a,b)=>a.seconds-b.seconds).slice(0,10);
}

// The visual interval and scoring use the same fixed green-window constants.
export function guidance(race){
 const p=race.runners[0],age=Math.max(0,race.time-p.lastStep),bandStart=RHYTHM_START,bandEnd=RHYTHM_END;
 const base={bandStart,bandEnd,phase:p.beatLabel,interval:p.beatTarget};
 if(race.phase!=='race'||!p.started||p.finished!==null||p.fall>0)return{...base,nextFoot:'',rhythm:p.fall>0?'起身後再踩':'準備',tone:'ready',beat:0,hands:p.fall>0?'放鬆，會自動起身':'J／K 短按微調'};
 const position=rhythmPosition(age,p.beatTarget),beat=clamp(position,0,1),late=rhythmRating(position)==='late';
 const rating=late?'late':p.stepRating;
 const rhythm=rating==='perfect'?'剛才踩準！':rating==='early'?'剛才太早':rating==='late'?(late?'太晚，快換腳':'剛才太晚'):rating==='wrong'?'要換另一腳':'跟著綠區';
 const delta=targetBank(p)-p.bank;
 return{...base,nextFoot:p.lastLeg===0?'S':p.lastLeg===1?'A':'A／S',rhythm,tone:rating==='perfect'?'good':rating==='early'?'fast':rating==='late'||rating==='wrong'?'slow':'ready',beat,hands:p.distance>399?'J＋K 同按，胸口壓線！':Math.abs(delta)<=BANK_SAFE?'穩住了，雙手先放開':delta>0?'點 J，向左扶回綠區':'點 K，向右扶回綠區'};
}
