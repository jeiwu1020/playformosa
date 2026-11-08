import {createAudioRuntime} from '../shared/audio-runtime.mjs';
import {SPORTS_EFFECTS} from '../shared/scene-audio.mjs';
export function createSceneAudio({game,notify=()=>{},...options}={}){
 return createAudioRuntime({music:[new URL('./audio/bgm.mp3',import.meta.url).href],effects:{...SPORTS_EFFECTS,impact:SPORTS_EFFECTS.land},...options,notify:s=>notify({...s,enabled:s.musicEnabled,ready:s.musicStatus==='ready'&&!s.contextSuspended,pending:s.musicStatus==='loading'||s.effectsStatus==='loading'})});
}
