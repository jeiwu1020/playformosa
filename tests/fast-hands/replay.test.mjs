import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,arm,move,release,cancel,snapshot} from '../../public/games/fast-hands/shuttle.mjs';
import {NOTE_FLOOR_MS} from '../../public/games/fast-hands/challenge.mjs';
import {createReplayRecorder,recordReplay,finishReplay,sampleReplay,MAX_REPLAY_SAMPLES} from '../../public/games/fast-hands/replay.mjs';

const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
function round(mode='mouse',armAt=100){
 const recorder=createReplayRecorder({mode});
 let state=arm(newRun(),{x:.1,at:armAt,id:7});
 assert.equal(recordReplay(recorder,state,armAt),true);
 return {recorder,get state(){return state;},move(x,at){state=move(state,{x,at,id:7});recordReplay(recorder,state,at);return state;},release(at){state=release(state,{at,id:7});recordReplay(recorder,state,at);return state;},cancel(at,reason){state=cancel(state,at,reason);recordReplay(recorder,state,at);return state;}};
}
function success(mode='mouse',start=200){
 const r=round(mode);
 r.move(.3,start);r.move(.6,start+50);r.move(.9,start+200);r.move(.6,start+250);r.move(.1,start+400);
 return {...r,clip:finishReplay(r.recorder)};
}

test('a completed replay retains the exact real score, input mode, and terminal state',()=>{
 const r=success('touch'),clip=r.clip;
 assert.ok(clip);assert.equal(clip.mode,'touch');eq(clip.elapsedMs,376);eq(clip.durationMs,376);
 assert.deepEqual(clip.finalState,r.state);assert.equal(clip.finalState.phase,'success');
 const end=sampleReplay(clip,376);assert.equal(end.state.phase,'success');eq(end.state.elapsedMs,376);eq(end.state.catchAt,576);
 assert.equal(end.scoring,false);assert.equal(end.interactive,false);assert.equal(end.mode,'touch');assert.match(end.label,/重播/);assert.match(end.label,/原速/);
});

test('nonuniform observed movements interpolate their real path, not a demonstration trajectory',()=>{
 const {clip}=success();
 for(const [time,x] of [[0,.3],[50,.6],[100,.7],[160,.82],[200,.9],[225,.75],[250,.6],[300,.43333333333333335],[350,.2666666666666667]])eq(sampleReplay(clip,time).state.controlX,x);
 eq(sampleReplay(clip,100).state.elapsedMs,100);
 assert.equal(sampleReplay(clip,159).state.phase,'outbound');assert.equal(sampleReplay(clip,160).state.phase,'returning');
 assert.equal(sampleReplay(clip,375.9).state.phase,'returning');assert.equal(sampleReplay(clip,376).state.phase,'success');
});

test('replay uses recorded shuttle snapshots for the note, without changing original states',()=>{
 const r=success(),before=JSON.stringify(r.state),view=sampleReplay(r.clip,100).state;
 eq(view.dropPx,snapshot(r.clip.samples[2].state,300).dropPx);
 assert.equal(JSON.stringify(r.state),before);assert.equal(r.state.elapsedMs,376);
 for(const time of [0,100,376,1076,100000])sampleReplay(r.clip,time);
 assert.equal(JSON.stringify(r.state),before);
});

test('long preparation is omitted and the final observed home point is retained at zero',()=>{
 const r=round('mouse');r.move(.15,40000);r.move(.9,1000000);r.move(.1,1000200);
 const clip=finishReplay(r.recorder);eq(clip.startAt,1000000);eq(clip.durationMs,180);
 assert.equal(clip.samples.length,3);eq(clip.samples[0].timeMs,0);eq(clip.samples[0].state.x,.15);eq(clip.samples[1].timeMs,0);
 eq(sampleReplay(clip,0).state.elapsedMs,0);eq(sampleReplay(clip,90).state.controlX,.54);
});

