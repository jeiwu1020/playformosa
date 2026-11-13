import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../../public/games/overtime-pinball/game-audio.js';
// Only browser-owned boundaries are substituted. Assertions exercise GameAudio.
async function fixture(run,{missing=false,throws=false,blocked=false}={}){
 const oldNav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 const order=[];let type='auto',finish;const session={get type(){return type;},set type(v){if(throws)throw Error('unsupported');type=v;order.push(v);}};
 const node=()=>({gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},threshold:{},ratio:{},connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 class Context{constructor(){order.push('context');this.currentTime=0;this.state='suspended';}async resume(){order.push('resume');if(blocked)throw Error('denied');this.state='running';}createGain(){return node();}createDynamicsCompressor(){return node();}createBufferSource(){return node();}async decodeAudioData(){return {duration:20};}}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:missing?{}:{audioSession:session}});globalThis.window={AudioContext:Context};
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 const a=new GameAudio({storage:{getItem(){return null;},setItem(){}}});
 try{await run({a,session,order,delay(){const wait=new Promise(r=>finish=r);globalThis.fetch=async()=>{await wait;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};},finish(){finish();}});}finally{if(oldNav)Object.defineProperty(globalThis,'navigator',oldNav);else delete globalThis.navigator;globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
}
test('only explicit unlock requests playback before creating/resuming context',()=>fixture(async({a,order,session})=>{a.setState('playing');assert.deepEqual(order,[]);await a.unlock();assert.deepEqual(order.slice(0,3),['playback','context','resume']);assert.equal(session.type,'playback');assert.ok(a.music);}));
test('muted game never requests playback',()=>fixture(async({a,order})=>{await a.toggle();a.setState('playing');await a.unlock();assert.deepEqual(order,[]);}));
for(const options of [{missing:true},{throws:true}])test(`unsupported session falls back to ordinary audio ${JSON.stringify(options)}`,()=>fixture(async({a})=>{a.setState('playing');await a.unlock();assert.ok(a.music);assert.equal(a.error,'');},options));
for(const mode of ['paused','intro','over'])test(`${mode} releases playback and next explicit resume can reacquire`,()=>fixture(async({a,session})=>{a.setState('playing');await a.unlock();a.setState(mode);await Promise.resolve();assert.equal(session.type,'auto');assert.equal(a.music,null);a.setState('playing');assert.equal(session.type,'auto');await a.unlock();assert.equal(session.type,'playback');}));
test('mute during loading releases playback and cannot start late music',()=>fixture(async({a,session,delay,finish})=>{a.setState('playing');delay();const pending=a.unlock();await Promise.resolve();await a.toggle();assert.equal(session.type,'auto');finish();await pending;assert.equal(session.type,'auto');assert.equal(a.music,null);}));
test('failed unlock releases session for other audio',()=>fixture(async({a,session})=>{a.setState('playing');await a.unlock();assert.ok(a.error);assert.equal(session.type,'auto');},{blocked:true}));
test('does not overwrite a session changed by another owner',()=>fixture(async({a,session})=>{a.setState('playing');await a.unlock();session.type='ambient';a.setState('paused');assert.equal(session.type,'ambient');}));
test('does not claim ownership of pre-existing playback',()=>fixture(async({a,session})=>{session.type='playback';a.setState('playing');await a.unlock();a.setState('paused');assert.equal(session.type,'playback');}));

test('final result effect retains playback until the audible tail ends',()=>fixture(async({a,session})=>{a.setState('playing');await a.unlock();a.setState('over');a.play('over');await Promise.resolve();assert.equal(session.type,'playback');const voice=[...a.voices][0];assert.ok(voice);voice.onended();assert.equal(session.type,'auto');}));
