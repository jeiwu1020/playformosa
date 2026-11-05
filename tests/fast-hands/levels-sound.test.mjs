import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../../public/games/fast-hands/levels-sound.mjs').catch(()=>({}));
// Web Audio is unavailable in Node: emulate only its external device boundary.
function device(){
 const events=[];let context;
 class AudioContext{
  constructor(){context=this;this.currentTime=3;this.state='running';this.destination={};events.push(['open']);}
  resume(){events.push(['resume']);this.state='running';return Promise.resolve();}
  close(){events.push(['close']);this.state='closed';return Promise.resolve();}
  createOscillator(){const osc={type:'sine',frequency:{setValueAtTime:(...v)=>events.push(['frequency',...v]),exponentialRampToValueAtTime:()=>{}},connect:()=>{},disconnect:()=>{},start:(t)=>events.push(['start',t]),stop:(t)=>events.push(['stop',t])};return osc;}
  createGain(){return {gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{},cancelScheduledValues:()=>{}},connect:()=>{},disconnect:()=>{}};}
 }
 return {window:{AudioContext},events,get context(){return context;}};
}
function sound(mode='catch',d=device()){assert.equal(typeof api.createLevelSound,'function');return {d,s:api.createLevelSound({window:d.window,mode})};}
test('audio waits for gesture unlock and creates only a short one-shot cue',async()=>{
 const {s,d}=sound();assert.equal(s.cue(),false);assert.equal(d.events.length,0);await s.unlock();assert.equal(s.cue(),true);assert.equal(d.events.filter(x=>x[0]==='start').length,1);const stop=d.events.find(x=>x[0]==='stop');assert.ok(stop[1]>3&&stop[1]<3.5);s.destroy();assert.equal(s.cue(),false);await s.unlock();assert.equal(d.events.filter(x=>x[0]==='open').length,1);
});
test('duel and catch have distinct short synth cues without background music',async()=>{
 const a=sound('catch'),b=sound('duel');await a.s.unlock();await b.s.unlock();a.s.cue();b.s.cue();assert.notEqual(a.d.events.find(x=>x[0]==='frequency')[1],b.d.events.find(x=>x[0]==='frequency')[1]);assert.equal(b.d.events.filter(x=>x[0]==='start').length,1);
});
test('mute prevents sound and stops an active note',async()=>{
 const {s,d}=sound();await s.unlock();s.cue();s.setMuted(true);assert.equal(s.muted,true);assert.equal(s.cue(),false);assert.ok(d.events.filter(x=>x[0]==='stop').length>=2);s.setMuted(false);assert.equal(s.cue(),true);
});
test('missing or broken audio support is harmless',async()=>{
 const {s}=sound('duel',{window:{}});assert.equal(await s.unlock(),false);assert.equal(s.cue(),false);s.destroy();
 const broken=api.createLevelSound({window:{AudioContext:class{constructor(){throw Error('not available');}}},mode:'catch'});assert.equal(await broken.unlock(),false);assert.equal(broken.cue(),false);
});
test('suspended audio never schedules a late cue',async()=>{
 const {s,d}=sound();await s.unlock();d.context.state='suspended';assert.equal(s.cue(),false);assert.equal(d.events.filter(x=>x[0]==='start').length,0);
});
