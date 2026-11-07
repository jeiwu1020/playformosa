import {createEntryShell} from '../shared/entry-shell.mjs';
import {syncPauseButton,createResultDialog} from '../shared/game-ui.mjs';
import {audioPreferences} from '../shared/audio-preferences.mjs';
import {mountLeaderboard} from '../shared/leaderboard.mjs';
import {recordPlayStart} from '../shared/play-counts.mjs';
import {copyResultFrame,createCourtesySharing} from './share.mjs';
const $=id=>document.getElementById(id),active=s=>['play','seating','depart'].includes(s.phase);
export function courtesyAudio(audio,music,prefs=audioPreferences()){
 const listeners=new Set();let last='';
 const note=audio.note.bind(audio),noise=audio.noise.bind(audio),startBuffer=music.startBuffer.bind(music);
 audio.note=(frequency,duration=.1,offset=0,type='triangle',volume=.045,end)=>note(frequency,duration,offset,type,volume*prefs.get().effectsVolume/.7,end);
 audio.noise=(duration=.16,volume=.07)=>noise(duration,volume*prefs.get().effectsVolume/.7);
 const volume=()=>{const v=prefs.get().musicVolume*.48;music.media.volume=v;if(music.gain)music.gain.gain.value=v;};
 music.startBuffer=(...args)=>{startBuffer(...args);volume();};
 function apply(){const p=prefs.get();audio.enabled=p.effectsEnabled;music.setEnabled(p.musicEnabled);volume();emit();}
 const getState=()=>{const p=prefs.get();return{...p,musicPlaying:!music.audio.paused,musicStatus:music.blocked?'error':music.loading?'loading':music.buffer?'ready':'locked',effectsStatus:audio.context?.state==='running'?'ready':'locked',suspended:music.pausedByGame,message:'聲音暫時無法播放，點擊音樂按鈕可重試。'};};
 function emit(){const next=JSON.stringify(getState());if(next!==last){last=next;for(const fn of listeners)fn();}}
 prefs.subscribe(apply);apply();
 return{getState,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},sync:emit,unlock(){audio.unlock();return music.play();},setMusicEnabled:musicEnabled=>prefs.set({musicEnabled}),setEffectsEnabled:effectsEnabled=>prefs.set({effectsEnabled}),setMusicVolume:musicVolume=>prefs.set({musicVolume}),setEffectsVolume:effectsVolume=>prefs.set({effectsVolume})};
}
export function installCourtesyPlatform(scene,audio,music){
 const sharing=createCourtesySharing(document),result=createResultDialog($('result'),{focusTarget:()=>$('restart'),returnFocus:()=>$('toolbar-restart')});
 const advanced=$('instructions').querySelector('.help-body');advanced.removeAttribute('tabindex');
 const entry=createEntryShell({document,title:'客氣大賽',goal:'30 秒內和對方客氣互讓，次數越多越好；發車前有效按下謝謝就確認成功並記錄時間，沒按會跌倒！',operations:['←／你請坐：相同站立互讓姿勢，完成才計次。','→／謝謝：發車前有效按下即確認成功並記錄時間。','點搶座乘客／空白鍵趕人；倒數 30→20 後隱藏。'],advanced,canStart:()=>scene.ready,onStart:()=>scene.start(),onHelpEnter:()=>{if(active(scene)&&!scene.tabPaused)scene.pauseRound();}});
 const originalStart=scene.start.bind(scene),originalPause=scene.pauseRound.bind(scene),originalResume=scene.resumeRound.bind(scene);
 let captureSerial=0;
 scene.start=()=>{if(document.hidden||scene.starting)return;captureSerial++;sharing.reset();leaderboard?.reset();result.close();entry.close({restoreView:false});if(scene.tabPaused){scene.tabPaused=false;scene.scene.resume();$('pause-overlay').classList.add('hidden');}originalStart();sync();};
 scene.pauseRound=()=>{originalPause();if(scene.tabPaused){$('pause-overlay').classList.add('hidden');entry.openPause();entry.dialog.querySelector('[data-pf-pause]')?.append(help);}sync();};
 scene.resumeRound=()=>{if(document.hidden)return;entry.close({restoreView:false});originalResume();sync();};
 entry.configurePause({canContinue:()=>!document.hidden,onContinue:()=>scene.resumeRound(),onRestart:()=>scene.start()});
 const audioAdapter=courtesyAudio(audio,music);entry.setAudio(audioAdapter);
 document.querySelector('[data-pf-music-toggle]')?.setAttribute('data-game-action','music');$('sound').removeAttribute('data-game-action');
 const leaderboard=mountLeaderboard({document,game:'courtesy-contest',entry:entry.dialog,result:$('result'),resultActionContainer:$('result-play'),resultUploadContainer:$('result-upload'),shell:entry});
 const help=document.createElement('button');help.className='pf-menu-row';help.textContent='操作說明與素材授權';help.onclick=()=>entry.open({help:true});entry.dialog.addEventListener('click',()=>{const root=entry.dialog.querySelector('[data-pf-pause]');if(root&&!root.contains(help))root.append(help);});
 $('toolbar-restart').onclick=()=>scene.start();$('toolbar-pause').onclick=()=>scene.tabPaused?scene.resumeRound():scene.pauseRound();$('restart').onclick=()=>scene.start();$('resume').onclick=()=>scene.resumeRound();
 window.addEventListener('blur',()=>scene.pauseRound());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&scene.tabPaused){const resume=entry.dialog.querySelector('[data-pf-continue]');if(resume)resume.disabled=false;}});
 window.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea,select,[contenteditable],dialog'))return;if(['p','P','Escape'].includes(e.key)&&active(scene)){e.preventDefault();scene.tabPaused?scene.resumeRound():scene.pauseRound();}});
 $('intro').hidden=true;$('intro').classList.add('hidden');document.querySelector('[data-pf-entry-loading]')?.remove();entry.open();sync();
 function sync(){syncPauseButton($('toolbar-pause'),{paused:scene.tabPaused,available:active(scene)});$('toolbar-restart').disabled=!scene.ready||scene.starting;audioAdapter.sync();}
 return{sync,started(){captureSerial++;sharing.reset();leaderboard?.reset();result.close();recordPlayStart(window,'courtesy-contest');sync();},finished(){
  sync();leaderboard?.setResult({phase:'done',seated:scene.seated===true,count:scene.count,remaining:Number.isFinite(scene.seatAcceptedAtMs)?Math.ceil((30000-scene.seatAcceptedAtMs)/10)/100:null});const token=++captureSerial,data={grade:$('rank').textContent,title:$('result-title').textContent,count:scene.count,bonus:scene.chainBonus,status:$('result-status-text').textContent,remaining:$('result-remaining').textContent};
  // Keep the stage geometry unchanged. Snapshot its actual final rendered pose.
  const capture=()=>{if(token!==captureSerial||scene.phase!=='result')return;try{sharing.prepare(copyResultFrame(document,scene.game.canvas),data);}catch{$('share-status').textContent='成績圖片暫時無法產生。';}result.open();};
  scene.game.events.once('postrender',capture);
 }};
}
let controller;
window.courtesyPlatform={ready(scene,audio,music){controller=installCourtesyPlatform(scene,audio,music);},started(){controller?.started();},finished(){controller?.finished();},sync(){controller?.sync();}};
