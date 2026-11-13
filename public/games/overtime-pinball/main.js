import {createLotteryStatus} from './lottery-hud.js';
import {LOTTERY_BOX} from './lottery-layout.js';
import {LOTTERY_PRIZES} from './lottery-events.js';
import {createLotteryVisuals} from './lottery-visual.js';
import {createLotteryCoworkers} from './lottery-coworkers.js';
import {lotteryPlacements} from './lottery-placement.js';
import {createOfferStationVisual} from './offer-station-visual.js';
import {mountInteractionOffer} from './overtime-ui.js';
import {overtimePresentation,overtimeCueText,PAY_NAMES} from './overtime-presentation.js';
import {createShadowWorkerVisuals} from './shadow-worker-visual.js';
import {mountReleaseRecovery} from './release-recovery.mjs';
import{recordPlayStart}from'../shared/play-counts.mjs';
import {clipIntroFrame} from './platform-layout.mjs';
import {mountPinballPlatform} from './platform-ui.mjs';
import {placeFeedback} from './feedback-layout.js';
import {openingPose,advanceOpening,openingFinished,poseOpeningBoss,openingContact,openingFlight} from './opening.js';
import {createStationLabels} from './station-labels.js';
import {clockCue} from './clock-cue.js';
import {bossPath} from './round-rules.js';
import {RoundOptions} from './round-options.js';
import {bossVisualState} from './boss-visual.js';
import {installViewportRecovery} from './viewport-recovery.js';
import {buildComboOffice} from './combo-office.js';
import {COMBO_ROUTES} from './combo-routes.js';
import {buildAssists} from './assist-office.js';
import {JetWake} from './jet-wake.js';
import {GameAudio} from './game-audio.js';
import {buildOfficeStory} from './office-stories.js';
import {DOOR,buildDoor,buildCompanySign} from './company-design.js';
import {specialFeedback} from './special-feedback.js';
import {buildSpecialStation} from './special-office.js';
import {canvasSize,fitLabelFont,renderRatio} from './text-layout.js';
import {buildMailOffice} from './mail-office.js';
import {mailPhase} from './mail-run.js';
import {buildDispatchCourt} from './dispatch-court.js';
import {setupPlayLayout,playFrame,blendPlayFrame,playSafeInsets} from './play-layout.js';
import {setupIntro,introFrame as originalIntroFrame,fittedIntro} from './intro.js';
const introFrame=()=>clipIntroFrame(originalIntroFrame(),innerHeight,document.querySelector('.pf-header')?.getBoundingClientRect().height||0);
import {WINDOWS,LAMPS} from './board-features.js';
import {buildOfficeFeatures,stableWindow} from './office-features.js';
import {predictLanding} from './prediction.js';
import * as T from './vendor/three.module.min.js';
import {Game,STEP,BUMPERS,FIELD,FLIPPER,flipperSegment,clamp} from './physics.js';
import {StableRig,overviewPose,controlSide,SLOPE} from './camera.js';
import {createCharacter,poseCharacter} from './character.js';
import {chairRenderPose,busyRenderHeight,busyRenderForward,launcherRenderHeight,updateWaterJet,coffeeRenderHeight,keepLauncherFeetAboveSurface,keepCoffeeFeetAboveFloor} from './render-proportions.js';
import {ACTIVITIES,activityFor,stageYaw} from './activities.js';
import {successfulInteraction} from './interactions.js';
import {ActorVisibility} from './occlusion.js';
if(parent!==window)document.body.classList.add('embedded-game');
const view=new URLSearchParams(location.search).get('view')==='original'?'original':'reverse';
const cameraRig=new StableRig(view);
const cameraPose=(w,h,mode,b)=>{if(mode==='intro'){const frame=introFrame();return frame?fittedIntro(frame.w,frame.h,view):overviewPose(w,h,view);}const f=playFrame(),r=new StableRig(view);r.reset(b);return r.update(0,f.w,f.h,b,null,null,comfort,{portrait:w<h,...playSafeInsets()});};
const physicalSide=side=>controlSide(side,view),physicalInput=()=>view==='reverse'?{left:input.right,right:input.left}:input;
let roundStorage;try{roundStorage=localStorage;}catch{}
const roundOptions=new RoundOptions(roundStorage);
const $=id=>document.getElementById(id),game=new Game({view,random:Math.random,roundLimit:roundOptions.limit}),input={left:false,right:false};
let interactionOfferUI;
let overtimeVisuals,lastShadowSound=-Infinity,shadowAwardPending=0,shadowAwardAt=0;
let lotteryVisuals,lotteryCoworkers,offerStationVisual,stationLabels,renderer,scene,camera,office,person,shadow,flipperMeshes={},bumperGroups={},particles=[],clock=0,accumulator=0,mode='intro',introTime=0,best=0,transition=0,interactionsOn=true,cinematicTime=0,cinematicStart=null,followAnchor=new T.Vector3(),pausedMode='playing',comicUntil=0;
const stats={frames:0,maxDrawCalls:0,lastEffect:null,visibility:null};
const gameAudio=new GameAudio();let jetWake,platform;
let comboOffice,assistOffice,mailOffice,economy=false,features,visibility,activityProps={},landingMarker,landingLine,lastPrediction=-1;
const stableWindows=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let comfort=reduced;
best=roundOptions.best();
const money=n=>'$'+Math.floor(n).toLocaleString('en-US');$('bestIntro').textContent='個人最高 '+money(best);
const C={ink:0x172c32,cream:0xeee7c8,teal:0x458b82,mint:0xa5c4b1,yellow:0xf3ce62,orange:0xef8b64,blue:0x7baec1};
const materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new T.MeshToonMaterial({color}));return materials.get(color);}
function shape(geo,color,parent=office,x=0,y=0,z=0){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.occludes=true;parent.add(m);const outline=new T.LineSegments(new T.EdgesGeometry(geo,28),new T.LineBasicMaterial({color:C.ink}));m.add(outline);return m;}
function box(w,h,d,color,parent,x=0,y=0,z=0){return shape(new T.BoxGeometry(w,h,d),color,parent,x,y,z);}
function cylinder(r,h,color,parent,x=0,y=0,z=0,segments=12){return shape(new T.CylinderGeometry(r,r,h,segments),color,parent,x,y,z);}
function sphere(r,color,parent,x=0,y=0,z=0){return shape(new T.SphereGeometry(r,12,8),color,parent,x,y,z);}
function label(text,w,h,color='#193a3c',bg='#f0e9c9'){
 const canvas=document.createElement('canvas'),size=canvasSize(w,h);canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,size.width,size.height);ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,size.height*.035);const inset=ctx.lineWidth;ctx.strokeRect(inset,inset,size.width-inset*2,size.height-inset*2);ctx.fillStyle=color;const font=fitLabelFont(text,size,n=>{ctx.font=`900 ${n}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;return ctx.measureText(text).width;});ctx.font=`900 ${font}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,size.width/2,size.height*.53);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.FrontSide}));m.userData.occludes=true;m.userData.text=text;m.userData.labelType='world';m.userData.textMetrics={...size,font};return m;
}
function floorLabel(text,x,z,w=3,h=.7,bg){const m=label(text,w,h,'#234344',bg);m.rotation.x=-Math.PI/2;m.rotation.z=view==='reverse'?0:Math.PI;m.userData.labelType='floor'; m.position.set(-x,.065,z);m.userData.occludes=false;office.add(m);return m;}
const character=createCharacter;
function buildOffice(){
 office=new T.Group();office.rotation.x=SLOPE;scene.add(office);
 // A full office floor, not a raised tabletop. The grid is one texture/draw call.
 const tile=document.createElement('canvas');tile.width=256;tile.height=256;const ctx=tile.getContext('2d');ctx.fillStyle='#c8d0b7';ctx.fillRect(0,0,256,256);ctx.fillStyle='#bfc9ae';ctx.fillRect(0,0,128,128);ctx.fillRect(128,128,128,128);ctx.strokeStyle='#7d958b';ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);ctx.beginPath();ctx.moveTo(128,0);ctx.lineTo(128,256);ctx.moveTo(0,128);ctx.lineTo(256,128);ctx.stroke();const tex=new T.CanvasTexture(tile);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(9,17);tex.colorSpace=T.SRGBColorSpace;
 const floor=new T.Mesh(new T.PlaneGeometry(36,70),new T.MeshToonMaterial({map:tex}));floor.rotation.x=-Math.PI/2;floor.position.z=15;floor.receiveShadow=true;office.add(floor);
 for(const x of [-18.3,18.3]){
  for(const [z,len] of [[6,52],[43,14]]){box(.6,2,len,C.teal,office,x,1,z);box(.7,.16,len,C.cream,office,x,2.03,z);}
  for(let z=-18;z<45;z+=12){stableWindow(box(.5,7,.6,C.cream,office,x,3.5,z),1,stableWindows);const glass=box(.18,3.8,z===30?4:9,0x94bbba,office,x,4.1,z===30?38.3:z+5.8);glass.material=new T.MeshBasicMaterial({color:0x94bbba});stableWindow(glass,.28,stableWindows);for(const zz of [z+2,z+6,z+10].filter(v=>v<32||v>=36))stableWindow(box(.25,3.9,.14,C.teal,office,x+(x>0?-.15:.15),4.1,zz),1,stableWindows);}
 }
 buildDispatchCourt({T,office,label,C,view});buildCompanySign({T,office,box,cylinder,label});
 // Structural beams, lights and office zone signs give the room scale and depth.
 const ceiling=new T.Group();ceiling.name='ceiling';office.add(ceiling);for(const z of [-12,10,32]){box(36.6,.35,.45,C.cream,ceiling,0,7.6,z);for(const x of [-8,8])box(5,.12,.65,0xfff3c8,ceiling,x,7.35,z);}
 features=buildOfficeFeatures({T,office,box,cylinder,label,C,view,stableWindows});assistOffice=buildAssists({T,office,box,cylinder,label,C,view});
 for(const x of [-13.6,13.6]){box(9,.9,.7,DOOR.navy,office,x,.45,46.5);box(9,.12,.8,DOOR.brass,office,x,.96,46.5);}
 box(17.4,.03,4,DOOR.glass,office,0,.025,48);floorLabel('出口 ↓',0,47.7,9,2.2,'#90c6cb');
 for(const x of [-8.8,8.8])box(.5,6,.6,C.cream,office,x,3,49);box(18.2,.5,.6,C.teal,office,0,6,49).name='gateLintel';
 const exit=label('下班出口｜老闆很期待',13,1.5,'#133738','#eec65b');exit.name='gateSign';exit.position.set(0,5.7,48.6);exit.rotation.y=view==='reverse'?0:Math.PI;office.add(exit);
 for(const sign of [-1,1]){const m=box(.7,.65,Math.hypot(5.9,9),DOOR.navy,office,-sign*14.75,.4,38.5);m.rotation.y=Math.atan2(sign*5.9,9);m.name='rescueGuide-'+sign;m.userData.occlusionMode='keep';}
 for(const o of BUMPERS){const g=new T.Group();g.position.set(-o.x,0,o.z);office.add(g);bumperGroups[o.id]=g;
  const ring=new T.Mesh(new T.RingGeometry(o.r+.05,o.r+.18,32),new T.MeshBasicMaterial({color:o.type==='water'?C.blue:C.yellow,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;g.add(ring);
  const model=new T.Group();model.name='mechanism';model.rotation.y=stageYaw(view);g.userData.stationId=o.id;g.add(model);
  if(o.theme){g.userData.specialAnimate=buildOfficeStory({T,model,type:o.theme,box,cylinder,label,C});
  }else if(['shredder','server'].includes(o.type)){g.userData.specialAnimate=buildSpecialStation({T,model,type:o.type,box,cylinder,label,C});
  }else if(o.type==='copier'){
   model.scale.set(1.9,1.9*.85,1.9);const copierY=1.9*.85*(o.visualScale||1);box(1.65,1.4,1.7,C.cream,model,0,.85,0);box(1.8,.22,1.8,C.ink,model,0,1.61,0);const lid=box(1.5,.1,1.45,C.mint,model,0,1.76,.06);lid.name='lid';box(.7,.12,.45,C.teal,model,-.65,1.65,-.65).rotation.x=.2;
   for(let i=0;i<3;i++){box(1.3,.04,.08,C.ink,model,0,.5+i*.33,-.88);box(.28,.09,.08,C.teal,model,0,.6+i*.33,-.91);}box(1.1,.08,.7,C.ink,model,0,1.57/copierY,-1.1).name='copierTray';box(.85,.025,.75,0xfff9df,model,0,1.7/copierY,-1.4).name='copierOutputPaper';const notice=label('卡紙',1.4,.45,'#173436','#f8ce63');notice.name='readable-copier';notice.position.set(0,1.28,-1.02);notice.rotation.y=Math.PI;model.add(notice);
  }else if(o.type==='water'){
   model.scale.setScalar(1.8);box(.95,1.8,.9,C.cream,model,0,.92,0);cylinder(.43,.95,C.blue,model,0,2.28,0);cylinder(.25,.12,C.ink,model,0,2.8,0);box(.6,.5,.06,C.ink,model,0,1.07,-.48);for(const s of [-1,1])box(.12,.14,.24,s===1?C.orange:C.blue,model,s*.26,1.16,-.58).name=s===-1?'waterTapLeft':'waterTapRight';cylinder(.14,.22,C.cream,model,0,.8,-.45);const notice=label('接水',1.15,.45);notice.name='readable-water';notice.rotation.y=Math.PI;notice.position.set(0,1.62,-.49);model.add(notice);
  }else if(o.type==='chair'){
   model.scale.setScalar(1.6);const seat=new T.Group();seat.name='swivel';model.add(seat);cylinder(.11,.94,C.ink,seat,0,.57,0).name='chairShaft';box(1.05,.14,.9,C.orange,seat,0,1.1,0).name='chairSeat';box(1.05,.9,.18,C.orange,seat,0,1.62,.38);for(let i=0;i<5;i++){const a=i*Math.PI*2/5,m=box(.13,.13,1.4,C.ink,seat,0,.25,0);m.rotation.y=a;sphere(.14,C.ink,seat,Math.sin(a)*.68,.2,Math.cos(a)*.68);}
  }else if(o.type==='desk'){
   model.scale.setScalar(1.9);box(1.8,.16,1.5,0xd5a771,model,0,1.25,0);for(const x of [-.7,.7])box(.13,1.2,1.1,C.ink,model,x,.65,0);const monitor=box(1.2,.75,.12,C.ink,model,0,1.82,.2);monitor.name='monitor';box(1.05,.55,.02,C.blue,model,0,1.85,.125);box(.12,.4,.13,C.ink,model,0,1.47,.2);box(.7,.04,.36,C.cream,model,0,1.36,-.55).name='keyboard';const mug=cylinder(.13,.3,C.orange,model,.61,1.48,-.2);mug.name='coffeeMug';const display=label('99%',1.05,.5,'#12363c','#a3d6ba');display.name='readable-desk';display.rotation.y=Math.PI;display.position.set(0,1.85,.11);model.add(display);
  }else if(o.type==='launcher'){model.add(assistOffice.models.center.root);assistOffice.models.center.root.position.set(0,0,0);assistOffice.models.center.root.rotation.y=-stageYaw(view);
  }else{const boss=character(true);boss.name='bossBody';boss.position.y=1.34;boss.rotation.y=view==='reverse'?0:Math.PI;model.add(boss);const bubble=label('還不下班？！',4.4,1,'#173136','#f6ca68');bubble.name='readable-boss';bubble.rotation.y=Math.PI;bubble.position.set(0,5.25,-.05);model.add(bubble);}
  model.scale.multiplyScalar(o.visualScale||1);
 }
 for(const side of ['left','right']){const g=new T.Group();g.userData.occlusionMode='keep';office.add(g);buildDoor({T,g,box,cylinder,length:FLIPPER.length,side});flipperMeshes[side]=g;}
 // Character size remains human-sized while the room is ~13x the old floor area.
 person=character();person.rotation.y=Math.PI;office.add(person);
 overtimeVisuals=createShadowWorkerVisuals({T,office});
 comboOffice=buildComboOffice({T,office,label,view});buildActivityProps();mailOffice=buildMailOffice({T,office,label,C,view});
 buildLandingCue();
 shadow=new T.Mesh(new T.CircleGeometry(.72,24),new T.MeshBasicMaterial({color:C.ink,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;office.add(shadow);
 const ground=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshBasicMaterial({color:0x577b78}));ground.rotation.x=-Math.PI/2;ground.position.y=-4;scene.add(ground);
}
function sound(kind,activity){gameAudio.play(kind,activity);}
let comicPriority=0,lastImpact=-1;
function comic(text,priority=1){if(clock<comicUntil&&priority<comicPriority)return;comicPriority=priority;$('comic').textContent=text;$('comic').dataset.tier=priority;$('comic').classList.remove('pop');void $('comic').offsetWidth;$('comic').classList.add('pop');comicUntil=clock+(priority>=2?1.5:.7);}

function burst(x,z,kind='copier',big=false){if(reduced||!big&&clock-lastImpact<.14)return;if(!big)lastImpact=clock;const colors={clock:C.cream,microwave:C.orange,parcel:C.cream,copier:C.cream,shredder:C.cream,server:C.mint,water:C.blue,chair:C.orange,desk:C.yellow};for(let i=0;i<(big?18:4);i++){const paper=['copier','shredder','parcel','clock'].includes(kind),mesh=box(paper?.42:.16,paper?.025:.16,paper?.6:.25,colors[kind]||C.yellow,office,-x,1,z);particles.push({mesh,v:new T.Vector3(Math.sin(i*2.4)*(big?7:4),4+i*.12,Math.cos(i*2.4)*4),life:big?1.4:1});}}
function buildActivityProps(){
 const root=new T.Group();root.name='activityProps';office.add(root);activityProps.root=root;
 const puddle=new T.Mesh(new T.CircleGeometry(1,32),new T.MeshToonMaterial({color:0x744b32,side:T.DoubleSide}));puddle.rotation.x=-Math.PI/2;puddle.scale.set(1.3,.7,1);puddle.position.set(0,.04,-2.3);root.add(puddle);activityProps.puddle=puddle;
 const stool=new T.Group();root.add(stool);box(1.15,.15,1.1,C.teal,stool,0,1.82,-1.85);for(const x of [-.42,.42])for(const z of [-2.25,-1.45])box(.1,1.7,.1,C.ink,stool,x,.85,z);activityProps.stool=stool;
 const paper=new T.Group();root.add(paper);for(let i=0;i<6;i++){const m=box(.5,.025,.38,C.cream,paper,0,1.5,-1.3-i*.31);m.rotation.x=(i%2?1:-1)*.17;}activityProps.paper=paper;
 const jet=new T.Group();root.add(jet);for(let k=0;k<9;k++){const drop=sphere(.07,C.blue,jet,Math.sin(k)*.12,2.15-k*.04,-1.1-k*.17);drop.userData.occludes=false;}activityProps.jet=jet;
 const stamp=label('再改一版！',2,.6,'#983a37','#f5e4bc');stamp.name='readable-stamp';stamp.rotation.y=Math.PI;stamp.position.set(0,4.6,-1.8);root.add(stamp);activityProps.stamp=stamp;root.visible=false;
}
function buildLandingCue(){
 landingMarker=new T.Group();landingMarker.name='landingMarker';office.add(landingMarker);
 const ring=new T.Mesh(new T.RingGeometry(.8,1.05,32),new T.MeshBasicMaterial({color:C.yellow,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;landingMarker.add(ring);
 for(const angle of [0,Math.PI/2]){const line=new T.Mesh(new T.PlaneGeometry(.14,2.7),new T.MeshBasicMaterial({color:C.ink,transparent:true,opacity:.8,side:T.DoubleSide}));line.rotation.set(-Math.PI/2,0,angle);line.position.y=.015;landingMarker.add(line);}
 landingLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:C.yellow,transparent:true,opacity:.65,dashSize:.5,gapSize:.35}));office.add(landingLine);landingMarker.visible=landingLine.visible=false;
}
function updateLanding(){
 const show=mode==='playing'&&!game.interaction&&!game.mailRun&&!game.round.ending&&!game.round.reentry&&cameraRig.gate;
 if(!show){stats.landing=null;landingMarker.visible=landingLine.visible=false;return;}
 if(clock-lastPrediction>.1){lastPrediction=clock;stats.landing=predictLanding(game.ball,game.flippers,game);if(stats.landing){const p=stats.landing;landingMarker.position.set(-p.x,.12,p.z);landingLine.geometry.dispose();landingLine.geometry=new T.BufferGeometry().setFromPoints(p.points.map(v=>new T.Vector3(-v.x,.1,v.z)));landingLine.computeLineDistances();}}
 landingMarker.visible=landingLine.visible=!!stats.landing;landingMarker.scale.setScalar(reduced?1:1+Math.sin(clock*5)*.06);
}
let releaseRecovery;
function consumeEvents(){for(const e of game.drainEvents()){
 if(e.type==='overtimeCue'&&e.cue!=='word'){const text=overtimeCueText(e.cue);if(text){comic(text,['frenzy','approved'].includes(e.cue)?3:2);$('joke').textContent=text;if(['frenzy','approved'].includes(e.cue))sound('major');}}
 if(e.type==='shadowHit'){const group=bumperGroups[e.stationId];if(group)group.userData.pulse=.35;if(clock-lastShadowSound>=.12){sound('hit');lastShadowSound=clock;}}
 if(e.type==='overtimeAward'&&e.category==='clones'){shadowAwardPending+=e.points||0;}

 if(e.type==='interactionError'){clearInput();mode='error';accumulator=0;gameAudio.setState(mode);$('activityPanel').hidden=true;$('controls').hidden=true;releaseRecovery.show();}
 if(e.type==='reentryStart'){clearInput();jetWake?.clear();comic('下班失敗！偷偷溜回公司',2);sound('cue');$('joke').textContent='不扣分 · 連擊中斷 · 倒數繼續';}
 if(e.type==='reentryEnd'){clearInput();comic('我還能再加班！');sound('boost');$('joke').textContent='重返成功！重新開始連擊';}
 if(e.type==='opportunity')sound('cue');
 if(e.type==='lotteryDraw'){sound('cue');comic('尾牙摸彩！人人有獎！',.8);}
 if(e.type==='lotteryStarted'){sound('major');comic(LOTTERY_PRIZES[e.prize].label+'！',1.5);}
 if(e.type==='lotteryExpired')comic('摸彩充電：碰三種設備再來！',1.2);
 if(e.type==='lotteryCharge'&&e.ready){sound('cue');comic('尾牙摸彩箱又亮了！',1);}
 if(e.type==='lotteryChain'){lotteryVisuals?.consume(e,game.playClock);for(const id of e.targets||[])if(bumperGroups[id])bumperGroups[id].userData.pulse=.5;}

 if(e.type==='centralReady')sound('cue');
 if(e.type==='centralArmed'){sound('cue');$('joke').textContent='公文台預備！碰到才起飛';}
 if(e.type==='timeWarning'){comic('最後5秒！老闆拿出下班章！');sound('cue');}
 if(e.type==='timeUp'){clearInput();comic('時間到！老闆親自送你下班！');sound('cue');}
 if(e.type==='forcedKick'){comic('強制下班！公司附贈空運！');sound('save');burst(game.ball.x,game.ball.z,'copier',true);}
 if(e.type==='bossWarning'){comic('主管巡視預告！注意黃色巡線');sound('cue');}
 if(e.type==='bossKick'){comic('老闆：下班！你：我還能救！');sound('save');burst(game.ball.x,game.ball.z,'copier');}
 if(e.type==='routeRewardStart'){sound('cue');comic('軌道掉寶！10秒內搶加班福利！');}
 if(e.type==='routeReward'){sound('boost');comic(e.label+' 到手！ +'+e.points);burst(e.x,e.z,'copier',true);}
 if(e.type==='comboRouteComplete'){sound('major');comic(e.title+'！ +'+e.points,3);burst(game.ball.x,game.ball.z,'copier',true);}
 if(e.type==='comboRouteStart')$('joke').textContent=e.title+'：沿亮起路線接下一站';
 if(e.type==='comboRouteSave')$('joke').textContent='打卡成功！L／R 救回來拿連擊獎金';
 if(e.type==='assistKick'){sound('save');comic('退件反攻 +'+e.points);}
 if(e.type==='mailStart'){sound('routeEntry');comic('急件！人也一起轉寄！');$('joke').textContent='兩側皆可轉寄，另一側回球';}
 if(e.type==='mailBoost'){sound('cue');comic(e.label+'！人比公文先到！');}
 if(e.type==='mailExit'){sound('boost');comic('咻！本人急件退回 +350');burst(game.ball.x,game.ball.z,'copier');}
 if(e.type==='workflowStart'){sound('major');comic('版本錯了！全部退件！ +1800',3);$('joke').textContent='接下來6秒，撞設備額外+300（最多3次）';}
 if(e.type==='workflowHit'){sound('cue');comic('退件獎金 +300');}
 if(e.type==='lamp'){sound('cue');comic('「'+e.label+'」亮了！');}
 if(e.type==='lampHit'&&!e.newlyLit){sound('hit');$('joke').textContent='「'+e.label+'」再裝一次 +'+e.points;}
 if(e.type==='bonusStart'){sound('major');comic('假裝很忙！老闆找不到門！ +1500',3);burst(0,42,'copier',true);}
 if(e.type==='bonusEnd')comic('門開了！繼續救球！');
 if(e.type==='gateSave'){sound('save');comic('公司鐵門，幫你加班！');}
 if(e.type==='window'){features.flash(e.id);sound('hit');}
 if(e.type==='propHit')sound('hit');
 if(e.type==='hit'){sound('hit');burst(game.ball.x,game.ball.z,BUMPERS.find(o=>o.id===e.id)?.type);const g=bumperGroups[e.id];if(g)g.userData.pulse=.65;stats.lastEffect=e.id;}
 if(e.type==='interactionPull'){sound('hit');if(game.interaction?.activity==='coffee')burst(game.ball.x,game.ball.z,'water');}
 if(e.type==='interactionLaunch'&&successfulInteraction(e))burst(e.station.x,e.station.z,e.station.theme||e.station.type,true);
 if(e.type==='interactionStart'){if(e.activity.id==='launcher')burst(e.station.x,e.station.z,'copier',true);$('joke').textContent=e.activity.phases[0];sound('hit');comic(e.activity.title+'！');stats.lastEffect=e.activity.id;}
 if(e.type==='interactionBeat')$('joke').textContent=e.activity.phases[e.phase];
 if(e.type==='interactionEnd'){stats.lastResult=e.result;stats.lastAward=e.points;const success=successfulInteraction(e),jokes={clock:'打卡三次，人還在公司！',copier:'完美影印！往碎紙機連鎖！',coffee:'地板亮了，員工滑了！',busy:'進度99%，手速100%！',water:'完美補水！往影印機衝！',chair:'完美轉職！往飲水機滑！',parcel:'收件人：明天的自己！',microwave:'便當升溫，人升空！',shredder:'薪水救回，預算碎滿地！',server:'系統復活，工程師起飛！',boss:'主管用腳蓋章！',launcher:'公文比本人先到！'};comic((success?jokes[e.activity.id]||e.activity.phases[2]:'差一點，彈回去再來！')+' +'+e.points,['copier','chair','water'].includes(e.activity.id)?1.1:success?2:1);if(success)sound('success',e.activity.id);else sound('hit');$('joke').textContent=success?'獎金入袋！':'準備救球';const g=bumperGroups[e.station.id];if(g)g.userData.pulse=success?1.2:.4;}
 if(e.type==='save'){comic((e.precise?'精準救球！ +':'續命成功 +')+e.points);sound('save');burst(game.ball.x,game.ball.z,'chair',true);}
 if(e.type==='over')endGame();
}}
function clearRoundVisuals(){interactionOfferUI?.hide();overtimeVisuals?.update([]);shadowAwardPending=0;shadowAwardAt=0;jetWake?.clear();for(const p of particles){office.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.children.forEach(o=>{o.geometry?.dispose();o.material?.dispose();});}particles.length=0;$('comic').classList.remove('pop');comicUntil=0;comicPriority=0;$('activityPanel').hidden=true;}
function returnHome(){releaseRecovery?.hide();platform?.reset();clearInput();clearRoundVisuals();mode='intro';gameAudio.setState(mode);game.reset();game.interactionsEnabled=interactionsOn;accumulator=0;cameraRig.reset(game.ball);for(const id of['results','pauseScreen','hud','controls','pause','launch','skipOpening'])$(id).hidden=true;for(const id of['intro','sceneLabel','footer'])$(id).hidden=false;document.body.classList.remove('playing');syncRecordNotice();$('start').focus({preventScroll:true});}
function openingKick(){if(cinematicStart.kicked)return;cinematicStart.kicked=true;cinematicStart.impactAt=cinematicTime;game.start();game.interactionsEnabled=interactionsOn;cinematicStart.launch={...game.ball};sound('kick');$('launch').textContent='碰！這一腳算公司福利';}
function completeOpening(){if(mode!=='cinematic')return;openingKick();clearInput();mode='playing';transition=0;accumulator=0;cameraRig.reset(game.ball);const goal=cameraPose(innerWidth,innerHeight,'playing',game.ball);camera.position.set(...goal.position);camera.userData.look.set(...goal.target);camera.fov=goal.fov;for(const id of['launch','skipOpening'])$(id).hidden=true;$('controls').hidden=false;$('joke').textContent='守住門，獎金靠本事！';}
function beginCinematic(){releaseRecovery?.hide();platform?.reset();game.roundLimit=roundOptions.limit;best=roundOptions.best();gameAudio.unlock();clearRoundVisuals();document.body.classList.add('playing');game.reset();game.interactionsEnabled=interactionsOn;mode='cinematic';gameAudio.setState(mode);cinematicTime=0;accumulator=0;cameraRig.reset(game.ball);clearInput();cinematicStart={kicked:false,impactAt:null,launch:null};const frame=playFrame(),full=cameraPose(innerWidth,innerHeight,'playing',game.ball),pose=openingPose(full,frame.w,frame.h,0,comfort,null);camera.position.set(...pose.position);camera.userData.look.set(...pose.target);camera.fov=pose.fov;for(const id of['intro','sceneLabel','footer','results','pauseScreen','controls'])$(id).hidden=true;for(const id of['hud','pause','launch','skipOpening'])$(id).hidden=false;$('launch').textContent='老闆：下班！現在！';$('stationHint').textContent='老闆準備送你下班';$('joke').textContent='鏡頭就位後開始計時';void recordPlayStart(window,'overtime-pinball');}
function syncRecordNotice(){for(const id of ['introStorageNotice','resultStorageNotice','settingsStorageNotice']){const el=$(id),limit=id==='resultStorageNotice'?game.round.limit:roundOptions.limit;el.hidden=!roundOptions.sessionOnly(limit);el.textContent=el.hidden?'':'無法永久儲存：最高分僅保留於本次開啟頁面，重新載入或關閉後不會保留。';}}
function endGame(){mode='over';gameAudio.setState(mode);clearInput();$('activityPanel').hidden=true;$('controls').hidden=true;$('pause').hidden=true;$('results').hidden=false;$('finalScore').textContent=money(game.score);const payNames=PAY_NAMES;$('payroll').innerHTML=Object.entries(game.payroll).map(([key,value])=>'<div><span>'+payNames[key]+'</span><b data-income="'+value+'">'+money(value)+'</b></div>').join('');$('finalTime').textContent=game.time.toFixed(1);$('finalHits').textContent=game.hits;$('finalSaves').textContent=game.saves;$('finalActivities').textContent='完成 '+game.completedActivities+' 段加班小劇場';best=roundOptions.best(game.round.limit);const record=game.score>best;best=roundOptions.record(game.score,game.round.limit);$('finalRoundMode').textContent=(game.round.limit?game.round.limit/60+'分鐘模式':'不限時模式')+' · '+(game.round.reason==='time'?'時間到，老闆強制送出門':'掉出門下班')+(game.round.limit?' · 重返 '+game.round.reentries+' 次':'');$('record').textContent=(record?'新紀錄！ ':'個人最高 ')+money(best);$('bestIntro').textContent='本模式最高 '+money(roundOptions.best());syncRecordNotice();sound('over');$('results').querySelector('.panel').scrollTop=0;platform?.settle();}
function pause(reason='工時與倒數都暫停了。'){if(!['playing','cinematic'].includes(mode))return;$('pauseScreen').querySelector('.pause-copy p').textContent=reason;pausedMode=mode;mode='paused';gameAudio.setState(mode);clearInput();$('pauseScreen').hidden=false;$('skipOpening').hidden=true;$('resume').focus();}
function resume(){if(mode!=='paused'||!checkOrientation().canResume)return;gameAudio.unlock();mode=pausedMode;gameAudio.setState(mode);accumulator=0;$('pauseScreen').hidden=true;$('skipOpening').hidden=mode!=='cinematic';}
const pointers={left:new Set(),right:new Set()},keys={left:new Set(),right:new Set()};
function clearInput(){interactionOfferUI?.hide();for(const side of ['left','right']){input[side]=false;const captured=[...pointers[side]];pointers[side].clear();keys[side].clear();for(const id of captured)if($(side).hasPointerCapture(id))$(side).releasePointerCapture(id);$(side).classList.remove('active');}game.arming=null;game.cancelInput();}
function press(side,on){if(!['playing','cinematic'].includes(mode)||game.round.ending||game.round.reentry||$('roundDialog').open)on=false;const rising=on&&!input[side];if(!on&&input[side])game.releaseFlipper(physicalSide(side));input[side]=on;$(side).classList.toggle('active',on);if(rising)game.tapFlipper(physicalSide(side));}
function checkOrientation(){return {blocked:false,pause:false,canStart:true,canResume:mode==='paused'};}

function syncRoundOptions(){
 const text=(roundOptions.limit?roundOptions.limit/60+' 分鐘':'不限時')+' · '+(roundOptions.sideways?'側轉開':'側轉關');document.querySelectorAll('.round-mode-label').forEach(e=>e.textContent=text);document.querySelectorAll('[data-home-limit]').forEach(e=>e.setAttribute('aria-pressed',String(Number(e.dataset.homeLimit)===roundOptions.limit)));document.querySelectorAll('[data-home-orientation]').forEach(e=>e.setAttribute('aria-pressed',String((e.dataset.homeOrientation==='on')===roundOptions.sideways)));$('homeRuleHint').textContent=roundOptions.limit?'出門可重返、不扣分；操作設備時倒數照走，過場暫停。':'沒有倒數，掉出門才下班。';$('roundLimit').value=String(roundOptions.limit);$('orientationMode').value=roundOptions.sideways?'on':'off';$('bestIntro').textContent='本模式最高 '+money(roundOptions.best());syncRecordNotice();checkOrientation();
}
function notifySideways(){if(parent!==window)parent.postMessage({type:'overtime:sideways',enabled:roundOptions.sideways},location.origin);}
function bindRoundOptions(){
 document.querySelectorAll('[data-home-limit]').forEach(el=>el.onclick=()=>{roundOptions.set({limit:Number(el.dataset.homeLimit)});syncRoundOptions();});document.querySelectorAll('[data-home-orientation]').forEach(el=>el.onclick=()=>{roundOptions.set({sideways:el.dataset.homeOrientation==='on'});clearInput();syncRoundOptions();notifySideways();});
 let opener;document.querySelectorAll('[data-round-settings]').forEach(el=>el.onclick=()=>{pause();clearInput();opener=el;syncRoundOptions();$('roundDialog').showModal();});
 $('roundClose').onclick=()=>$('roundDialog').close();$('roundDialog').addEventListener('close',()=>{clearInput();checkOrientation();opener?.focus({preventScroll:true});});
 $('roundLimit').onchange=e=>{roundOptions.set({limit:Number(e.target.value)});syncRoundOptions();};$('orientationMode').onchange=e=>{roundOptions.set({sideways:e.target.value==='on'});clearInput();syncRoundOptions();notifySideways();};syncRoundOptions();notifySideways();
}
function bindControls(){
 interactionOfferUI=mountInteractionOffer({document,window,game,mode:()=>mode});
 releaseRecovery=mountReleaseRecovery({document,restart:beginCinematic,home:returnHome});
 platform=mountPinballPlatform({document,game,mode:()=>mode,pause,resume,restart:beginCinematic,clearInput});
 window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='overtime:viewport')clearInput();});
 bindRoundOptions();
 document.body.dataset.view=view;$('doorWarning').textContent='出口接近 · L／R 救球';document.querySelectorAll('[data-view-name]').forEach(el=>el.textContent=view==='reverse'?'滿版全景 · 08.26':'原向全景 · 08.26');document.querySelectorAll('[data-view-link]').forEach(el=>el.setAttribute('aria-current',el.dataset.viewLink===view?'page':'false'));$('viewDescription').textContent=view==='reverse'?'完整球台固定透視；沿亮起的辦公室路線連擊，碰設備照常彈跳，提示時間內按 L／R 才拉近。':'原方向滿版全景，主動選擇設備互動才拉近。舊版 v0.7 保留於下方連結。';

 document.querySelectorAll('.comfort-option').forEach(el=>{el.checked=comfort;el.onchange=()=>{comfort=el.checked;document.querySelectorAll('.comfort-option').forEach(other=>other.checked=comfort);};});
 document.querySelectorAll('.economy-option').forEach(el=>{el.onchange=()=>{economy=el.checked;document.querySelectorAll('.economy-option').forEach(other=>other.checked=economy);renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,economy));renderer.setSize(innerWidth,innerHeight);};});
 $('skipOpening').onclick=completeOpening;$('start').onclick=beginCinematic;$('restart').onclick=beginCinematic;$('pause').onclick=()=>mode==='paused'?resume():pause();$('resume').onclick=resume;
 $('home').onclick=returnHome;$('pauseHome').onclick=returnHome;$('pauseRestart').onclick=beginCinematic;
 $('interactionOption').onchange=e=>{interactionsOn=e.target.checked;game.interactionsEnabled=interactionsOn;if(!interactionsOn){game.opportunity=null;game.arming=null;game.cancelInput();}};
 const syncSoundControls=()=>{$('sound').textContent='聲音 '+(gameAudio.enabled?'開':'關');$('sound').setAttribute('aria-label',gameAudio.enabled?'關閉聲音':'開啟聲音');$('sound').setAttribute('aria-pressed',String(gameAudio.enabled));$('musicOption').checked=gameAudio.musicEnabled;};syncSoundControls();
 $('sound').onclick=async()=>{const done=gameAudio.toggle();$('sound').textContent='聲音 '+(gameAudio.enabled?'開':'關');$('sound').setAttribute('aria-label',gameAudio.enabled?'關閉聲音':'開啟聲音');$('sound').setAttribute('aria-pressed',String(gameAudio.enabled));$('platformAudioStatus').textContent=gameAudio.enabled?'音訊載入中…':'';await done;$('audioStatus').textContent=gameAudio.error;$('platformAudioStatus').textContent=gameAudio.error||(gameAudio.enabled?'聲音已開啟':'聲音已關閉');};
 $('musicOption').onchange=e=>gameAudio.setMusic(e.target.checked);let creditsOpener;document.querySelectorAll('[data-audio-credits]').forEach(button=>button.onclick=()=>{pause();creditsOpener=button;$('audioDialog').showModal();});$('audioClose').onclick=()=>$('audioDialog').close();$('audioDialog').addEventListener('close',()=>creditsOpener?.focus());
 for(const side of ['left','right']){const b=$(side);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers[side].add(e.pointerId);press(side,true);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{if(event==='pointercancel')game.cancelInput();pointers[side].delete(e.pointerId);press(side,pointers[side].size>0||keys[side].size>0);});b.addEventListener('contextmenu',e=>e.preventDefault());}
 const keySide=key=>['a','A','ArrowLeft'].includes(key)?'left':['d','D','ArrowRight'].includes(key)?'right':null;
 window.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea,[contenteditable],dialog[open]'))return;if(mode==='cinematic'&&e.code==='Space'&&!e.repeat){e.preventDefault();completeOpening();return;}if($('audioDialog').open||$('introDialog').open||$('roundDialog').open)return;const side=keySide(e.key);if(side&&['playing','cinematic'].includes(mode)){e.preventDefault();if(!e.repeat){keys[side].add(e.code||e.key);press(side,true);}}if((e.key==='Escape'||e.key==='p'||e.key==='P')&&!e.repeat){if(['playing','cinematic'].includes(mode))pause();else if(mode==='paused')resume();}});
 window.addEventListener('keyup',e=>{const side=keySide(e.key);if(side){keys[side].delete(e.code||e.key);press(side,keys[side].size>0||pointers[side].size>0);}});window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
}
const lotteryStatus=createLotteryStatus();
function updateUI(){platform?.sync();interactionOfferUI?.sync();offerStationVisual?.update($('interactionOffer').hidden?null:game.getInteractionOffer()?.stationId);
 const mobileLottery=innerWidth<1000||matchMedia('(pointer: coarse)').matches,lotteryMessage=lotteryStatus.update(game.lottery,game.playClock,{enabled:mobileLottery&&mode==='playing',suppressed:!!game.interaction||!!game.getInteractionOffer()||!!game.round.reentry||!!game.round.ending});$('lotteryStatus').hidden=!lotteryMessage;$('lotteryStatus').textContent=lotteryMessage;document.body.classList.toggle('lottery-status-active',!!lotteryMessage);document.body.classList.toggle('lottery-mobile',mobileLottery);document.body.classList.toggle('lottery-priority-active',mode!=='playing'||!!game.interaction||!!game.getInteractionOffer()||!!game.round.reentry||!!game.round.ending);
 const overtimeUI=overtimePresentation(game.overtime,game.playClock||0),overtimeStatus=$('overtimeStatus');overtimeStatus.hidden=mode!=='playing'||!game.overtime||!!game.round.ending;overtimeStatus.textContent=overtimeUI.text;overtimeStatus.dataset.phase=overtimeUI.phase;
 if(shadowAwardPending&&clock-shadowAwardAt>=.25){$('shadowIncome').textContent='影分身代班 +'+money(shadowAwardPending);shadowAwardPending=0;shadowAwardAt=clock;}$('shadowIncome').hidden=mode!=='playing'||clock-shadowAwardAt>1;

 const route=game.comboRoutes.active;const routeCue=$('comboRoute');routeCue.hidden=mode!=='playing'||!route;if(route){const name=COMBO_ROUTES[route.id].title,step=route.stage==='lane'?'穿過亮起滑道':route.stage==='save'?'L／R 救球':route.id==='dispatch'?'打卡三連':route.id==='paper'?'撞碎紙機':'撞旋轉椅';routeCue.textContent=name+' · '+step;}
 const active=game.interaction,workTime=active?Math.max(0,active.elapsed-(active.workOffset||0)):0,visible=mode==='playing'&&!!active;
 const limited=game.round.remaining!==null,remaining=Math.ceil(game.round.remaining||0);$('time').classList.toggle('urgent',limited&&remaining<=5);
 const ready=mode==='playing'&&!active&&!game.round.ending&&!game.round.reentry&&game.central.available;$('centralPrompt').hidden=!ready;$('centralPrompt').textContent=game.central.armed?'公文台已預備 · 碰到才噴射！':'✦ 公文台亮燈 · L '+(view==='reverse'?'裝忙':'咖啡')+' ／ R '+(view==='reverse'?'咖啡':'裝忙');
 const boss=game.bossPatrol;$('bossStatus').hidden=mode!=='playing'||!['warning','patrol','chase','kick'].includes(boss.phase);$('bossStatus').textContent=game.round.ending?'時間到！老闆強制送你下班':boss.phase==='warning'?'⚠ 主管即將沿黃線巡視':'主管巡視中 · 碰到仍可救球';
 $('score').textContent=money(game.score);const seconds=Math.floor(game.time);$('time').textContent=game.round.ending?'時間到':limited?'剩 '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('time').title='累計工時 '+seconds+' 秒';$('payStatus').textContent=mode==='cinematic'?'準備中 · 尚未計時':mode==='error'?'本局已中止':mode==='over'?'本局已結算':game.round.ending?'結算中 · 停止計費':game.round.reentry?'重返中 · 不計費':active?(limited&&active.stage==='work'&&!(active.activity==='launcher'&&active.selected)?'操作倒數中 · 基本費暫停':'過場／互動不計基本費'):'+$12 / 秒';$('payStatus').classList.toggle('frozen',mode==='over'||!!game.round.ending||!!game.round.reentry||!!active);$('payStatus').classList.toggle('settled',mode==='over'||!!game.round.ending);$('payStatus').classList.toggle('reentry',!!game.round.reentry);
 const lamps=document.querySelectorAll('#lampHud>div:first-child span');lamps.forEach((el,n)=>{el.classList.toggle('lit',game.lamps[n]);el.setAttribute('aria-label',LAMPS[n].label+(game.lamps[n]?' 已點亮':' 未點亮'));el.textContent=(game.lamps[n]?'● ':'○ ')+LAMPS[n].label;});$('bonusText').textContent=game.gateClosed?'鐵門關閉 '+game.gateRemaining.toFixed(1)+' 秒':['frenzy','claim','ready'].includes(game.overtime?.phase)?'加班事件進行中':'四字全亮 +1500／影分身';$('lampHud').classList.toggle('bonus-on',game.gateClosed);$('lampHud').setAttribute('aria-label',`假裝很忙：已點亮 ${game.lamps.filter(Boolean).length}/4`);const wf=game.workflow;$('workflowText').textContent=wf.active?`全部退件！+300 ×${wf.hitsLeft} · ${Math.max(0,wf.until-game.effectTime).toFixed(0)}秒`:wf.readyAt?'流程休息中':`流程 ${wf.lights.filter(Boolean).length}/3`;$('workflowText').classList.toggle('reward',wf.active);$('mailStatus').hidden=mode!=='playing'||!game.mailRun;if(game.mailRun)$('mailStatus').textContent=mailPhase(game.mailRun.distance,game.mailRun.direction,game.mailRun.entrySpeed).label+' → 回球 +350';
 const rr=game.routeRewards;$('routeReward').textContent=rr.active?`✦ 軌道福利 ${rr.collected.filter(Boolean).length}/3 · ${Math.max(0,rr.until-game.time).toFixed(0)}秒`:'';$('routeReward').classList.toggle('available',rr.active);$('routeReward').hidden=!rr.active;
 $('combo').style.opacity=game.combo>1?'1':'0';$('combo').innerHTML='連撞 <b>×'+game.combo+'</b>';
 $('activityPanel').hidden=!visible;document.body.classList.toggle('activity-active',!!active&&mode==='playing');document.body.classList.remove('offer-active');document.body.classList.toggle('gate-active',mode==='playing'&&cameraRig.gate&&!active&&!game.mailRun&&!game.round.ending&&!game.round.reentry);document.body.classList.toggle('mail-active',mode==='playing'&&!!game.mailRun);
 if(visible){const activity=ACTIVITIES[active.activity];$('activityKeys').hidden=true;$('activityTitle').textContent=activity.title;$('activityBadge').textContent=activity.special?'頂樓高額獎金':'碰撞加班小劇場';let text=activity.phases[active.phase],progress=clamp(active.elapsed/active.duration,0,1);
  if(active&&['copier','busy','coffee','shredder'].includes(active.activity)){const next=physicalSide(active.nextSide)==='left'?'L':'R';const needed=active.activity==='busy'?6:['coffee','shredder'].includes(active.activity)?5:4,action=active.activity==='busy'?'敲鍵盤':active.activity==='coffee'?'擦地':'拉紙';text=active.stage==='launch'?(active.activity==='shredder'?specialFeedback(active.activity,active.result):'收工！準備彈出！'):`${active.inputReady?'點按 '+next: '先放開，再按 '+next} ${action} · ${active.pulls}/${needed} · ${Math.max(0,(active.activity==='shredder'?5:6)-workTime).toFixed(1)} 秒`;progress=active.pulls/needed;}
  if(active?.activity==='chair'){text=active.stage==='launch'?(active.result.kind==='dizzy'?'轉過頭！頭暈偏航中':'放手成功，轉職起飛！'):!active.inputReady?'先放開，再長按 L／R':active.wasHolding?`${active.charge>2.7?'過熱！高速偏航':active.charge>2.3?'太快了！小心偏航':active.charge>=1.8?'高速！放手強力彈出':active.charge>=1.2?'中速！放手彈出':'長按加速，放手彈出'} · ${active.charge.toFixed(1)} 秒`:`長按 L 或 R 蓄力，放手彈出 · ${Math.max(0,6-workTime).toFixed(1)} 秒`;progress=clamp(active.charge/4,0,1);}
  if(active?.activity==='server'){text=active.stage==='launch'?(active.result.kind==='perfect'?'全公司復活！獎金 +3000':'充電時機錯過，準備彈回'):!active.inputReady?'先放開，再長按 L／R':`長按 → 1.2–2秒放手 · ${active.charge.toFixed(1)}秒`;progress=clamp(active.charge/2.8,0,1);}
  if(active?.activity==='water'){text=active.stage==='launch'?'水壓太猛，人也噴走！':!active.inputReady?'先放開，再長按 L／R':`長按 → 1–1.8秒放手（${active.charge.toFixed(1)}秒）`;progress=clamp(active.charge/2.4,0,1);}
  if(active?.activity==='launcher'){text=active.stage==='launch'?'公文空運！人比報表先到！':'已選 '+(physicalSide(active.side)==='left'?'L':'R')+' · 公文台升起！';progress=clamp(active.elapsed/1.05,0,1);}
 if(active?.activity==='boss'){const next=physicalSide(active.nextSide)==='left'?'L':'R';text=active.stage==='launch'?'老闆用腳幫你蓋章！':workTime<.8?'等老闆亮燈，再遞加班單':workTime<=2.4?`現在點按 ${next} 遞單！ ${Math.max(0,2.4-workTime).toFixed(1)}秒`:'老闆忙線中…稍後自動彈回';progress=clamp(workTime/2.4,0,1);}
  if(active.activity==='parcel'){const next=physicalSide(active.nextSide)==='left'?'L':'R';text=active.stage==='launch'?'本人包裹，準備寄出！':`${active.inputReady?'交替點按 '+next:'先放開，再按 '+next} 打包 · ${active.pulls}/6 · ${Math.max(0,6-workTime).toFixed(1)}秒`;progress=active.pulls/6;}
  if(active.activity==='clock'){const next=physicalSide(active.nextSide)==='left'?'L':'R',cue=clockCue(active);text=active.stage==='launch'?(successfulInteraction(active)?`打卡完成！ +${active.result.points}`:'漏拍也下班！彈回中'):!active.inputReady?'先放開按鍵':cue.lit?`${cue.perfect?'✦ 完美拍':'● 現在按'} ${next} 蓋章 ${active.pulls}/3`:`準備 ${next} · ${(cue.start-cue.time).toFixed(1)}秒`;progress=active.pulls/3;}
  if(active.activity==='microwave'){text=active.stage==='launch'?(active.result.kind==='perfect'?'便當升溫，人升空！ +1250':'便當過冷／過熱，稍後彈回'):!active.inputReady?'先放開，再長按 L／R':active.charge>=1.2&&active.charge<=2?'✦ 綠燈！現在放手領便當':`長按加熱 → 1.2–2秒放手 · ${active.charge.toFixed(1)}秒`;progress=clamp(active.charge/2.8,0,1);}
  if(active.stage==='docking'){text='已選互動 · 正在靠近設備';progress=0;}$('activityText').textContent=text;$('activityHint').textContent=game.round.limit?(active.stage==='work'&&!(active.activity==='launcher'&&active.selected)?'操作中倒數照走 · 完成另領獎金':'過場不計倒數 · 獎金另計'):'互動不計基本工時 · 完成另領獎金';$('activityKeys').textContent='';$('activityBar').style.transform='scaleX('+progress+')';$('activityBar').classList.toggle('danger',active?.charge>2.7);
 }
 for(const side of ['left','right']){let expected=false,cueText='';if(active&&mode==='playing'&&active.stage==='work'){if(['copier','busy','coffee','shredder'].includes(active.activity)){expected=physicalSide(active.nextSide)===side;cueText=['copier','shredder'].includes(active.activity)?'↔ 點按拉紙':active.activity==='busy'?'⌨ 交替敲鍵':'↔ 交替擦地';}if(active.activity==='server'){expected=true;cueText=active.charge>=1.2&&active.charge<=2?'✦ 放手領獎':'長按充電';}if(active.activity==='water'){expected=true;cueText=active.wasHolding?'放手接滿':'長按接水';}if(active.activity==='boss'){expected=workTime>=.8&&workTime<=2.4&&physicalSide(active.nextSide)===side;cueText='✦ 現在遞單';}if(active.activity==='parcel'){expected=physicalSide(active.nextSide)===side;cueText='↔ 交替打包';}if(active.activity==='clock'){expected=clockCue(active).lit&&physicalSide(active.nextSide)===side;cueText='✦ 現在蓋章';}if(active.activity==='microwave'){expected=true;cueText=active.charge>=1.2&&active.charge<=2?'✦ 放手領便當':'長按加熱';}if(active.activity==='chair'){expected=true;cueText=active.wasHolding?'放手彈出':'長按蓄力';}}if(ready){expected=true;cueText=game.central.armed?'已預備':'✦ 點按彈公文';}$(side).classList.toggle('expected',expected);const cue=$(side).querySelector('.interact-cue');cue.hidden=!expected;cue.textContent=expected?cueText:'';$(side).setAttribute('aria-label',expected?`${side==='left'?'L':'R'}，${cueText}`:`${side==='left'?'左':'右'}彈板`);}
 $('radarBall').setAttribute('cx',String((game.ball.x+18)/36*120));$('radarBall').setAttribute('cy',String((game.ball.z+20)/70*220));$('zone').textContent=game.ball.z<5?'01 行政・報表地獄':game.ball.z<18?'02 茶水・摸魚補給':game.ball.z<34?'03 會議・轉職中心':'04 門板救球';$('doorWarning').hidden=mode!=='playing'||!cameraRig.gate||!!active||!!game.mailRun||!!game.round.ending||!!game.round.reentry;
 const landing=stats.landing,key=landing?(physicalSide(landing.x<0?'left':'right')==='left'?'L':'R'):null;$('doorWarning').textContent=landing?`⊕ 預估落點 · ${Math.abs(landing.x)<2?'L／R':key} 救球`:'出口接近 · L／R 救球';if(clock>comicUntil)$('comic').classList.remove('pop');
}

