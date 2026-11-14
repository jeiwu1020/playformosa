import {SHORT_LOOP,SHORT_LENGTH,shortEntry,shortPoint,shortLoopExit,freshMailChoice,advanceMailChoice,MAIL_BRANCHES,branchPoint} from './office-routes.js';
import {LOTTERY_BOX} from './lottery-layout.js';
import {createLotteryState,advanceLottery,hitLottery,leaveLottery,hitLotteryEquipment,endLottery,lotteryEffects,LOTTERY_PROMPT_RULES} from './lottery-events.js';
import {createOvertimeState,onOvertimeWord,onOvertimeWork,onOvertimeWorkStart,onOvertimeSave,onOvertimeShadowHit,advanceOvertime,settleOvertime} from './overtime-events.js';
import {createShadowState,spawnShadowWorkers,stepShadowWorkers,clearShadowWorkers} from './shadow-workers.js';
import {freshRound,freshBoss,updateRound,updateBoss,patrolContact,kickByPatrol,startReentry,updateReentry} from './round-rules.js';
import {CENTRAL,freshCentral,updateCentral,centralContact} from './central-launch.js';
import {LAYOUT} from './route-layout.js';
import {freshCombos,startCombo,updateCombo,comboContact,comboWork,comboSave,comboTarget} from './combo-routes.js';
import {freshAssists,updateAssists,retractAssists,assistColliders,firstAssistContact,ASSIST_OBSTACLES,resolveAssist} from './assist-machines.js';
import {freshRouteRewards,updateRouteRewards,collectRouteRewards} from './route-rewards.js';
import {MAIL,MAIL_LENGTH,mailEntry,mailPoint,mailPhase,WORKFLOW,freshWorkflow,freshMailLatch,lockMailExit,advanceMailLatch} from './mail-run.js';
import {WINDOWS,LAMPS,BONUS,SOLID_PROPS,segmentDistance} from './board-features.js';
import {setupInteraction,advanceInteraction,cancelInteractionInput,launchVelocity,releasePosition} from './interactions.js';
import {activityFor,dockFor} from './activities.js';
import {stationShapes,firstStationContact,dockingPoint,planApproach,clearStationSegment} from './contact.js';
// Fixed 120 Hz physics with contact-triggered, bounded equipment interactions.
export const STEP=1/120;
export const FIELD={halfWidth:18,top:-20,door:46.5,drain:50,gravity:6};
export const FLIPPER={length:9.2,pivotX:11.8,pivotZ:43,radius:.4};
export const INTERACTION_RULES={rearmDistance:2,clearance:.7,offerSeconds:1.35,offerDistance:18};
export {LOTTERY_PROMPT_RULES};
export const BUMPERS=[
 {id:'shredder',type:'shredder',...LAYOUT.shredder,power:20,points:45,label:'薪水保衛戰',joke:'碎紙機：薪水薄到像張紙！'},
 {id:'server',type:'server',...LAYOUT.server,power:20,points:45,label:'全公司重開機',joke:'工程師：你有試過關掉重開嗎？'},
 {id:'boss',type:'boss',...LAYOUT.boss,power:18,points:35,label:'老闆飛踢',joke:'公司送你一程！'},
 {id:'copier',type:'copier',...LAYOUT.copier,power:15,points:30,label:'影印暴擊',joke:'影印 99 份，你是第 100 份！'},
 {id:'water',type:'water',...LAYOUT.water,power:16,points:25,label:'水逆退散',joke:'補充水分，也補充動能！'},
 {id:'water2',theme:'microwave',activity:'microwave',type:'water',...LAYOUT.water2,power:16,points:25,label:'便當爆熱',joke:'便當升溫，比薪水還快！'},
 {id:'desk',type:'desk',...LAYOUT.desk,power:15,points:25,label:'會議彈射',joke:'這個會議，先把你彈出去！'},
 {id:'chair',type:'chair',...LAYOUT.chair,power:15,points:20,label:'旋轉椅漂移',joke:'轉職？先轉三圈！'},
 {id:'chair2',theme:'parcel',activity:'parcel',type:'chair',...LAYOUT.chair2,power:15,points:20,label:'本人寄件',joke:'收件人：明天的自己！'},
 {id:'desk2',type:'desk',...LAYOUT.desk2,power:14,points:25,label:'最後一份報表',joke:'快下班了？再改一版！'},
 {id:'desk3',theme:'clock',activity:'clock',type:'desk',...LAYOUT.desk3,power:14,points:25,label:'打卡三連',joke:'人可以走，工時留下！'},
 {id:'launcher',type:'launcher',...LAYOUT.launcher,power:0,points:0,label:'升職分流台',joke:'先選部門，再被彈走！'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function flipperSegment(side,amount){const sign=side==='left'?1:-1,angle=.23-amount*.83,x=-sign*FLIPPER.pivotX,z=FLIPPER.pivotZ,len=FLIPPER.length;return {ax:x,az:z,bx:x+sign*Math.cos(angle)*len,bz:z+Math.sin(angle)*len};}
export function closestPoint(x,z,s){const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((x-s.ax)*dx+(z-s.az)*dz)/(dx*dx+dz*dz),0,1);return {x:s.ax+t*dx,z:s.az+t*dz,t};}
export class Game{
 constructor({view='reverse',random=null,roundLimit=0,patrol=true}={}){this.view=view;this.random=random;this.roundLimit=roundLimit;this.patrolEnabled=patrol;this.reset();}
 reset(){this.round=freshRound(this.roundLimit);this.bossPatrol=freshBoss();this.central=freshCentral();this.comboRoutes=freshCombos();this.assists=freshAssists();this.ball={x:0,z:-11.3,vx:0,vz:0,r:.65};this.time=0;this.playClock=0;this.overtime=createOvertimeState();this.lottery=createLotteryState();this.lotteryEnabled=true;this.lotteryContact=0;this.shadowWorkers=createShadowState();this.overtimeEnabled=true;this.shadowPreviousFlippers={left:0,right:0};this.shadowStepClock=0;this.simTime=0;this.bonus=0;this.income={equipment:0,work:0,rescue:0,route:0,lights:0,clones:0,jackpot:0};this.hits=0;this.saves=0;this.combo=0;this.lastHit=-99;this.state='ready';this.events=[];this.cooldowns={};this.flippers={left:0,right:0};this.flipperPulse={left:0,right:0};this.flipperStroke={left:0,right:0};this.previous={left:false,right:false};this.opportunity=null;this.arming=null;this.interaction=null;this.interactionsEnabled=true;this.offerSequence=0;this.entryHeld={left:false,right:false};this.interactionNotice=null;this.offerSpent=new Set();this.contactEpisodes=new Map();this.stationContactTrace=new Map();this.loopDeflectionSign=1;this.releaseError=null;this.tapQueue=[];this.pendingTap=null;this.interactionReady=0;this.stationReady={};this.specialReady=0;this.completedActivities=0;this.hop=0;this.chairBoost={remaining:0,peak:38};this.effect=null;this.timeScale=1;this.effectTime=0;this.lamps=LAMPS.map(()=>false);this.lampInside=LAMPS.map(()=>false);this.bonusUntil=0;this.bonusReady=0;this.windowReady={};this.mailRun=null;this.shortRun=null;this.shortLatch=false;this.mailReady=0;this.mailLatch=freshMailLatch();this.mailTrips=0;this.workflow=freshWorkflow();this.routeRewards=freshRouteRewards();this.lotteryPrompt=null;this.shortLoopTrips=0;}
 start(){this.reset();this.state='playing';const sample=this.random?.(),r=Number.isFinite(sample)?clamp(sample,0,1):null,band=r===null?null:Math.min(2,Math.floor(r*3)),t=r===null?0:r*3-band;this.ball.vx=band===0?-17+t*4:band===1?-5+t*10:band===2?13+t*4:-3.9;this.ball.vz=22;this.emit('kick');}
 get gateRemaining(){return Math.max(0,this.bonusUntil-this.effectTime,this.lotteryEnabled&&lotteryEffects(this.lottery,this.playClock).gateClosed?this.lottery.until-this.playClock:0);}
 get gateClosed(){return this.gateRemaining>0;}
 get lotteryObstacles(){return this.lotteryEnabled?[LOTTERY_BOX]:[];}
 applyLottery(commands){for(const c of commands){if(c.type==='lotteryChain')this.award('equipment',c.points);this.emit(c.type,c);}}
 get score(){return Math.floor(this.time*12)+this.bonus;}
 award(category,points){if(!Number.isFinite(points)||points<0)return;this.bonus+=points;this.income[category]=(this.income[category]||0)+points;}
 get payroll(){const rows={base:Math.floor(this.time*12),...this.income};const extra=this.bonus-Object.values(this.income).reduce((a,b)=>a+b,0);if(extra)rows.other=extra;return rows;}
 emit(type,data={}){this.events.push({...data,type});}
 drainEvents(){const e=this.events;this.events=[];return e;}
 cancelInput(){this.opportunity=null;if(this.central){this.central.armed=null;this.central.remaining=0;}cancelInteractionInput(this.interaction);this.tapQueue=[];this.pendingTap=null;this.previous={left:false,right:false};}
 tapFlipper(side){if(this.round.reentry||this.round.ending||this.entryHeld[side])return;if(side in this.flipperPulse){if(!this.interaction&&!this.mailRun&&!this.shortRun&&!this.lotteryPrompt){this.flipperPulse[side]=.1;this.flipperStroke[side]=.18;}this.tapQueue.push({side,offerId:this.opportunity?.id,at:this.time});}}
 releaseFlipper(side){if(side in this.entryHeld)this.entryHeld[side]=false;}
 getInteractionOffer(){
  const p=this.opportunity;
  if(!p||(p.stationId==='boss'&&this.bossPatrol.phase==='patrol')||this.state!=='playing'||!this.interactionsEnabled||this.interaction||this.mailRun||this.shortRun||this.round.ending||this.round.reentry||this.ball.z>=34||this.playClock>=p.expiresAt||Math.hypot(this.ball.x-p.x,this.ball.z-p.z)>INTERACTION_RULES.offerDistance){this.opportunity=null;return null;}
  return {id:p.id,stationId:p.stationId,label:p.label,duration:INTERACTION_RULES.offerSeconds,remaining:Math.max(0,p.expiresAt-this.playClock)};
 }
 requestInteraction(offerId){
  const visible=this.getInteractionOffer(),p=this.opportunity;
  if(!visible||(offerId!==undefined&&offerId!==visible.id))return false;
  this.opportunity=null;
  const o=BUMPERS.find(o=>o.id===p.stationId),episode=this.contactEpisodes.get(o.id);
  this.offerSpent.delete(o.id);
  const started=this.startInteraction(o,p.side,true);
  if(!started){this.offerSpent.add(o.id);if(episode)this.contactEpisodes.set(o.id,episode);this.interactionNotice={text:'路線受阻，碰設備再試',until:this.playClock+.85};}
  return started;
 }
 offerInteraction(o){
  if(this.getInteractionOffer())return;
  this.opportunity={id:++this.offerSequence,stationId:o.id,label:o.label,side:this.ball.x<o.x?'left':'right',x:this.ball.x,z:this.ball.z,expiresAt:this.playClock+INTERACTION_RULES.offerSeconds};
  this.emit('opportunity',{stationId:o.id,label:o.label});
 }
 shadowWorld(){return {...FIELD,stations:BUMPERS.filter(o=>o.type!=='launcher'&&(o.type!=='boss'||this.bossPatrol.phase!=='patrol')),props:[...SOLID_PROPS,...this.lotteryObstacles],rails:[-1,1].map(sign=>({ax:sign*17.7,az:34,bx:sign*11.8,bz:43,r:.35})),gateClosed:this.gateClosed};}
 applyOvertime(commands){
  if(!this.overtimeEnabled)return;
  for(const command of commands){
   if(command.type==='award'){this.award(command.category,command.points);this.emit('overtimeAward',{category:command.category,points:command.points,provisional:command.provisional});}
   else if(command.type==='spawnShadows'){spawnShadowWorkers(this.shadowWorkers,{now:this.playClock,duration:command.duration,count:command.count,origin:this.ball,velocity:this.ball,view:this.view,world:this.shadowWorld()});this.shadowStepClock=this.playClock;}
   else if(command.type==='clearShadows')clearShadowWorkers(this.shadowWorkers);
   else {if(command.type==='overtimeChanged')this.lamps=LAMPS.map(p=>!!this.overtime.words[p.id]);this.emit(command.type,command);}
  }
 }
 advancePlayClock(dt){this.playClock+=dt;updateBoss(this,dt);if(this.lotteryEnabled)this.applyLottery(advanceLottery(this.lottery,{now:this.playClock}));}
 finishPlayableStep(dt){
  if(this.state!=='playing'||this.round.ending||!this.overtimeEnabled||this.overtime.settled)return;
  const flippers=Object.fromEntries(['left','right'].map(side=>[side,{...flipperSegment(side,this.flippers[side]),side,r:.4,previous:flipperSegment(side,this.shadowPreviousFlippers[side]),rising:this.flippers[side]>this.shadowPreviousFlippers[side]}]));
  const shadowDt=Math.min(dt,Math.max(0,this.playClock-this.shadowStepClock));this.shadowStepClock=this.playClock;
  for(const event of stepShadowWorkers(this.shadowWorkers,{dt:shadowDt,now:this.playClock,world:this.shadowWorld(),flippers,view:this.view})){
   if(event.type==='shadowHit')this.applyOvertime(onOvertimeShadowHit(this.overtime,{now:this.playClock,points:event.points}));
   this.emit(event.type,event);
  }
  this.shadowPreviousFlippers={...this.flippers};
  this.applyOvertime(advanceOvertime(this.overtime,{now:this.playClock,canStart:!this.interaction&&!this.mailRun&&!this.shortRun&&!this.lotteryPrompt&&!this.round.reentry&&!this.round.ending,shadowCount:this.shadowWorkers.workers.length}));
 }
 endOvertime(reason='roundEnd'){
  this.applyLottery(endLottery(this.lottery));this.bonusUntil=0;
  const commands=settleOvertime(this.overtime,{now:this.playClock,reason:'roundEnd'});
  this.applyOvertime(reason==='error'?commands.filter(c=>c.type==='clearShadows'||c.type==='overtimeChanged'):commands);
  clearShadowWorkers(this.shadowWorkers);
 }
 spendContact(o){this.offerSpent.add(o.id);this.contactEpisodes.set(o.id,{station:o,travel:0});}
 refreshContactArming(from,to){
  // Called only for the integrated free-physics segment, never docking, mail or teleport motion.
  if(!from||!to)return;
  const distance=Math.hypot(to.x-from.x,to.z-from.z);if(!Number.isFinite(distance))return;
  for(const [id,episode]of this.contactEpisodes){
   if(id==='launcher'){if(Math.hypot(to.x-CENTRAL.x,to.z-CENTRAL.z)>CENTRAL.proximity+this.ball.r+.1){this.offerSpent.delete(id);this.contactEpisodes.delete(id);}continue;}
   if(clearStationSegment(from,to,episode.station,this.view,this.ball.r,INTERACTION_RULES.clearance))episode.travel+=distance;else episode.travel=0;
   if(episode.travel>=INTERACTION_RULES.rearmDistance){this.offerSpent.delete(id);this.contactEpisodes.delete(id);}
  }
 }
 repeatedStationContact(o,contact){
  if(!BUMPERS.includes(o)||o.type==='launcher')return false;
  const b=this.ball,now=this.time,previous=this.stationContactTrace.get(o.id),current={x:contact.x,z:contact.z,vx:b.vx,vz:b.vz,time:now};
  this.stationContactTrace.set(o.id,current);
  if(!previous)return false;
  const elapsed=now-previous.time;
  return elapsed>=3&&elapsed<=20&&Math.hypot(contact.x-previous.x,contact.z-previous.z)<=1.25&&Math.hypot(b.vx-previous.vx,b.vz-previous.vz)<=5;
 }
 startLotteryPrompt(contact,held={}){
  if(this.lotteryPrompt||this.lottery.inside||this.lottery.phase!=='ready')return false;
  const b=this.ball,{nx,nz}=contact;let vx=b.vx,vz=b.vz;const vn=vx*nx+vz*nz;
  if(vn<0){vx-=1.8*vn*nx;vz-=1.8*vn*nz;}
  b.x=contact.x+nx*.002;b.z=contact.z+nz*.002;b.vx=b.vz=0;
  this.lotteryPrompt={from:{x:b.x,z:b.z},dock:{x:LOTTERY_BOX.x,z:LOTTERY_BOX.z},zoomRemaining:LOTTERY_PROMPT_RULES.zoom,ready:false,remaining:LOTTERY_PROMPT_RULES.choice,confirmed:false,release:{vx,vz}};
  this.cancelInput();this.entryHeld={left:!!held.left,right:!!held.right};this.flipperStroke={left:0,right:0};this.flipperPulse={left:0,right:0};this.hop=0;
  this.emit('lotteryPromptStart',{duration:LOTTERY_PROMPT_RULES.choice});return true;
 }
 startLotteryDraw(held={}){
  const prompt=this.lotteryPrompt;if(!prompt)return false;
  this.applyLottery(hitLottery(this.lottery,{now:this.playClock,source:'main',random:this.lotteryRandom??this.random}));
  this.ball.vx=prompt.release.vx;this.ball.vz=prompt.release.vz;this.lotteryPrompt=null;this.cancelInput();this.entryHeld={left:!!held.left,right:!!held.right};
  this.emit('lotteryPromptEnd',{drawId:this.lottery.drawId});return true;
 }
 updateLotteryPrompt(dt,input={}){
  const prompt=this.lotteryPrompt;if(!prompt)return;
  const closed=this.gateClosed;this.effectTime+=dt;this.updateWorkflow();if(closed&&!this.gateClosed)this.emit('bonusEnd');
  const pressed=this.tapQueue.some(t=>t.side==='left'||t.side==='right')||['left','right'].some(side=>!!input[side]&&!this.previous[side]);
  this.tapQueue.length=0;this.previous={left:!!input.left,right:!!input.right};if(pressed)prompt.confirmed=true;
  let remaining=dt;if(prompt.zoomRemaining>0){const zoom=Math.min(remaining,prompt.zoomRemaining);prompt.zoomRemaining-=zoom;remaining-=zoom;}
  if(prompt.zoomRemaining<=1e-10)prompt.ready=true;
  if(prompt.ready&&prompt.confirmed){this.startLotteryDraw(input);return;}
  if(!prompt.ready||remaining<=0)return;
  const active=this.round.remaining===null?remaining:Math.min(remaining,this.round.remaining);this.advancePlayClock(active);
  if(updateRound(this,active,{billable:false}))return;
  prompt.remaining=Math.max(0,prompt.remaining-active);this.finishPlayableStep(active);
  if(prompt.remaining<=1e-10)this.startLotteryDraw(input);
 }
 breakStationLoop(nx,nz){
  const b=this.ball,impulse=Math.min(7,Math.hypot(b.vx,b.vz)*.25)*this.loopDeflectionSign;
  b.vx-=nz*impulse;b.vz+=nx*impulse;this.loopDeflectionSign*=-1;this.stationContactTrace.clear();
 }
 startInteraction(o,side,automatic=false){
  if(this.state!=='playing'||(o.type==='boss'&&this.bossPatrol.phase==='patrol')||this.interaction||this.mailRun||this.ball.z>=34||(!this.interactionsEnabled&&o.type!=='launcher')||this.round.ending||this.round.reentry)return false;
  const activity=activityFor(o);if(!activity||this.offerSpent.has(o.id))return false;
  const dock=dockFor(o,this.view),next={stationId:o.id,activity:activity.id,side,automatic,workOffset:automatic?.55:0,dockDuration:automatic?.85:.3,elapsed:0,duration:automatic?7.1:6.55,phase:0,from:{x:this.ball.x,z:this.ball.z},dock};setupInteraction(next);if(o.type==='launcher'){next.workOffset=0;next.dockDuration=.35;next.duration=1.2;next.selected=true;}if(automatic){next.approach=planApproach(next,o,this.view,[...BUMPERS,...SOLID_PROPS,...ASSIST_OBSTACLES,...this.lotteryObstacles]);if(next.approach.blocked)return false;}retractAssists(this);this.interaction=next;this.stationContactTrace.clear();this.central.available=false;this.central.armed=null;this.spendContact(o);this.pendingTap=null;this.tapQueue=[];this.flipperStroke={left:0,right:0};this.flipperPulse={left:0,right:0};this.ball.vx=0;this.ball.vz=0;this.hop=0;this.arming=null;this.opportunity=null;this.emit('interactionStart',{station:o,activity});return true;
 }
 failInteractionRelease(o){this.endOvertime('error');this.releaseError={reason:'no-safe-release',stationId:o.id};this.ball.vx=this.ball.vz=0;this.state='error';this.emit('interactionError',this.releaseError);}
 finishInteraction(){
  const i=this.interaction;if(!i)return;
  const o=BUMPERS.find(o=>o.id===i.stationId),a=activityFor(o),sign=i.side==='left'?-1:1;
  const exit=i.release||releasePosition(i,o,this.view,this.ball.r,[...BUMPERS,...SOLID_PROPS,...ASSIST_OBSTACLES,...this.lotteryObstacles]);if(!exit){this.failInteractionRelease(o);return false;}this.ball.x=exit.x;this.ball.z=exit.z;const velocity=launchVelocity(i,a,o,[...BUMPERS,...this.lotteryObstacles],exit,this.view,this.ball.r);if(!velocity){this.failInteractionRelease(o);return false;}this.ball.vx=velocity.vx;this.ball.vz=velocity.vz;
  this.chairBoost={remaining:i.activity==='chair'?1.4:0,peak:Math.max(44,Math.hypot(velocity.vx,velocity.vz))};
  const points=i.result?.points??a.reward;this.award('work',points);this.completedActivities++;this.applyOvertime(onOvertimeWork(this.overtime,{now:this.playClock,stationId:o.id,activityId:i.activity,kind:i.result?.kind,quality:i.result?.quality,points,startedAt:i.overtimeWorkStartedAt,patrolCycle:this.bossPatrol.cycle,isPatrolling:this.bossPatrol.phase==='patrol'}));if(['perfect','complete'].includes(i.result?.kind)){if(i.activity==='copier')this.markWorkflow('print');if(i.activity==='boss')this.markWorkflow('sign');}comboWork(this,o.id,['perfect','complete'].includes(i.result?.kind));if(['perfect','complete'].includes(i.result?.kind)){if(o.id==='copier')startCombo(this,'paper');if(o.id==='desk2')startCombo(this,'coffee');}this.spendContact(o);this.interaction=null;this.arming=null;this.hop=.8;this.effect={type:o.type,remaining:1};this.emit('interactionEnd',{station:o,activity:a,side:i.side,points,result:i.result});this.finishPlayableStep(0);
 }
 updateInteraction(dt,input){
  // Keep interaction clocks on the same bounded 120 Hz steps as free physics.
  // Only controllable work consumes a timed round; docking/launch and selected auto-launch do not.
  let left=dt;
  while(left>1e-10&&this.interaction&&this.state==='playing'&&!this.round.ending){
   const i=this.interaction,dockLeft=Math.max(0,(i.dockDuration||.3)-i.elapsed),docking=i.stage==='docking'&&dockLeft>1e-10;
   const slice=Math.min(left,STEP,docking?dockLeft:Infinity);
   const operable=!docking&&i.stage!=='launch'&&!(i.activity==='launcher'&&i.selected);
   if(operable){
    if(i.overtimeWorkStartedAt===undefined){i.overtimeWorkStartedAt=this.playClock;this.applyOvertime(onOvertimeWorkStart(this.overtime,{now:this.playClock,stationId:i.stationId,activityId:i.activity}));}
    const active=this.round.remaining===null?slice:Math.min(slice,this.round.remaining);this.advancePlayClock(active);
    if(updateRound(this,active,{billable:false}))return;
    this.advanceInteractionSlice(active,input);this.finishPlayableStep(active);
   }else this.advanceInteractionSlice(slice,input);
   left-=slice;
  }
 }
 advanceInteractionSlice(dt,input){
  const i=this.interaction,o=BUMPERS.find(o=>o.id===i.stationId),activity=activityFor(o),beforePulls=i.pulls,wasLaunching=i.stage==='launch';
  const done=advanceInteraction(i,dt,input,this.tapQueue.splice(0),activity);
  const t=clamp(i.elapsed/i.dockDuration,0,1),dock=dockingPoint(i,o,t);this.ball.x=dock.x;this.ball.z=dock.z;this.ball.vx=this.ball.vz=0;
  if(i.pulls>beforePulls)this.emit('interactionPull',{pulls:i.pulls,station:o});
  if(!wasLaunching&&i.stage==='launch')this.emit('interactionLaunch',{station:o,activity,result:i.result});
  if(i.stage==='launch'){if(!i.release){i.release=releasePosition(i,o,this.view,this.ball.r,[...BUMPERS,...SOLID_PROPS,...ASSIST_OBSTACLES,...this.lotteryObstacles]);if(!i.release){this.failInteractionRelease(o);return;}i.launchRoute={automatic:true,from:i.dock,dock:i.release};i.launchRoute.approach=planApproach(i.launchRoute,o,this.view,[...BUMPERS,...SOLID_PROPS,...ASSIST_OBSTACLES,...this.lotteryObstacles]);if(i.launchRoute.approach.blocked){this.finishInteraction();return;}}const t=clamp(i.launchElapsed/.55,0,1),p=dockingPoint(i.launchRoute,o,t);this.ball.x=p.x;this.ball.z=p.z;this.hop=Math.sin(t*Math.PI)*1.5;}
  const phase=i.stage==='launch'?2:i.elapsed-(i.workOffset||0)>.8?1:0;if(phase!==i.phase){i.phase=phase;this.emit('interactionBeat',{activity,phase});}
  this.previous={left:!!input.left,right:!!input.right};if(done)this.finishInteraction();
 }
 hit(o,nx,nz){
  this.combo=this.time-this.lastHit<4?Math.min(this.combo+1,4):1;this.lastHit=this.time;this.hits++;const points=o.points*this.combo;this.award('equipment',points);const b=this.ball;
  // Ordinary equipment keeps the solver's contact-normal rebound and impulse.
  // Comic hops/effects remain; only the boss deliberately delivers a directed kick.
  this.hop={copier:.45,water:1.05,chair:.35,desk:.55}[o.type]??.5;
  if(o.type==='boss'){b.vz=18;this.hop=.5;}
  if(this.workflow.active&&this.workflow.hitsLeft>0){this.workflow.hitsLeft--;this.award('lights',WORKFLOW.hitPoints);this.emit('workflowHit',{points:WORKFLOW.hitPoints});}this.effect={type:o.type,remaining:.75};this.emit('hit',{...o,points,combo:this.combo});
 }
 update(dt,input={}){
  if(this.state!=='playing')return;
  const raw={left:!!input.left,right:!!input.right};
  for(const side of ['left','right'])if(!raw[side])this.entryHeld[side]=false;
  input={left:raw.left&&!this.entryHeld.left,right:raw.right&&!this.entryHeld.right};
  if(this.lotteryPrompt&&!this.round.ending){this.updateLotteryPrompt(dt,input);return;}
  if(!this.interaction&&!this.mailRun&&!this.shortRun){
   const offer=this.getInteractionOffer();
   const pressed=offer&&['left','right'].some(side=>this.tapQueue.some(t=>t.side===side&&t.offerId===offer.id)||input[side]&&!this.previous[side]&&!this.tapQueue.some(t=>t.side===side));
   if(pressed&&this.requestInteraction(offer.id)){
    this.entryHeld={...raw};this.previous={left:false,right:false};
    this.updateInteraction(dt,{left:false,right:false});return;
   }
  }
  if(this.round.ending){updateRound(this,dt);return;}
  const closed=this.gateClosed;this.effectTime+=dt;this.updateWorkflow();if(closed&&!this.gateClosed)this.emit('bonusEnd');
  if(this.round.reentry){const active=this.round.remaining===null?dt:Math.min(dt,this.round.remaining);this.advancePlayClock(active);if(!updateRound(this,active))updateReentry(this,active);this.finishPlayableStep(active);return;}
  if(this.interaction){retractAssists(this);this.updateInteraction(dt,input);return;}
  const active=this.round.remaining===null?dt:Math.min(dt,this.round.remaining);this.advancePlayClock(active);if(updateRound(this,active))return;
  dt=active;try{
  this.time+=dt;if(updateRouteRewards(this.routeRewards,this.time))this.emit('routeRewardStart');const old={...this.flippers},assistPressed=Object.fromEntries(['left','right'].map(side=>[side,!!input[side]&&!this.previous[side]||this.tapQueue.some(t=>t.side===side)]));
  if(this.mailRun||this.shortRun){
   retractAssists(this);this.flippers={left:0,right:0};this.flipperStroke={left:0,right:0};this.flipperPulse={left:0,right:0};this.central.armed=null;this.central.available=false;this.opportunity=null;
   this.tapQueue.length=0;this.pendingTap=null;this.previous={...input};
   if(this.mailRun)this.updateMail(dt,assistPressed);else this.updateShortLoop(dt);
   if(!this.mailRun&&!this.shortRun){this.entryHeld={...raw};this.previous={...raw};}
   return;
  }
  for(const side of ['left','right']){if(input[side]&&!this.previous[side])this.flipperStroke[side]=.18;this.flipperStroke[side]=Math.max(0,this.flipperStroke[side]-dt);this.flipperPulse[side]=Math.max(0,this.flipperPulse[side]-dt);const target=this.flipperStroke[side]>0?1:0;this.flippers[side]+=clamp(target-this.flippers[side],-dt*7,dt*12);}

  updateAssists(this,dt,assistPressed);updateCentral(this,dt,assistPressed,input);
  this.tapQueue.length=0;this.previous={left:!!input.left,right:!!input.right};
  this.simTime+=dt;this.hop=Math.max(0,this.hop-dt*2);if(this.effect){this.effect.remaining-=dt;if(this.effect.remaining<=0)this.effect=null;}
  if(this.time-this.lastHit>4)this.combo=0;const b=this.ball;b.vz+=FIELD.gravity*dt;const damping=Math.exp(-.025*dt);b.vx*=damping;b.vz*=damping;this.chairBoost.remaining=Math.max(0,this.chairBoost.remaining-dt);const cap=44+(this.chairBoost.peak-44)*this.chairBoost.remaining/1.4,speed=Math.hypot(b.vx,b.vz);if(speed>cap){b.vx*=cap/speed;b.vz*=cap/speed;}
  if(this.lotteryEnabled&&(Math.abs(b.x-LOTTERY_BOX.x)>LOTTERY_BOX.hx+b.r+.7||Math.abs(b.z-LOTTERY_BOX.z)>LOTTERY_BOX.hz+b.r+.7))leaveLottery(this.lottery);
  const previousBall={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;

  if(b.x<-FIELD.halfWidth+b.r){b.x=-FIELD.halfWidth+b.r;b.vx=Math.abs(b.vx)*.94;this.hitWindow(-1);}if(b.x>FIELD.halfWidth-b.r){b.x=FIELD.halfWidth-b.r;b.vx=-Math.abs(b.vx)*.94;this.hitWindow(1);}if(b.z<FIELD.top+b.r){b.z=FIELD.top+b.r;b.vz=Math.abs(b.vz)*.9;}
  const solids=BUMPERS.filter(o=>o.type!=='launcher'&&(o.type!=='boss'||this.bossPatrol.phase!=='patrol'));
  const contacts=[firstStationContact(previousBall,b,[...solids,...SOLID_PROPS,...this.lotteryObstacles],this.view,b.r),firstAssistContact(previousBall,b,this.assists,b.r),patrolContact(this,previousBall,b),centralContact(this,previousBall,b)].filter(Boolean),contact=contacts.sort((a,b)=>a.t-b.t)[0];
  // The first swept collision wins over an entrance farther along the same step.
  const entry=!this.mailLatch.blocked?mailEntry(previousBall,b):null,entryT=entry?(MAIL.entryZ-previousBall.z)/(b.z-previousBall.z):Infinity;
  if(entry&&(!contact||entryT<contact.t)){this.updateLamps(previousBall,entry);this.mailRun={distance:0,elapsed:0,speed:clamp(Math.hypot(b.vx,b.vz),MAIL.minTravelSpeed,MAIL.maxTravelSpeed),entrySpeed:clamp(Math.hypot(b.vx,b.vz),MAIL.minTravelSpeed,MAIL.maxTravelSpeed),phase:'intake',direction:entry.direction,offsetX:entry.x-MAIL.entryX*entry.direction,...freshMailChoice(entry.direction)};b.x=entry.x;b.z=entry.z;this.hop=0;this.cancelInput();this.emit('mailStart',{direction:entry.direction});return;}
  if(this.shortLatch&&Math.hypot(b.x-SHORT_LOOP.entry.x,b.z-SHORT_LOOP.entry.z)>9)this.shortLatch=false;
  const short=!this.shortLatch?shortEntry(previousBall,b):null;
  if(short&&(!contact||short.t<contact.t)){this.updateLamps(previousBall,short);this.shortRun={distance:0,elapsed:0,speed:SHORT_LOOP.speed,offsetX:short.x-SHORT_LOOP.entry.x,exit:shortLoopExit(this.shortLoopTrips)};this.shortLatch=true;b.x=short.x;b.z=SHORT_LOOP.entry.z;this.hop=0;this.cancelInput();retractAssists(this);this.emit('shortLoopStart');return;}
  this.updateLamps(previousBall,contact?{x:contact.x,z:contact.z}:b);
  advanceMailLatch(this.mailLatch,previousBall,contact?{x:contact.x,z:contact.z}:b,b.r);
  this.refreshContactArming(previousBall,contact?{x:contact.x,z:contact.z}:b);
  updateCombo(this,previousBall,contact?{x:contact.x,z:contact.z}:b);
  if(contact){const {station:o,shape,nx,nz}=contact,looped=this.repeatedStationContact(o,contact);comboContact(this,o.id);b.x=contact.x+nx*.002;b.z=contact.z+nz*.002;
   if(o.patrol){kickByPatrol(this);}else if(o.central){const side=this.central.armed;if(this.startInteraction(BUMPERS.find(o=>o.id==='launcher'),side,false))return;}else if(o.id==='lottery'){if(this.startLotteryPrompt(contact,raw))return;const vn=b.vx*nx+b.vz*nz;if(vn<0){b.vx-=1.8*vn*nx;b.vz-=1.8*vn*nz;}this.applyLottery(hitLottery(this.lottery,{now:this.playClock,source:'main',random:this.lotteryRandom??this.random}));}
   else if(o.assistId){resolveAssist(this,contact);}else{
   const fresh=!this.offerSpent.has(o.id),eligible=!!activityFor(o)&&this.interactionsEnabled&&fresh&&this.time>=this.interactionReady;
   if(eligible)this.offerInteraction(o);
   if(fresh){this.spendContact(o);if(this.lotteryEnabled&&BUMPERS.includes(o)&&o.type!=='launcher'&&!(o.type==='boss'&&this.bossPatrol.phase==='patrol')){const targets=BUMPERS.filter(t=>t.id!==o.id&&t.type!=='launcher'&&!(t.type==='boss'&&this.bossPatrol.phase==='patrol')).sort((a,b)=>Math.hypot(a.x-o.x,a.z-o.z)-Math.hypot(b.x-o.x,b.z-o.z)).slice(0,2).map(t=>t.id);this.applyLottery(hitLotteryEquipment(this.lottery,{now:this.playClock,source:'main',stationId:o.id,contactId:++this.lotteryContact,targets}));}}
   const vn=b.vx*nx+b.vz*nz;if(vn<0){b.vx-=1.9*vn*nx;b.vz-=1.9*vn*nz;}
   if(fresh){b.vx+=nx*(o.power||4)*.65;b.vz+=nz*(o.power||4)*.65;if(o.points)this.hit(o,nx,nz);else if(!o.points){this.hop=.25;this.emit('propHit',{id:o.id,label:o.label});}}
   }
   if(looped)this.breakStationLoop(nx,nz);
  }
  for(const sign of [-1,1])this.rail({ax:sign*17.7,az:34,bx:sign*11.8,bz:43},.35);
  for(const side of ['left','right']){const s=flipperSegment(side,this.flippers[side]),p=closestPoint(b.x,b.z,s),dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz),r=b.r+.4;
   if(d<r){const nx=d>.0001?dx/d:0,nz=d>.0001?dz/d:-1;b.x=p.x+nx*(r+.004);b.z=p.z+nz*(r+.004);const vn=b.vx*nx+b.vz*nz;if(vn<0){b.vx-=1.72*vn*nx;b.vz-=1.72*vn*nz;}if(this.flipperStroke[side]>0&&this.flippers[side]>old[side]&&(this.cooldowns[side]??-1)<this.time){const sign=side==='left'?1:-1;b.vz=-38-8*p.t;b.vx=sign*(p.t>.62?-.5-2*(p.t-.65):3+9*p.t);if(p.t>.88){const up=-b.vz,flight=(up-Math.sqrt(Math.max(1,up*up-2*FIELD.gravity*(b.z-SHORT_LOOP.entry.z))))/FIELD.gravity;b.vx=(sign*(.95-p.t)*3-b.x)/Math.max(.2,flight);}this.cooldowns[side]=this.time+.22;this.saves++;const points=80+(p.t>.65?60:0);this.award('rescue',points);this.hop=.45;this.emit('save',{side,points,precise:p.t>.65});this.applyOvertime(onOvertimeSave(this.overtime,{now:this.playClock,precise:p.t>.65}));comboSave(this);}}
  }
  if(this.gateClosed&&b.vz>0&&previousBall.z<=FIELD.door-b.r&&b.z>FIELD.door-b.r&&Math.abs(b.x)<=8.8){b.z=FIELD.door-b.r;b.vz=-Math.max(12,Math.abs(b.vz)*.9);this.emit('gateSave');}
  if(b.z>FIELD.door-b.r&&Math.abs(b.x)>8.8&&b.z<FIELD.door+.5){b.z=FIELD.door-b.r;b.vz=-Math.abs(b.vz)*.8;}
  const reboundSpeed=Math.hypot(b.vx,b.vz);if(reboundSpeed>cap){b.vx*=cap/reboundSpeed;b.vz*=cap/reboundSpeed;}
  if(b.z>FIELD.drain){if(startReentry(this)){retractAssists(this);}else{this.state='over';this.round.reason='drain';this.opportunity=null;this.arming=null;this.interaction=null;this.endOvertime();this.emit('over',{reason:'drain'});}}
  }finally{this.finishPlayableStep(active);}
 }
 markWorkflow(goal){const w=this.workflow,n=WORKFLOW.goals.indexOf(goal);if(n<0||w.active||w.readyAt||w.lights[n])return;w.lights[n]=true;this.emit('workflowLight',{goal});if(w.lights.every(Boolean)){w.active=true;w.until=this.effectTime+WORKFLOW.duration;w.readyAt=w.until+WORKFLOW.cooldown;w.hitsLeft=WORKFLOW.hits;w.rounds++;this.award('lights',WORKFLOW.points);this.emit('workflowStart',{points:WORKFLOW.points});}}
 updateWorkflow(){const w=this.workflow;if(w.active&&this.effectTime>=w.until){w.active=false;w.hitsLeft=0;this.emit('workflowEnd');}if(w.readyAt&&this.effectTime>=w.readyAt){const rounds=w.rounds;this.workflow=freshWorkflow();this.workflow.rounds=rounds;this.emit('workflowReset');}}
 updateShortLoop(dt){
  this.simTime+=dt;const m=this.shortRun,from={...this.ball};m.elapsed+=dt;m.distance=Math.min(SHORT_LENGTH,m.distance+m.speed*dt);const p=shortPoint(m.distance),blend=Math.max(0,1-m.distance/6),exitT=clamp((m.distance-(SHORT_LENGTH-6))/6,0,1),exitBlend=exitT*exitT*(3-2*exitT),exitOffset=m.exit?.x||0;Object.assign(this.ball,{x:p.x+(m.offsetX||0)*blend+exitOffset*exitBlend,z:p.z,vx:(p.dx-(blend>0?(m.offsetX||0)/6:0)+exitOffset*exitT*(1-exitT))*m.speed,vz:p.dz*m.speed});m.height=p.y||0;this.hop=0;this.updateLamps(from,this.ball);
  if(m.distance>=SHORT_LENGTH||m.elapsed>=2){Object.assign(this.ball,m.exit||SHORT_LOOP.exit);this.shortRun=null;this.shortLoopTrips++;this.award('route',SHORT_LOOP.points);this.interactionReady=Math.max(this.interactionReady,this.time+.25);this.cancelInput();this.emit('shortLoopExit',{points:SHORT_LOOP.points,trip:this.shortLoopTrips});}
 }
 updateMail(dt,pressed={}){
  this.simTime+=dt;const m=this.mailRun,previousDistance=m.distance;m.elapsed+=dt;
  if(!('choiceDefault' in m))Object.assign(m,freshMailChoice(m.direction));
  const split=MAIL_LENGTH/2;
  if(!m.branch&&m.distance>=split-40&&!m.choice)advanceMailChoice(m,dt,pressed);
  if(m.branch){
   m.branch.distance=Math.min(MAIL_BRANCHES[m.branch.side].length,m.branch.distance+32*dt);const p=branchPoint(m.branch.side,m.branch.distance);Object.assign(this.ball,{x:p.x,z:p.z,vx:p.dx*32,vz:p.dz*32});m.height=0;this.hop=0;
   if(m.branch.distance>=MAIL_BRANCHES[m.branch.side].length||m.elapsed>=9){const side=m.branch.side,exit=MAIL_BRANCHES[side].exit;Object.assign(this.ball,exit);this.mailRun=null;this.mailTrips++;lockMailExit(this.mailLatch,m.direction);this.award('route',MAIL.points);this.markWorkflow('mail');this.hop=.6;this.cancelInput();this.interactionReady=Math.max(this.interactionReady,this.time+.25);startCombo(this,'dispatch');this.emit('mailExit',{...this.ball,points:MAIL.points,side,chosenByPlayer:m.chosenByPlayer});}
   return;
  }
  const phase=mailPhase(m.distance,m.direction,m.entrySpeed??m.speed);if(m.phase!==phase.id){m.phase=phase.id;if(phase.id==='outbound'||phase.id==='return')this.emit('mailBoost',{label:phase.label,direction:m.direction});}m.speed+=clamp(phase.speed-m.speed,-48*dt,28*dt);if(m.distance>=split-40)m.speed=Math.min(m.speed,30);m.distance=Math.min(split,m.distance+m.speed*dt);for(const item of collectRouteRewards(this.routeRewards,this.time,previousDistance,m.distance,m.direction)){this.award('route',item.points);this.emit('routeReward',item);}const p=mailPoint(m.distance),blend=Math.max(0,1-m.distance/8),direction=m.direction||1;Object.assign(this.ball,{x:p.x*direction+m.offsetX*blend,z:p.z,vx:p.dx*m.speed*direction,vz:p.dz*m.speed});m.height=p.y||0;this.hop=0;
  if(m.distance>=split){if(!m.choice){m.choice=m.choiceDefault;m.choiceOpen=false;m.choiceRemaining=0;}m.branch={side:m.choice,distance:0};this.emit('mailChoice',{side:m.choice,chosenByPlayer:m.chosenByPlayer});}
 }

 hitWindow(side){const o=WINDOWS.find(o=>o.side===side&&Math.abs(this.ball.z-o.z)<=o.halfLength);if(!o||this.effectTime<(this.windowReady[o.id]||0))return;this.windowReady[o.id]=this.effectTime+.8;this.award('equipment',o.points);this.ball.vx=-side*Math.max(8,Math.abs(this.ball.vx));this.hop=.6;this.emit('window',{id:o.id,points:o.points,side,z:o.z});}
 updateLamps(previous,end=this.ball){if(!this.overtimeEnabled||this.state!=='playing'||this.interaction||this.mailRun||this.round.reentry||this.round.ending)return;LAMPS.forEach((p,n)=>{const distance=Math.hypot(end.x-p.x,end.z-p.z),passed=segmentDistance(p.x,p.z,previous,end)<=p.r;if(passed&&!this.lampInside[n]){this.lampInside[n]=true;const before=this.overtime.litCount;this.award('lights',20);this.applyOvertime(onOvertimeWord(this.overtime,{now:this.playClock,wordId:p.id}));const newlyLit=this.overtime.litCount>before;this.emit('lampHit',{index:n,label:p.label,points:20,newlyLit});if(newlyLit)this.emit('lamp',{index:n,label:p.label});if(newlyLit&&this.overtime.phase==='ready'){this.award('lights',BONUS.points);this.bonusUntil=this.effectTime+BONUS.duration;this.emit('bonusStart',{points:BONUS.points,duration:BONUS.duration});}}if(distance>p.r+this.ball.r+.7)this.lampInside[n]=false;});}
 rail(s,r){const b=this.ball,p=closestPoint(b.x,b.z,s),dx=b.x-p.x,dz=b.z-p.z,d=Math.hypot(dx,dz);if(d<b.r+r){const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0;b.x=p.x+nx*(b.r+r+.002);b.z=p.z+nz*(b.r+r+.002);const v=b.vx*nx+b.vz*nz;if(v<0){b.vx-=1.8*v*nx;b.vz-=1.8*v*nz;}}}
}
