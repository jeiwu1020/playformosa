import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,beginRound,advance,press,pauseMatch} from '../../public/games/fast-hands/levels-rules.mjs';
const api=await import('../../public/games/fast-hands/levels-replay.mjs').catch(()=>({}));
const random=()=>.5;
function setup(mode='duel') {assert.equal(typeof api.createLevelReplayRecorder,'function');return {rec:api.createLevelReplayRecorder({mode}),s:newMatch(mode,{random})};}
const record=(rec,s,now,extra={})=>api.recordLevelReplay(rec,s,{now,...extra});
test('replays observed delayed signal and input instead of recomputing scheduled onset',()=>{
 let {rec,s}=setup();s=beginRound(s,1000,random);record(rec,s,1000);s=advance(s,2800);record(rec,s,2800);s=press(s,2920);record(rec,s,2920,{pressedAt:2920,settledAt:2920});
 const clip=api.finishLevelReplay(rec);assert.equal(clip.durationMs,2440);assert.equal(api.sampleLevelReplay(clip,1799).state.phase,'waiting');
 const live=api.sampleLevelReplay(clip,1800);assert.equal(live.state.liveAt,1800);assert.equal(live.state.readyAt,1600);assert.equal(live.state.phase,'live');
 const end=api.sampleLevelReplay(clip,1920);assert.equal(end.state.results.at(-1).playerMs,120);assert.equal(end.presentation.pressedAt,1920);assert.equal(end.presentation.suppressCelebration,true);assert.equal(end.scoring,false);assert.equal(api.sampleLevelReplay(clip,2440).done,true);
 assert.ok(Object.isFrozen(clip));assert.ok(Object.isFrozen(end.state.results));assert.throws(()=>end.state.results.push({}));assert.equal(s.liveAt,2800);
});
test('early press preserves no signal and the actual pre-signal press',()=>{
 let {rec,s}=setup();s=beginRound(s,5000,random);record(rec,s,5000);s=press(s,5180);record(rec,s,5180,{pressedAt:5180,settledAt:5180});const clip=api.finishLevelReplay(rec);
 const frame=api.sampleLevelReplay(clip,180);assert.equal(frame.state.liveAt,null);assert.equal(frame.state.results.at(-1).reason,'early');assert.equal(frame.presentation.pressedAt,180);assert.equal(clip.durationMs,700);
});
test('AI automatic result preserves no input and chosen AI timing',()=>{
 let {rec,s}=setup();s=beginRound(s,1000,random);record(rec,s,1000);s=advance(s,2700);record(rec,s,2700);s=advance(s,3000);record(rec,s,3000,{settledAt:3000});const end=api.sampleLevelReplay(api.finishLevelReplay(rec),2000);
 assert.equal(end.presentation.pressedAt,null);assert.equal(end.state.aiMs,215);assert.equal(end.state.results.at(-1).reason,'ai-first');assert.equal(end.state.results.at(-1).playerMs,null);
});
test('recording retains only latest round and discards interrupted attempts',()=>{
 let {rec,s}=setup();s=beginRound(s,1000,random);record(rec,s,1000);s=pauseMatch(s);record(rec,s,1300);assert.equal(api.finishLevelReplay(rec),null);
 s=beginRound(s,10000,random);record(rec,s,10000);s=advance(s,11700);record(rec,s,11700);s=press(s,11800);record(rec,s,11800,{pressedAt:11800,settledAt:11800});const first=api.finishLevelReplay(rec);
 s=beginRound(s,13000,random);record(rec,s,13000);s=press(s,13090);record(rec,s,13090,{pressedAt:13090,settledAt:13090});const clip=api.finishLevelReplay(rec);assert.notEqual(clip,first);assert.equal(clip.durationMs,610);const frame=api.sampleLevelReplay(clip,90);assert.equal(frame.state.results.length,1);assert.equal(frame.state.results.at(-1).round,2);assert.deepEqual(frame.state.results.at(-1).item,s.results.at(-1).item);assert.equal(frame.state.startedAt,0);
});
test('catch success holds the full actual pose tail and misses preserve automatic result',()=>{
 let {rec,s}=setup('catch');s=beginRound(s,1000,random);record(rec,s,1000);s=advance(s,2700);record(rec,s,2700);const at=s.targetAt;s=press(s,at);record(rec,s,at,{pressedAt:at,settledAt:at});const clip=api.finishLevelReplay(rec);assert.equal(clip.durationMs,at-1000+1100);
 s=beginRound(s,6000,random);record(rec,s,6000);s=advance(s,7700);record(rec,s,7700);s=advance(s,9000);record(rec,s,9000,{settledAt:9000});const miss=api.sampleLevelReplay(api.finishLevelReplay(rec),3000);assert.equal(miss.state.results.at(-1).reason,'miss');assert.equal(miss.presentation.pressedAt,null);
});
test('duplicate animation frames do not grow a round recording',()=>{
 let {rec,s}=setup();s=beginRound(s,1000,random);for(let i=0;i<10000;i++)record(rec,s,1000+i/100);s=press(s,1200);record(rec,s,1200,{pressedAt:1200,settledAt:1200});assert.equal(api.finishLevelReplay(rec).frames.length,2);
});
test('ten-round final tape contains only the actual final item and round',()=>{
 let {rec,s}=setup();for(let round=0;round<10;round++){
  const start=1000+round*4000;s=beginRound(s,start,random);record(rec,s,start);s=advance(s,start+1800);record(rec,s,start+1800);s=press(s,start+1900);record(rec,s,start+1900,{pressedAt:start+1900,settledAt:start+1900});
 }
 const before=JSON.stringify(s),clip=api.finishLevelReplay(rec);assert.equal(clip.round,10);assert.equal(clip.frames.length,3);assert.equal(clip.durationMs,2420);
 for(let now=0;now<=2500;now+=10){const frame=api.sampleLevelReplay(clip,now);assert.equal(frame.state.items.length,1);assert.ok(frame.state.results.length<=1);assert.equal(frame.state.replayRound,10);}
 assert.equal(JSON.stringify(s),before);assert.deepEqual(api.sampleLevelReplay(clip,2400).state.items[0],s.results.at(-1).item);
});
