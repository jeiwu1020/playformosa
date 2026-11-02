// Sound preferences are independent of game saves, scores, and anonymous identities.
export const AUDIO_PREFERENCES_KEY='pf-audio-preferences-v1';
const defaults=Object.freeze({musicEnabled:true,effectsEnabled:true,musicVolume:.5,effectsVolume:.7});
const safeStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function createAudioPreferences({storage=safeStorage()}={}){
 let value={...defaults};const listeners=new Set();
 function valid(input){const next={};if(!input||typeof input!=='object')return next;for(const key of ['musicEnabled','effectsEnabled'])if(typeof input[key]==='boolean')next[key]=input[key];for(const key of ['musicVolume','effectsVolume'])if(typeof input[key]==='number'&&Number.isFinite(input[key]))next[key]=Math.max(0,Math.min(1,input[key]));return next;}
 try{value={...value,...valid(JSON.parse(storage?.getItem(AUDIO_PREFERENCES_KEY)||'null'))};}catch{}
 return {get:()=>({...value}),set(patch){const next={...value,...valid(patch)};if(Object.keys(value).every(k=>next[k]===value[k]))return;value=next;try{storage?.setItem(AUDIO_PREFERENCES_KEY,JSON.stringify(value));}catch{}for(const fn of listeners)try{fn({...value});}catch{}},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
}
let singleton;
export function audioPreferences(){return singleton??=createAudioPreferences();}
