// Default production constructor, not an injected fetcher. Model Window.fetch's
// receiver check; Node's own fetch accepts the wrong receiver and hid this bug.
// Web Audio is modeled: these tests do not prove browser decoding or audibility.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GameAudio} from '../../public/games/beer-slide/audio.mjs';

function browserGlobals(t){
 const originals=new Map(['fetch','AudioContext'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 t.after(()=>{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 const sources=[],decoded=[],requests=[];
 class AudioNode{
  constructor(){this.gain={value:1,setTargetAtTime(v){this.value=v;}};}
  connect(){} start(){this.started=true;} stop(){}
 }
 globalThis.AudioContext=class{
  state='suspended';currentTime=0;destination={};
  createGain(){return new AudioNode();}
  createBufferSource(){const node=new AudioNode();sources.push(node);return node;}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async decodeAudioData(bytes){assert.ok(bytes.byteLength>1000);decoded.push(bytes.byteLength);return {duration:30};}
 };
 globalThis.fetch=async function(url){
  if(this!==globalThis)throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
  requests.push(url);
  return new Response(readFileSync(new URL('../../public/games/beer-slide/'+url.replace('./',''),import.meta.url)));
 };
 return {sources,decoded,requests};
}

test('default constructor preserves Window receiver when loading and starting music',async t=>{
 const f=browserGlobals(t),audio=new GameAudio();
 assert.equal(await audio.unlock(true),true,audio.diagnostics().error);
 assert.equal(audio.status,'ready');assert.equal(audio.diagnostics().musicLoaded,true);
 assert.deepEqual(f.requests,['./audio/chill-menu.mp3']);
 assert.equal(f.decoded.length,1);assert.equal(f.sources.filter(s=>s.loop&&s.started).length,1);
 await audio.unlock(true);assert.equal(f.sources.length,1);
});

test('default constructor preserves Window receiver for shipped push and result sound effects',async t=>{
 const f=browserGlobals(t),audio=new GameAudio();
 await audio.unlock(true);
 assert.equal(await audio.cue('push',{preview:true}),true,audio.diagnostics().error);
 assert.equal(await audio.cue('success',{id:'result-7'}),true,audio.diagnostics().error);
 assert.equal(audio.diagnostics().effectsStarted,2);
 assert.deepEqual(f.requests,['./audio/chill-menu.mp3','./audio/glass-tap.wav','./audio/result-pizzicato.wav']);
 assert.equal(f.decoded.length,3);assert.equal(f.sources.filter(s=>!s.loop&&s.started).length,2);
 await audio.cue('success',{id:'result-7'});assert.equal(audio.effectsStarted,2);
});
