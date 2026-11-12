import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../../public/games/overtime-pinball/game-audio.js';
const key='overtime-pinball-audio-v1';
function storage(value){const data=new Map(value===undefined?[]:[[key,JSON.stringify(value)]]);return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};}
// WebAudio is unavailable in Node. Only the external audio/fetch boundary is
// replaced; preference, gating, deferred loading and music state are real.
async function withAudio(run){
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 let rejectResume=false,staySuspended=false,pending=null;
 const node=()=>({gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},threshold:{},ratio:{},connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 class Context{constructor(){this.currentTime=0;this.state='suspended';}async resume(){if(rejectResume)throw new Error('NotAllowedError');if(!staySuspended)this.state='running';}createGain(){return node();}createDynamicsCompressor(){return node();}createBufferSource(){return node();}async decodeAudioData(){return {duration:20};}}
 globalThis.window={AudioContext:Context};
 globalThis.fetch=async()=>{if(pending)await new Promise(resolve=>pending.push(resolve));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 try{await run({suspend:()=>{staySuspended=true;},block:()=>{rejectResume=true;},allow:()=>{rejectResume=false;},delay:()=>{pending=[];},finish:()=>{const work=pending;pending=null;work.forEach(f=>f());}});}finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
}
test('fresh preference waits for explicit unlock then starts enabled cinematic music',()=>withAudio(async()=>{
 const a=new GameAudio({storage:storage()});a.setState('cinematic');
 assert.equal(a.context,null);assert.equal(a.music,null);
 await a.unlock();assert.ok(a.music);assert.equal(a.musicStarts,1);
}));
test('saved mute remains silent on start and across new instances',()=>withAudio(async()=>{
 const saved=storage({enabled:false,musicEnabled:false}),a=new GameAudio({storage:saved});
 a.setState('cinematic');await a.unlock();assert.equal(a.context,null);assert.equal(a.music,null);
 const b=new GameAudio({storage:saved});assert.equal(b.enabled,false);assert.equal(b.musicEnabled,false);
}));
test('saved music-off still permits enabled effects after gesture unlock',()=>withAudio(async()=>{
 const a=new GameAudio({storage:storage({enabled:true,musicEnabled:false})});a.setState('playing');await a.unlock();
 assert.equal(a.music,null);a.play('hit');assert.equal(a.played,1);
}));
test('first mute toggle saves opt-out without creating an audio context',()=>withAudio(async()=>{
 const saved=storage(),a=new GameAudio({storage:saved});await a.toggle();
 assert.equal(a.context,null);assert.equal(a.enabled,false);
 const b=new GameAudio({storage:saved});b.setState('playing');await b.unlock();assert.equal(b.context,null);
}));
test('corrupt or blocked preferences retain safe gesture-gated default audio',()=>withAudio(async()=>{
 for(const saved of [{getItem:()=>'{bad'},{getItem(){throw new Error('blocked');}},{getItem:()=>JSON.stringify({enabled:'yes',musicEnabled:0})}]){
  const a=new GameAudio({storage:saved});a.setState('playing');assert.equal(a.context,null);await a.unlock();assert.ok(a.music);
 }
}));
test('muting while first unlock loads cannot start late music',()=>withAudio(async({delay,finish})=>{
 delay();const a=new GameAudio({storage:storage()});assert.equal(a.enabled,true);a.setState('playing');const loading=a.unlock();await Promise.resolve();await a.toggle();finish();await loading;
 assert.equal(a.enabled,false);assert.equal(a.music,null);assert.equal(a.musicStarts,0);
}));
test('autoplay refusal remains silent and a later explicit unlock can recover',()=>withAudio(async({block,allow})=>{
 block();const a=new GameAudio({storage:storage()});a.setState('playing');await a.unlock();assert.equal(a.music,null);assert.ok(a.error);
 allow();await a.unlock();assert.ok(a.music);assert.equal(a.error,'');
}));

test('a resume that remains suspended never reports started music',()=>withAudio(async({suspend})=>{
 suspend();const a=new GameAudio({storage:storage()});a.setState('cinematic');await a.unlock();
 assert.equal(a.context.state,'suspended');assert.equal(a.music,null);assert.equal(a.musicStarts,0);a.play('hit');assert.equal(a.played,0);
}));
