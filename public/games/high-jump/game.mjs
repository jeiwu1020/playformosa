import {mountLeaderboard} from '../shared/leaderboard.mjs';
import {recordPlayStart} from '../shared/play-counts.mjs';
let leaderboard=null;
import {createSceneAudio} from '../shared/scene-audio.mjs';
import {createGameAudioEvents} from '../shared/game-audio-events.mjs';
import {mountControlsFrame} from '../shared/controls-shell.mjs';
mountControlsFrame({document,game:"high-jump",scene:document.querySelector("#stage"),controls:document.querySelector(".controls"),keys:{a:document.querySelector("#a"),s:document.querySelector("#s"),j:document.querySelector("#j"),k:document.querySelector("#k")}});
import {createGameEntry,helpIsOpen,suspendHelpPresentation,ensurePauseHelp} from '../shared/entry-shell.mjs';
import {selectReplay,replayFrame} from './replay.mjs';
import {createRenderTransaction} from './render-transaction.mjs';
import {bindControls} from './control-bindings.mjs';
import {createActionInputs} from './action-inputs.mjs';
import {createPresentationClock} from './clock.mjs';
import {createRound,advance,verdict,KEYS,snapshot} from './physics.mjs';
import {createWorld} from './render.mjs';import {syncPauseButton,createResultDialog,createMusicController} from '../shared/game-ui.mjs';import {createSharing} from './share.mjs';
const $=id=>document.getElementById(id);let initialPresentationReady=false,world=null,s=createRound(),active=false,record=[],replay=null,replayClip=null,last=0,completed=false,pendingFinish=false;const clock=createPresentationClock(evolve,()=>pause(true,'畫面更新延遲，已保留剛才可見的位置。繼續後再操作，不會暗判漏步或失誤。'));const controls=createActionInputs(()=>s,()=>clock.input(performance.now()),paintControls);let best=0;try{best=Number(localStorage.getItem('pf-high-jump-best-v8'))||0}catch{}$('best').textContent=best?best.toFixed(1)+' m':'—';
const presentation=createRenderTransaction({getState:()=>s,setState:value=>{s=value;pendingFinish=false;completed=false;},getMeta:()=>({replay,active,completed}),setMeta:m=>{replay=m.replay;active=m.active;completed=m.completed;},getHistoryLength:()=>record.length,truncateHistory:n=>{record.length=n;},onError:error=>{pendingFinish=false;pause(true,'繪圖暫時失敗，已保留上一個成功畫面的位置。按繼續重試；重來也可以。');$('status').textContent='繪圖未成功，沒有計分；可重試。';console.warn('High-jump draw interrupted',error);}});
presentation.seed();
function drawSafely(shown,commit=()=>{}){return presentation.draw(()=>{world.resize();world.draw(shown);},commit);}
const music=createSceneAudio({game:'high-jump',src:new URL('./audio/bgm.mp3',import.meta.url).href,notify:a=>{$('music').setAttribute('aria-pressed',String(a.ready));$('music').setAttribute('aria-label',a.enabled&&a.ready?'關閉音樂':'開啟或重試音樂');$('music').textContent=a.ready?'♫ 開':'♫ 關';if(a.pending)$('status').textContent='音樂載入中…';else if(a.ready)$('status').textContent='音樂已開啟 · 不用配合音樂打拍子。';else if(a.enabled&&!a.ready&&active)$('status').textContent='音樂尚未開啟；可按音樂重試。不影響遊戲。';}});
const audioEvents=createGameAudioEvents('high-jump',name=>music.play(name));
const sharing=createSharing({byId:$});const result=createResultDialog($('result'),{focusTarget:()=>$('retry'),returnFocus:()=>$('stage')});
function paintControls(){for(const key of KEYS)$(key.toLowerCase()).classList.toggle('active',controls.isHeld(key));}
function release(){bindings.release();}
function audioUnlock(){music.setPlaying(true);void music.unlock()}
function start(){if(!initialPresentationReady)return;leaderboard?.reset();entry.close({restoreView:false});release();sharing.reset();for(const id of['intro','paused','result','fallback'])if($(id).open)$(id).close();s=createRound();s.phase='run';s.countdown=0;audioEvents.reset();audioEvents.update(s,{emitResult:false});active=true;clock.reset(performance.now());completed=false;pendingFinish=false;record=[];replay=null;replayClip=null;presentation.seed();last=0;$('replayTag').hidden=true;$('status').textContent='誇張運動，請勿模仿。';audioUnlock();$('stage').focus({preventScroll:true});update();void recordPlayStart(window,'high-jump');}
function pause(value=true,reason='遊戲時間已停住，繼續後重新按鍵。'){if(!active||s.phase==='done'&&!replay)return;if(value)clock.pause(performance.now());else clock.resume(performance.now());if(!active)return;release();s.paused=value;last=0;music.setPlaying(!value);if(value){$('pauseReason').textContent=reason;if(!helpIsOpen(document))entry.openPause();}else{entry.close({restoreView:false});if($('paused').open)$('paused').close();audioUnlock();$('stage').focus({preventScroll:true});}update();}
function finish(){leaderboard?.setResult({...s,phase:'done'});completed=true;release();active=false;music.setPlaying(false);audioEvents.finish();const rating=s.resultVerdict=verdict(s);if(record.at(-1)?.t!==s.t)record.push(snapshot(s));if(s.success&&s.height>best){best=s.height;try{localStorage.setItem('pf-high-jump-best-v8',String(best))}catch{}}$('best').textContent=best?best.toFixed(1)+' m':'—';$('resultTitle').textContent=s.success?'越過去了！':s.fallen?'重心先下班了':'再來一跳？';$('resultScore').textContent=s.success?s.height.toFixed(1)+' m':'未過桿';$('verdict').textContent=rating;result.open();captureResult();update();}
function captureResult(){sharing.capture(world.canvas,s,s.resultVerdict,(w,h)=>world.capture(s,w,h));}
function update(){const shown=replay?replayFrame(replayClip,replay.time)||s:s;$('target').textContent=shown.barLocked||shown.phase==='air'?shown.target.toFixed(1)+' m':'起跳後決定';$('count').textContent=active&&!replay&&s.phase==='countdown'?Math.ceil(s.countdown):'';
 $('prompt').textContent=replay?'看這一跳，手腳怎麼配合。':s.phase==='countdown'?'A/S 控制雙腳，長按 A 或 S 蓄力，放開起跳；J/K 雙手平衡':s.phase==='run'?'A/S 控制雙腳，長按 A 或 S 蓄力，放開起跳；J/K 雙手平衡':s.phase==='air'?'先按 J/K 帶頭肩過桿；髖過桿後按 A/S 收腿。':s.feedback;
 syncPauseButton($('pause'),{paused:s.paused,available:active&&s.phase!=='done'||Boolean(replay)});for(const key of KEYS)$(key.toLowerCase()).disabled=!active||s.paused||!!replay;paintControls();return shown;}
