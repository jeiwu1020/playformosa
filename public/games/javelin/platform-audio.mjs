// Menu adapter only. Original sample assets, gains and scene timing stay owned by audio.mjs.
export function createAudioAdapter(audio,initial,save=()=>{}){
 const value={music:.4,effects:.45,enabled:true,effectsEnabled:true,...initial};let loading=false,attempted=false,epoch=0;const listeners=new Set();
 const emit=()=>listeners.forEach(fn=>fn());
 function configure(){audio.configure({music:value.music,effects:value.effectsEnabled?value.effects:0,enabled:value.enabled});save({...value});emit()}
 async function unlock(){const token=++epoch;loading=true;emit();const ok=await audio.unlock();if(token===epoch){loading=false;attempted=true;emit()}return ok}
 const state=()=>{const s=audio.getStatus();return{musicEnabled:value.enabled,effectsEnabled:value.effectsEnabled,musicVolume:value.music,effectsVolume:value.effects,musicStatus:loading?'loading':!attempted?'locked':s.musicReady?'ready':'error',effectsStatus:loading?'loading':!attempted?'locked':s.effectsReady?'ready':'error',musicPlaying:s.musicPlaying,suspended:s.suspended,partial:s.partial,message:'部分聲音未載入，可重新整理後再試。'}};
 const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
 audio.configure({music:value.music,effects:value.effectsEnabled?value.effects:0,enabled:value.enabled});
 return{unlock,getState:state,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},setMusicEnabled(v){value.enabled=!!v;configure()},setEffectsEnabled(v){value.effectsEnabled=!!v;configure()},setMusicVolume(v){value.music=clamp(v);configure()},setEffectsVolume(v){value.effects=clamp(v);configure()},reset(){audio.reset();emit()},suspend(){audio.suspend();emit()},resume(){audio.resume();emit()},sync(s){audio.sync(s)}};
}