test('late failed samples retain their event time instead of speeding the path to a capped lastAt',()=>{
 const r=round();r.move(.3,200);r.move(.9,10000);
 const clip=finishReplay(r.recorder);assert.equal(clip.finalState.phase,'failed');eq(clip.durationMs,NOTE_FLOOR_MS);
 assert.equal(clip.samples.at(-1).at,10000);eq(clip.samples.at(-1).state.lastAt,200+NOTE_FLOOR_MS);
 eq(sampleReplay(clip,1000).state.controlX,.3+.6*1000/9800);
 assert.equal(sampleReplay(clip,NOTE_FLOOR_MS-1).state.phase,'outbound');
 assert.equal(sampleReplay(clip,NOTE_FLOOR_MS).state.phase,'failed');eq(sampleReplay(clip,NOTE_FLOOR_MS).state.elapsedMs,NOTE_FLOOR_MS);
});

test('release cancellation replays the unfinished attempt and cannot become success',()=>{
 const r=round('touch');r.move(.9,300);r.release(400);const clip=finishReplay(r.recorder);
 assert.equal(clip.finalState.phase,'cancelled');assert.equal(clip.finalState.reason,'released');eq(clip.elapsedMs,100);
 assert.equal(sampleReplay(clip,99).state.phase,'returning');assert.equal(sampleReplay(clip,100).state.phase,'cancelled');
 assert.equal(sampleReplay(clip,10000).state.catchAt,null);assert.equal(sampleReplay(clip,10000).scoring,false);
});

test('armed cancellation is replayable without a start or a valid score',()=>{
 const r=round();r.cancel(300,'blur');const clip=finishReplay(r.recorder);
 assert.ok(clip);eq(clip.durationMs,200);eq(clip.elapsedMs,0);assert.equal(clip.startAt,null);
 assert.equal(sampleReplay(clip,100).state.phase,'armed');eq(sampleReplay(clip,100).state.elapsedMs,0);
 assert.equal(sampleReplay(clip,200).state.reason,'blur');assert.equal(sampleReplay(clip,900).done,true);
});

test('an excessively long no-departure hold is unavailable instead of being falsely sped up',()=>{
 const r=round();r.release(100000);assert.equal(finishReplay(r.recorder),null);
});

test('normalized overshoots interpolate raw input before visual clamping',()=>{
 const r=round();r.move(1.1,300);r.move(-.1,500);const clip=finishReplay(r.recorder);
 eq(sampleReplay(clip,0).state.controlX,1);eq(sampleReplay(clip,100).state.controlX,.5);
 eq(clip.samples[1].state.x,1.1);eq(clip.samples[2].state.x,-.1);
});

test('finished clips and every nested sample are immutable and reused safely',()=>{
 const r=success(),clip=r.clip;
 for(const value of [clip,clip.samples,clip.finalState,...clip.samples,...clip.samples.map(item=>item.state)])assert.equal(Object.isFrozen(value),true);
 assert.throws(()=>{clip.mode='mouse';},TypeError);assert.throws(()=>{clip.samples[1].state.x=0;},TypeError);
 assert.equal(finishReplay(r.recorder),clip);
 assert.equal(recordReplay(r.recorder,arm(newRun(),{x:.1,at:2000,id:7}),2000),false);
 assert.equal(finishReplay(r.recorder),clip);
});

test('finished pose holds for 700ms and does not loop or change score after the end',()=>{
 const {clip}=success();const almost=sampleReplay(clip,1075.99),end=sampleReplay(clip,1076),later=sampleReplay(clip,100000);
 assert.equal(almost.done,false);assert.equal(end.done,true);eq(end.finishAge,700);assert.deepEqual(end,later);
 assert.equal(end.state.phase,'success');eq(end.state.elapsedMs,376);
});

test('zero time is accepted and invalid playback times safely show the start',()=>{
 const r=round('mouse',0);r.move(.9,10);r.move(.1,30);const clip=finishReplay(r.recorder);
 assert.ok(clip);eq(clip.elapsedMs,18);
 for(const time of [NaN,Infinity,-Infinity,-5,undefined])assert.deepEqual(sampleReplay(clip,time),sampleReplay(clip,0));
});

