import {audioPreferences} from '../shared/audio-preferences.mjs';
// Existing CC0 assets; music and effects have independent persistent gates/gains.
export const AUDIO_FILES={music:'./audio/chill-menu.mp3',push:'./audio/glass-tap.wav',spill:'./audio/spill-drop.wav',success:'./audio/result-pizzicato.wav',settle:'./audio/ui-click.wav'};
export class GameAudio{
 constructor({createContext=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),fetcher=(...args)=>globalThis.fetch(...args),onStatus=()=>{},preferences=audioPreferences(),loadTimeoutMs=10000}={}){
  Object.assign(this,{createContext,fetcher,onStatus,preferences,loadTimeoutMs,hidden:false,phase:'ready',dialog:false,status:'waiting',context:null,music:null,epoch:0,lastError:'',requests:0,effectsStarted:0,musicStatus:'locked',effectsStatus:'locked'});
  this.settings=preferences.get();this.buffers=new Map();this.cueIds=new Set();this.activeEffects=new Set();this.listeners=new Set();
  preferences.subscribe(s=>{this.settings=s;if(!s.effectsEnabled)this.stopEffects();this.applyGain();this.report();});
 }
 get volume(){return this.settings.musicVolume;}get muted(){return !this.settings.musicEnabled;}
 getState(){return {...this.settings,musicStatus:this.musicStatus,effectsStatus:this.effectsStatus,musicAvailable:true,effectsAvailable:true,musicPlaying:Boolean(this.music&&this.context?.state==='running'&&!this.hidden&&!this.dialog&&this.settings.musicEnabled&&this.settings.musicVolume>0),suspended:this.dialog||this.hidden||Boolean(this.context&&this.context.state!=='running'),partial:this.effectsStatus==='error',message:this.lastError};}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 report(){this.onStatus(this.status);for(const fn of this.listeners)try{fn(this.getState());}catch{}}
 notify(status){this.status=status;this.report();}
 diagnostics(){return {context:this.context?.state||'not-created',musicLoaded:Boolean(this.music),requests:this.requests,effectsStarted:this.effectsStarted,error:this.lastError,volume:Math.round(this.volume*100),muted:this.muted};}
 async buffer(name){if(!AUDIO_FILES[name])return null;if(!this.buffers.has(name)){
   const task=(async()=>{let timer;const abort=new AbortController();try{this.requests++;const decoded=(async()=>{const r=await this.fetcher(AUDIO_FILES[name],{signal:abort.signal});if(!r.ok)throw Error(`HTTP ${r.status||'error'}`);return this.context.decodeAudioData(await r.arrayBuffer());})();const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('timeout'));},this.loadTimeoutMs);});return await Promise.race([decoded,deadline]);}catch(e){this.lastError=`${name}: ${e.message}`;return null;}finally{clearTimeout(timer);}})();this.buffers.set(name,task);
  }const task=this.buffers.get(name),buffer=await task;if(!buffer&&this.buffers.get(name)===task)this.buffers.delete(name);return buffer;
 }
 async unlock(trusted=true){if(!trusted||this.hidden||(!this.settings.musicEnabled&&!this.settings.effectsEnabled))return false;
  try{if(!this.context){this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=1;this.master.connect(this.context.destination);this.musicGain=this.context.createGain();this.musicGain.connect(this.master);this.effectsGain=this.context.createGain();this.effectsGain.connect(this.master);this.applyGain();this.context.onstatechange=()=>this.notify(this.context.state==='running'?'ready':this.hidden?'paused':'blocked');}
   const resumed=this.context.resume();this.notify('starting');await resumed;if(this.hidden){await this.context.suspend();return false;}if(this.context.state!=='running'){this.notify('blocked');return false;}
   const tasks=[];
   if(this.settings.musicEnabled){this.musicStatus='loading';tasks.push((async()=>{const buffer=await this.buffer('music');this.musicStatus=buffer?'ready':'error';if(buffer&&!this.music&&!this.hidden&&!this.dialog&&this.settings.musicEnabled&&this.context.state==='running'){const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.musicGain);source.start();this.music=source;}return Boolean(buffer);})());}
   if(this.settings.effectsEnabled){this.effectsStatus='loading';tasks.push(Promise.all(['push','spill','success','settle'].map(n=>this.buffer(n))).then(b=>{this.effectsStatus=b.every(Boolean)?'ready':'error';return b.some(Boolean);}));}
   this.notify('loading');const loaded=await Promise.all(tasks);if(this.hidden||this.context.state!=='running'){this.notify(this.hidden?'paused':'blocked');return false;}this.applyGain();this.notify(this.musicStatus==='error'||this.effectsStatus==='error'?'unavailable':'ready');return loaded.some(Boolean);
  }catch(e){this.lastError=`activation: ${e.message}`;if(this.settings.musicEnabled)this.musicStatus='error';if(this.settings.effectsEnabled)this.effectsStatus='error';this.notify('unavailable');return false;}
 }
 applyGain(){if(!this.context)return;const t=this.context.currentTime,duck=['replay','result'].includes(this.phase)?1/3:1;this.master.gain.setTargetAtTime(1,t,.04);this.musicGain.gain.setTargetAtTime(this.settings.musicEnabled&&!this.dialog&&!this.hidden ? .60*this.settings.musicVolume*duck:0,t,.04);this.effectsGain.gain.setTargetAtTime(this.settings.effectsEnabled? .70*this.settings.effectsVolume:0,t,.04);}
 setMusicEnabled(v){this.preferences.set({musicEnabled:Boolean(v)});}setEffectsEnabled(v){this.preferences.set({effectsEnabled:Boolean(v)});}
 setMusicVolume(v){this.preferences.set({musicVolume:v});}setEffectsVolume(v){this.preferences.set({effectsVolume:v});}
 setMuted(v){this.setMusicEnabled(!v);}setVolume(v){this.setMusicVolume(v);}
 setPhase(phase){if(this.phase===phase)return;this.phase=phase;this.applyGain();this.report();}
 setDialogOpen(open){this.dialog=Boolean(open);if(open){this.epoch++;this.stopEffects();}this.applyGain();this.report();}
 setHidden(hidden){this.hidden=Boolean(hidden);if(hidden){this.epoch++;this.stopEffects();if(this.context){this.notify('paused');this.context.suspend().catch(()=>{});}}this.applyGain();this.report();}
 stopEffects(){for(const s of [...this.activeEffects]){try{s.stop();s.disconnect?.();}catch{}}this.activeEffects.clear();}
 newAttempt(){this.epoch++;this.stopEffects();}
 track(source,gain=null){while(this.activeEffects.size>=8){const old=this.activeEffects.values().next().value;this.activeEffects.delete(old);try{old.stop();old.disconnect?.();}catch{}}this.activeEffects.add(source);source.onended=()=>{this.activeEffects.delete(source);source.disconnect?.();gain?.disconnect?.();};}
 async cue(name,{id,preview=false}={}){const epoch=this.epoch;if(id!==undefined){if(this.cueIds.has(id))return false;this.cueIds.add(id);if(this.cueIds.size>100)this.cueIds.delete(this.cueIds.values().next().value);}
  if(!this.context||this.hidden||this.dialog||!this.settings.effectsEnabled||this.settings.effectsVolume<=0||this.context.state!=='running'||(!preview&&['replay','result'].includes(this.phase)))return false;
  const buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||this.hidden||this.dialog||!this.settings.effectsEnabled||this.context.state!=='running')return false;
  try{const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.effectsGain);this.track(source);source.start();this.effectsStarted++;return true;}catch{return false;}
 }
 tone(freq,duration=.1,type='sine',volume=.04){if(!this.context||this.hidden||this.dialog||!this.settings.effectsEnabled||this.settings.effectsVolume<=0||this.context.state!=='running'||['replay','result'].includes(this.phase))return false;try{const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.6,c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(this.effectsGain);this.track(o,g);o.start();o.stop(c.currentTime+duration);return true;}catch{return false;}}
}
