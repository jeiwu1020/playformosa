// Translate the game's real audio backend to the common menu's two-channel contract.
export function createRunnerAudio({document,gameId,sound}){
 const win=document.defaultView,key='pf-'+gameId+'-audio-v1';let prefs={musicEnabled:true,effectsEnabled:true,musicVolume:.18,effectsVolume:.35};
 try{const saved=JSON.parse(win.localStorage.getItem(key));if(saved)for(const k of Object.keys(prefs))if(typeof saved[k]===typeof prefs[k])prefs[k]=saved[k];}catch{}
 let state='locked',suspended=true,epoch=0;const listeners=new Set(),notify=()=>listeners.forEach(fn=>fn());
 function configure(){sound.configure({enabled:prefs.musicEnabled,music:prefs.musicVolume,effects:prefs.effectsEnabled?prefs.effectsVolume:0});try{win.localStorage.setItem(key,JSON.stringify(prefs));}catch{}notify();}
 const set=(k,v)=>{prefs[k]=k.endsWith('Volume')?Math.max(0,Math.min(1,Number(v)||0)):!!v;configure();};
 const adapter={getState:()=>({...prefs,musicStatus:state,effectsStatus:state,suspended,musicPlaying:!suspended&&prefs.musicEnabled&&state==='ready'}),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},setMusicEnabled:v=>set('musicEnabled',v),setEffectsEnabled:v=>set('effectsEnabled',v),setMusicVolume:v=>set('musicVolume',v),setEffectsVolume:v=>set('effectsVolume',v),unlock(){if(!prefs.musicEnabled&&!prefs.effectsEnabled)return Promise.resolve(false);const token=++epoch;state='loading';notify();let pending;try{pending=sound.unlock();}catch{pending=Promise.resolve(false);}return Promise.resolve(pending).then(ok=>{if(token===epoch){state=ok?'ready':'error';notify();}return ok;},()=>{if(token===epoch){state='error';notify();}return false;});}};
 configure();return{adapter,resume(){suspended=false;sound.resume();notify();},suspend(){suspended=true;sound.suspend();notify();},reset(){sound.reset();},sync:r=>sound.sync(r)};
}
