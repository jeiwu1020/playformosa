import {createAudioRuntime} from './audio-runtime.mjs';
// Existing files and credits only. Per-cue trims preserve the established LJ mix;
// shared sliders multiply these gains, not different hidden game percentages.
// The near-full-scale landing sample is conservatively attenuated to .2; no quiet cue is boosted.
const sound=(name,gain)=>({urls:['ogg','mp3'].map(ext=>new URL(`../long-jump/audio/${name}.${ext}`,import.meta.url).href),gain});
const beer=(name,gain)=>({urls:[new URL(`../beer-slide/audio/${name}.wav`,import.meta.url).href],gain});
export const SPORTS_EFFECTS=Object.freeze({step:sound('step',1),jump:sound('jump',.24),flight:sound('flight',.14),land:sound('land',.2),impact:sound('land',.2),result:sound('result',1),catch:beer('glass-tap',.7),miss:beer('spill-drop',.45)});
export function createSceneAudio({game,notify=()=>{},...options}={}){
 const src=game==='reaction-rod'?new URL('../beer-slide/audio/chill-menu.mp3',import.meta.url).href:new URL(`../${game}/audio/bgm.mp3`,import.meta.url).href;
 return createAudioRuntime({music:[src],effects:SPORTS_EFFECTS,...options,notify:s=>notify({...s,enabled:s.musicEnabled,ready:s.musicStatus==='ready'&&!s.contextSuspended,pending:s.musicStatus==='loading'||s.effectsStatus==='loading'})});
}
export function createSportsAudio({baseURL,notify=()=>{},fetch,preferences,...options}={}){
 const effects=Object.fromEntries(['step','jump','flight','land','result'].map(n=>[n,{...SPORTS_EFFECTS[n],urls:['ogg','mp3'].map(ext=>new URL(`./audio/${n}.${ext}`,baseURL).href)}]));
 return createAudioRuntime({music:['ogg','mp3'].map(ext=>new URL(`./audio/bgm.${ext}`,baseURL).href),effects,preferences,...options,...(fetch?{fetcher:fetch}:{}),notify:s=>notify(s.message||(!s.musicEnabled?'音樂已關閉。':s.musicStatus==='loading'||s.effectsStatus==='loading'?'正在開啟音效…':s.musicStatus==='error'&&s.effectsStatus==='error'?'無法開啟音效；可重試。':'聲音已準備。'))});
}