function animateWorker(dt){
 if(mode==='paused'&&pausedMode==='cinematic')return;
 const b=game.ball,i=game.interaction;activityProps.root.visible=!!i;
 if(i){const o=BUMPERS.find(o=>o.id===i.stationId),p=i.activity==='chair'?clamp(i.charge/3.5,0,1):['copier','busy','coffee','shredder','parcel','clock'].includes(i.activity)?i.pulls/(['busy','parcel'].includes(i.activity)?6:i.activity==='clock'?3:['coffee','shredder'].includes(i.activity)?5:4):['water','server','microwave'].includes(i.activity)?clamp(i.charge/1.8,0,1):clamp(i.elapsed/i.duration,0,1),a=i.activity,chairPose=a==='chair'?chairRenderPose(o.visualScale||1,i.stage,i.elapsed,i.dockDuration,i.launchElapsed):null;let y=a==='busy'?busyRenderHeight(o.visualScale||1,i.stage,i.elapsed,i.dockDuration,i.launchElapsed):a==='coffee'?coffeeRenderHeight(i.stage,i.elapsed,i.dockDuration,i.launchElapsed):a==='chair'?chairPose.y:a==='launcher'?launcherRenderHeight(i.elapsed,i.stage,i.dockDuration,i.launchElapsed):1.34;if(i.stage==='docking'&&!['chair','busy','launcher','coffee'].includes(a))y=1.34+(y-1.34)*clamp(i.elapsed/i.dockDuration,0,1);person.position.set(-b.x,y+game.hop,b.z);person.rotation.set(0,(a==='chair'?i.spinAngle:Math.PI)+stageYaw(view),0);if(a==='chair'){person.position.x-=Math.sin(person.rotation.y)*chairPose.forward;person.position.z-=Math.cos(person.rotation.y)*chairPose.forward;}if(a==='busy'){const forward=busyRenderForward(i.stage,i.elapsed,i.dockDuration,i.launchElapsed);person.position.x-=Math.sin(person.rotation.y)*forward;person.position.z-=Math.cos(person.rotation.y)*forward;}if(a==='coffee'&&i.stage==='work'&&p>.82){person.rotation.z=(p-.82)*.25;person.position.z-=Math.sin((p-.82)*8)*.35;}poseCharacter(person,{activity:['docking','launch'].includes(i.stage)?'flight':a,progress:p,time:['busy','coffee','clock','parcel'].includes(a)&&i.stage==='work'?i.pulls*.65+i.pullPulse*2:i.elapsed,impact:i.stage==='launch'});if(a==='launcher')keepLauncherFeetAboveSurface(person,assistOffice.models.center.root,Math.min(1,i.elapsed/.35)*1.2);if(a==='coffee'&&i.stage!=='work')keepCoffeeFeetAboveFloor(person);
  if(i.stage==='launch'){if(a==='parcel')person.userData.rig.parcel.visible=true;if(a==='microwave')person.userData.rig.lunch.visible=true;if(a==='clock')person.userData.rig.paper.visible=true;}
  activityProps.root.position.set(-o.x,0,o.z);activityProps.root.rotation.y=stageYaw(view);activityProps.root.scale.setScalar(o.visualScale||1);activityProps.puddle.visible=a==='coffee';activityProps.puddle.scale.set(1.3*(1-p*.55),.7*(1-p*.55),1);activityProps.stool.visible=a==='busy';activityProps.paper.visible=false;activityProps.paper.scale.z=.6+i.pulls*.3+i.pullPulse*1.2;activityProps.stamp.visible=a==='boss'&&(p>.35||i.stage==='launch');activityProps.jet.visible=a==='water'&&p>.2;if(a==='water')updateWaterJet(activityProps.jet,bumperGroups[o.id].getObjectByName('waterTapLeft'),person.userData.rig.cup);
  if(a==='boss'){const boss=bumperGroups.boss.getObjectByName('bossBody');boss.rotation.y=0;boss.getObjectByName('kickLeg').rotation.x=i.stage==='launch'?Math.sin(i.launchElapsed/.55*Math.PI)*1.4:0;boss.userData.rig.right.shoulder.rotation.x=.8+Math.sin(i.elapsed*7)*.25;}
  const keyboard=bumperGroups[o.id].getObjectByName('keyboard');if(keyboard)keyboard.scale.y=1+i.pullPulse*(a==='busy'?.2:3);const mug=bumperGroups[o.id].getObjectByName('coffeeMug');if(mug)mug.rotation.z=a==='coffee'?Math.min(1.4,i.elapsed*3):0;
  const seat=bumperGroups[o.id].getObjectByName('swivel');if(seat&&a==='chair')seat.rotation.y=person.rotation.y-stageYaw(view);
 }else{if(mode==='playing'){const boss=bumperGroups.boss.getObjectByName('bossBody');boss.rotation.y=view==='reverse'?0:Math.PI;boss.getObjectByName('kickLeg').rotation.x=0;}person.position.set(-b.x,1.34+game.hop+(game.mailRun ? .2 : 0),b.z);if(game.mailRun){person.rotation.set(0,Math.atan2(-b.vx,b.vz),0);}else if(mode==='playing'&&!reduced){person.rotation.x+=b.vz*dt*.55;person.rotation.z-=b.vx*dt*.55;person.rotation.y=game.effect?.type==='chair'?person.rotation.y+dt*9:Math.PI;}else if(['intro','cinematic'].includes(mode))person.rotation.set(0,Math.PI,.06);if(mode==='cinematic'&&cinematicStart.launch){const flight=openingFlight(cinematicStart.launch,cinematicTime,cinematicStart.impactAt,comfort);person.position.y+=flight.hop;person.rotation.x=flight.tilt;}poseCharacter(person,{activity:mode==='playing'||mode==='cinematic'&&cinematicStart.kicked?'flight':'idle',time:mode==='cinematic'?cinematicTime:game.simTime,impact:mode==='cinematic'&&cinematicStart.kicked||!!game.effect});}
 shadow.position.set(-b.x,.075,b.z);shadow.scale.setScalar(1-game.hop*.2);
}
let bossTrail,lastFrameMode='intro';
function updateBossVisual(){
 const p=bossVisualState(game),g=bumperGroups.boss,m=g.getObjectByName('mechanism'),body=g.getObjectByName('bossBody');g.position.set(p.x,p.height,p.z);
 if(p.active){m.rotation.y=0;body.rotation.x=0;body.position.z=0;if(p.yaw!==null)body.rotation.y=p.yaw;body.getObjectByName('kickLeg').rotation.x=p.kick*1.6+p.walk;body.userData.rig.right.shoulder.rotation.x=-p.walk;}
 else if(mode!=='cinematic'&&!(mode==='paused'&&pausedMode==='cinematic')&&game.interaction?.activity!=='boss'){m.rotation.y=stageYaw(view);body.rotation.x=0;body.position.z=0;body.rotation.y=view==='reverse'?0:Math.PI;body.getObjectByName('kickLeg').rotation.x=0;body.userData.rig.right.shoulder.rotation.x=0;}
 if(!bossTrail){bossTrail=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:C.orange,transparent:true,opacity:.65,dashSize:.6,gapSize:.45,depthWrite:false}));bossTrail.name='boss-patrol-route';office.add(bossTrail);}
 const state=game.bossPatrol,show=['warning','patrol'].includes(state.phase)&&mode!=='intro';bossTrail.visible=show;if(show){const side=state.cycle%2?1:-1,key=state.cycle;if(bossTrail.userData.cycle!==key){bossTrail.userData.cycle=key;bossTrail.geometry.dispose();bossTrail.geometry=new T.BufferGeometry().setFromPoints(bossPath(side).map(({x,z})=>new T.Vector3(-x,.08,z)));bossTrail.computeLineDistances();}}
}
function currentViewport(){return mode==='intro'?introFrame():playFrame();}
function renderFrame(ms){requestAnimationFrame(renderFrame);const now=ms/1000,gap=Math.max(0,now-clock),dt=Math.min(gap,1);if(clock&&gap>1&&mode==='playing'&&lastFrameMode==='playing'){pause('畫面中斷，已自動暫停；準備好再繼續。');accumulator=0;}lastFrameMode=mode;clock=now;introTime+=dt;stats.frames++;const beforeCamera=stats.captureCamera?camera.quaternion.clone():null;
 if(mode==='playing'){transition+=dt;accumulator+=dt;let count=0;while(accumulator>=STEP&&count++<120){game.update(STEP,physicalInput());consumeEvents();accumulator-=STEP;if(mode!=='playing')break;}}
 if(mode==='cinematic'){cinematicTime=advanceOpening(cinematicTime,dt);if(cinematicStart.launch){const flight=openingFlight(cinematicStart.launch,cinematicTime,cinematicStart.impactAt,comfort);game.ball.x=flight.x;game.ball.z=flight.z;}}
 const b=game.ball,visualDt=dt*(mode==='playing'||mode==='intro'?1:0);animateWorker(visualDt);updateBossVisual();
 if(mode==='cinematic'){
  const boss=bumperGroups.boss.getObjectByName('bossBody');bumperGroups.boss.getObjectByName('mechanism').rotation.y=0;poseOpeningBoss(boss,cinematicTime,cinematicStart.impactAt);scene.updateMatrixWorld(true);
  const contact=openingContact(boss,person);if(!cinematicStart.kicked&&contact.touching)openingKick();
  const frame=playFrame(),goal=cameraPose(innerWidth,innerHeight,'playing',game.ball),pose=openingPose(goal,frame.w,frame.h,cinematicTime,comfort,cinematicStart.impactAt);camera.position.set(...pose.position);camera.userData.look.set(...pose.target);camera.fov=pose.fov;
  stats.opening={time:cinematicTime,impactAt:cinematicStart.impactAt,contactDistance:contact.distance,kicked:cinematicStart.kicked};
  if(openingFinished(cinematicTime,cinematicStart.impactAt,comfort))completeOpening();
 }
 jetWake.update(visualDt,person.position,Math.hypot(b.vx,b.vz),mode==='playing'&&!game.interaction&&!game.round.reentry,reduced);gameAudio.setState(mode);
 for(const side of ['left','right']){const s=flipperSegment(side,game.flippers[side]),g=flipperMeshes[side];g.position.set(-s.ax,0,s.az);g.rotation.y=-Math.atan2(s.bz-s.az,-(s.bx-s.ax));}
 for(const [id,g] of Object.entries(bumperGroups)){g.userData.specialAnimate?.(game.interaction?.stationId===id?game.interaction:null,game.effectTime);const p=g.userData.pulse||0;g.userData.pulse=Math.max(0,p-visualDt);const m=g.getObjectByName('mechanism');m.rotation.z=p>0?Math.sin(p*25)*.09:0;const active=game.interaction?.stationId===id,swivel=g.getObjectByName('swivel');if(swivel&&mode==='playing'&&!active)swivel.rotation.y+=visualDt*(p>0?12:.35);const lid=g.getObjectByName('lid');if(lid)lid.rotation.x=active&&game.interaction.activity==='copier'?-.2-Math.abs(Math.sin(game.interaction.elapsed*7))*.3:p>0?-Math.abs(Math.sin(p*12))*.45:0;}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=visualDt;p.v.y-=9*visualDt;p.mesh.position.addScaledVector(p.v,visualDt);p.mesh.rotation.x+=visualDt*5;if(p.life<=0){office.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.children.forEach(c=>{c.geometry?.dispose();c.material?.dispose();});particles.splice(i,1);}}
 if(!['cinematic','paused'].includes(mode)){
  let pose;const frame=mode==='intro'?introFrame():playFrame();camera.aspect=frame?frame.w/frame.h:innerWidth/innerHeight;if(mode==='intro')pose=frame?fittedIntro(frame.w,frame.h,view):overviewPose(innerWidth,innerHeight,view);else{const i=game.interaction,o=i?BUMPERS.find(o=>o.id===i.stationId):null;pose=cameraRig.update(dt,frame.w,frame.h,b,i,o,comfort,{portrait:innerWidth<innerHeight,mail:!!game.mailRun,...playSafeInsets()});}
  if(mode==='intro'&&!comfort){const mix=1-Math.exp(-dt*2);camera.position.lerp(new T.Vector3(...pose.position),mix);camera.userData.look.lerp(new T.Vector3(...pose.target),mix);}else{camera.position.set(...pose.position);camera.userData.look.set(...pose.target);}
  camera.fov=pose.fov;camera.updateProjectionMatrix();
 }

 const activeViewport=currentViewport();camera.aspect=activeViewport?activeViewport.w/activeViewport.h:innerWidth/innerHeight;const sceneRange=camera.position.distanceTo(camera.userData.look);camera.far=Math.max(350,sceneRange+200);camera.updateProjectionMatrix();scene.fog.near=Math.max(75,sceneRange+50);scene.fog.far=scene.fog.near+140;camera.up.set(0,1,0);camera.lookAt(camera.userData.look);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(beforeCamera&&dt>0&&mode==='playing'){stats.cameraTrace??=[];stats.cameraTrace.push({dt,angle:camera.quaternion.angleTo(beforeCamera)*180/Math.PI,blend:cameraRig.close,focusX:cameraRig.x,gate:cameraRig.gate,distance:cameraRig.distance,up:camera.up.toArray()});}updateLanding();updateUI();stats.labels=stationLabels.update({office,camera,person,game,mode,time:clock,close:cameraRig.close,frame:currentViewport()||{x:0,y:0,w:innerWidth,h:innerHeight}})||stats.labels;visibility.protectedRoot=game.interaction?bumperGroups[game.interaction.stationId]:null;visibility.focusUpper=!!game.interaction||cameraRig.close>.3;visibility.update(camera,person,clock,mode!=='intro');stats.visibility={...visibility.last};office.getObjectByName('ceiling').visible=mode==='intro';if(view==='reverse'){for(const name of ['gateLintel','gateSign'])office.getObjectByName(name).visible=mode==='intro';}overtimeVisuals?.update(['playing','paused'].includes(mode)?game.shadowWorkers?.workers||[]:[],game.playClock||0);lotteryVisuals?.update(game.lottery,game.playClock,{camera,frame:currentViewport()||{w:innerWidth,h:innerHeight},compact:innerWidth<1000||matchMedia('(pointer: coarse)').matches});if(lotteryCoworkers)for(const n of lotteryCoworkers.root.children)n.visible=n.userData.stationId!==game.interaction?.stationId;comboOffice.update(game);assistOffice.update(game);features.update(game,clock);mailOffice.update(game,clock);const screenActor=person.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,1,0)).project(camera);const feedbackFrame=currentViewport()||{x:0,y:0,w:innerWidth,h:innerHeight};placeFeedback($('comic'),{x:feedbackFrame.x+(screenActor.x+1)*feedbackFrame.w/2,y:innerHeight-feedbackFrame.y-(screenActor.y+1)*feedbackFrame.h/2},innerWidth,innerHeight);const edge=$('routeEdge'),p=person.getWorldPosition(new T.Vector3()).project(camera);edge.hidden=!(mode==='playing'&&innerWidth<innerHeight&&game.mailRun&&Math.abs(p.x)>.94);if(!edge.hidden){edge.textContent=p.x<0?'◀ 轉寄中':'轉寄中 ▶';edge.style.left=p.x<0?'4px':'auto';edge.style.right=p.x>0?'4px':'auto';edge.style.top=Math.max(120,Math.min(innerHeight-110,(1-p.y)*innerHeight/2))+'px';}renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();const frame=currentViewport();stats.viewport=frame;if(frame){renderer.setViewport(frame.x,frame.y,frame.w,frame.h);renderer.setScissor(frame.x,frame.y,frame.w,frame.h);renderer.setScissorTest(true);}renderer.render(scene,camera);platform?.afterRender(renderer.domElement);renderer.setScissorTest(false);stats.maxDrawCalls=Math.max(stats.maxDrawCalls,renderer.info.render.calls);
}
try{
 setupIntro();setupPlayLayout();const lotteryStatusNode=document.createElement('div');lotteryStatusNode.id='lotteryStatus';lotteryStatusNode.hidden=true;$('joke').after(lotteryStatusNode);
 renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.autoClear=false;renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,economy));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=innerWidth>=700;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 scene=new T.Scene();scene.background=new T.Color(0x92b4b0);scene.fog=new T.Fog(0x92b4b0,75,175);camera=new T.PerspectiveCamera(54,innerWidth/innerHeight,.1,350);const startPose=cameraPose(innerWidth,innerHeight,'intro',game.ball);camera.position.set(...startPose.position);camera.fov=startPose.fov;camera.userData.look=new T.Vector3(...startPose.target);
 scene.add(new T.HemisphereLight(0xfff1d2,0x53797a,2));const light=new T.DirectionalLight(0xffedc6,2.3);light.position.set(-16,38,-20);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-25;light.shadow.camera.right=25;light.shadow.camera.top=65;light.shadow.camera.bottom=-65;light.shadow.camera.far=140;light.shadow.normalBias=.04;scene.add(light);
 buildOffice();lotteryCoworkers=createLotteryCoworkers({T,scene:office,createCharacter,poseCharacter,placements:lotteryPlacements(BUMPERS,view),mapX:x=>-x});lotteryVisuals=createLotteryVisuals(T,{scene:office,shape:LOTTERY_BOX,stations:BUMPERS,mapX:x=>-x,coworkers:lotteryCoworkers,view});offerStationVisual=createOfferStationVisual({T,office,stations:BUMPERS,view});stationLabels=createStationLabels(T,BUMPERS);jetWake=new JetWake(office);const occluders=[];office.traverse(o=>{if(o.isMesh&&o.userData.occludes)occluders.push(o);});visibility=new ActorVisibility(occluders,{cutaway:false});bindControls();$('radarBumpers').innerHTML=BUMPERS.map(o=>'<circle cx="'+((o.x+18)/36*120)+'" cy="'+((o.z+20)/70*220)+'" r="'+o.r*1.5+'"/>').join('');
 let viewportKey='';installViewportRecovery(window,document,{onOrientation:clearInput,onChange:()=>{checkOrientation();const key=[innerWidth,innerHeight,devicePixelRatio,economy].join(':');if(key===viewportKey)return;viewportKey=key;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(renderRatio(innerWidth,innerHeight,devicePixelRatio,economy));renderer.setSize(innerWidth,innerHeight);}});$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('errorText').textContent='3D 顯示暫時中斷，請重新載入。重新載入會遺失本次頁面暫存、尚未永久保存的最高分；已成功儲存的紀錄仍保留。';$('error').hidden=false;});requestAnimationFrame(renderFrame);
 if(new URLSearchParams(location.search).has('qa'))window.__overtimeQA={roundOptions,checkOrientation,returnHome,game,gameAudio,jetWake,lotteryVisuals,lotteryCoworkers,scene,camera,person,input,stats,renderer,mailOffice,assistOffice,comboOffice,visibility,view,cameraState:()=>({rescueBlend:cameraRig.gate?1:0,interactionBlend:cameraRig.close,gate:cameraRig.gate,focusX:cameraRig.x,focusZ:cameraRig.z,distance:cameraRig.distance,comfort}),bumperGroups,features,physicalInput,office,flipperMeshes,begin:beginCinematic,mode:()=>mode,press:(side,on)=>press(side,on),place:(x,z,vx=0,vz=0)=>{Object.assign(game.ball,{x,z,vx,vz});game.interaction=null;game.opportunity=null;game.arming=null;game.cancelInput();game.interactionReady=0;followAnchor.set(-x,0,z);cameraRig.reset(game.ball);},ready:()=>{mode='playing';game.start();game.interactionsEnabled=interactionsOn;followAnchor.set(-game.ball.x,0,game.ball.z);$('launch').hidden=true;$('skipOpening').hidden=true;$('controls').hidden=false;},startActivity:(id,side='left')=>{const o=BUMPERS.find(o=>o.id===id);return game.startInteraction(o,side);},pause,resume};
}catch(e){console.error(e);for(const id of ['start','platformRestart','pause'])$(id).disabled=true;$('introHelp').onclick=()=>$('introDialog').showModal();$('sound').onclick=async()=>{await gameAudio.toggle();$('sound').setAttribute('aria-pressed',String(gameAudio.enabled));$('sound').textContent='聲音 '+(gameAudio.enabled?'開':'關');$('platformAudioStatus').textContent=gameAudio.error||'聲音設定已更新';};$('error').hidden=false;$('errorText').textContent='無法啟動 3D 畫面。請使用支援 WebGL 2 的瀏覽器，並啟用硬體加速。';}

if(parent!==window)parent.postMessage({type:'overtime:ready'},location.origin);
