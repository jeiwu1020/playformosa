import {createSportsAudio} from '../shared/scene-audio.mjs';
// UI/settings use independent music and effects channels. Legacy enabled means music only.
export function createGameAudio(options={}){return createSportsAudio({...options,baseURL:import.meta.url});}
export function createAudioEvents(play){let phase=null,lastX=null,stepDistance=0,lastFlight=-Infinity;return{reset(){phase=null;lastX=null;stepDistance=0;lastFlight=-Infinity;},update(state){const x=(state.origin||0)+state.x,t=state.t||0;if(state.phase==='run'&&phase==='run'&&lastX!==null){stepDistance+=Math.abs(x-lastX);if(stepDistance>=.8){play('step');stepDistance%=.8;}}
 if(state.phase!==phase){if(state.phase==='air')play('jump');if(state.phase==='land')play('land');if(state.phase==='done')play('result');}
 if(state.phase==='air'&&state.airEffort>.35&&t-lastFlight>=1.8){play('flight');lastFlight=t;}
 phase=state.phase;lastX=x;
}};}
