import {mountClub} from './club.mjs';
import {mountFastHandsSharing} from './share.mjs';
import {createReplayRecorder,recordReplay,finishReplay,sampleReplay} from './replay.mjs';
import {mountFastHandsLeaderboard} from './leaderboard.mjs';
import {createScoreImage} from './score-image.mjs';
import {captureFinaleImage} from './finale-image.mjs';
import {FINISH_RESULT_DELAY_MS} from './finish-timing.mjs';
import {TRACK,newRun,arm,move,release,cancel,snapshot} from './shuttle.mjs';
import {readBest,saveBest} from './records.mjs';
import {eventTime,orderedSamples} from './input-clock.mjs';
import {demoSample,poseForRun,renderScene} from './scene.mjs';
import {squeak} from './sound.mjs';
import {resolveInputMode} from './auto-input.mjs';
import {describeResult} from './result-copy.mjs';
import {demo3D,loadGameStage} from './three3d/presentation.mjs';
const $=id=>document.getElementById(id),pad=$('pad'),canvas=$('scene'),clock=()=>performance.now();
let s=newRun(),mode=matchMedia('(pointer:coarse)').matches?'touch':'mouse',demo=true,demoStart=clock(),activePointer=null,activeType=null,preference='auto',gestureRect=null,muted=false,ac=null,soundCount=0,storage=null,lastPhase='',finishStartedAt=null;
try{storage=localStorage;}catch{}
let cachedBest=readBest(storage,mode),stage=null,sampleForRun=null,raf=null,disposed=false,rendererMode='loading',previousBest=null,resultShown=false,terminalSeenAt=null,recordSaveFailed=false;
let resultForSharing=null,club=null,resultSuppressed=false,startupTimer=null;
let leaderboard=null,recorder=null,replayClip=null,replaying=false,replayStart=0;
let resultImagePromise=null,resultImageURL=null,resultImage=null,resultImageGeneration=0,resultImageSurface=0,imagePageAway=false;
const sharing=mountFastHandsSharing({document,createImage:async options=>{
 const token=resultImageGeneration,pending=resultImagePromise;
 const captured=await pending;
 if(!captured||token!==resultImageGeneration||imagePageAway||disposed)throw Error('本次畫面圖片無法產生');
 const portrait=installResultImage(captured,token);
 if(!portrait)throw Error('本次畫面圖片無法產生');
 return createScoreImage({...options,portrait});
}});
function imageStatus(message){const status=$('resultImageStatus');if(status)status.textContent=message;}
function releaseResultImage({reset=false}={}){
 resultImageSurface++;
 if(resultImageURL)URL.revokeObjectURL(resultImageURL);
 resultImageURL=null;resultImage=null;
 const image=$('resultPortrait');image.hidden=true;image.removeAttribute?.('src');
 if(reset){resultImageGeneration++;resultImagePromise=null;imageStatus('正在準備本次畫面…');}
}
function installResultImage(captured,token){
 if(token!==resultImageGeneration||imagePageAway||disposed)return null;
 if(!resultImageURL){
  resultImageURL=URL.createObjectURL(captured.blob);
  resultImage=new Image();resultImage.src=resultImageURL;
  const hero=$('resultPortrait');hero.src=resultImageURL;hero.hidden=false;
  imageStatus('本次挑戰的結束畫面');
 }
 return resultImage;
}
function displayResultImage(){
 if(!resultImagePromise)return;
 const token=resultImageGeneration,surface=resultImageSurface;
 void resultImagePromise.then(captured=>{
  if(token!==resultImageGeneration||surface!==resultImageSurface||imagePageAway||disposed)return;
  if(captured)installResultImage(captured,token);
  else imageStatus('本次畫面圖片暫時無法產生；成績與重播仍可使用。');
 }).catch(()=>{if(token===resultImageGeneration&&surface===resultImageSurface)imageStatus('本次畫面圖片暫時無法產生；成績與重播仍可使用。');});
}
function captureResultImage(view){
 if(resultImagePromise)return;
 const now=clock(),finishAge=finishStartedAt===null?0:Math.max(0,now-finishStartedAt),currentStage=stage;
 // Invoke synchronously: preserveDrawingBuffer:false loses pixels after yielding.
 resultImagePromise=(async()=>captureFinaleImage({document,canvas:currentStage?$('scene3d'):canvas,renderFrame:()=>{
  if(currentStage)return currentStage.render(sampleForRun(view,finishAge),{now,maxFps:60,force:true});
  if(rendererMode==='loading')return false;
  renderScene(canvas,{state:view,pose:poseForRun(view,finishAge),demo:false},torso);return true;
 }}))().catch(()=>null);
 displayResultImage();
}
const offline=$('demo3d'),dialogs=[$('entryDialog'),$('info'),$('resultDialog'),$('rankingDialog')];
const isTerminal=phase=>['success','failed','cancelled'].includes(phase);
const blocked=()=>dialogs.some(dialog=>dialog.open)||Boolean(club?.blocked());
function syncOverlay(){document.body.dataset.overlay=club?.navigationPending?.()?'navigation':$('rankingDialog').open?'ranking':$('entryDialog').open?'entry':$('resultDialog').open?'result':$('info').open?'help':'';syncVideo();}
function closeDialogs(){if($('rankingDialog').open)leaderboard?.dismiss(false);for(const dialog of dialogs)if(dialog.open)dialog.close();syncOverlay();}
function openDialog(dialog){dialog.hidden=false;if(!dialog.open)dialog.showModal();syncOverlay();}
for(const dialog of dialogs)dialog.addEventListener('close',syncOverlay);
document.addEventListener('clubchange',syncOverlay);
leaderboard=mountFastHandsLeaderboard({document,inlineUpload:{host:$('resultUploadHost'),trigger:$('resultUploadDirect'),hint:$('resultUploadHint'),resultDialog:$('resultDialog')},onOpen(dialog){interrupt('ranking');closeDialogs();openDialog(dialog);},onClose(origin){if(disposed)return;openDialog(origin==='result'&&resultShown?$('resultDialog'):$('entryDialog'));}});
function syncVideo(){
 if(rendererMode==='fallback'&&demo&&!blocked()&&!document.hidden&&document.body.dataset.video!=='failed'){if(offline.paused)void offline.play().catch(()=>{});}
 else offline.pause();
}
function fallback(){if(disposed)return;window.clearTimeout(startupTimer);stage=null;rendererMode='fallback';document.body.dataset.renderer='fallback';document.body.dataset.ready='true';$('sceneCaption').textContent=document.body.dataset.video==='failed'?'3D未啟用，目前以2D玩法與示範顯示。':'3D未啟用：示範為離線影片，挑戰保留2D玩法。';syncVideo();}
document.body.dataset.renderer='loading';document.body.dataset.view='front';
startupTimer=window.setTimeout(()=>{if(rendererMode==='loading')fallback();},5000);
loadGameStage($('scene3d'),{onUnavailable:fallback}).then(result=>{
 if(disposed||rendererMode!=='loading'){result.stage.dispose();return;}
 const painted=result.stage.render(demo3D(0).sample,{now:clock(),maxFps:30,force:true});
 if(rendererMode!=='loading'||!painted){result.stage.dispose();if(rendererMode==='loading')fallback();return;}
 window.clearTimeout(startupTimer);demoStart=clock();stage=result.stage;sampleForRun=result.sampleForRun;rendererMode='webgl';document.body.dataset.renderer='webgl';document.body.dataset.ready='true';$('sceneCaption').textContent='從紙鈔開始，按住後滑去抓小鴨。';syncVideo();
}).catch(fallback);
function videoFailed(){document.body.dataset.video='failed';if(rendererMode==='fallback')$('sceneCaption').textContent='3D未啟用，目前以2D玩法與示範顯示。';}
offline.addEventListener('error',videoFailed);$('demoSource').addEventListener('error',videoFailed);
if(offline.error||offline.networkState===3)videoFailed();
$('mode').value=preference;
const torso=new Image();torso.src='assets/king-torso-v3.png';
torso.onload=()=>{document.body.dataset.art='loaded';document.body.dataset.ready='true';};
torso.onerror=()=>{document.body.dataset.art='failed';document.body.dataset.ready='true';if(rendererMode!=='webgl')$('sceneCaption').textContent='角色圖片暫時無法載入。';};
function unlock(){try{ac??=new AudioContext();void ac.resume().catch(()=>{});}catch{}}
function quack(){if(muted)return;try{unlock();if(ac){squeak(ac);soundCount++;$('sound').dataset.playCount=String(soundCount);}}catch{$('sound').textContent='音效暫不可用';}}
function clearPointer(){const id=activePointer;activePointer=null;activeType=null;gestureRect=null;if(id!==null&&pad.hasPointerCapture(id))pad.releasePointerCapture(id);}
function stopReplay(){replaying=false;document.body.dataset.playback='';lastPhase='';}
function reset(){releaseResultImage({reset:true});resultSuppressed=false;stopReplay();recorder=null;replayClip=null;$('resultDemo').disabled=true;leaderboard.reset();sharing.reset();resultForSharing=null;clearPointer();s=newRun();lastPhase='';finishStartedAt=null;previousBest=null;resultShown=false;terminalSeenAt=null;recordSaveFailed=false;}
function interrupt(reason){stopReplay();if(activePointer!==null){s=cancel(s,clock(),reason);recordReplay(recorder,s,clock());}clearPointer();}
function apply(next,at=next.lastAt){const prev=s;s=next;if(next!==prev)recordReplay(recorder,next,at);if(prev.pickupAt===null&&s.pickupAt!==null)quack();if(prev.phase!=='success'&&s.phase==='success'){leaderboard.captureResult(s,mode,{demo});finishStartedAt=clock();previousBest=readBest(storage,mode);const saved=saveBest(storage,mode,s.elapsedMs);recordSaveFailed=saved===null;cachedBest=saved??previousBest;}}
function sampleTime(e){return eventTime(e,performance.timeOrigin,clock());}
function sampleX(e){return (e.clientX-gestureRect.left)/gestureRect.width;}
pad.addEventListener('contextmenu',e=>e.preventDefault());
pad.addEventListener('pointerdown',e=>{e.preventDefault();if(demo||replaying||blocked()||activePointer!==null)return;const inputMode=resolveInputMode(e,preference);if(!inputMode)return;const rect=pad.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width;if(x<0||x>TRACK.home)return;if(isTerminal(snapshot(s,clock()).phase))reset();const next=arm(s,{x,at:sampleTime(e),id:e.pointerId});if(next===s)return;s=next;mode=inputMode;recorder=createReplayRecorder({mode});recordReplay(recorder,next,sampleTime(e));cachedBest=readBest(storage,mode);activePointer=e.pointerId;activeType=e.pointerType;gestureRect=rect;pad.setPointerCapture(e.pointerId);unlock();});
pad.addEventListener('pointermove',e=>{if(activePointer!==e.pointerId||activeType!==e.pointerType||!gestureRect)return;e.preventDefault();for(const item of orderedSamples(e)){const at=sampleTime(item);apply(move(s,{x:sampleX(item),at,id:e.pointerId}),at);}});
pad.addEventListener('pointerup',e=>{if(activePointer!==e.pointerId||activeType!==e.pointerType)return;e.preventDefault();const at=sampleTime(e);apply(release(s,{at,id:e.pointerId}),at);clearPointer();});
pad.addEventListener('pointercancel',e=>{if(activePointer===e.pointerId)interrupt('pointercancel');});
pad.addEventListener('lostpointercapture',e=>{if(activePointer===e.pointerId)interrupt('lost-capture');});
window.addEventListener('blur',()=>interrupt('blur'));document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt('hidden');});window.addEventListener('resize',()=>interrupt('resize'));window.addEventListener('pagehide',event=>{imagePageAway=true;releaseResultImage();interrupt('hidden');leaderboard.dismiss(false);offline.pause();if(!event.persisted){disposed=true;window.clearTimeout(startupTimer);leaderboard.destroy();sharing.destroy();cancelAnimationFrame(raf);stage?.dispose();}});
window.addEventListener('pageshow',()=>{if(!disposed){imagePageAway=false;stage?.resize();syncVideo();displayResultImage();}});
document.addEventListener('visibilitychange',syncVideo);
window.addEventListener('storage',()=>{cachedBest=readBest(storage,mode);});
function startGame(){if(club?.blocked?.()||rendererMode==='loading')return;closeDialogs();demo=false;reset();syncVideo();unlock();}
function showDemo(){if(club?.blocked?.())return;closeDialogs();reset();demo=true;demoStart=clock();offline.currentTime=0;syncVideo();}
function interruptForClub({reason}){interrupt(reason);resultSuppressed=true;terminalSeenAt=null;syncVideo();}
function showResult(){
 if(club?.blocked?.())return;stopReplay();
 const view=snapshot(s,clock());
 if(demo||activePointer!==null||!isTerminal(view.phase))return;
 replayClip??=finishReplay(recorder);$('resultDemo').disabled=!replayClip;
 const result=resultForSharing??=Object.freeze(describeResult(view,{previousBest,best:cachedBest,mode,saveFailed:recordSaveFailed}));
 for(const [id,value] of Object.entries({resultTitle:result.title,resultTime:result.timeText,resultUnit:result.success?'秒':'',resultComment:result.comment,resultBest:result.bestText,resultDelta:result.deltaText,resultMode:result.modeText}))$(id).textContent=value;
  $('resultDialog').dataset.outcome=result.success?'success':'unfinished';
 $('resultDialog').dataset.record=String(result.newRecord);
 captureResultImage(view);resultShown=true;closeDialogs();openDialog($('resultDialog'));sharing.prepare(Object.freeze(result),mode);
}
function replayResult(){if(club?.blocked?.()||!replayClip||activePointer!==null||demo)return;closeDialogs();replaying=true;replayStart=clock();lastPhase='';document.body.dataset.playback='replay';syncVideo();}
$('resultDemo').onclick=replayResult;
$('mode').onchange=()=>{if(club?.blocked?.())return;interrupt('mode-change');preference=$('mode').value;if(preference!=='auto')mode=preference;cachedBest=readBest(storage,mode);reset();};
$('play').onclick=startGame;$('retry').onclick=startGame;$('showDemo').onclick=showDemo;
$('resultUploadDirect').onclick=()=>{if(!club?.blocked?.())leaderboard.showResultUpload();};
$('resultUpload').onclick=()=>{if(!club?.blocked?.())leaderboard.showUpload();};
$('entryRanking').onclick=()=>{if(!club?.blocked?.()||$('entryDialog').open&&!club?.navigationPending?.())leaderboard.showBoard({origin:'entry',mode});};
$('resultRanking').onclick=()=>{if(!club?.blocked?.())leaderboard.showBoard({origin:'result',mode});};
$('headerRanking').onclick=()=>{if(!club?.blocked?.())leaderboard.showBoard({origin:resultShown&&!demo?'result':'entry',mode});};
$('viewResult').onclick=showResult;$('resultAgain').onclick=startGame;
$('resultClose').onclick=()=>{$('resultDialog').close();syncOverlay();};
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='鴨叫：'+(muted?'關':'開');$('sound').setAttribute('aria-pressed',String(muted));if(!muted)unlock();};
$('about').onclick=$('headerSettings').onclick=()=>{if(club?.blocked?.()&&!($('entryDialog').open&&!club?.navigationPending?.()))return;interrupt('help');closeDialogs();openDialog($('info'));};
$('closeInfo').onclick=()=>{$('info').close();syncOverlay();};
function updateControls(view){
 const phase=demo?'demo':view.phase;
 const homeHints={demo:'起點',idle:'按住這裡',armed:'已就位',outbound:'回來接住',returning:'快回來！',success:'雙收成功',failed:activePointer!==null?'放開重來':'再挑戰',cancelled:'重新就位'};
 const farHints={demo:'滑到這裡',idle:'去抓小鴨',armed:'滑到這裡',outbound:'快抓鴨！',returning:'抓到了！',success:'已帶回',failed:'再試一次',cancelled:'不用急'};
 $('homeLabel').textContent='紙鈔起點';$('homeHint').textContent=homeHints[phase];
 $('farLabel').textContent='小鴨';$('farHint').textContent=farHints[phase];
 $('controlArrow').textContent=phase==='returning'?'←':phase==='success'?'✓':isTerminal(phase)?'↻':'→';
 const label=mode==='touch'?'單指觸控':'滑鼠操作';
 $('currentMode').textContent=label+(preference==='auto'?' · 自動':'');
 $('viewResult').hidden=demo||activePointer!==null||(!replaying&&!isTerminal(view.phase));$('viewResult').textContent=replaying?'返回成績':'看成績';
}
const labels={idle:'從紙鈔開始，按住準備出手',armed:'準備好了，就往右滑',outbound:'一路往右，抓小鴨！',returning:'抓到了，快滑回左邊！',success:'兩樣都接住了！',failed:'鈔票落地了，再試一次',cancelled:'這輪中止，不留成績'};
const prompts={idle:'從紙鈔開始 → 抓小鴨 → 回紙鈔',armed:'滑出左邊起點，才開始計時',outbound:'全程按住，碰到右邊就抓起',returning:'不要放開！一口氣滑回左邊',success:'漂亮！再比一次自己的紀錄',failed:'在左邊重新按住，就能再挑戰',cancelled:'在左邊重新按住，就能再挑戰'};
function draw(){if(disposed)return;const now=clock(),demoTime=rendererMode==='fallback'&&offline.readyState>=1&&document.body.dataset.video!=='failed'?offline.currentTime*1000:now-demoStart,d=demo?(rendererMode==='loading'?demo3D(0):rendererMode==='fallback'&&document.body.dataset.video==='failed'?demoSample(now-demoStart):demo3D(demoTime)):null,playback=replaying?sampleReplay(replayClip,now-replayStart):null,view=playback?.state??(d?d.state:snapshot(s,now)),phase=demo?'demo':view.phase;if(lastPhase!==phase){document.body.dataset.phase=phase;$('status').textContent=demo?'動作示範':labels[view.phase];lastPhase=phase;}if(d)$('status').textContent=rendererMode==='loading'?'正在準備角色…':d.label;if(playback)$('status').textContent='本次操作重播 · 原速';$('badge').textContent=replaying?'本次重播':demo?'先看一次':view.phase==='success'?'完成！':view.phase==='armed'?'準備中':'一筆挑戰';$('play').hidden=!demo;$('play').disabled=rendererMode==='loading';$('retry').hidden=demo;$('retry').disabled=rendererMode==='loading';$('showDemo').hidden=demo;$('mode').disabled=activePointer!==null||replaying;$('instruction').textContent=replaying?'正在重播你這一輪的操作':demo?'從紙鈔開始 → 抓小鴨 → 回紙鈔':prompts[view.phase];$('gestureHint').textContent=replaying?'原速重播 · 不計分，不會再上傳':demo?'按住紙鈔區，全程不放開':preference==='auto'&&view.phase==='idle'?'滑鼠或單指，全程按住':mode==='touch'?'同一根手指，不放開':'按住左鍵，不放開';updateControls(view);const ms=demo?0:view.elapsedMs;$('time').innerHTML=(ms/1000).toFixed(3)+' <small>s</small>';$('time').dataset.ms=String(ms);const best=cachedBest;$('best').textContent=best===null?'—':(best/1000).toFixed(3)+' s';$('bestMode').textContent=mode==='touch'?'觸控':'滑鼠';$('distance').innerHTML=((demo?0:view.dropPx)/150*100).toFixed(1)+' <small>cm</small>';$('thumb').style.left=((view.controlX??.1)*100)+'%';const finishAge=playback?.finishAge??(finishStartedAt===null?0:Math.max(0,now-finishStartedAt));
 if(!demo&&!replaying&&isTerminal(view.phase)){terminalSeenAt??=now;if(activePointer===null&&!resultShown&&!resultSuppressed&&!blocked()&&!document.hidden&&now-(view.phase==='success'?finishStartedAt:terminalSeenAt)>=(view.phase==='success'?FINISH_RESULT_DELAY_MS:350))showResult();}else terminalSeenAt=null;
 if(!document.hidden){
  if(stage){stage.render(d?.sample??sampleForRun(view,finishAge),{now,maxFps:demo?30:60});document.body.dataset.renderFrames=String(stage?.metrics.frames??0);document.body.dataset.triangles=String(stage?.metrics.triangles??0);document.body.dataset.renderMs=String(stage?.metrics.renderMs??0);}
  else if(rendererMode!=='loading'&&(!demo||document.body.dataset.video==='failed'))renderScene(canvas,{state:view,pose:d?.pose??poseForRun(view,finishAge),demo},torso);
 }
 if(playback?.done&&!blocked()&&!document.hidden)showResult();
 raf=requestAnimationFrame(draw);}
club=mountClub({document,window,mode:'duck',getNavigationContext:()=>({phase:s.phase,practice:demo}),getResumeTarget:()=>$('retry'),isActive:()=>!demo&&activePointer!==null&&s.phase!=='success',onInterrupt:interruptForClub,onStart:showDemo});
raf=requestAnimationFrame(draw);
