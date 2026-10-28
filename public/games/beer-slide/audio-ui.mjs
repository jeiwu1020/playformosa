import {GameAudio} from './audio.mjs';
const $audio=id=>document.getElementById(id);
export const sound=new GameAudio({onStatus:()=>updateAudioUI()});
function updateAudioUI(){
 const d=sound.diagnostics(),quiet=sound.muted||sound.volume===0,playing=!quiet&&d.context==='running'&&d.musicLoaded;
 const label=quiet?'已靜音':playing?'聲音開':sound.status==='unavailable'?'重試聲音':'開聲音';
 $audio('soundLabel').textContent=label;$audio('sound').title=playing?'靜音音樂與音效':'啟動或恢復音樂與音效';$audio('sound').setAttribute('aria-label',playing?'靜音音樂與音效':'開啟音樂與音效');$audio('sound').setAttribute('aria-pressed',String(playing));$audio('sound').querySelector('.off').style.display=quiet?'block':'none';$audio('volumeValue').textContent=Math.round(sound.volume*100)+'%';
 const messages={waiting:'點「開聲音」，或推杯放開後啟動。',starting:'正在請求音訊；若仍無聲，可再點「開聲音」。',loading:'正在載入背景音樂…',ready:'音樂已啟動；試聽可檢查音效。重試不重頭播。',blocked:'瀏覽器尚未啟動音訊，請點「開聲音」恢復。',paused:'已暫停聲音；返回後點「開聲音」或再次操作。',unavailable:'音訊載入失敗，請點「重試聲音」。遊戲可照常進行。'};
 $audio('audioStatus').textContent=quiet?'已靜音；點右上角按鈕可恢復。':messages[sound.status]||messages.waiting;
 $audio('audioDiagnostics').textContent=`音訊：${d.context} · 音樂：${d.musicLoaded?'已載入':'未載入'} · 音效送出 ${d.effectsStarted} 次${d.error?' · '+d.error:''}`;
}
function enableAudio(e){if(e?.isTrusted!==true)return;return sound.unlock(true);}
$audio('sound').onclick=e=>{const active=sound.context?.state==='running'&&sound.music&&!sound.muted&&sound.volume>0;if(active){sound.setMuted(true);}else{sound.setMuted(false);if(sound.volume===0){sound.setVolume(.5);$audio('volume').value=50;}enableAudio(e);}updateAudioUI();};
$audio('volume').addEventListener('input',e=>{sound.setVolume(Number(e.target.value)/100);if(sound.volume>0)sound.setMuted(false);enableAudio(e);updateAudioUI();});
$audio('testSound').onclick=async e=>{if(e?.isTrusted!==true)return;sound.setMuted(false);if(sound.volume===0){sound.setVolume(.5);$audio('volume').value=50;}const pending=sound.unlock(true);updateAudioUI();await pending;const played=await sound.cue('push',{preview:true});updateAudioUI();$audio('testSoundStatus').textContent=played?'測試音效已送出；若仍無聲，請檢查裝置音量、靜音模式或輸出裝置。':'音效尚未播放，請看上方音訊狀態再重試。';};
// Touch / pen pointerdown is NOT an activation-triggering event. Resume again on real pointerup.
$audio('world').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')enableAudio(e);});
$audio('world').addEventListener('pointerup',enableAudio);
$audio('world').addEventListener('touchend',enableAudio,{passive:true});
$audio('stage').addEventListener('keydown',e=>{if(!e.repeat&&!e.target.closest('button,input,a')&&(e.code==='Space'||e.key?.toLowerCase()==='r'))enableAudio(e);});
document.addEventListener('visibilitychange',()=>sound.setHidden(document.hidden));
$audio('about').addEventListener('click',()=>{$audio('aboutDialog').showModal();sound.setDialogOpen(true);updateAudioUI();});
$audio('closeAbout').onclick=()=>$audio('aboutDialog').close();
$audio('aboutDialog').addEventListener('close',()=>sound.setDialogOpen(false));
$audio('aboutDialog').addEventListener('click',e=>{if(e.target===$audio('aboutDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
updateAudioUI();
