// This view never owns audio playback or persistence. The game supplies its real adapter.
export function createMenuAudio(document){
 const root=document.createElement('section');root.className='pf-menu-audio';root.setAttribute('aria-label','聲音設定');
 const title=document.createElement('h3');title.textContent='聲音剛剛好';root.append(title);
 let adapter=null,unsubscribe=null;const channels={};
 const header=document.createElement('button');header.type='button';header.className='pf-menu-music';header.dataset.pfMusicToggle='';header.textContent='音樂 開';
 const invoke=fn=>{if(!adapter)return;fn(adapter);try{const pending=adapter.unlock?.();pending?.catch?.(()=>{});}catch{/* Actual status remains owned by the adapter. */}};
 for(const [kind,label] of [['music','音樂'],['effects','音效']]){
  const row=document.createElement('div');row.className='pf-audio-channel';const name=document.createElement('span');name.textContent=label;
  const toggle=document.createElement('button');toggle.type='button';toggle.dataset.pfEnable=kind;toggle.className='pf-audio-switch';
  const output=document.createElement('output');output.dataset.pfVolumeValue=kind;
  const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='1';range.dataset.pfVolume=kind;range.setAttribute('aria-label',label+'音量');
  const enabledKey=kind+'Enabled',setter=kind==='music'?'setMusicEnabled':'setEffectsEnabled',volumeSetter=kind==='music'?'setMusicVolume':'setEffectsVolume';
  toggle.addEventListener('click',()=>invoke(a=>a[setter](!a.getState()[enabledKey])));
  range.addEventListener('input',()=>invoke(a=>a[volumeSetter](Number(range.value)/100)));
  row.append(name,toggle,output,range);root.append(row);channels[kind]={toggle,output,range};
 }
 const status=document.createElement('p');status.dataset.pfAudioStatus='';status.className='pf-audio-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
 header.addEventListener('click',()=>invoke(a=>a.setMusicEnabled(!a.getState().musicEnabled)));
 function render(){if(!adapter)return;const s=adapter.getState();for(const kind of ['music','effects']){const c=channels[kind],enabled=Boolean(s[kind+'Enabled']),value=Math.round(Math.max(0,Math.min(1,Number(s[kind+'Volume'])||0))*100);c.toggle.textContent=enabled?'開啟':'關閉';c.toggle.setAttribute('aria-label',(kind==='music'?'音樂':'音效')+(enabled?'開啟':'關閉'));c.toggle.setAttribute('aria-pressed',String(enabled));c.range.value=String(value);c.range.setAttribute('aria-valuetext',value+'%');c.output.textContent=value+'%';}
  header.textContent=s.musicEnabled?'音樂 開':'音樂 關';header.setAttribute('aria-pressed',String(Boolean(s.musicEnabled)));header.setAttribute('aria-label',s.musicEnabled?'關閉音樂':'開啟音樂');
  const enabledStatuses=['music','effects'].filter(k=>s[k+'Enabled']).map(k=>s[k+'Status']);
  status.textContent=enabledStatuses.includes('loading')?'聲音載入中…':enabledStatuses.includes('error')?(s.message||'部分聲音載入失敗，點擊設定可重試。'):enabledStatuses.includes('locked')?'點擊按鈕後啟用聲音。':s.partial?'部分聲音暫時無法播放。':s.suspended?'音量已記住，繼續遊戲後播放。':s.musicPlaying?'音樂播放中。':'聲音已準備好。';
 }
 return{root,header,setAudio(next){unsubscribe?.();unsubscribe=null;adapter=next;root.hidden=header.hidden=!adapter;if(adapter){unsubscribe=adapter.subscribe(render);render();}},destroy(){unsubscribe?.();unsubscribe=null;adapter=null;header.remove();root.remove();}};
}
