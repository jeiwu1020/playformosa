import test from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundMusic} from '../../public/games/courtesy-contest/music.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function fixture(t,{decode,fetchError,mediaError,contextState='running'}={}){
 const prior={Audio:globalThis.Audio,document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
 const media=[],sources=[],curves=[];let fetches=0,decodes=0,resumes=0;
 class Media{
  constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.duration=32;this.rate=1;this.rateWrites=[];this.plays=0;media.push(this);}
  set playbackRate(rate){this.rate=rate;this.rateWrites.push(rate);}
  get playbackRate(){return this.rate;}
  play(){this.plays++;if(mediaError)return Promise.reject(mediaError);this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
 }
 const context={currentTime:0,state:contextState,destination:{},resume(){resumes++;this.state='running';return Promise.resolve();},
  decodeAudioData(){decodes++;return decode?.promise||Promise.resolve({duration:32});},
  createGain(){return{gain:{value:1},connect(){},disconnect(){}};},
  createBufferSource(){const source={playbackRate:{value:1,setValueAtTime(rate,at){this.value=rate;source.rateSet={rate,at};},setValueCurveAtTime(values,at,duration){const curve={values:[...values],at,duration};source.curve=curve;curves.push(curve);}},connect(){},disconnect(){this.disconnected=true;},start(at,offset){this.started={at,offset};},stop(){this.stopped=true;}};sources.push(source);return source;}
 };
 globalThis.Audio=Media;globalThis.document={hidden:false};globalThis.window={};
 globalThis.fetch=async()=>{fetches++;if(fetchError)throw fetchError;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(16)};};
 t.after(()=>{for(const [key,value] of Object.entries(prior)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 const music=new BackgroundMusic(()=>context);
 return{music,context,media,sources,curves,get fetches(){return fetches;},get decodes(){return decodes;},get resumes(){return resumes;}};
}

test('One audio-clock tempo curve replaces per-frame media rate changes',async t=>{
 const f=fixture(t);f.music.start();await settle();
 for(let frame=1;frame<=1800;frame++){f.context.currentTime=frame/60;f.music.update(30-frame/60);}
 assert.equal(f.music.audio.backend,'buffer');assert.equal(f.sources.length,1);assert.equal(f.curves.length,1);
 assert.deepEqual(f.media[0].rateWrites,[]);assert.equal(f.curves[0].values[0],1);assert.equal(f.curves[0].values.at(-1),1.5);
 for(let i=1;i<f.curves[0].values.length;i++)assert.ok(f.curves[0].values[i]>=f.curves[0].values[i-1]&&f.curves[0].values[i]-f.curves[0].values[i-1]<.01);
 assert.equal(f.music.audio.playbackRate,1.5);assert.ok(Math.abs(f.music.audio.currentTime-3.35714)<.001);assert.equal(f.music.audio.duration,32);
});

test('Streaming handoff continues the actual media offset without replaying its intro',async t=>{
 const decode=deferred(),f=fixture(t,{decode});f.music.start();await settle();
 assert.equal(f.music.audio.backend,'media');assert.equal(f.music.audio.playbackRate,1);
 f.media[0].currentTime=.75;f.context.currentTime=.75;f.music.update(29.25);decode.resolve({duration:32});await settle();
 assert.equal(f.sources[0].started.offset,.75);assert.equal(f.media[0].paused,true);assert.equal(f.curves[0].duration,29.25);assert.equal(f.music.audio.paused,false);
});

test('Pause freezes the integrated music offset; explicit resume continues the same phrase',async t=>{
 const f=fixture(t);f.music.start();await settle();f.context.currentTime=15;f.music.update(15);
 assert.ok(Math.abs(f.music.audio.currentTime-15.76922)<.001);const before=f.music.audio.currentTime;
 f.music.pausedByGame=true;f.music.audio.pause();f.context.currentTime=75;await f.music.play();
 assert.equal(f.music.audio.currentTime,before);assert.equal(f.music.audio.paused,true);assert.equal(f.sources.length,1);
 f.music.pausedByGame=false;await f.music.play();assert.equal(f.sources.length,2);assert.ok(Math.abs(f.sources[1].started.offset-before)<1e-8);assert.equal(f.curves[1].duration,15);
 f.context.currentTime=90;assert.ok(Math.abs(f.music.audio.currentTime-3.35714)<.001);
});

test('Restart resets position and speed without decoding or downloading twice',async t=>{
 const f=fixture(t);f.music.start();await settle();f.context.currentTime=15;f.music.update(5);f.music.start();await settle();
 assert.equal(f.sources[0].stopped,true);assert.equal(f.sources[1].started.offset,0);assert.equal(f.music.audio.currentTime,0);assert.equal(f.music.audio.playbackRate,1);assert.equal(f.fetches,1);assert.equal(f.decodes,1);
});

test('Rapid play calls share a decode and cannot produce overlapping music',async t=>{
 const decode=deferred(),f=fixture(t,{decode});f.music.start();f.music.play();f.music.play();await settle();decode.resolve({duration:32});await settle();
 assert.equal(f.sources.length,1);assert.equal(f.fetches,1);assert.equal(f.decodes,1);await f.music.play();assert.equal(f.sources.length,1);
});

for(const interruption of ['stop','mute','background'])test(`A pending decode cannot restart music after ${interruption}`,async t=>{
 const decode=deferred(),f=fixture(t,{decode});f.music.start();await settle();
 if(interruption==='stop')f.music.stop();else if(interruption==='mute')f.music.setEnabled(false);else{globalThis.document.hidden=true;f.music.pausedByGame=true;f.music.audio.pause();}
 decode.resolve({duration:32});await settle();assert.equal(f.sources.length,0);assert.equal(f.music.audio.paused,true);assert.equal(f.media[0].paused,true);
});

test('A stopped round followed by restart during decode only starts the newest round',async t=>{
 const decode=deferred(),f=fixture(t,{decode});f.music.start();await settle();f.media[0].currentTime=3;f.music.stop();f.music.start();decode.resolve({duration:32});await settle();
 assert.equal(f.sources.length,1);assert.equal(f.sources[0].started.offset,0);assert.equal(f.music.audio.playbackRate,1);
});

test('Decode failure leaves the stream audible at fixed speed rather than stuttering rate changes',async t=>{
 const decode=deferred(),f=fixture(t,{decode});f.music.start();await settle();decode.reject(new Error('decode failure'));await settle();
 f.music.update(1);assert.equal(f.music.audio.backend,'media');assert.equal(f.music.audio.paused,false);assert.equal(f.music.audio.playbackRate,1);assert.deepEqual(f.media[0].rateWrites,[]);assert.equal(f.music.blocked,false);
});

test('Fetch failure leaves fixed-speed media playback available',async t=>{
 const f=fixture(t,{fetchError:new Error('offline')});f.music.start();await settle();f.music.update(0);
 assert.equal(f.music.audio.backend,'media');assert.equal(f.music.audio.paused,false);assert.equal(f.music.audio.playbackRate,1);assert.equal(f.sources.length,0);
});

test('A rejected media gesture does not prevent the unlocked audio buffer from playing',async t=>{
 const f=fixture(t,{mediaError:new Error('NotAllowedError'),contextState:'suspended'});f.music.start();await settle();
 assert.ok(f.resumes>=1);assert.equal(f.music.audio.backend,'buffer');assert.equal(f.music.audio.paused,false);assert.equal(f.music.blocked,false);
});

test('Muted or hidden rounds cannot unlock or play in the background',async t=>{
 const f=fixture(t);f.music.setEnabled(false);f.music.start();await settle();assert.equal(f.sources.length,0);assert.equal(f.media[0].plays,0);
 globalThis.document.hidden=true;f.music.setEnabled(true);await settle();assert.equal(f.sources.length,0);assert.equal(f.media[0].plays,0);
 globalThis.document.hidden=false;await f.music.play();assert.equal(f.sources.length,1);
});

test('Both decoding and media rejection report blocked instead of claiming playback',async t=>{
 const f=fixture(t,{fetchError:new Error('offline'),mediaError:new Error('NotAllowedError')});f.music.start();await settle();
 assert.equal(f.music.blocked,true);assert.equal(f.music.audio.state,'blocked');assert.equal(f.music.audio.paused,true);
});

test('An interrupted context is resumed without restarting a playing source',async t=>{
 const f=fixture(t);f.music.start();await settle();f.context.state='interrupted';assert.equal(f.music.audio.paused,true);assert.equal(f.music.audio.state,'interrupted');await f.music.play();
 assert.equal(f.resumes,1);assert.equal(f.sources.length,1);assert.equal(f.music.audio.state,'playing');
});

test('The music curve keeps accelerating during a foreground rendering stall',async t=>{
 const f=fixture(t);f.music.start();await settle();f.context.currentTime=30;
 assert.equal(f.music.audio.playbackRate,1.5);assert.ok(Math.abs(f.music.audio.currentTime-3.35714)<.001);assert.equal(f.curves.length,1);
});

test('A failed context resume keeps the original stream running at 1x',async t=>{
 const f=fixture(t,{contextState:'suspended'});f.context.resume=()=>Promise.reject(new Error('Resume blocked'));f.music.start();await settle();
 assert.equal(f.music.audio.backend,'media');assert.equal(f.music.audio.playbackRate,1);assert.equal(f.music.audio.paused,false);assert.equal(f.music.blocked,false);
});

test('An unresolved audio resume cannot silence the fixed-speed streaming fallback',async t=>{
 const f=fixture(t,{contextState:'suspended'});f.context.resume=()=>Promise.resolve();f.music.start();await settle();
 assert.equal(f.music.audio.backend,'media');assert.equal(f.music.audio.paused,false);assert.equal(f.music.blocked,false);
});
