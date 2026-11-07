import {benchLayout,carriageLayout} from './bench-layout.js';
import {resultFor,countdownVisible,seatAnchoredY,THREAT_SECONDS,THREAT_WINDUP,INTRUDERS} from './rules.js';
import {courtesyMotion,canStartComicEvent,chooseComicEvent,passengerQuip} from './comic-events.js';
import {PARTNERS,choosePartner,partnerLines,chainReward,SEAT_AUDIENCE,createThreatPlan} from './round-variation.js';
import {isEscalatingThreatPlan,isPressureThreatPlan,threatEligible,threatTimingAt,threatSpeedLabel} from './threat-plan.js';
import {ComicSounds} from './sfx.js';
import {BackgroundMusic} from './music.js';
import {ActiveRoundClock,departureIsSafe} from './round-clock.js';
const $=id=>document.getElementById(id);
const INTRUDER_VISUAL_RATIO=.9;
const ui={start:$('start'),restart:$('restart'),offer:$('offer'),thanks:$('thanks'),clock:$('clock'),count:$('count'),status:$('status'),intro:$('intro'),result:$('result'),timer:document.querySelector('.time'),hit:$('intruder-hit'),notice:$('event-notice'),help:$('instructions'),pause:$('pause-overlay'),resume:$('resume'),app:$('app'),controls:$('controls')};
const audio=new ComicSounds(),music=new BackgroundMusic(()=>audio.context);
let activeScene;
document.addEventListener('visibilitychange',()=>activeScene?.handleVisibilityChange());
$('sound').onclick=()=>{audio.enabled=!audio.enabled;$('sound').querySelector('span').textContent=audio.enabled?'聲音開':'聲音關';$('sound').setAttribute('aria-label',audio.enabled?'關閉音樂與音效':'開啟音樂與音效');music.setEnabled(audio.enabled);audio.unlock();audio.play('click');};
$('help').onclick=()=>{if(!['play','seating','depart'].includes(window.__courtesy?.getState().phase))ui.help.showModal();};$('close-help').onclick=()=>ui.help.close();

