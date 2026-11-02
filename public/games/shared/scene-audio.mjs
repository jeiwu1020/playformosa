import {createAudioRuntime} from './audio-runtime.mjs';
// Existing files and credits only. Per-cue trims preserve the established LJ mix;
// shared sliders multiply these gains, not different hidden game percentages.
// The near-full-scale landing sample is conservatively attenuated to .2; no quiet cue is boosted.
const sound=(name,gain)=>({urls:['ogg','mp3'].map(ext=>new URL(`../long-jump/audio/${name}.${ext}`,import.meta.url).href),gain});
export const SPORTS_EFFECTS=Object.freeze({step:sound('step',1),jump:sound('jump',.24),flight:sound('flight',.14),land:sound('land',.2),result:sound('result',1)});
export function createSportsAudio({baseURL,notify=()=>{},fetch,preferences,...options}={}){
 const effects=Object.fromEntries(['step','jump','flight','land','result'].map(n=>[n,{...SPORTS_EFFECTS[n],urls:['ogg','mp3'].map(ext=>new URL(`./audio/${n}.${ext}`,baseURL).href)}]));
 return createAudioRuntime({music:['ogg','mp3'].map(ext=>new URL(`./audio/bgm.${ext}`,baseURL).href),effects,preferences,...options,...(fetch?{fetcher:fetch}:{}),notify:s=>notify(s.message||(!s.musicEnabled?'音樂已關閉。':s.musicStatus==='loading'||s.effectsStatus==='loading'?'正在開啟音效…':s.musicStatus==='error'&&s.effectsStatus==='error'?'無法開啟音效；可重試。':'聲音已準備。'))});
}