test('empty, unarmed, incomplete, and malformed records never become a playable clip',()=>{
 const recorder=createReplayRecorder({mode:'mouse'});assert.equal(finishReplay(recorder),null);
 assert.equal(recordReplay(recorder,newRun(),0),false);assert.equal(finishReplay(recorder),null);
 assert.equal(sampleReplay(null,0),null);assert.equal(sampleReplay({},0),null);
 const r=round();r.move(.9,300);assert.equal(finishReplay(r.recorder),null);
 for(const state of [null,{}, {...r.state,x:NaN},{...r.state,lastAt:Infinity},{...r.state,startAt:-1},{...r.state,elapsedMs:NaN},{...r.state,phase:'demo'}]){
  const invalid=createReplayRecorder({mode:'mouse'});assert.equal(recordReplay(invalid,state,400),false);assert.equal(finishReplay(invalid),null);
 }
});

test('invalid modes and sample limits cannot create a mislabeled recording',()=>{
 for(const options of [null,0,'mouse'])assert.equal(createReplayRecorder(options),null);
 for(const mode of ['auto','pen','',null,undefined])assert.equal(createReplayRecorder({mode}),null);
 for(const maxSamples of [0,1,-1,NaN,Infinity,2.5,MAX_REPLAY_SAMPLES+1])assert.equal(createReplayRecorder({mode:'mouse',maxSamples}),null);
});

test('non-primitive pointer identifiers cannot introduce mutable data into a clip',()=>{
 const recorder=createReplayRecorder({mode:'mouse'}),state={...arm(newRun(),{x:.1,at:100,id:7}),pointerId:{id:7}};
 assert.equal(recordReplay(recorder,state,100),false);assert.equal(finishReplay(recorder),null);
});

test('unchanged rejected moves are ignored and do not spend recording capacity',()=>{
 const recorder=createReplayRecorder({mode:'mouse',maxSamples:3});let state=arm(newRun(),{x:.1,at:100,id:7});recordReplay(recorder,state,100);
 for(let i=0;i<100;i++)assert.equal(recordReplay(recorder,state,100),false);
 state=move(state,{x:.9,at:300,id:7});recordReplay(recorder,state,300);state=move(state,{x:.1,at:500,id:7});recordReplay(recorder,state,500);
 assert.equal(finishReplay(recorder).samples.length,3);
});

test('exceeding the bounded buffer disables replay rather than dropping movements silently',()=>{
 const recorder=createReplayRecorder({mode:'mouse',maxSamples:3});let state=arm(newRun(),{x:.1,at:100,id:7});recordReplay(recorder,state,100);
 for(const [x,at] of [[.3,200],[.9,300],[.1,500]]){state=move(state,{x,at,id:7});recordReplay(recorder,state,at);}
 assert.equal(state.phase,'success');assert.equal(finishReplay(recorder),null);
});

test('backward or malformed accepted states invalidate a clip instead of concealing missing history',()=>{
 for(const corrupt of [state=>({...state,lastAt:99}),state=>({...state,x:NaN}),state=>({...state,startAt:400}),state=>({...state,phase:'success',catchAt:null})]){
  const r=round();const damaged=corrupt(r.state);assert.equal(recordReplay(r.recorder,damaged,200),false);r.move(.9,300);r.move(.1,500);assert.equal(finishReplay(r.recorder),null);
 }
});

test('recorders cannot accept a different pointer or a new run inside an unfinished attempt',()=>{
 for(const change of [state=>({...state,pointerId:8,lastAt:200}),state=>({...state,phase:'outbound',lastAt:200,startAt:201})]){
  const r=round();assert.equal(recordReplay(r.recorder,change(r.state),200),false);r.move(.9,300);r.move(.1,500);assert.equal(finishReplay(r.recorder),null);
 }
});

test('recorded values are detached from mutable caller objects',()=>{
 const recorder=createReplayRecorder({mode:'mouse'}),armed={...arm(newRun(),{x:.1,at:100,id:7})};recordReplay(recorder,armed,100);
 let state=move(armed,{x:.9,at:300,id:7});recordReplay(recorder,state,300);state=move(state,{x:.1,at:500,id:7});recordReplay(recorder,state,500);armed.x=.17;
 eq(finishReplay(recorder).samples[0].state.x,.1);
});
