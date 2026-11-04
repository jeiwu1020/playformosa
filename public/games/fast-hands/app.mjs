import {createScoreImage} from './score-image.mjs';
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
let cachedBest=readBest(storage,mode),stage=null,sampleForRun=null,raf=null,disposed=false,rendererMode='loading',previousBest=null,resultShown=false,terminalSeenAt=null,recordSaveFailed=false,resultForDownload=null,downloadBusy=false;
const offline=$('demo3d'),dialogs=[$('entryDialog'),$('info'),$('resultDialog')];
const isTerminal=phase=>['success','failed','cancelled'].includes(phase);
const blocked=()=>dialogs.some(dialog=>dialog.open);
function syncOverlay(){document.body.dataset.overlay=$('entryDialog').open?'entry':$('resultDialog').open?'result':$('info').open?'help':'';syncVideo();}
function closeDialogs(){for(const dialog of dialogs)if(dialog.open)dialog.close();syncOverlay();}
function openDialog(dialog){dialog.hidden=false;if(!dialog.open)dialog.showModal();syncOverlay();}
for(const dialog of dialogs)dialog.addEventListener('close',syncOverlay);
function syncVideo(){
 if(rendererMode==='fallback'&&demo&&!blocked()&&!document.hidden&&document.body.dataset.video!=='failed'){if(offline.paused)void offline.play().catch(()=>{});}
 else offline.pause();
}
function fallback(){if(disposed)return;stage=null;rendererMode='fallback';document.body.dataset.renderer='fallback';document.body.dataset.ready='true';$('sceneCaption').textContent=document.body.dataset.video==='failed'?'3D未啟用，目前以2D玩法與示範顯示。':'3D未啟用：示範為離線影片，挑戰保留2D玩法。';syncVideo();}
document.body.dataset.renderer='loading';document.body.dataset.view='front';
loadGameStage($('scene3d'),{onUnavailable:fallback}).then(result=>{
 if(disposed){result.stage.dispose();return;}stage=result.stage;sampleForRun=result.sampleForRun;rendererMode='webgl';document.body.dataset.renderer='webgl';document.body.dataset.ready='true';$('sceneCaption').textContent='正面3D · 手指留在下面，畫面看得清楚。';syncVideo();
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
function resetDownload(){resultForDownload=null;downloadBusy=false;$('resultDownload').disabled=false;$('downloadStatus').textContent='';}
function reset(){resetDownload();clearPointer();s=newRun();lastPhase='';finishStartedAt=null;previousBest=null;resultShown=false;terminalSeenAt=null;recordSaveFailed=false;}
function interrupt(reason){if(activePointer!==null)s=cancel(s,clock(),reason);clearPointer();}
function apply(next){const prev=s;s=next;if(prev.pickupAt===null&&s.pickupAt!==null)quack();if(prev.phase!=='success'&&s.phase==='success'){finishStartedAt=clock();previousBest=readBest(storage,mode);const saved=saveBest(storage,mode,s.elapsedMs);recordSaveFailed=saved===null;cachedBest=saved??previousBest;}}
function sampleTime(e){return eventTime(e,performance.timeOrigin,clock());}
function sampleX(e){return (e.clientX-gestureRect.left)/gestureRect.width;}
pad.addEventListener('contextmenu',e=>e.preventDefault());
pad.addEventListener('pointerdown',e=>{e.preventDefault();if(demo||blocked()||activePointer!==null)return;const inputMode=resolveInputMode(e,preference);if(!inputMode)return;const rect=pad.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width;if(x<0||x>TRACK.home)return;if(isTerminal(snapshot(s,clock()).phase))reset();const next=arm(s,{x,at:sampleTime(e),id:e.pointerId});if(next===s)return;s=next;mode=inputMode;cachedBest=readBest(storage,mode);activePointer=e.pointerId;activeType=e.pointerType;gestureRect=rect;pad.setPointerCapture(e.pointerId);unlock();});
pad.addEventListener('pointermove',e=>{if(activePointer!==e.pointerId||activeType!==e.pointerType||!gestureRect)return;e.preventDefault();for(const item of orderedSamples(e))apply(move(s,{x:sampleX(item),at:sampleTime(item),id:e.pointerId}));});
pad.addEventListener('pointerup',e=>{if(activePointer!==e.pointerId||activeType!==e.pointerType)return;e.preventDefault();apply(release(s,{at:sampleTime(e),id:e.pointerId}));clearPointer();});
pad.addEventListener('pointercancel',e=>{if(activePointer===e.pointerId)interrupt('pointercancel');});
pad.addEventListener('lostpointercapture',e=>{if(activePointer===e.pointerId)interrupt('lost-capture');});
window.addEventListener('blur',()=>interrupt('blur'));document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt('hidden');});window.addEventListener('resize',()=>interrupt('resize'));window.addEventListener('pagehide',event=>{interrupt('hidden');offline.pause();if(!event.persisted){disposed=true;cancelAnimationFrame(raf);stage?.dispose();}});
window.addEventListener('pageshow',()=>{if(!disposed){stage?.resize();syncVideo();}});
document.addEventListener('visibilitychange',syncVideo);
window.addEventListener('storage',()=>{cachedBest=readBest(storage,mode);});
function startGame(){closeDialogs();demo=false;reset();syncVideo();unlock();}
function showDemo(){closeDialogs();reset();demo=true;demoStart=clock();offline.currentTime=0;syncVideo();}
function showMenu(){interrupt('menu');closeDialogs();openDialog($('entryDialog'));}
function showResult(){
 const view=snapshot(s,clock());
 if(demo||activePointer!==null||!isTerminal(view.phase))return;
 const result=describeResult(view,{previousBest,best:cachedBest,mode,saveFailed:recordSaveFailed});
 for(const [id,value] of Object.entries({resultTitle:result.title,resultTime:result.timeText,resultUnit:result.success?'秒':'',resultComment:result.comment,resultBest:result.bestText,resultDelta:result.deltaText,resultMode:result.modeText}))$(id).textContent=value;
 resetDownload();resultForDownload=Object.freeze(result);
 $('resultDialog').dataset.outcome=result.success?'success':'unfinished';
 $('resultDialog').dataset.record=String(result.newRecord);
 resultShown=true;closeDialogs();openDialog($('resultDialog'));
}
$('mode').onchange=()=>{interrupt('mode-change');preference=$('mode').value;if(preference!=='auto')mode=preference;cachedBest=readBest(storage,mode);reset();};
$('play').onclick=startGame;$('retry').onclick=startGame;$('showDemo').onclick=showDemo;
$('entryStart').onclick=showDemo;$('openMenu').onclick=showMenu;
$('entryClose').onclick=()=>{$('entryDialog').close();syncOverlay();};
async function downloadResult(){
 if(downloadBusy||!resultForDownload||!$('resultDialog').open)return;
 const result=resultForDownload;
 downloadBusy=true;$('resultDownload').disabled=true;$('downloadStatus').textContent='成績圖製作中…';
 try{
  const {blob,filename}=await createScoreImage({result,mode,portrait:$('resultPortrait')});
  if(result!==resultForDownload||disposed)return;
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{link.href=url;link.download=filename;document.body.appendChild(link);link.click();}
  finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  $('downloadStatus').textContent='成績圖已產生，請查看瀏覽器下載項目。';
 }catch{if(result===resultForDownload&&!disposed)$('downloadStatus').textContent='成績圖暫時無法產生，請再試一次。';}
 finally{if(result===resultForDownload){downloadBusy=false;$('resultDownload').disabled=false;}}
}
$('resultDownload').onclick=downloadResult;
$('viewResult').onclick=showResult;$('resultAgain').onclick=startGame;$('resultDemo').onclick=showDemo;
$('resultClose').onclick=()=>{$('resultDialog').close();syncOverlay();};
$('sound').onclick=()=>{muted=!muted;$('sound').textContent='鴨叫：'+(muted?'關':'開');$('sound').setAttribute('aria-pressed',String(muted));if(!muted)unlock();};
$('about').onclick=()=>{interrupt('help');closeDialogs();openDialog($('info'));};
$('closeInfo').onclick=()=>{$('info').close();syncOverlay();};
function updateControls(view){
 const phase=demo?'demo':view.phase;
 const homeHints={demo:'起點',idle:'按住這裡',armed:'已就位',outbound:'回來接住',returning:'快回來！',success:'雙收成功',failed:activePointer!==null?'放開重來':'再挑戰',cancelled:'重新就位'};
 const farHints={demo:'滑到這裡',idle:'去抓小鴨',armed:'滑到這裡',outbound:'快抓鴨！',returning:'抓到了！',success:'已帶回',failed:'再試一次',cancelled:'不用急'};
 $('homeLabel').textContent='鈔票';$('homeHint').textContent=homeHints[phase];
 $('farLabel').textContent='小鴨';$('farHint').textContent=farHints[phase];
 $('controlArrow').textContent=phase==='returning'?'←':phase==='success'?'✓':isTerminal(phase)?'↻':'→';
 const label=mode==='touch'?'單指觸控':'滑鼠操作';
 $('currentMode').textContent=label+(preference==='auto'?' · 自動':'');
 $('viewResult').hidden=demo||activePointer!==null||!isTerminal(view.phase);
}
const labels={idle:'按住左邊，準備出手',armed:'準備好了，就往右滑',outbound:'一路往右，抓小鴨！',returning:'抓到了，快滑回左邊！',success:'兩樣都接住了！',failed:'鈔票落地了，再試一次',cancelled:'這輪中止，不留成績'};
const prompts={idle:'按住起點 → 滑到右邊 → 滑回起點',armed:'滑出左邊起點，才開始計時',outbound:'全程按住，碰到右邊就抓起',returning:'不要放開！一口氣滑回左邊',success:'漂亮！再比一次自己的紀錄',failed:'在左邊重新按住，就能再挑戰',cancelled:'在左邊重新按住，就能再挑戰'};
function draw(){if(disposed)return;const now=clock(),demoTime=rendererMode==='fallback'&&offline.readyState>=1&&document.body.dataset.video!=='failed'?offline.currentTime*1000:now-demoStart,d=demo?(rendererMode==='loading'||(rendererMode==='fallback'&&document.body.dataset.video==='failed')?demoSample(now-demoStart):demo3D(demoTime)):null,view=d?d.state:snapshot(s,now),phase=demo?'demo':view.phase;if(lastPhase!==phase){document.body.dataset.phase=phase;$('status').textContent=demo?'3D動作示範':labels[view.phase];lastPhase=phase;}if(d)$('status').textContent=d.label;$('badge').textContent=demo?'先看一次':view.phase==='success'?'完成！':view.phase==='armed'?'準備中':'一筆挑戰';$('play').hidden=!demo;$('retry').hidden=demo;$('showDemo').hidden=demo;$('mode').disabled=activePointer!==null;$('instruction').textContent=demo?'按住左邊 → 滑到右邊 → 滑回左邊':prompts[view.phase];$('gestureHint').textContent=demo?'全程不用放開':preference==='auto'&&view.phase==='idle'?'滑鼠或單指，全程按住':mode==='touch'?'同一根手指，不放開':'按住左鍵，不放開';updateControls(view);const ms=demo?0:view.elapsedMs;$('time').innerHTML=(ms/1000).toFixed(3)+' <small>s</small>';$('time').dataset.ms=String(ms);const best=cachedBest;$('best').textContent=best===null?'—':(best/1000).toFixed(3)+' s';$('bestMode').textContent=mode==='touch'?'觸控':'滑鼠';$('distance').innerHTML=((demo?0:view.dropPx)/150*100).toFixed(1)+' <small>cm</small>';$('thumb').style.left=((view.controlX??.1)*100)+'%';const finishAge=finishStartedAt===null?0:Math.max(0,now-finishStartedAt);
 if(!demo&&isTerminal(view.phase)){terminalSeenAt??=now;if(activePointer===null&&!resultShown&&!blocked()&&!document.hidden&&now-(view.phase==='success'?finishStartedAt:terminalSeenAt)>=(view.phase==='success'?FINISH_RESULT_DELAY_MS:350))showResult();}else terminalSeenAt=null;
 if(!document.hidden){
  if(stage){stage.render(d?.sample??sampleForRun(view,finishAge),{now,maxFps:demo?30:60});document.body.dataset.renderFrames=String(stage?.metrics.frames??0);document.body.dataset.triangles=String(stage?.metrics.triangles??0);document.body.dataset.renderMs=String(stage?.metrics.renderMs??0);}
  else if(!demo||rendererMode==='loading'||document.body.dataset.video==='failed')renderScene(canvas,{state:view,pose:d?.pose??poseForRun(view,finishAge),demo},torso);
 }
 raf=requestAnimationFrame(draw);}
openDialog($('entryDialog'));
raf=requestAnimationFrame(draw);