class CourtesyScene extends Phaser.Scene{
 constructor(){super('Courtesy');this.phase='intro';this.roundId=0;this.count=0;this.remaining=30;this.ready=false;this.lastIntruder=-1;this.threat=null;this.cooldown=0;this.threatChance=.65;this.motionLog=[];this.transients=[];this.seated=false;this.seatReady=false;this.tabPaused=false;this.roundClock=new ActiveRoundClock(30);this.comic=null;this.comicSerial=0;this.comicUsed=0;this.comicLastAt=0;this.lastComic=null;this.partner='aunt';this.lastPartner='';this.chainBonus=0;this.chainLast=0;this.chainSerial=0;this.chain=null;this.starting=false;this.trace=[];this.seatAcceptedAtMs=null;this.seatSettledAtMs=null;this.threatPlan=[];this.threatIndex=0;}
 preload(){
  for(const key of ['office','stubborn'])this.load.image(key,'./assets/'+key+'-v7.png');this.load.json('variation','./assets/variation-v7.json');this.load.spritesheet('seatedNew','./assets/seated-v7.png',{frameWidth:724,frameHeight:724});this.load.spritesheet('seatedGesture','./assets/seated-gesture-v7.png',{frameWidth:724,frameHeight:724});
  this.load.image('metro','./assets/metro.png');this.load.image('people','./assets/commuters.png');this.load.json('frames','./assets/frames.json');
  this.load.image('auntV4','./assets/aunt-v4.png');this.load.json('auntFrames','./assets/aunt-v4-frames.json');
  this.load.spritesheet('intruders','./assets/intruders-v4.png',{frameWidth:362,frameHeight:362});
  this.load.image('hero','./assets/hero-v3.png');this.load.json('heroFrames','./assets/hero-v3-frames.json');
  this.load.spritesheet('passengers','./assets/passengers-v3.png',{frameWidth:362,frameHeight:362});
  this.load.on('loaderror',()=>{ui.status.textContent='圖片還沒進站，請重新整理。';});
 }
 create(){
  this.variation=this.cache.json.get('variation');for(const key of ['office','stubborn']){const t=this.textures.get(key);this.variation[key].forEach((f,i)=>t.add(i,0,f.x,f.y,f.width,f.height));}
  this.frameData=this.cache.json.get('frames').frames;this.heroFrames=this.cache.json.get('heroFrames').frames;this.auntFrames=this.cache.json.get('auntFrames').frames;
  for(const [key,frames]of [['people',this.frameData],['hero',this.heroFrames],['auntV4',this.auntFrames]]){const t=this.textures.get(key);frames.forEach((f,i)=>t.add(i,0,f.x,f.y,f.width,f.height));}
  this.bg=this.add.image(0,0,'metro');this.seatGlow=this.add.graphics().setDepth(1);
  this.spectators=SEAT_AUDIENCE.map(({type,slot})=>({type,slot,normalizedSlot:true,sprite:this.add.sprite(0,0,'passengers',0).setOrigin(.5,1).setDepth(3),reaction:null}));
  this.shadows=[this.add.ellipse(0,0,100,14,0x463e24,.2),this.add.ellipse(0,0,100,14,0x463e24,.2)];this.shadows.forEach(s=>s.setDepth(4));
  this.player=this.add.sprite(0,0,'people',0).setDepth(8);this.aunt=this.add.sprite(0,0,'people',6).setFlipX(true).setDepth(8);this.player.pose=0;this.aunt.pose=1;
  this.intruder=this.add.sprite(0,0,'intruders',1).setOrigin(.5,1).setDepth(11).setVisible(false);this.threatRing=this.add.graphics().setDepth(10);
  this.speech={box:this.add.graphics().setDepth(15),tail:this.add.graphics().setDepth(15),text:this.add.text(0,0,'',{fontFamily:'Noto Sans TC,sans-serif',fontStyle:'bold',color:'#30463a',align:'center'}).setOrigin(.5).setDepth(16),until:0};
  this.banner=this.add.text(0,0,'',{fontFamily:'Noto Sans TC,sans-serif',fontStyle:'bold',color:'#fff4ca',stroke:'#4e3a2d',strokeThickness:6,align:'center'}).setOrigin(.5).setDepth(20);
  this.speedLines=this.add.graphics().setDepth(6);this.layout();this.scale.on('resize',()=>this.layout());
  ui.start.disabled=false;ui.start.innerHTML='開始客氣 <span>→</span>';ui.start.onclick=()=>this.start();ui.restart.onclick=()=>this.start();ui.offer.onclick=()=>this.offer();ui.thanks.onclick=()=>this.thank();ui.hit.onclick=()=>this.repel();
  this.input.keyboard.on('keydown-LEFT',e=>{if(this.phase!=='play'||this.tabPaused||ui.help.open)return;e.preventDefault();if(!e.repeat)this.offer();});this.input.keyboard.on('keydown-RIGHT',e=>{if(this.phase!=='play'||this.tabPaused||ui.help.open)return;e.preventDefault();if(!e.repeat)this.thank();});
  this.input.keyboard.on('keydown-SPACE',e=>{if(this.phase!=='play'||!this.threat||this.tabPaused||ui.help.open)return;e.preventDefault();if(!e.repeat)this.repel();});this.input.keyboard.on('keydown-ENTER',e=>{if(['intro','result'].includes(this.phase)&&!ui.help.open&&!$('rank-dialog')?.open&&!$('share-fallback')?.open&&!e.target?.closest?.('button,a,input,textarea,select,[contenteditable]')){e.preventDefault();this.start();}});
  activeScene=this;ui.resume.onclick=()=>this.resumeRound();this.ready=true;this.pose(this.player,0);this.pose(this.aunt,1);window.__courtesy={getState:()=>this.debugState()};window.courtesyPlatform?.ready(this,audio,music);
 }
 later(ms,fn){
  const id=this.roundId,active=['play','seating'].includes(this.phase),dueAt=active?this.roundClock.elapsed(performance.now())+ms:null;
  const run=()=>{if(id!==this.roundId||this.tabPaused)return;if(this.syncDeadline())return;const wait=active?dueAt-this.roundClock.elapsed(performance.now()):0;if(wait>0){this.time.delayedCall(Math.max(1,wait),run);return;}fn();};
  return this.time.delayedCall(ms,run);
 }
 syncDeadline(now=performance.now()){
  if(!['play','seating'].includes(this.phase)||this.tabPaused)return false;
  // Acceptance is final; the remaining seating animation is presentation only.
  if(this.phase==='seating'&&this.seatAcceptedAtMs!==null)return false;
  const elapsedMs=this.roundClock.elapsed(now),elapsed=elapsedMs/1000;this.remaining=this.roundClock.remaining(now);this.cooldown=Math.max(0,(this.cooldownUntil||0)-elapsed);
  if(this.threat){
   const startedAtMs=this.threat.startedAtMs??Math.round(this.threat.startedAt*1000),expiresAtMs=this.threat.expiresAtMs??startedAtMs+Math.round((this.threat.duration||THREAT_SECONDS)*1000);
   this.threat.elapsed=Math.max(0,(elapsedMs-startedAtMs)/1000);
   // Compare absolute milliseconds, not floating-point seconds subtracted from
   // each other: 5.8 - 4 can otherwise incorrectly leave a 1.8s threat alive.
   if(elapsedMs>=expiresAtMs){
    // Repeated standing offers never cancel an approaching intruder.
    this.steal();return true;
   }
  }
  if(this.remaining>0)return false;this.depart(false);return true;
 }
 handleVisibilityChange(){if(document.hidden)this.pauseRound();}
 pauseRound(){if(this.tabPaused||!['play','seating','depart'].includes(this.phase))return;const now=performance.now();this.syncDeadline(now);if(['play','seating'].includes(this.phase))this.recordEvent('pause',{},now);this.roundClock.pause(now);this.tabPaused=true;music.pausedByGame=true;music.audio.pause();audio.context?.suspend();ui.pause.classList.remove('hidden');ui.pause.scrollTop=0;this.scene.pause();this.writeDiagnostics();}
 resumeRound(){if(!this.tabPaused||document.hidden)return;if(['play','seating'].includes(this.phase)){const now=performance.now();this.roundClock.resume(now);this.recordEvent('resume',{},now);}this.tweens.getDelta(true);this.tabPaused=false;ui.pause.classList.add('hidden');this.scene.resume();music.pausedByGame=false;music.play();audio.unlock();this.writeDiagnostics();}
 gripPlacement(){
  const m=this.partner!=='aunt'&&this.variation?this.variation[this.partner][4]:this.auntFrames[1];
  // Pose artwork shares an adult scale. Never enlarge a body to span the car.
  const scale=this.baseScale*(this.partner==='aunt'?.74:1.05);
  return{scale,x:this.W*(1056/1536)+(m.handX-m.anchorX)*scale,y:this.H*(211/1024)+(m.height-m.handY)*scale,floorY:this.H*(211/1024)+(m.feet-m.handY)*scale};
 }

