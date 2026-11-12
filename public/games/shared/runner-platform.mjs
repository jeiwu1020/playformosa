import{recordPlayStart}from'./play-counts.mjs';
import{createEntryShell,suspendHelpPresentation}from'./entry-shell.mjs';
import{mountControlsFrame}from'./controls-shell.mjs';
import{createResultDialog,syncPauseButton}from'./game-ui.mjs';
import{mountLeaderboard}from'./leaderboard.mjs';
import{createRunnerAudio}from'./runner-audio.mjs';
import{freezeRunnerResult}from'./runner-result.mjs';
import{createFinishRecorder,sampleFinishClip}from'./runner-replay.mjs';
import{bindShare,freezeScene}from'../sprint-100m/share.mjs';
export function createRunnerPlatform({document,adapter:a}){
 const win=document.defaultView,$=id=>document.getElementById(id),world=$('world'),dialog=$('result'),pointers=new Map();
 const controls=[...document.querySelectorAll('[data-limb],[data-key]')],keys={};for(const b of controls){const key=b.dataset.key||['j','k','a','s'][Number(b.dataset.limb)];keys[key]=b;}
 let race=a.create(),active=false,last=win.performance.now(),saved=null,replay=null,recorder=createFinishRecorder(),share=null,board=null,postUntil=null,resultRendered=false,accumulator=0;
 const audio=createRunnerAudio({document,gameId:a.gameId,sound:a.sound});
 const resultUI=createResultDialog(dialog,{focusTarget:()=>$('resultTitle'),returnFocus:()=>world});
 function clear(){a.clear(race);for(const [id,b]of pointers){try{b.releasePointerCapture(id);}catch{}}pointers.clear();controls.forEach(b=>b.setAttribute('aria-pressed','false'));}
 function sync(){syncPauseButton($('pause'),{paused:replay?replay.paused:race.paused,available:active&&!dialog.open&&!entry.active});$('restart').disabled=!a.ready();for(const b of controls)b.disabled=!active||race.paused||!!saved||!!replay||entry.active;}
 function suspend(){accumulator=0;race.paused=true;clear();audio.suspend();if(replay)replay.paused=true;last=win.performance.now();sync();}
 function resume(){accumulator=0;if(saved){entry.close({restoreView:false});showResult();return;}entry.close({restoreView:false});audio.adapter.unlock();clear();race.paused=false;audio.resume();last=win.performance.now();world.focus({preventScroll:true});sync();}
 function restart(){if(!a.ready())return;accumulator=0;entry.close({restoreView:false});board?.reset();share?.reset();share=null;resultUI.close();$('fallback').close();replay=null;document.body.classList.remove('replaying');$('replayControls').hidden=true;audio.reset();race=a.create();active=true;saved=null;frozenScene=null;postUntil=null;resultRendered=false;recorder=createFinishRecorder();clear();a.start?.(race);race.paused=false;last=win.performance.now();audio.adapter.unlock();audio.resume();world.focus({preventScroll:true});sync();void recordPlayStart(win,a.gameId);}
 function pauseRootVisible(event){const root=entry.dialog.querySelector(':scope > [data-pf-pause]');return !!root&&!root.hidden&&!root.closest('[hidden],[inert]')&&!entry.dialog.classList.contains('pf-honor-dialog')&&!event.target?.closest?.('.pf-menu-audio')&&!document.activeElement?.closest?.('.pf-menu-audio');}
 function pause(){if(!active)return;if(replay){replay.paused=!replay.paused;sync();return;}if(saved||dialog.open)return;suspend();entry.openPause();sync();}
 win.addEventListener('keydown',e=>{if(textTarget(e))return;const k=e.key.toLowerCase();if(entry.active){if(pauseRootVisible(e)&&(k==='p'||k==='escape')){e.preventDefault();e.stopImmediatePropagation();resume();}return;}if(k==='p'||k==='escape'){if(!dialog.open){e.preventDefault();pause();}return;}if(keys[k]&&!dialog.open){e.preventDefault();if(!e.repeat)press(k,true);}},true);
 const advanced=document.createElement('div');advanced.innerHTML=a.advanced;
 const entry=createEntryShell({document,gameId:a.gameId,title:a.title,goal:a.goal,operations:a.operations,advanced,canStart:()=>a.ready(),onStart:restart,onEnter:()=>suspend(),onHelpEnter:()=>suspendHelpPresentation(document,{pause:suspend,controllers:{result:resultUI},dialogs:['result'],panels:[$('replayControls')],after:({restoredDialog})=>{if(replay)return;if(saved){if(!restoredDialog)showResult();}else if(active)entry.openPause();}})});
 entry.setAudio(audio.adapter);entry.configurePause({onContinue:resume,onRestart:restart,canContinue:()=>active&&!saved});
 const controlsSource=document.createElement('div');controlsSource.className='runner-controls-source';for(const b of controls)controlsSource.append(b);document.querySelector('main').append(controlsSource);
 mountControlsFrame({document,scene:document.querySelector('.arena'),controls:controlsSource,keys,game:a.gameId});
 const oldMusic=$('music')||$('sound');if(oldMusic){oldMusic.hidden=true;oldMusic.removeAttribute('data-game-action');}document.querySelector('.pf-header [data-pf-music-toggle]')?.setAttribute('data-game-action','music');
 const help=$('help');help.onclick=()=>entry.open({help:true});
 function showResult(){if(!saved)return;race.paused=true;audio.suspend();if(!resultRendered){
  const s=saved,m=s.metrics;const facts=a.gameId==='run-400m'?`踩準 ${m.perfectSteps}／${m.steps} 步 · 起跑反應 ${(m.reaction??0).toFixed(2)} 秒 · 跌倒 ${m.falls} 次 · 剩餘腿力 ${Math.round(m.stamina)}%`:`腳步 ${m.steps} 次 · 剩餘體力 ${Math.round(m.energy)}% · 跟跑氣流 ${Math.round(m.slipSeconds)} 秒 · 換位 ${m.laneChanges} 次 · 補給 ${m.cansCollected.length}／3 罐`;
  let previous=0;const splits=m.splits.map((x,i)=>{const value=typeof x==='number'?x:x.time,part=value-previous;previous=value;return`<div class="rank-row"><span>${typeof x==='number'?(i+1)*100:x.distance}m</span><span>分段</span><b>${part.toFixed(2)} 秒</b></div>`;}).join('');
  $('resultBody').innerHTML=`<p class="tag">PLAYFORMOSA · ${a.title}</p><div class="bigtime">${s.seconds.toFixed(2)}<small> 秒</small></div><h2 id="resultTitle" tabindex="-1">過線時第 ${s.rank} 名</h2><p class="runner-verdict">${s.verdict}</p>${s.timeBasis?`<p class="runner-time-basis">${s.timeBasis}</p>`:''}<div id="resultPrimary" class="pf-result-play"><button id="finishReplay" class="primary">終點精彩重播</button><button id="again">再跑一次</button></div><div class="pf-share-actions"><a id="threads" data-share="threads" target="_blank" rel="noopener noreferrer">分享至Threads</a><button id="image" data-share="image" disabled>下載成績圖片</button><button id="copy" data-share="copy">複製成績與網址</button></div><p id="share-status" role="status" aria-live="polite"></p><small>Threads 圖片請手動附加。${a.gameId==='run-1500m'?'成績為玩家回報。':'成績為玩家回報，不計十項總積分。'}</small><div id="uploadSlot"></div><details class="pf-result-details"><summary>本場細節、分段與過線照片</summary><p>${facts}</p><p>${a.gameId==='run-1500m'?'':`規則 ${s.ruleset} · `}${a.storageStatus?.()||'本機紀錄已保存'}</p><div>${s.runners.map(q=>`<div class="rank-row"><span>${q.id===0?'你':'對手'}</span><span>${q.name}</span><b>${q.finished===null?'過線時尚未完賽':q.finished.toFixed(2)+' 秒'}</b></div>`).join('')}</div>${splits}<img id="resultPhoto" alt="本場實際過線畫面"></details><p class="pf-studio-result">島遊無界工作室 | PLAYFORMOSA STUDIO</p>`;
  $('again').onclick=restart;$('finishReplay').onclick=startReplay;
  share=bindShare({imageButton:$('image'),threads:$('threads'),copyButton:$('copy'),status:$('share-status'),resultImage:$('resultPhoto'),fallback:$('fallback'),fallbackImage:$('fallback-image'),fallbackText:$('fallback-text')});
  try{share.prepare(frozenScene,{...s,gameId:a.gameId,title:a.title,cardTitle:a.gameId==='run-400m'?'400公尺':'1500公尺'});}catch{$('share-status').textContent='本次畫面無法擷取，仍可分享秒數與網址。';}
  board?.destroy();board=mountLeaderboard({document,game:a.gameId,entry:entry.dialog,result:$('resultBody'),resultActionContainer:$('resultPrimary'),resultUploadContainer:$('uploadSlot'),shell:entry,enabled:a.leaderboardEnabled});board?.setResult(s);resultRendered=true;
 }
 const clip=recorder.clip();$('finishReplay').disabled=!clip||postUntil!==null;resultUI.open();sync();}
 let frozenScene=null;
 function finish(){if(saved)return;accumulator=0;saved=freezeRunnerResult(a.gameId,race,a.rules);if(!saved)return;clear();a.render(race,true);try{frozenScene=freezeScene(a.canvas());}catch{frozenScene=null;}
  recorder.finish(race,race.clock);a.save(saved);audio.sync(race);
  // 1500m source already supports honest runout. Record it without rebuilding the finish snapshot.
  postUntil=a.gameId==='run-1500m'?race.clock+1:null;showResult();
 }
 function startReplay(){const clip=recorder.clip();if(!clip||postUntil!==null)return;resultUI.close();suspend();entry.close({restoreView:false});replay={clip,time:clip.start,paused:false};$('replayControls').hidden=false;document.body.classList.add('replaying');$('replayBack').focus({preventScroll:true});last=win.performance.now();sync();}
 function endReplay(){if(!replay)return;replay=null;document.body.classList.remove('replaying');$('replayControls').hidden=true;showResult();}
 $('replayPlay').onclick=()=>{if(replay){replay.paused=!replay.paused;sync();}};$('replayAgain').onclick=()=>{if(replay){replay.time=replay.clip.start;replay.paused=false;}};$('replayBack').onclick=endReplay;
 $('replaySeek').oninput=()=>{if(replay){replay.time=replay.clip.start+(replay.clip.end-replay.clip.start)*Number($('replaySeek').value)/1000;replay.paused=true;}};
 function press(key,down){if(!keys[key]||!active||race.paused||saved||replay||entry.active||dialog.open)return;a.input(race,key,down);keys[key].setAttribute('aria-pressed',String(!!a.held(race,key)));}
 for(const [key,b]of Object.entries(keys)){b.onpointerdown=e=>{e.preventDefault();if(b.disabled||[...pointers.values()].includes(b))return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b);press(key,true);};b.onpointerup=e=>{e.preventDefault();if(pointers.get(e.pointerId)!==b)return;pointers.delete(e.pointerId);press(key,false);try{b.releasePointerCapture(e.pointerId);}catch{}};b.onpointercancel=()=>interrupt();b.onlostpointercapture=e=>{if(pointers.has(e.pointerId))interrupt();};b.oncontextmenu=e=>e.preventDefault();b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press(key,true);}});b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press(key,false);}});}
 const textTarget=e=>e.target?.closest?.('input,textarea,select,[contenteditable=true]');
 // Capture before the common shell's modal gate. Only its explicit pause view can resume.
 win.addEventListener('keyup',e=>{if(!textTarget(e))press(e.key.toLowerCase(),false);});
 function interrupt(){clear();audio.suspend();if(postUntil!==null){postUntil=null;race.paused=true;if($('finishReplay'))$('finishReplay').disabled=false;}if(replay){replay.paused=true;sync();}else if(active&&!saved&&!entry.active)pause();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});for(const name of ['blur','orientationchange','race-render-lost'])win.addEventListener(name,interrupt);win.screen.orientation?.addEventListener?.('change',interrupt);
 $('restart').onclick=restart;$('pause').onclick=()=>race.paused&&!replay?resume():pause();
 $('records').onclick=()=>board?.showRanking();$('fallback-close').onclick=()=>{$('fallback').close();$('image')?.focus({preventScroll:true});};$('fallback').addEventListener('cancel',()=>queueMicrotask(()=>$('image')?.focus({preventScroll:true})));
 // Header and entry can view the existing anonymous board even before the first round.
 board=mountLeaderboard({document,game:a.gameId,entry:entry.dialog,shell:entry,enabled:a.leaderboardEnabled});
 function frame(now){const dt=Math.max(0,(now-last)/1000||0);last=now;
  if(replay){if(!replay.paused&&!entry.active){replay.time=Math.min(replay.clip.end,replay.time+Math.min(dt,.1)*.5);if(replay.time>=replay.clip.end)replay.paused=true;}const recorded=sampleFinishClip(replay.clip,replay.time);a.hud(recorded);a.render(recorded,true);$('replaySeek').value=String((replay.time-replay.clip.start)/Math.max(.001,replay.clip.end-replay.clip.start)*1000);$('replayPlay').textContent=replay.paused?'播放':'暫停';}
  else{
   if(dt>1&&active&&!saved&&!race.paused)pause();
   if(active&&!race.paused&&!saved&&dt<=1){accumulator+=dt;while(accumulator+1e-12>=1/120&&!saved){accumulator=Math.max(0,accumulator-1/120);a.step(race,1/120);recorder.capture(race,race.clock);if(race.runners[0].finished!==null)finish();}audio.sync(race);}
   else if(saved&&postUntil!==null&&!entry.active&&!document.hidden){const was=race.paused;race.paused=false;accumulator+=Math.min(dt,.1);while(accumulator+1e-12>=1/120&&race.clock<postUntil){accumulator=Math.max(0,accumulator-1/120);a.step(race,1/120);recorder.capture(race,race.clock);}race.paused=was;if(race.clock>=postUntil-1e-8){postUntil=null;if($('finishReplay'))$('finishReplay').disabled=false;}}
   a.hud(race);a.render(race);
  }sync();win.requestAnimationFrame(frame);
 }
 entry.open();Promise.resolve(a.readyPromise).then(()=>{if(entry.active)entry.open();sync();});win.requestAnimationFrame(frame);
 return{restart,pause,resume,press,interrupt,startReplay,endReplay,entry,get race(){return race;},get result(){return saved;},get replay(){return replay;}};
}
