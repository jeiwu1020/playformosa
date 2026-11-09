import {musicRate} from './rules.js';
import {getAudioContext} from './sfx.js';

const MUSIC_URL='./assets/music/monkeys-spinning-monkeys-game.mp3';
// HTML media rate changes can interrupt Safari audio (WebKit bug 163433).
// Decode the compact excerpt once and schedule its tempo on the audio clock.
// The fixed-1x media stream remains available while loading or if decoding fails.
export class BackgroundMusic{
 constructor(contextGetter=getAudioContext){
  this.contextGetter=contextGetter;this.context=null;this.buffer=null;this.loading=null;this.source=null;this.gain=null;
  this.media=new Audio(MUSIC_URL);this.media.loop=true;this.media.volume=.24;this.media.preload='auto';
  this.enabled=true;this.active=false;this.blocked=false;this.pausedByGame=false;this.serial=0;this.remaining=30;this.offset=0;this.backend='media';this.plan=null;this.fallbackReason='';
  const owner=this;
  // Preserve the scene's pause/diagnostic interface without exposing a media
  // playbackRate setter. These values describe the backend actually playing.
  this.audio={
   pause:()=>owner.pause(),
   get paused(){return owner.source?owner.context.state!=='running':owner.media.paused;},
   get playbackRate(){return owner.source?owner.planPosition().rate:1;},
   get currentTime(){return owner.currentTime();},
   get duration(){return owner.buffer?.duration||(Number.isFinite(owner.media.duration)?owner.media.duration:0);},
   get backend(){return owner.backend;},
   get state(){return !owner.active?'stopped':owner.blocked?'blocked':owner.source&&owner.context.state!=='running'?owner.context.state:this.paused?'paused':'playing';},
   get loadState(){return owner.buffer?'ready':owner.loading?'loading':owner.fallbackReason?'fallback':'idle';}
  };
 }
 canPlay(){return this.enabled&&this.active&&!this.pausedByGame&&!document.hidden;}
 load(context){
  if(this.buffer)return Promise.resolve(this.buffer);
  if(!this.loading)this.loading=fetch(MUSIC_URL).then(response=>{if(!response.ok)throw new Error('Music download failed');return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{this.buffer=buffer;this.loading=null;return buffer;},error=>{this.loading=null;throw error;});
  return this.loading;
 }
 async play(){
  if(!this.canPlay())return;
  const serial=++this.serial;
  let context,resumed;
  try{
   context=this.contextGetter()||getAudioContext();this.context=context;
   // Start/resume inside the user's gesture, before awaiting network or decode.
   resumed=context&&context.state!=='running'?context.resume():Promise.resolve();
  }catch(error){resumed=Promise.reject(error);}
  let mediaPlay=Promise.resolve();
  if(!this.source&&(!this.buffer||context?.state!=='running')){
   this.backend='media';
   try{this.media.currentTime=this.offset;}catch{}
   try{mediaPlay=Promise.resolve(this.media.play()).then(()=>{if(serial===this.serial)this.blocked=false;},()=>{if(serial===this.serial&&!this.source)this.blocked=true;});}catch{this.blocked=true;}
  }
  try{
   if(!context){await resumed;this.fallbackReason='Web Audio unavailable';await mediaPlay;return;}
   const [buffer]=await Promise.all([this.load(context),resumed]);
   if(serial!==this.serial||!this.canPlay())return;
   if(context.state!=='running')throw new Error('Audio context is not running');
   if(!this.source){
    if(this.backend==='media')this.offset=this.media.currentTime||this.offset;
    this.startBuffer(buffer);
   }
   this.blocked=false;this.fallbackReason='';
  }catch(error){
   if(serial!==this.serial||!this.canPlay())return;
   this.fallbackReason=error?.message||'Web Audio unavailable';
   // Never vary fallback media playbackRate: stable music beats repeated gaps.
   await mediaPlay;
   if(serial===this.serial)this.blocked=this.audio.paused;
  }
 }
 startBuffer(buffer){
  const context=this.context,source=context.createBufferSource();
  if(!this.gain){this.gain=context.createGain();this.gain.gain.value=.24;this.gain.connect(context.destination);}
  source.buffer=buffer;source.loop=true;source.connect(this.gain);
  const duration=Math.max(0,Math.min(30,this.remaining)),segments=Math.max(1,Math.ceil(duration/.1)),curve=new Float32Array(segments+1),integral=new Float64Array(segments+1),step=duration/segments;
  for(let i=0;i<=segments;i++){curve[i]=musicRate(duration-i*step);if(i)integral[i]=integral[i-1]+(curve[i-1]+curve[i])*step/2;}
  this.plan={at:context.currentTime,duration,step,curve,integral};
  if(duration>0)source.playbackRate.setValueCurveAtTime(curve,context.currentTime,duration);
  else source.playbackRate.setValueAtTime(1.5,context.currentTime);
  this.offset%=buffer.duration;
  try{source.start(context.currentTime,this.offset);}catch(error){source.disconnect();throw error;}
  this.source=source;this.backend='buffer';this.media.pause();
 }
 planPosition(){
  const {at,duration,step,curve,integral}=this.plan,elapsed=Math.max(0,this.context.currentTime-at);
  if(elapsed>=duration)return{rate:1.5,advance:integral.at(-1)+(elapsed-duration)*1.5};
  const i=Math.min(curve.length-2,Math.floor(elapsed/step)),part=elapsed-i*step,slope=(curve[i+1]-curve[i])/step;
  return{rate:curve[i]+slope*part,advance:integral[i]+curve[i]*part+slope*part*part/2};
 }
 currentTime(){
  if(this.source)return(this.offset+this.planPosition().advance)%this.buffer.duration;
  return this.backend==='media'?this.media.currentTime:this.offset;
 }
 pause(){
  this.offset=this.currentTime();++this.serial;this.media.pause();
  if(this.source){this.source.stop();this.source.disconnect();this.source=null;}
 }
 start(){this.pause();this.active=true;this.offset=0;this.remaining=30;try{this.media.currentTime=0;}catch{}return this.play();}
 setEnabled(enabled){this.enabled=enabled;if(enabled)return this.play();this.pause();}
 update(remaining){if(Number.isFinite(remaining))this.remaining=Math.max(0,Math.min(30,remaining));}
 stop(){this.pause();this.active=false;}
}
