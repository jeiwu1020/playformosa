import {createAudioRuntime} from '../shared/audio-runtime.mjs';
import {SPORTS_EFFECTS} from '../shared/scene-audio.mjs';
const cue=(name,gain)=>({urls:[new URL(`./audio/${name}.wav`,import.meta.url).href],gain});
// Same approved mix as preview, with assets local to Rod. Existing games are unchanged.
const effects=Object.freeze({...SPORTS_EFFECTS,impact:SPORTS_EFFECTS.land,catch:cue('glass-tap',.7),miss:cue('spill-drop',.45)});
export function createSceneAudio({game,notify=()=>{},...options}={}){
 return createAudioRuntime({music:[new URL('./audio/chill-menu.mp3',import.meta.url).href],effects,...options,notify:s=>notify({...s,enabled:s.musicEnabled,ready:s.musicStatus==='ready'&&!s.contextSuspended,pending:s.musicStatus==='loading'||s.effectsStatus==='loading'})});
}
