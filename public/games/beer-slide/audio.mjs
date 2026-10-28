// Gesture-gated optional audio, independent of the 3D renderer. Failures are visible and retryable.
export const AUDIO_FILES={music:'./audio/chill-menu.mp3',push:'./audio/glass-tap.wav',spill:'./audio/spill-drop.wav',success:'./audio/result-pizzicato.wav',settle:'./audio/ui-click.wav'};
export class GameAudio{
 constructor({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),fetcher=(...args)=>globalThis.fetch(...args),onStatus=()=>{}}={}){
  Object.assign(this,{createContext,fetcher,onStatus,volume:.5,muted:false,hidden:false,phase:'ready',dialog:false,status:'waiting',context:null,music:null,loadingMusic:null,epoch:0,lastError:'',requests:0,effectsStarted:0});
  this.buffers=new Map();this.cueIds=new Set();this.activeEffects=new Set();
 }
 notify(status){this.status=status;this.onStatus(status);}
 diagnostics(){return {context:this.context?.state||'not-created',musicLoaded:Boolean(this.music),requests:this.requests,effectsStarted:this.effectsStarted,error:this.lastError,volume:Math.round(this.volume*100),muted:this.muted};}
 async buffer(name){
  if(!AUDIO_FILES[name])return null;
  if(!this.buffers.has(name)){
   const task=(async()=>{try{this.requests++;const r=await this.fetcher(AUDIO_FILES[name]);if(!r.ok)throw new Error(`HTTP ${r.status||'error'}`);const bytes=await r.arrayBuffer();try{return await this.context.decodeAudioData(bytes);}catch{throw new Error('decode failed');}}catch(e){this.lastError=`${name}: ${e.message}`;return null;}})();
   this.buffers.set(name,task);
  }
  const task=this.buffers.get(name),buffer=await task;
  if(!buffer&&this.buffers.get(name)===task)this.buffers.delete(name); // transient failures must not poison all retries
  return buffer;
 }
 async unlock(trusted){
  if(!trusted||this.hidden||this.muted)return false;
  try{
   if(!this.context){
    this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);
    this.musicGain=this.context.createGain();this.musicGain.gain.value=.60;this.musicGain.connect(this.master);
    this.effectsGain=this.context.createGain();this.effectsGain.gain.value=.70;this.effectsGain.connect(this.master);this.applyGain();
    this.context.onstatechange=()=>{if(this.context.state==='running'&&this.music)this.notify('ready');else if(this.context.state!=='running')this.notify(this.hidden?'paused':'blocked');};
   }
   this.notify('starting');
   // Called synchronously in trusted click / mouse-down / touch-up / keyboard handler, before awaits.
   const resumed=this.context.resume();await resumed;
   if(this.hidden){await this.context.suspend();return false;}
   if(this.context.state!=='running'){this.notify('blocked');return false;}
   if(!this.music&&!this.loadingMusic){
    this.notify('loading');
    this.loadingMusic=(async()=>{const buffer=await this.buffer('music');if(!buffer)return false;if(this.music)return true;const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.musicGain);source.start();this.music=source;return true;})().finally(()=>{this.loadingMusic=null;});
   }
   if(this.loadingMusic)await this.loadingMusic;
   if(!this.music){this.notify('unavailable');return false;}
   if(this.context.state!=='running'||this.hidden){this.notify(this.hidden?'paused':'blocked');return false;}
   this.lastError='';this.notify('ready');return true;
  }catch(e){this.lastError=`activation: ${e.message}`;this.notify('unavailable');return false;}
 }
 applyGain(){if(!this.context)return;const t=this.context.currentTime;this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.04);const duck=this.dialog||['replay','result'].includes(this.phase);this.musicGain.gain.setTargetAtTime(duck?.20:.60,t,.2);}
 setMuted(value){this.muted=Boolean(value);this.applyGain();}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));this.applyGain();}
 setPhase(phase){if(this.phase===phase)return;this.phase=phase;this.applyGain();}
 setDialogOpen(open){this.dialog=Boolean(open);this.applyGain();}
 setHidden(hidden){this.hidden=Boolean(hidden);if(hidden&&this.context){this.notify('paused');this.context.suspend().catch(()=>{});}/* Return resumes only on another trusted gesture. */}
 newAttempt(){this.epoch++;for(const s of this.activeEffects){try{s.stop();}catch{}}this.activeEffects.clear();}
 async cue(name,{id,preview=false}={}){
  const epoch=this.epoch;if(id!==undefined){if(this.cueIds.has(id))return;this.cueIds.add(id);if(this.cueIds.size>100)this.cueIds.delete(this.cueIds.values().next().value);}
  if(!this.context||this.hidden||this.muted||this.context.state!=='running'||(!preview&&['replay','result'].includes(this.phase)))return false;
  const buffer=await this.buffer(name);if(!buffer||epoch!==this.epoch||this.hidden||this.muted||this.context.state!=='running')return false;
  const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.effectsGain);this.activeEffects.add(source);source.onended=()=>this.activeEffects.delete(source);source.start();this.effectsStarted++;return true;
 }
 tone(freq,duration=.1,type='sine',volume=.04){if(!this.context||this.hidden||this.muted||this.context.state!=='running'||['replay','result'].includes(this.phase))return;try{const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.6,c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);}catch{}}
}
