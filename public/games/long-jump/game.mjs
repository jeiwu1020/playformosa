import {createCharacter} from './character.mjs';
import {createDialogController} from './dialogs.mjs';
import * as THREE from './vendor/three.module.min.js';
import {createShareState,makeResultFile,saveResultImage,openThreads,copyResultText} from './share.mjs';
import {captureResultPng,paintScoreCard} from './capture.mjs';
import {createInput,cancelPendingMotion,handleGameKey} from './controls.mjs';
import {fresh,step,pose,result,readBest,saveBest,START,BOARD,PIT,PIT_END,DT,cameraFrame,toKmh} from './physics.mjs';
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#c4e6e4');scene.fog=new THREE.Fog('#c4e6e4',38,90);
let paused=false;
const modal=createDialogController($('overlay'),()=>{if(paused)resume();});
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{$('card-title').textContent='這個裝置暫時無法開啟 3D';$('card-text').textContent='請使用支援 WebGL 的瀏覽器再試。';$('start').disabled=true;modal.open();throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('scene').appendChild(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,140);camera.position.set(5,6,15);camera.lookAt(5,1,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x7a9b8c,2.4));const sun=new THREE.DirectionalLight(0xfff6dd,3);sun.position.set(-5,15,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:30,top:16,bottom:-15});scene.add(sun);
const materials={};function mat(c){return materials[c]??=new THREE.MeshStandardMaterial({color:c,roughness:.85});}
function box(x,y,z,w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
box((START+PIT_END)/2,-.35,0,PIT_END-START+24,.6,55,'#8bbaa3');box((START-3+PIT)/2,-.06,0,PIT-START+3,.12,3.6,'#c46f53');box((PIT+PIT_END)/2,-.08,0,PIT_END-PIT,.16,3.6,'#ead49b');box(9.89,.015,0,.22,.035,3.6,'#fffced');box(10.06,.02,0,.12,.04,3.6,'#ed7052');
for(const z of [-1.6,1.6])box((START-3+BOARD)/2,.012,z,BOARD-START+3,.02,.035,'#f9dfbb');
for(let x=11;x<=PIT_END;x++){box(x,.015,-1.5,.025,.02,3,'#d6bb80');box(x,.04,1.97,.03,.08,.35,'#fff9df');}
for(let i=0;i<Math.ceil((PIT_END-START+8)/1.2);i++){const x=START-4+i*1.2;box(x,.25,-5,.8,.5,.7,i%3?'#fcf6dc':'#e6aa87');box(x,.9,-6,.8,.5,.7,i%4?'#6f9d91':'#f3c679');box(x,1.55,-7,.8,.5,.7,i%3?'#426b67':'#ed886d');}
box(5,.45,-7.8,58,1.5,.25,'#355e5c');
function label(txt,x,y,z,color='#173b41',size=1){const cvs=document.createElement('canvas');cvs.width=512;cvs.height=128;const ctx=cvs.getContext('2d');ctx.fillStyle=color;ctx.font='900 49px Arial';ctx.textAlign='center';ctx.fillText(txt,256,80);const tex=new THREE.CanvasTexture(cvs);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sp.position.set(x,y,z);sp.scale.set(4*size,size,1);scene.add(sp);return sp;}
label('PLAYFORMOSA',2,2.1,-7.5,'#f6f1d3',1.5);label('GO YOUR OWN WAY',14,2.1,-7.5,'#f6f1d3',1.1);label('起跳線',10,.2,2.5,'#833f34',.7);for(let i=2;i<PIT_END-BOARD;i+=4)label(i+' m',10+i,.2,2.5,'#6c6750',.5);
const character=createCharacter(THREE,scene);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.4,32),new THREE.MeshBasicMaterial({color:'#315d5b',transparent:true,opacity:.16,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;scene.add(shadow);
const dust=[];for(let i=0;i<30;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.055),mat('#f4e5be'));m.visible=false;scene.add(m);dust.push({m,life:0,v:new THREE.Vector3()});}
function burst(x){dust.forEach((d,i)=>{d.m.visible=true;d.m.position.set(x,.15,(i%5-2)*.15);d.v.set(Math.sin(i*5)*2,1+(i%7)*.3,Math.cos(i*4)*1.4);d.life=.6+(i%4)*.1;});}
const shareState=createShareState();let pendingCapture=false;
let state=fresh(),playing=false,best=0,reported=false,lastPhase='run';try{best=readBest(localStorage);}catch{}$('best').textContent=best.toFixed(2)+' m';
const controls=createInput(),input=controls.values;const buttons=[...document.querySelectorAll('[data-limb]')];
function sync(){buttons.forEach(b=>{const active=input[Number(b.dataset.limb)];b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
function clear(){controls.clear();sync();}
buttons.forEach(b=>{const i=Number(b.dataset.limb);b.addEventListener('pointerdown',e=>{e.preventDefault();if(!playing||paused)return;b.setPointerCapture(e.pointerId);controls.pointer(e.pointerId,i);sync();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(controls.endPointer(e.pointerId,type))pauseGame();sync();});b.addEventListener('contextmenu',e=>e.preventDefault());});
window.addEventListener('keydown',e=>{if(handleGameKey(e,true,controls,playing&&!paused))sync();if(e.code==='Escape'&&playing&&!paused){e.preventDefault();pauseGame();}});window.addEventListener('keyup',e=>{if(handleGameKey(e,false,controls,playing&&!paused))sync();});

function show(title,text,button){$('card-title').textContent=title;$('card-text').innerHTML=text;$('start').innerHTML=button+' <span>↗</span>';modal.open();}
function pauseGame(){if(!playing||paused)return;document.querySelector('.card').classList.remove('result');$('share-actions').hidden=true;paused=true;clear();cancelPendingMotion(state);acc=0;show('四肢休息一下。','已暫停。回來時按繼續，重新按住你的四肢控制鍵。','繼續這一跳');}
window.addEventListener('blur',pauseGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('orientationchange',pauseGame);$('pause').onclick=()=>paused?resume():pauseGame();
function resume(){paused=false;clear();modal.close();}
function start(){shareState.begin();pendingCapture=false;$('share-actions').hidden=true;document.querySelector('.card').classList.remove('result');clear();state=fresh();playing=true;paused=false;reported=false;lastPhase='run';acc=0;trailWindow=0;trails.forEach(d=>{d.life=0;d.m.visible=false;});dust.forEach(d=>{d.life=0;d.m.visible=false;});modal.close();}
$('start').onclick=()=>paused?resume():start();$('reset').onclick=start;
let sceneWidth=1,sceneHeight=1;
function resize(){const el=$('scene');sceneWidth=Math.max(1,el.clientWidth);sceneHeight=Math.max(1,el.clientHeight);renderer.setSize(sceneWidth,sceneHeight,false);}new ResizeObserver(resize).observe($('scene'));resize();
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
 markLine.visible=Number.isFinite(state.mark);if(markLine.visible)markLine.position.x=state.mark;
 firstLine.visible=Number.isFinite(state.firstMark)&&state.firstMark-state.mark>.03;if(firstLine.visible)firstLine.position.x=state.firstMark;
 $('air-guide').classList.toggle('boost',trailWindow>0);
 $('air-count').textContent=(state.landingPose>.3?'準備落地 · ':state.charging?'蓄力中 · ':'')+'體力 '+Math.round(state.energy*100)+'%';
 $('air-guide').setAttribute('aria-label','剩餘體力 '+Math.round(state.energy*100)+'%');
}
function downloadPNG(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name||'playformosa-long-jump.png';document.body.appendChild(a);
 try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
}
function prepareResultShare(){
 if(state.phase!=='done')return;
 const token=shareState.begin();$('save-result').disabled=true;$('save-result').textContent=mobileImageAction()?'儲存／分享圖片':'下載圖片';$('share-status').textContent='正在準備圖片…';
 const r=result(state),info={...r,foul:state.foul,takeoffKmh:state.takeoffSpeed===null?null:toKmh(state.takeoffSpeed),flips:state.rotations,part:state.markPart};
 const point=new THREE.Vector3(state.x,state.y+.3,0).project(camera),focus={x:(point.x+1)/2,y:(1-point.y)/2};
 captureResultPng({render:()=>renderer.render(scene,camera),source:renderer.domElement,paint:source=>paintScoreCard(source,info,focus)}).then(blob=>{
  if(blob.type!=='image/png')throw new Error('Unsupported screenshot format');
  const file=typeof File==='function'?makeResultFile(blob):blob;
  if(!shareState.accept(token,file))return;
  $('save-result').disabled=false;$('share-status').textContent='';
 }).catch(()=>{if(!shareState.fail(token,'capture'))return;$('save-result').disabled=false;$('save-result').textContent='重做成績圖';$('share-status').textContent='圖片準備失敗，可重試。';});
}
function mobileImageAction(){return matchMedia('(pointer: coarse)').matches||((navigator.maxTouchPoints||0)>0&&!matchMedia('(hover: hover)').matches);}
function openImage(file){const url=URL.createObjectURL(file);let popup;try{popup=window.open(url,'_blank');if(popup)popup.opener=null;}catch{}setTimeout(()=>URL.revokeObjectURL(url),60000);return Boolean(popup);}
function resultShareData(){const r=result(state);return {text:'四肢各有想法－跳遠｜'+(r.valid?'我跳了 '+r.distance.toFixed(2)+' m！':state.foul?'這一跳越線，不計成績。':'這一跳沒進沙坑。')+' '+r.title,url:new URL('/games/long-jump/',location.origin).href};}
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
 const messages={'handed-off':'已交給系統；App 可能省略文字或網址，可另按複製。',downloaded:'已送出下載要求。','opened-image':'已開啟圖片，可長按儲存。',cancelled:'已取消。',unsupported:'此瀏覽器不支援圖片分享，請改用系統瀏覽器。',error:outcome.reason==='NotAllowedError'?'瀏覽器未允許圖片分享，請改用系統瀏覽器再試。':'圖片分享未完成，請稍後再試。'};
 $('share-status').textContent=messages[outcome.status];
};
let prev=performance.now(),acc=0;function frame(now){
 requestAnimationFrame(frame);const elapsed=Math.min((now-prev)/1000,.06);prev=now;
 if(playing&&!paused){acc+=elapsed;let n=0;while(acc>=DT&&n++<8){step(state,input);acc-=DT;}
  if(state.phase==='land'&&lastPhase!=='land')burst(state.x);lastPhase=state.phase;
  if(state.phase==='done'&&!reported){
   reported=true;playing=false;clear();const r=result(state);
   if(r.valid&&r.distance>best){best=r.distance;try{saveBest(localStorage,best);}catch{}}$('best').textContent=best.toFixed(2)+' m';
   const score=state.foul?'犯規':r.valid?r.distance.toFixed(2)+' <small>m</small>':'未計分';

   document.querySelector('.card').classList.add('result');
   show(r.title,'<div class="result-score">'+score+'</div>'+(state.foul?'<div class="result-status">越線 · 不計成績</div>':''),'再來一跳');
   $('share-actions').hidden=false;pendingCapture=true;

  }
 }
 renderAthlete();const view=cameraFrame(state,sceneWidth,sceneHeight);Object.assign(camera,{left:-view.halfW,right:view.halfW,top:view.halfH,bottom:-view.halfH});camera.updateProjectionMatrix();camera.position.set(view.centerX,view.centerY+4,16);camera.lookAt(view.centerX,view.centerY,0);
 if(!paused)for(const d of dust)if(d.life>0){d.life-=elapsed;d.v.y-=elapsed*5;d.m.position.addScaledVector(d.v,elapsed);d.m.scale.setScalar(Math.max(0,d.life*1.4));d.m.visible=d.life>0;}
 effects(elapsed);
 const inAir=state.phase==='air';$('jump-label').textContent=inAir?'空中落地姿勢':'蓄力起跳';
 const jumpButton=document.querySelector('[data-limb="4"]');jumpButton.setAttribute('aria-label',inAir?'Space 空中重新按住準備落地':'Space 按住蓄力，放開起跳');
 jumpButton.classList.toggle('charging',state.phase==='run'&&state.charging);
 $('speed').innerHTML=toKmh(state.vx).toFixed(1)+' <small>km/h</small>';
 renderer.render(scene,camera);
 if(pendingCapture){pendingCapture=false;prepareResultShare();}
}
modal.open();
requestAnimationFrame(frame);
