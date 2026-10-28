import {renderCameraBounds,isStandalone} from './layout.mjs';
import {protectPlaySurface,protectSelection} from './play-surface.mjs';
import {splitResultComment} from './result-view.mjs';
import {createGameAudio,createAudioEvents} from './audio.mjs';
import {arrivalFlavour} from './flavour.mjs';
import {createScenery} from './scenery.mjs';
import {regionAt,journeyLabel,adventureAt,routeLabel} from './world.mjs';
import {controlFeedback,formatDistance,formatMileage,resultDisplay,resultShareText} from './presentation.mjs';
import {settleVerdict} from './verdicts.mjs';
import {createCharacter} from './character.mjs';
import {createDialogController,createPauseDialogRecovery} from './dialogs.mjs';
import * as THREE from './vendor/three.module.min.js';
import {createShareState,makeResultFile,saveResultImage,openThreads,copyResultText} from './share.mjs';
import {captureResultPng,paintScoreCard,createLandingCapture} from './capture.mjs';
import {createInput,clearCapturedInput,cancelPendingMotion,handleGameKey} from './controls.mjs';
import {fresh,step,pose,result,readBest,saveBest,saveJourney,worldX,START,BOARD,PIT,DT,cameraFrame,toKmh} from './physics.mjs';
document.querySelectorAll('[data-play-surface]').forEach(protectPlaySurface);
document.querySelectorAll('header h1, #sound-status, header button, .card button').forEach(protectSelection);
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#c4e6e4');scene.fog=new THREE.Fog('#c4e6e4',38,90);
let paused=false;
const modal=createDialogController($('overlay'),()=>{if(paused)resume();},{forceFallback:isStandalone(window)});
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{$('card-title').textContent='這個裝置暫時無法開啟 3D';$('card-text').textContent='請使用支援 WebGL 的瀏覽器再試。';$('start').disabled=true;modal.open();throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('scene').appendChild(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,140);camera.position.set(5,6,15);camera.lookAt(5,1,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x7a9b8c,2.4));const sun=new THREE.DirectionalLight(0xfff6dd,3);sun.position.set(-5,15,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:30,top:16,bottom:-15});scene.add(sun);
const materials={};function mat(c){return materials[c]??=new THREE.MeshStandardMaterial({color:c,roughness:.85});}
function box(x,y,z,w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
const world=createScenery(THREE,scene);
const character=createCharacter(THREE,scene);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.4,32),new THREE.MeshBasicMaterial({color:'#315d5b',transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;scene.add(shadow);
const dust=[];for(let i=0;i<30;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.055),mat('#f4e5be'));m.visible=false;scene.add(m);dust.push({m,life:0,v:new THREE.Vector3()});}
function burst(x){dust.forEach((d,i)=>{d.m.visible=true;d.m.position.set(x,.15,(i%5-2)*.15);d.v.set(Math.sin(i*5)*2,1+(i%7)*.3,Math.cos(i*4)*1.4);d.life=.6+(i%4)*.1;});}
const landingCapture=createLandingCapture();
const shareState=createShareState();let pendingCapture=false;let storage=null;try{storage=localStorage;}catch{}
const placeVisits=new Map();
let renderOrigin=0,lastPlaceKey='',cueTime=0;
const sound=createGameAudio({notify:message=>{$('sound-status').textContent=message;$('sound').title=message;$('sound').setAttribute('aria-label',message+'；切換音效');$('sound').setAttribute('aria-pressed',String(sound.ready));$('sound').textContent=sound.ready?'♪':'♩';}});
const audioEvents=createAudioEvents(name=>{if(name==='result')sound.setPlaying(false);sound.play(name);});
async function soundReady(preview=true){if(sound.enabled)await sound.unlock({preview});}
$('sound').onclick=()=>{if(sound.ready||sound.pending){sound.setEnabled(false);}else{sound.setEnabled(true);soundReady();}};
let state=fresh(),playing=false,best=0,reported=false,lastPhase='run';try{best=readBest(storage);}catch{}$('best').textContent=formatMileage(best).value+' '+formatMileage(best).unit;
const controls=createInput(),input=controls.values;const buttons=[...document.querySelectorAll('[data-limb]')];
const pauseRecovery=createPauseDialogRecovery(window,modal,()=>playing&&paused);
function sync(){buttons.forEach(b=>{const active=input[Number(b.dataset.limb)];b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
function clear(){clearCapturedInput(controls,buttons);sync();}
buttons.forEach(b=>{const i=Number(b.dataset.limb);b.addEventListener('pointerdown',e=>{if(!playing||paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);controls.pointer(e.pointerId,i);sync();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(controls.endPointer(e.pointerId,type))pauseGame();sync();});b.addEventListener('contextmenu',e=>e.preventDefault());});
window.addEventListener('keydown',e=>{if(handleGameKey(e,true,controls,playing&&!paused))sync();if(e.code==='Escape'&&playing&&!paused){e.preventDefault();pauseGame();}});window.addEventListener('keyup',e=>{if(handleGameKey(e,false,controls,playing&&!paused))sync();});

function show(title,text,button){$('result-brand').hidden=true;$('result-score-block').hidden=true;$('card-subtitle').hidden=true;$('card-subtitle').textContent='';$('card-title').textContent=title;$('card-text').innerHTML=text;$('start').innerHTML=button+' <span>↗</span>';modal.open();}
function pauseGame(){if(!playing||paused)return;document.querySelector('.card').classList.remove('result');$('share-actions').hidden=true;paused=true;sound.setPlaying(false);clear();cancelPendingMotion(state);acc=0;show('四肢休息一下。','已暫停。回來時按繼續，重新按住你的四肢控制鍵。','繼續這一跳');}
window.addEventListener('blur',pauseGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('orientationchange',pauseGame);window.addEventListener('orientationchange',pauseRecovery.schedule);window.addEventListener('resize',pauseRecovery.schedule);window.visualViewport?.addEventListener('resize',pauseRecovery.schedule);window.screen?.orientation?.addEventListener('change',()=>{pauseGame();pauseRecovery.schedule();});$('pause').onclick=()=>paused?resume():pauseGame();
function resume(){pauseRecovery.cancel();paused=false;clear();modal.close();sound.setPlaying(true);soundReady(false);}
function start(){shareState.begin();pendingCapture=false;pauseRecovery.cancel();landingCapture.reset();$('landing-preview').replaceChildren();$('landing-preview').hidden=true;sound.setPlaying(false);audioEvents.reset();sound.setPlaying(true);soundReady();renderOrigin=0;lastPlaceKey='';cueTime=0;$('share-actions').hidden=true;document.querySelector('.card').classList.remove('result');$('result-brand').hidden=true;$('result-score-block').hidden=true;$('card-subtitle').hidden=true;clear();state=fresh();playing=true;paused=false;reported=false;lastPhase='run';acc=0;trailWindow=0;trails.forEach(d=>{d.life=0;d.m.visible=false;});dust.forEach(d=>{d.life=0;d.m.visible=false;});modal.close();}
$('start').onclick=()=>paused?resume():start();$('reset').onclick=start;
let sceneWidth=1,sceneHeight=1,scenePlayHeight=1;
function resize(){const el=$('scene');sceneWidth=Math.max(1,el.clientWidth);sceneHeight=Math.max(1,el.clientHeight);scenePlayHeight=Math.max(1,sceneHeight-(parseFloat(document.documentElement.style.getPropertyValue('--scene-extension'))||0));renderer.setSize(sceneWidth,sceneHeight,false);}new ResizeObserver(resize).observe($('scene'));resize();
function renderAthlete(){character.update(pose(state),state);shadow.position.x=state.x;shadow.scale.setScalar(Math.max(.6,1-state.y*.08));}
const markLine=box(0,.035,0,.035,.05,3.35,'#8c4781');markLine.visible=false;
const firstLine=box(0,.028,0,.022,.03,3.35,'#fff8db');firstLine.visible=false;
const trails=[];for(let i=0;i<32;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.055,6,5),new THREE.MeshBasicMaterial({color:i%2?'#fdfca8':'#83e8e2',transparent:true,opacity:.8,depthWrite:false}));m.visible=false;scene.add(m);trails.push({m,life:0});}
let trailWindow=0,trailIndex=0;
function effects(elapsed){
 if(state.phase==='air'&&state.airEffort>.35)trailWindow=.1;
 if(!paused){
  if(trailWindow>0&&state.phase==='air'){const p=pose(state);for(let i=0;i<2;i++){const d=trails[trailIndex++%trails.length];d.life=.32;d.m.visible=true;d.m.position.set(p['foot'+i].x,p['foot'+i].y,i===0?.23:-.23);}}
  trailWindow=Math.max(0,trailWindow-elapsed);
  for(const d of trails)if(d.life>0){d.life-=elapsed;d.m.material.opacity=Math.max(0,d.life*2.5);d.m.scale.setScalar(Math.max(.1,d.life*3));d.m.visible=d.life>0;}
 }
 markLine.visible=Number.isFinite(state.mark);if(markLine.visible)markLine.position.x=state.mark-state.origin;
 firstLine.visible=Number.isFinite(state.firstMark)&&state.firstMark-state.mark>.03;if(firstLine.visible)firstLine.position.x=state.firstMark-state.origin;
 $('air-guide').classList.toggle('boost',trailWindow>0);
 $('air-count').textContent=(state.landingPose>.3?'收尾中 · ':state.charging?'放開腳起跳 · ':state.phase==='air'?'擺動續飛 · ':'腳長按蓄力 · ')+'體力 '+Math.round(state.energy*100)+'%';
 $('air-guide').setAttribute('aria-label','剩餘體力 '+Math.round(state.energy*100)+'%');
}
function downloadPNG(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'playformosa-long-jump.png';document.body.appendChild(a);
 try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
}
function prepareResultShare(){
 if(state.phase!=='done')return;
 const token=shareState.begin();$('save-result').disabled=true;$('save-result').textContent=mobileImageAction()?'分享成績圖片':'下載圖片';$('share-status').textContent='正在準備圖片…';
 const r=result(state),info={...r,foul:state.foul,takeoffKmh:state.takeoffSpeed===null?null:toKmh(state.takeoffSpeed),flips:state.rotations,part:state.markPart};
 const shot=landingCapture.current;
 if(!shot){shareState.fail(token,'capture');$('save-result').disabled=true;$('share-status').textContent='落地畫面未能保存；這一跳仍已記錄。';return;}
 const preview=document.createElement('canvas');
 captureResultPng({render:()=>{},source:shot.canvas,paint:source=>{
  const card=paintScoreCard(source,info,shot.focus,undefined,preview);
  preview.setAttribute('role','img');preview.setAttribute('aria-label',shot.canvas.getAttribute('aria-label'));$('landing-preview').replaceChildren(preview);$('landing-preview').hidden=false;return card;
 }}).then(blob=>{
  if(blob.type!=='image/png')throw new Error('Unsupported screenshot format');
  const file=typeof File==='function'?makeResultFile(blob):blob;
  if(!shareState.accept(token,file))return;
  $('save-result').disabled=false;$('share-status').textContent='';
 }).catch(()=>{if(!shareState.fail(token,'capture'))return;$('save-result').disabled=false;$('save-result').textContent='重做成績圖';$('share-status').textContent='圖片準備失敗，可重試。';});
}
function mobileImageAction(){return matchMedia('(pointer: coarse)').matches||((navigator.maxTouchPoints||0)>0&&!matchMedia('(hover: hover)').matches);}
function openImage(file){const url=URL.createObjectURL(file);let popup;try{popup=window.open(url,'_blank');if(popup)popup.opener=null;}catch{}setTimeout(()=>URL.revokeObjectURL(url),60000);return Boolean(popup);}
function resultShareData(){const r={...result(state),foul:state.foul};return {text:resultShareText(r),url:new URL('/games/long-jump/',location.origin).href};}
$('share-result').onclick=()=>{
 if(state.phase!=='done')return;
 const status=openThreads(resultShareData(),{open:window.open.bind(window)});
 $('share-status').textContent=status==='opened'?'請在 Threads 確認文字後發布；圖片需另行附上。':'Threads 視窗未開啟，請允許彈出視窗後再試。';
};
$('copy-result').onclick=async()=>{
 if(state.phase!=='done')return;const attempt=state,data=resultShareData();const outcome=await copyResultText(data);
 if(state!==attempt||state.phase!=='done')return;
 $('share-status').textContent=outcome.status==='copied'?'已複製成績與網址，可貼到分享貼文。':'無法自動複製，請選取以下文字：'+data.text+' '+data.url;
};
$('save-result').onclick=async()=>{
 const file=shareState.file;if(!file){prepareResultShare();return;}$('save-result').disabled=true;
 const outcome=await saveResultImage(file,{...resultShareData(),mobile:mobileImageAction(),download:downloadPNG,openImage});
 if(shareState.file!==file)return;$('save-result').disabled=false;
 const messages={'handed-off':'圖片已交給系統；請另按複製成績與網址，再貼到貼文。',downloaded:'已送出下載要求。','opened-image':'已開啟圖片，可長按儲存。',cancelled:'已取消。',unsupported:'此瀏覽器不支援圖片分享，請改用系統瀏覽器。',error:outcome.reason==='NotAllowedError'?'瀏覽器未允許圖片分享，請改用系統瀏覽器再試。':'圖片分享未完成，請稍後再試。'};
 $('share-status').textContent=messages[outcome.status];
};
let prev=performance.now(),acc=0;function frame(now){
 requestAnimationFrame(frame);const elapsed=Math.min((now-prev)/1000,.06);prev=now;
 if(playing&&!paused){acc+=elapsed;let n=0;while(acc>=DT&&n++<8){step(state,input);audioEvents.update(state);acc-=DT;}
  if(state.phase==='land'&&lastPhase!=='land')burst(state.x);lastPhase=state.phase;
  if(state.phase==='done'&&!reported){
   reported=true;playing=false;clear();settleVerdict(state,result(state),storage);saveJourney(storage,state);const r=result(state);
   if(r.valid&&r.legalAdventureKm>best){best=r.legalAdventureKm;try{saveBest(storage,best);}catch{}}$('best').textContent=formatMileage(best).value+' '+formatMileage(best).unit;
   const measure=formatMileage(r.legalAdventureKm),score=state.foul?'犯規':r.valid?measure.value+' <small>'+measure.unit+'</small>':'未計分';

   document.querySelector('.card').classList.add('result');
   const comment=splitResultComment(r.title);
   show(comment.primary,'<div class="journey-result">'+r.journey+'</div>'+(r.achievements.length?'<div class="stunt-result">'+r.achievements.at(-1)+'</div>':'')+(r.badge?'<div class="stunt-result">'+r.badge+'</div>':'')+(state.foul?'<div class="result-status">越線 · 不計成績，探索約 '+formatMileage(r.adventureKm).value+' '+formatMileage(r.adventureKm).unit+' 保留</div>':''),'再來一跳');
   $('result-brand').hidden=false;$('result-score-block').innerHTML='<div class="mileage-label">冒險里程 · 約</div><div class="result-score">'+score+'</div>';$('result-score-block').hidden=false;$('card-subtitle').textContent=comment.separator+comment.secondary;$('card-subtitle').hidden=!comment.secondary;
   $('share-actions').hidden=false;$('save-result').disabled=true;$('share-status').textContent='正在保存落地畫面…';pendingCapture=true;

  }
 }
 const shift=state.origin-renderOrigin;if(shift){for(const d of[...trails,...dust])d.m.position.x-=shift;renderOrigin=state.origin;}
 const distance=Math.max(0,worldX(state)-BOARD),progress=adventureAt((state.phase==='land'||state.phase==='done')?Math.max(0,(state.landingWorldX??worldX(state))-BOARD):distance),place=progress.region;world.update(distance,state.origin);const sky=new THREE.Color(place.sky);scene.background.lerp(sky,Math.min(1,elapsed*2.5));scene.fog.color.copy(scene.background);
 const key=place.id;if(playing&&key!==lastPlaceKey){const achieved=progress.achievements.at(-1),special=['penghu','world_complete','space','moon','mars','saturn'].includes(place.id);const visit=placeVisits.get(key)||0;placeVisits.set(key,visit+1);$('place-cue').textContent=(special?achieved+'！ ':place.name+' · ')+arrivalFlavour(key,visit);cueTime=4.5;lastPlaceKey=key;}
 if(!paused)cueTime=Math.max(0,cueTime-elapsed);$('place-cue').classList.toggle('visible',cueTime>0);$('place-name').textContent=routeLabel(place.start);const measure=formatMileage(progress.km);$('travel-distance').textContent='冒險里程 約 '+measure.value+' '+measure.unit;$('wind-label').textContent='氣流 '+(state.wind.push>=0?'→':'←')+(Math.sign(state.wind.nextPush)!==Math.sign(state.wind.push)?' 前方轉向':'');
 const feedback=controlFeedback(state);buttons.forEach(b=>{const i=Number(b.dataset.limb),f=feedback[i];$('hint-'+i).textContent=f.hint;b.style.setProperty('--load',f.load);b.classList.toggle('loading',i>=2&&f.load>0);b.classList.toggle('armed',i>=2&&state.phase==='run'&&state.chargeFoot===i-2);b.classList.toggle('bracing',state.phase==='air'&&i>=2&&state.brace[i-2]>.3);b.setAttribute('aria-label',f.label+'，'+f.hint);});
 renderAthlete();const view=cameraFrame(state,sceneWidth,scenePlayHeight);Object.assign(camera,renderCameraBounds(view,scenePlayHeight,sceneHeight));camera.updateProjectionMatrix();camera.position.set(view.centerX,view.centerY+4,16);camera.lookAt(view.centerX,view.centerY,0);sun.position.set(state.x-5,18,8);sun.target.position.set(state.x,0,0);sun.target.updateMatrixWorld();
 if(!paused)for(const d of dust)if(d.life>0){d.life-=elapsed;d.v.y-=elapsed*5;d.m.position.addScaledVector(d.v,elapsed);d.m.scale.setScalar(Math.max(0,d.life*1.4));d.m.visible=d.life>0;}
 effects(elapsed);
 $('speed').innerHTML='<span class="speed-caption">'+(state.jumped?'起跳速度':'助跑速度')+'</span>'+toKmh(state.takeoffSpeed??state.vx).toFixed(1)+' <small>km/h</small>';
 renderer.render(scene,camera);
 if(pendingCapture&&sceneWidth>1&&sceneHeight>1&&!document.hidden){pendingCapture=false;
  try{const point=new THREE.Vector3(state.x,state.y+.3,0).project(camera);const shot=landingCapture.freeze(renderer.domElement,{x:(point.x+1)/2,y:(1-point.y)/2});shot.canvas.setAttribute('role','img');shot.canvas.setAttribute('aria-label','這一跳最後落地的遊戲截圖');}catch{$('landing-preview').hidden=true;}
  prepareResultShare();
 }
}
modal.open();
requestAnimationFrame(frame);