 clearSpeech(){this.speech.box.clear();this.speech.tail.clear();this.speech.text.setVisible(false);this.speech.until=0;}
 say(words,duration=1300){if(this.threat)return;const b=this.speech;const fs=this.mobile?18:Math.max(21,this.W*.022);b.text.setFontSize(fs).setWordWrapWidth(Math.max(120,this.W-44),true).setText(words).setVisible(true);const bw=Math.min(this.W-20,b.text.width+24),bh=b.text.height+18,x=this.W*.5,y=Math.max(bh/2+8,this.H*.15);
  b.box.clear().fillStyle(0xfffcef,.98).lineStyle(2,0x405a45,.75).fillRoundedRect(x-bw/2,y-bh/2,bw,bh,10).strokeRoundedRect(x-bw/2,y-bh/2,bw,bh,10);b.tail.clear().fillStyle(0xfffcef).fillTriangle(x-6,y+bh/2-1,x+7,y+bh/2-1,x+1,y+bh/2+12);b.text.setPosition(x,y);b.until=this.time.now+duration;
 }
 playerIsSeated(){
  const m=this.heroFrames[1],expected=seatAnchoredY(this.seatY,m.height,m.hip,this.baseScale),tolerance=Math.max(2,this.baseScale*2.5);
  return this.player.pose===4&&this.player.texture.key==='hero'&&Number(this.player.frame.name)===1&&Math.abs(this.player.x-this.seatX)<=tolerance&&Math.abs(this.player.y-expected)<=tolerance&&Math.abs(this.player.angle)<=5&&!this.stolen;
 }
 layout(){
  // Numeric tween endpoints belong to the old viewport. Never let them overwrite new anchors.
  for(const actor of [this.player,this.aunt]){this.tweens.killTweensOf(actor);actor.lift=0;actor.setAngle(0);}
  if(this.comic)this.cancelComicEvent();
  this.W=this.scale.width;this.H=this.scale.height;this.mobile=window.matchMedia?.('(max-width:650px)').matches??this.W<=650;this.bg.setPosition(this.W/2,this.H/2).setDisplaySize(this.W,this.H);
  const composition=carriageLayout(this.W,this.H,this.mobile);this.baseScale=composition.baseScale;this.vacancyWidth=composition.vacancyWidth;this.floorY=this.gripPlacement().floorY;this.seatY=this.H*.672;this.seatX=this.W*.5;this.px=this.seatX-this.baseScale*150;this.ax=this.seatX+this.baseScale*180;this.npcScale=Math.min(this.H*.55/323,this.W*.26/240);
  this.benchSeats=composition.seats;
  for(const p of this.spectators){p.reaction?.destroy();p.reaction=null;this.spectatorPose(p);}this.clearChainCaptions();
  this.player.setScale(this.baseScale);this.aunt.setScale(this.baseScale);this.pose(this.player,this.player.pose||0);this.pose(this.aunt,this.aunt.pose??1);
  this.player.x=this.seated||this.phase==='seating'?this.seatX:this.playerSeatX();this.aunt.x=this.aunt.pose===6?this.gripPlacement().x:this.aunt.pose===5?this.W*.75:this.ax;
  if(this.aunt.pose===5){this.aunt.x=this.silhouetteX(this.aunt,this.W*.75,8);this.aunt.angle=8;}
  if(this.player.pose===5){this.player.x=this.silhouetteX(this.player,this.W*.29,-8);this.player.y=this.player.restY+this.H*.025;this.player.angle=-8;}
  for(const [i,s]of [this.player,this.aunt].entries())this.shadows[i].setPosition(s.x,this.floorY+2).setSize(this.baseScale*150,this.baseScale*24);
  this.banner.setPosition(this.W/2,this.H*.25).setFontSize(this.mobile?25:37);this.clearSpeech();this.paintVacancy();
  if(this.threat)this.positionIntruder();
  else if(this.stolen){const sc=this.baseScale*1.22*INTRUDER_VISUAL_RATIO;this.intruder.setScale(sc).setPosition(this.seatX,seatAnchoredY(this.seatY,362,[280,279,282][this.stolenBy],sc));}
 }
 spectatorPose(p){
  const slots=[.12,.31,.69,.88],placement=(this.benchSeats||benchLayout(this.W,this.H,this.mobile))[p.type];
  const visible=!p.normalizedSlot||Boolean(placement);p.sprite.setVisible(visible);if(!visible)return;
  const x=p.normalizedSlot?placement.x:this.W*slots[p.slot];
  if(p.type<3){const sc=p.normalizedSlot?placement.scale:this.npcScale;p.sprite.setTexture('passengers',p.type*4).setOrigin(.5,1).setScale(sc).setPosition(x,seatAnchoredY(this.seatY,362,[265,270,279][p.type],sc)).setAngle(0).setAlpha(.98);}
  else{const i=p.type-3,m=this.variation[p.chainGesture?'gesture':'seated'][i],sc=placement.scale;p.sprite.setTexture(p.chainGesture?'seatedGesture':'seatedNew',i).setOrigin(m.anchorX/724,1).setScale(sc).setPosition(x,seatAnchoredY(this.seatY,724,m.hip,sc)).setAngle(0).setAlpha(.98);}

 }
 clearChainCaptions(){for(const p of this.spectators){p.chainCaption?.destroy();p.chainCaption=null;}}
 cancelChain(){this.chain=null;this.chainSerial++;this.clearChainCaptions();for(const p of this.spectators){p.chainGesture=false;this.spectatorPose(p);}}
 maybeChain(){
  if(!chainReward(this.count,this.chainLast)||this.phase!=='play')return;
  this.chainLast=this.count;this.chainBonus++;this.cancelChain();const id=++this.chainSerial;this.chain=id;
  this.transient('客氣連鎖 +1',this.W*.5,this.H*.12,'#ffedbd',this.mobile?24:34);
  const actors=this.spectators.filter(p=>p.type>=3&&p.sprite.visible!==false),n=Math.min(actors.length,1+Math.floor(this.count/4));
  actors.slice(0,n).forEach((p,i)=>this.later(i*200,()=>{if(this.chain!==id)return;p.chainGesture=true;this.spectatorPose(p);p.chainCaption=this.add.text(p.sprite.x,this.seatY-this.H*.50,['你先坐！','你也先！','全車先坐！'][i],{fontFamily:'Noto Sans TC,sans-serif',fontSize:`${this.mobile?16:20}px`,fontStyle:'bold',color:'#254938',backgroundColor:'#fff4ce',padding:{x:5,y:3}}).setOrigin(.5).setDepth(7);}));
  this.later(1400,()=>{if(this.chain===id)this.cancelChain();});
 }
 silhouetteX(actor,desired,angle=0){
  const m=actor.paintMeta;if(!m?.bounds)return desired;const [l,t,r,b]=m.bounds,a=m.anchorX-m.x,sc=actor.scaleX,rad=angle*Math.PI/180;
  const xs=actor===this.aunt?[a-r,a-l]:[l-a,r-a],ys=[t-m.height,b-m.height],edges=[];
  for(const x of xs)for(const y of ys)edges.push((x*Math.cos(rad)-y*Math.sin(rad))*sc);
  return Phaser.Math.Clamp(desired,7-Math.min(...edges),this.W-7-Math.max(...edges));
 }
 playerSeatX(){return this.px;}
 paintVacancy(){this.seatGlow.clear();if(this.seated||this.stolen||this.seatReady)return;this.seatGlow.fillStyle(0xffe29b,.5).fillRoundedRect(this.seatX-this.vacancyWidth/2,this.seatY-this.H*.018,this.vacancyWidth,this.H*.075,8).lineStyle(3,0xffefbd,.9).strokeRoundedRect(this.seatX-this.vacancyWidth/2,this.seatY-this.H*.018,this.vacancyWidth,this.H*.075,8);}
 pose(actor,frame){
  if(!actor?.active)return;const isAunt=actor===this.aunt;let key='people',index=(isAunt?6:0)+frame,meta=this.frameData[index],feet=isAunt?492:484,scale=this.baseScale*(isAunt?1.05:1.15);
  if(frame===4){key='hero';index=isAunt?4:1;meta=this.heroFrames[index];feet=meta.feet;scale=this.baseScale;}
  if(frame===5){key=isAunt?'auntV4':'hero';index=2;meta=isAunt?this.auntFrames[2]:this.heroFrames[2];feet=meta.feet;scale=this.baseScale*(isAunt?.72:1);}
  if(frame===6){key='auntV4';index=1;meta=this.auntFrames[1];feet=meta.feet;scale=this.gripPlacement().scale;}
  if(isAunt&&this.partner!=='aunt'&&this.variation){key=this.partner;index=[0,1,2,2,3,5,4][frame];meta=this.variation[key][index];feet=meta.feet;scale=frame===6?this.gripPlacement().scale:this.baseScale*1.05;}
  actor.paintMeta=meta;actor.setTexture(key,index).setScale(scale);const ox=(meta.anchorX-meta.x)/meta.width;actor.setOrigin(isAunt?1-ox:ox,1);actor.pose=frame;
  const height=meta.height;actor.y=frame===4?seatAnchoredY(this.seatY,height,meta.hip,scale):this.floorY+(height-feet)*scale;
  if(frame===6){const p=this.gripPlacement();actor.setPosition(p.x,p.y);}
  actor.restY=actor.y;this.motionLog.push({at:Math.round(this.time.now),who:isAunt?'aunt':'player',frame});if(this.motionLog.length>120)this.motionLog.shift();if(!isAunt)this.paintVacancy();
 }
 sequence(actor,frames,interval=85){frames.forEach((f,i)=>this.later(i*interval,()=>this.pose(actor,f)));}
 transient(text,x,y,color='#ffebae',size){const t=this.add.text(x,y,text,{fontFamily:'Noto Sans TC,sans-serif',fontSize:`${size||(this.mobile?28:42)}px`,fontStyle:'bold',color,stroke:'#6c392d',strokeThickness:5,align:'center'}).setOrigin(.5).setDepth(18).setAngle(-6);this.transients.push(t);this.tweens.add({targets:t,y:y-18,scaleX:1.1,scaleY:1.1,alpha:0,delay:260,duration:600,onComplete:()=>{t.destroy();this.transients=this.transients.filter(v=>v!==t);}});}
 react(kind){for(const p of this.spectators){this.spectatorPose(p);p.reaction?.destroy();if(p.sprite.visible===false)continue;p.reaction=this.add.text(p.sprite.x,this.seatY-this.npcScale*280,kind==='steal'?'！':kind==='repel'?'哈！':this.count>=8?'…':'!',{fontFamily:'Noto Sans TC,sans-serif',fontSize:`${this.mobile?19:25}px`,fontStyle:'bold',color:kind==='steal'?'#a7432e':'#455f43',stroke:'#fff8e5',strokeThickness:4}).setOrigin(.5).setDepth(5);this.tweens.add({targets:p.reaction,alpha:.55,duration:180,yoyo:true,repeat:1});}this.later(1250,()=>{for(const p of this.spectators){p.reaction?.destroy();p.reaction=null;this.spectatorPose(p);}});}
 timing(now=performance.now()){return{atMs:Math.min(30000,Math.max(0,Math.floor(this.roundClock.elapsed(now)))),wallMs:Math.max(0,Math.floor(now-this.wallStartedAt))};}
 recordEvent(type,details={},now=performance.now()){const event={type,...this.timing(now),...details};if(this.trace.length<256)this.trace.push(event);return event;}
 start(){
  if(this.starting||this.tabPaused||ui.help.open||$('rank-dialog')?.open||document.hidden)return;
  this.starting=true;ui.start.disabled=true;ui.restart.disabled=true;ui.offer.disabled=true;ui.thanks.disabled=true;$('help').disabled=true;
  // Unlock audio during the gesture, but do not start time or music while the server prepares a run.
  audio.unlock();this.roundId++;this.time.removeAllEvents();this.tweens.killAll();this.roundClock.pause(performance.now());music.stop();this.phase='starting';
  const launch=run=>{this.startRound(run);this.starting=false;ui.start.disabled=false;ui.restart.disabled=false;if(document.hidden)this.pauseRound();};
  
  launch(null);
 }
 startRound(run=null){
  this.rankingRunId=run?.runId||null;this.rankingSubmitted=false;this.trace=[];this.seatAcceptedAtMs=null;this.seatSettledAtMs=null;this.departureTiming=null;this.threatPlan=Array.isArray(run?.plan)?run.plan.map(event=>({...event})):createThreatPlan(Math.random);this.threatIndex=0;this.pressureThreats=isPressureThreatPlan(this.threatPlan);this.persistentThreats=this.pressureThreats||isEscalatingThreatPlan(this.threatPlan);
  ui.app.classList.remove('is-result');ui.app.classList.remove('is-intro');ui.controls.hidden=false;this.cancelChain();this.chainBonus=0;this.chainLast=0;if(this.variation){this.partner=choosePartner(Math.random(),this.lastPartner);this.lastPartner=this.partner;}this.cancelComicEvent();this.comicUsed=0;this.comicLastAt=0;this.lastComic=null;this.wallStartedAt=performance.now();this.roundClock.start(this.wallStartedAt);this.seatReady=false;music.pausedByGame=false;ui.pause.classList.add('hidden');
  this.roundId++;this.time.removeAllEvents();this.tweens.killAll();this.transients.forEach(t=>t.destroy());this.transients=[];for(const p of this.spectators){p.reaction?.destroy();p.reaction=null;p.sprite.angle=0;this.spectatorPose(p);}
  this.phase='play';this.count=0;this.remaining=30;this.seated=false;this.stolen=false;this.reason=null;this.busy=false;this.cooldown=0;this.cooldownUntil=0;this.threatChance=.65;this.cancelThreat();this.banner.setText('');this.motionLog=[];this.player.setAngle(0).setAlpha(1);this.aunt.setAngle(0).setAlpha(1);this.player.lift=0;this.aunt.lift=0;this.player.pose=2;this.aunt.pose=1;this.layout();
  ui.intro.classList.add('hidden');ui.result.classList.add('hidden');ui.count.textContent='0';ui.clock.textContent='30';ui.timer.classList.remove('timer-hidden');ui.timer.removeAttribute('aria-hidden');ui.clock.nextElementSibling.hidden=false;$('time-label').textContent='發車倒數';ui.offer.disabled=false;ui.thanks.disabled=false;ui.status.textContent='對手：'+PARTNERS.find(p=>p.id===this.partner).name;this.say(PARTNERS.find(p=>p.id===this.partner).reply,1500);$('help').disabled=true;audio.unlock();audio.play('start');music.start();window.courtesyPlatform?.started(this);
 }
 offer(){
  const acceptedNow=performance.now();if(this.syncDeadline(acceptedNow)||this.tabPaused||this.phase!=='play'||this.busy||ui.help.open||document.hidden)return;
  const offerEvent=this.recordEvent('offer',{},acceptedNow);this.cancelComicEvent();this.seatReady=false;this.seatSettledAtMs=null;this.paintVacancy();this.maybeThreat(offerEvent.atMs);this.busy=true;ui.offer.disabled=true;
  const nextCount=this.count+1,lines=partnerLines(this.count,this.partner),motion=courtesyMotion(this.count);
  this.flourish(this.player,motion,1);this.flourish(this.aunt,motion,-1);this.say(lines[0]);ui.status.textContent=lines[0];this.sequence(this.player,[3,2,0,1],65);this.tweens.add({targets:this.player,x:this.px-this.W*motion.reach,duration:240,ease:'Sine.easeInOut'});this.tweens.add({targets:this.aunt,x:this.seatX+this.W*.03,duration:300,ease:'Sine.easeInOut'});this.sequence(this.aunt,[0,2,3,2],85);
  audio.play('offer');this.transient(nextCount>=8?'客氣到極限！':nextCount>=4?'禮貌反擊！':'請！',this.W*.5,this.H*.43);
  this.later(540,()=>{
   if(this.phase!=='play')return;this.say(lines[1]);ui.status.textContent=lines[1];this.sequence(this.aunt,[3,2,0,1],65);this.tweens.add({targets:this.aunt,x:this.ax,duration:270,ease:'Sine.easeInOut'});
   this.tweens.add({targets:this.player,x:this.px,duration:330,ease:'Sine.easeInOut'});this.sequence(this.player,[0,2,3,2],90);audio.play('reply');
   this.later(430,()=>{
    if(this.phase!=='play')return;const completedNow=performance.now();if(this.syncDeadline(completedNow))return;
    this.count=nextCount;ui.count.textContent=String(this.count);this.busy=false;this.seatReady=false;
    this.recordEvent('complete',{seated:false},completedNow);this.paintVacancy();ui.offer.disabled=false;
    if(this.count%3===0)this.react('courtesy');

    this.maybeChain();if(!this.threat&&!this.maybeComicEvent()&&this.count%3===0)this.say('路人：'+passengerQuip(this.count),1400);
   });
  });
 }
 flourish(actor,motion,direction){
  actor.setAngle(0);actor.lift=0;this.tweens.add({targets:actor,angle:motion.angle*direction,duration:145,yoyo:true,repeat:motion.level>=2?1:0});
  if(motion.hop)this.tweens.add({targets:actor,lift:-motion.hop*this.baseScale,duration:130,yoyo:true,repeat:1});
 }
 maybeComicEvent(){
  if(this.seatReady||!canStartComicEvent({count:this.count,remaining:this.remaining,busy:this.busy,threat:!!this.threat,used:this.comicUsed,lastAt:this.comicLastAt}))return false;
  const kind=chooseComicEvent(Math.random(),this.lastComic);if(!kind)return false;return this.startComicEvent(kind);
 }
 startComicEvent(kind){
  if(this.syncDeadline()||this.tabPaused||document.hidden||this.phase!=='play'||this.seatReady||this.comic||!['fake-sit','passenger-urge'].includes(kind)||!canStartComicEvent({count:this.count,remaining:this.remaining,busy:this.busy,threat:!!this.threat,used:this.comicUsed,lastAt:this.comicLastAt}))return false;
  const id=++this.comicSerial;this.comic={id,kind,pose:this.aunt.pose,x:this.aunt.x,angle:this.aunt.angle};this.comicUsed++;this.comicLastAt=this.count;this.lastComic=kind;
  this.say('路人：'+passengerQuip(this.count,kind),1300);this.react('courtesy');
  const step=(ms,fn)=>this.later(ms,()=>{if(this.comic?.id===id&&this.phase==='play')fn();});
  if(kind==='fake-sit'){
   this.transient('假坐！真讓！',this.W*.5,this.H*.43,'#ffebae',this.mobile?26:38);
   this.tweens.add({targets:this.aunt,x:this.seatX+this.W*.035,duration:270,ease:'Sine.easeInOut'});
   for(const [i,frame]of [2,3,4,2,0,1].entries())step(i*150,()=>this.pose(this.aunt,frame));
   step(650,()=>this.tweens.add({targets:this.aunt,x:this.ax,duration:300,ease:'Back.easeOut'}));
  }else{
   this.transient('全車催坐！',this.W*.5,this.H*.43,'#ffebae',this.mobile?26:38);
   this.tweens.add({targets:this.aunt,angle:-9,duration:130,yoyo:true,repeat:2});step(220,()=>this.pose(this.aunt,0));step(500,()=>this.pose(this.aunt,1));
  }
  step(1050,()=>this.cancelComicEvent());return true;
 }
 cancelComicEvent(){
  const old=this.comic;this.comic=null;this.comicSerial++;if(!old)return;
  this.tweens.killTweensOf(this.aunt);this.aunt.lift=0;this.aunt.setAngle(old.angle||0);this.pose(this.aunt,old.pose);this.aunt.x=this.ax;this.clearSpeech();
 }
 maybeThreat(startedAtMs=this.timing().atMs){
  if(this.threat||this.seatReady)return;
  let event;
  while(this.threatIndex<this.threatPlan.length){
   const next=this.threatPlan[this.threatIndex];if(!threatEligible(next,this.count,startedAtMs,this.pressureThreats))return;this.threatIndex++;
   const timing=threatTimingAt(next,startedAtMs,this.pressureThreats);
   if(30000-startedAtMs<timing.windupMs+timing.travelMs+500)continue;event={...next,...timing};break;
  }
  if(!event)return;
  this.cancelComicEvent();const {type,travelMs,windupMs,side}=event;this.lastIntruder=type;this.threat={type,travelMs,duration:(windupMs+travelMs)/1000,windup:windupMs/1000,elapsed:0,startedAtMs,expiresAtMs:startedAtMs+windupMs+travelMs,startedAt:startedAtMs/1000,side};this.tweens.killTweensOf(this.intruder);this.intruder.setVisible(true).setAlpha(1).setAngle(0);this.clearSpeech();ui.notice.hidden=false;ui.hit.setAttribute('aria-label',`點${INTRUDERS[type].name}，阻止搶座`);ui.hit.hidden=false;audio.play('warning');this.react('steal');this.positionIntruder();
 }
 positionIntruder(){
  const t=this.threat;if(!t)return;const windup=t.windup??THREAT_WINDUP,duration=t.duration||THREAT_SECONDS;const moving=t.elapsed>=windup;const progress=Phaser.Math.Clamp((t.elapsed-windup)/(duration-windup),0,1);const speed=threatSpeedLabel(t.travelMs);ui.notice.textContent=moving?`${INTRUDERS[t.type].name}${speed}速衝刺！點他`:`新乘客預警！${INTRUDERS[t.type].name}要搶座，點他`;this.intruder.setAngle(moving?t.side*9:0);const sc=Math.min(this.baseScale*1.25,this.W*.40/280);const edge=sc*181+5;const from=t.side<0?Math.max(this.W*.14,edge):Math.min(this.W*.86,this.W-edge);const x=Phaser.Math.Linear(from,this.seatX,progress*.88);this.intruder.setScale(sc).setFlipX(t.side>0).setFrame(t.type*4+(moving?2:1)).setPosition(x,this.floorY+(362-353)*sc+(moving?Math.sin(t.elapsed*24)*3:0));
  this.threatRing.clear();
  // Keep the original tap rectangle and path; only the painted figure shrinks.
  const bounds=this.intruder.getBounds(),visualScale=sc*INTRUDER_VISUAL_RATIO,footDelta=(sc-visualScale)*(362-353),angle=this.intruder.angle*Math.PI/180;
  this.intruder.setScale(visualScale).setPosition(x+Math.sin(angle)*footDelta,this.intruder.y-Math.cos(angle)*footDelta);
  const width=Math.max(84,bounds.width),height=Math.max(130,bounds.height),left=Phaser.Math.Clamp(bounds.x,0,this.W-width),top=Phaser.Math.Clamp(bounds.y,48,this.H-height);Object.assign(ui.hit.style,{left:`${left}px`,top:`${top+($('game').offsetTop??64)}px`,width:`${width}px`,height:`${height}px`});
 }
 cancelThreat(){this.threat=null;this.threatRing?.clear();this.intruder?.setVisible(false);this.tweens.killTweensOf(this.intruder);ui.hit.hidden=true;ui.notice.hidden=true;}
 repel(){
  const acceptedNow=performance.now();if(this.syncDeadline(acceptedNow)||this.tabPaused||this.phase!=='play'||!this.threat||ui.help.open||document.hidden)return;this.recordEvent('repel',{},acceptedNow);const t=this.threat;this.threat=null;this.cooldown=4.2;this.cooldownUntil=this.roundClock.elapsed(acceptedNow)/1000+4.2;ui.hit.hidden=true;this.threatRing.clear();this.intruder.setFrame(t.type*4+3);ui.notice.textContent=INTRUDERS[t.type].repelled;audio.play('repel');this.react('repel');this.transient('這邊還在客氣！',this.W*.5,this.H*.43,'#fff0b2',this.mobile?24:34);
  this.tweens.add({targets:this.intruder,x:this.W*(t.side<0?-.15:1.15),y:this.intruder.y-14,angle:t.side*12,duration:580,ease:'Back.easeIn',onComplete:()=>this.intruder.setVisible(false)});this.later(1350,()=>{if(!this.threat)ui.notice.hidden=true;});
 }
 steal(){
  if(this.phase!=='play'||!this.threat)return;const type=this.threat.type;this.stolenBy=type;this.threat=null;this.stolen=true;this.seated=false;ui.hit.hidden=true;this.threatRing.clear();ui.notice.hidden=true;const sc=this.baseScale*1.22*INTRUDER_VISUAL_RATIO;this.intruder.setFrame(type*4).setFlipX(false).setAngle(0).setScale(sc).setPosition(this.seatX,seatAnchoredY(this.seatY,362,[280,279,282][type],sc));this.paintVacancy();this.react('steal');this.depart(false,'stolen');
 }
 thank(){
  const acceptedNow=performance.now();if(this.syncDeadline(acceptedNow)||this.tabPaused||this.phase!=='play'||ui.help.open||document.hidden)return;
  this.recordEvent('thanks',{},acceptedNow);this.seatAcceptedAtMs=this.roundClock.elapsed(acceptedNow);this.seated=true;this.seatSettledAtMs=null;this.cancelComicEvent();this.cancelChain();this.phase='seating';this.roundId++;this.cancelThreat();this.busy=true;this.seatReady=false;ui.offer.disabled=true;ui.thanks.disabled=true;this.tweens.killTweensOf(this.player);this.tweens.killTweensOf(this.aunt);this.player.setAngle(0);this.aunt.setAngle(0);this.player.lift=0;this.aunt.lift=0;this.say('謝謝！我就坐了！');ui.status.textContent='謝謝，坐下囉！';
  this.tweens.add({targets:this.player,x:this.seatX,duration:250,ease:'Sine.easeInOut'});this.tweens.add({targets:this.aunt,x:this.gripPlacement().x,duration:220,ease:'Sine.easeInOut'});this.sequence(this.player,[2,3,4],110);this.sequence(this.aunt,[0,6],220);audio.play('reply');
  this.later(300,()=>{
   // Commit the completed animation pose even when a stalled frame runs timers before tweens.
   this.tweens.killTweensOf(this.player);this.player.x=this.seatX;this.pose(this.player,4);
   this.seatReady=true;const settledNow=performance.now(),settledTiming=this.timing(settledNow);this.busy=false;
   // The accepted press already locked success; never recheck its deadline here.
   if(this.seatReady)this.seatSettledAtMs=this.recordEvent('seated',{},settledNow).atMs;
   this.depart(this.seatReady,'thanks',settledTiming);
  });
 }
 depart(seated,reason='timer',timingSnapshot=null){
  if(this.phase==='depart'||this.phase==='result')return;seated=seated===true&&departureIsSafe({accepted:Number.isFinite(this.seatAcceptedAtMs),seatReady:this.seatReady&&this.playerIsSeated(),busy:this.busy});const departed=timingSnapshot||this.timing();this.departureTiming={finishedAtMs:departed.atMs,wallElapsedMs:departed.wallMs};this.cancelComicEvent();this.cancelChain();this.player.lift=0;this.aunt.lift=0;this.phase='depart';ui.controls.hidden=true;this.roundId++;this.busy=true;this.seated=seated;this.reason=reason;if(reason!=='stolen')this.cancelThreat();ui.offer.disabled=true;ui.thanks.disabled=true;ui.timer.classList.remove('timer-hidden');ui.timer.removeAttribute('aria-hidden');$('time-label').textContent='列車狀態';ui.clock.textContent='發車';ui.clock.nextElementSibling.hidden=true;this.clearSpeech();this.banner.setText(seated?'坐好了，出發！':reason==='stolen'?'位子被搶走啦！':'哎呀！發車了！');this.cameras.main.shake(450,seated?.004:.009);audio.play('depart');this.tweens.killTweensOf(this.player);this.tweens.killTweensOf(this.aunt);this.roundClock.pause(performance.now());this.paintVacancy();
  if(seated){this.pose(this.aunt,6);this.pose(this.player,4);this.tweens.add({targets:this.player,angle:3,duration:140,yoyo:true,repeat:3});ui.status.textContent='你坐穩，對手抓穩！';}
  else{this.pose(this.player,5);this.pose(this.aunt,5);this.player.x=this.silhouetteX(this.player,this.W*.34);this.aunt.x=this.silhouetteX(this.aunt,this.W*.72);this.player.angle=0;this.aunt.angle=0;this.tweens.add({targets:this.player,x:this.silhouetteX(this.player,this.W*.29,-8),y:this.player.restY+this.H*.025,angle:-8,duration:580,ease:'Bounce.easeOut'});this.tweens.add({targets:this.aunt,x:this.silhouetteX(this.aunt,this.W*.75,8),y:this.aunt.restY+this.H*.015,angle:8,duration:600,ease:'Bounce.easeOut'});ui.status.textContent=reason==='stolen'?'空位被搶，兩個一起摔！':'沒坐穩，兩個一起摔！';this.later(300,()=>{audio.play('fall');this.transient('咚！',this.W*.34,this.H*.72,'#ffe0ac',this.mobile?38:56);});}
  this.later(1800,()=>this.finish(seated));
 }
 finish(seated){
  this.phase='result';ui.app.classList.add('is-result');music.stop();$('help').disabled=false;this.banner.setText('');const r=resultFor(this.count+this.chainBonus,seated,this.reason);$('rank').textContent=r.grade;$('result-title').textContent=r.title;$('result-comment').textContent=this.reason==='stolen'?INTRUDERS[this.stolenBy].stolen:r.line.replace('阿姨：',PARTNERS.find(p=>p.id===this.partner).name+'：');$('result-count').textContent=String(this.count);$('result-bonus').textContent=this.chainBonus?'連鎖 +'+this.chainBonus:'';$('result-bonus').hidden=!this.chainBonus;$('result-status').textContent=seated?'✓':'哎呀';$('result-status-text').textContent=seated?'安全入座':this.reason==='stolen'?'空位被搶':'屁股落地';$('result-kicker').textContent=seated?'本班列車 · 安全發車':'本班列車 · 禮貌事故';ui.result.classList.remove('hidden');ui.result.scrollTop=0;if($('result-remaining'))$('result-remaining').textContent=seated&&this.seatAcceptedAtMs!==null?'按下謝謝時剩 '+(Math.ceil((30000-this.seatAcceptedAtMs)/10)/100).toFixed(2)+' 秒':'—';if(seated){audio.play('win');}window.courtesyPlatform?.finished(this);
 }
 update(time,delta){
  if(!this.ready)return;const paused=this.tabPaused||document.hidden||ui.help.open;
  if(['play','seating'].includes(this.phase)&&!paused){this.syncDeadline();if(['play','seating'].includes(this.phase)){music.update(this.remaining);const shown=countdownVisible(this.remaining);ui.timer.classList.toggle('timer-hidden',!shown);ui.timer.setAttribute('aria-hidden',String(!shown));ui.clock.textContent=shown?String(Math.ceil(this.remaining)):'';if(this.threat)this.positionIntruder();}}
  if(['intro','play'].includes(this.phase)&&!paused){for(const s of [this.player,this.aunt])s.y=s.restY+(s.lift||0)+(!this.busy?Math.sin(time/450+(s===this.aunt?1.5:0))*this.baseScale*1.4:0);}
  for(const [i,s]of [this.player,this.aunt].entries())this.shadows[i].x=s.x;
  if(this.speech.until&&time>this.speech.until)this.clearSpeech();this.speedLines.clear();if(this.phase==='depart'){this.speedLines.lineStyle(2,0xfff4cf,.35);for(let i=0;i<10;i++){const x=this.W*1.5-(time*.65+i*131)%(this.W*1.5);this.speedLines.lineBetween(x,this.H*(.22+(i%4)*.075),x+this.W*.12,this.H*(.22+(i%4)*.075));}}
  if(!this.lastDiagnostics||time-this.lastDiagnostics>100){this.lastDiagnostics=time;this.writeDiagnostics();}
 }
 writeDiagnostics(){window.courtesyPlatform?.sync(this);const root=$('game');Object.assign(root.dataset,{phaser:Phaser.VERSION,composition:this.mobile?'portrait':'desktop',adultScale:this.baseScale.toFixed(6),audience:String(this.spectators.filter(p=>p.sprite.visible).length),floorY:this.floorY.toFixed(2),phase:this.phase,count:String(this.count),comic:this.comic?.kind||'none',comicUsed:String(this.comicUsed),partner:this.partner,chainBonus:String(this.chainBonus),aligned:String(this.playerIsSeated()),gestureLevel:String(courtesyMotion(this.count).level),seatReady:String(this.seatReady),seatSettledAtMs:this.seatSettledAtMs===null?'':String(this.seatSettledAtMs),paused:String(this.tabPaused),remaining:this.roundClock.remaining(performance.now()).toFixed(3),playerFrame:String(this.player.pose),auntFrame:String(this.aunt.pose),threat:this.threat?INTRUDERS[this.threat.type].name:'none',threatTexture:this.intruder.texture.key,threatElapsed:this.threat?this.threat.elapsed.toFixed(2):'',reason:this.reason||'',timerVisible:String(!ui.timer.classList.contains('timer-hidden')),musicPlaying:String(!music.audio.paused),musicBackend:music.audio.backend||'',musicState:music.audio.state||'',musicLoad:music.audio.loadState||'',musicTime:Number(music.audio.currentTime||0).toFixed(3),musicDuration:Number(music.audio.duration||0).toFixed(3),musicRate:music.audio.playbackRate.toFixed(3),musicBlocked:String(music.blocked),seatY:this.seatY.toFixed(2),playerBounds:JSON.stringify(this.player.getBounds()),auntBounds:JSON.stringify(this.aunt.getBounds())});}
 debugState(){return{phase:this.phase,count:this.count,remaining:this.roundClock.remaining(performance.now()),seatReady:this.seatReady,seatAcceptedAtMs:this.seatAcceptedAtMs,seatSettledAtMs:this.seatSettledAtMs,rankingRunId:this.rankingRunId,paused:this.tabPaused,busy:this.busy,comic:this.comic?.kind||null,comicUsed:this.comicUsed,threat:this.threat,cooldown:this.cooldown,seated:this.seated,reason:this.reason,playerFrame:this.player.pose,auntFrame:this.aunt.pose,motionLog:[...this.motionLog]};}
}
// Native DOM buttons own pointer activation; Phaser keeps keyboard input only.
// Avoid its default touch/wheel preventDefault so browser pinch and page scroll survive.
const parent=$('game');const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:parent.clientWidth,height:parent.clientHeight,transparent:true,antialias:true,scale:{mode:Phaser.Scale.NONE},scene:[CourtesyScene],input:{mouse:false,touch:false},audio:{noAudio:true},render:{powerPreference:'low-power'},banner:false});window.courtesyGame=game;new ResizeObserver(entries=>{const r=entries[0].contentRect;if(r.width>0&&r.height>0)game.scale.resize(Math.round(r.width),Math.round(r.height));}).observe(parent);