$('start').onclick=()=>start();$('restart').onclick=()=>start();$('retry').onclick=()=>start();$('pause').onclick=()=>pause(!s.paused);$('resume').onclick=()=>pause(false);$('paused').addEventListener('cancel',e=>{e.preventDefault();pause(false)});$('intro').addEventListener('cancel',e=>e.preventDefault());
$('music').onclick=()=>{if(music.ready){music.setEnabled(false);$('status').textContent='音樂已關閉。';}else{music.setEnabled(true);music.setPlaying(active&&!s.paused);void music.unlock()}};
$('replay').onclick=()=>{result.close();release();const clip=selectReplay(record);if(!clip){result.open();return;}replayClip=clip;replay={time:0};active=true;s.paused=false;presentation.seed();clock.reset(performance.now());last=0;$('replayTag').hidden=false;$('stage').focus({preventScroll:true});update();};
const bindings=bindControls({buttons:Object.fromEntries(KEYS.map(k=>[k,$(k.toLowerCase())])),global:globalThis,input:controls,available:()=>active&&!s.paused&&!replay,changed:update});
addEventListener('keydown',e=>{if(!e.repeat&&['p','P','Escape'].includes(e.key)&&active&&!$('result').open&&!$('intro').open){e.preventDefault();pause(!s.paused);}});

function interrupt(){if(active)pause(true);else release()}addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt()});addEventListener('orientationchange',interrupt);globalThis.screen?.orientation?.addEventListener('change',interrupt);addEventListener('resize',()=>{try{world?.resize();if(world)drawSafely(update());if($('result').open&&completed)captureResult();}catch(error){pause(true,'畫面調整失敗，按繼續重試。');$('status').textContent='畫面未成功更新，沒有計分。';}});
try{world=createWorld($('world'));initialPresentationReady=drawSafely(s)}catch(error){$('world').innerHTML='<div class="game-error"><b>這個瀏覽器目前無法啟動 WebGL。</b><br>遊戲尚未開始，也不會計分。請改用支援 WebGL 的瀏覽器，或返回遊戲首頁。</div>';$('restart').disabled=true;for(const key of KEYS)$(key.toLowerCase()).disabled=true;$('status').textContent='3D 畫面無法啟動；首頁與音樂按鈕仍可使用。';console.error('High-jump renderer unavailable',error)}
if(!initialPresentationReady)$('restart').disabled=true;
function evolve(dt){if(!world||!active||s.paused)return;if(replay){replay.time+=dt;if(replay.time>=replayClip.duration){replay=null;active=false;$('replayTag').hidden=true;drawSafely(s,()=>result.open());}return;}let remaining=dt;while(remaining>1e-9&&active){const step=Math.min(remaining,1/120),before=s.t;advance(s,step);if(Math.floor(s.t*60)>Math.floor(before*60))record.push(snapshot(s));remaining-=step;if(s.phase==='done'&&!completed){pendingFinish=true;break;}}}
function frame(){try{const now=performance.now(),ready=active?clock.frame(now):false;const shown=update();if(world&&active&&!s.paused&&ready)drawSafely(shown,()=>{clock.present(now);if(!replay)audioEvents.update(s,{emitResult:false});if(pendingFinish){pendingFinish=false;finish();}});}catch(error){s.paused=true;clock.pause?.();try{pause(true,'繪圖暫時失敗，按繼續或重來再試。');}catch{}}finally{requestAnimationFrame(frame)}}requestAnimationFrame(frame);

function helpVisit(){leaderboard?.suspend();return suspendHelpPresentation(document,{pause:()=>{interrupt();release();},controllers:{result},dialogs:['paused','result','intro'],after:({restoredDialog})=>{if(!restoredDialog&&active&&s.paused&&(s.phase!=='done'||replay))entry.openPause();}});}
const entry=createGameEntry({document,gameId:'high-jump',operations:['助跑：A／S 交替短按，搭配 J／K 擺動手臂、調整平衡。','起跳：長按 A 或 S 蓄力，在綠區放開起跳。','過桿：先按 J／K 帶頭肩過桿，髖部過桿後按 A／S 收腿。'],onHelpEnter:helpVisit,onStart:()=>start(),onEnter:()=>{interrupt();release();},canStart:()=>initialPresentationReady});entry.open();

entry.setAudio(music);

entry.configurePause({onContinue:()=>pause(false),onRestart:()=>start(),canContinue:()=>active&&s.paused});

leaderboard=mountLeaderboard({document,game:'high-jump',entry:entry.dialog,shell:entry,result:$('result')});
