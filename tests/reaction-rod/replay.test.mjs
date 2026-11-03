import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../public/games/reaction-rod/physics.mjs';

const replayURL=new URL('../../public/games/reaction-rod/replay.mjs',import.meta.url);
async function recorder(options){let module={};try{module=await import(replayURL);}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}assert.equal(typeof module.createRoundReplay,'function','full-round render recorder is available');return module.createRoundReplay(options);}
function present(world,history=[]){return{held:[0,0],history,noticeTime:0,noticeText:'',visual:null};}
function finishRound(replay,{world=P.makeWorld(42),fall=false,initial=true}={}){
 P.start(world);const history=[];if(initial)replay.record(world,present(world,history),{force:true});
 for(let i=0;i<5000&&world.state!=='done';i++){
  if(fall)P.aim(world,i<80?.63:0,i<80?1.95:1.7);
  P.advance(world,1/60);const force=world.events.length>0;
  for(const e of world.events)if(e.type==='catch'||e.type==='miss')history.push(e.type==='catch'?'caught':'missed');
  replay.record(world,present(world,history),{force});world.events.length=0;
 }
 assert.equal(world.state,'done','fixture finishes all ten rods');replay.finish();return world;
}
function frames(replay){const seen=[];assert.equal(replay.start(),true);let previous=null;while(replay.active){if(replay.current!==previous){seen.push(replay.current);previous=replay.current;}replay.advance(1/1000);}if(replay.current!==previous)seen.push(replay.current);return seen;}

// Missing readiness validation would expose an incomplete or absent round as a replay.
test('only a complete ten-rod recording becomes ready',async()=>{
 const replay=await recorder();assert.equal(replay.start(),false);assert.equal(replay.ready,false);
 const world=P.makeWorld();P.start(world);replay.record(world);replay.finish();assert.equal(replay.ready,false);assert.equal(replay.start(),false);
 replay.reset();finishRound(replay);assert.equal(replay.ready,true);assert.equal(replay.failed,false);assert.ok(replay.duration>1);
});

// Retaining references, unknown world payloads or mutable replay frames would leak gameplay state.
test('snapshots are detached immutable render data rather than simulation or event copies',async()=>{
 const replay=await recorder(),world=P.makeWorld(42);P.start(world);
 const presentation={held:[.2,0],history:[],noticeTime:1.7,noticeText:'接到了',visual:{effects:[{x:.2,y:1.8,z:.25,scale:1,age:0,vx:.5,vy:.25,color:0}]}};
 const original=structuredClone(world);replay.record(world,presentation);assert.deepEqual(world,original);
 presentation.held[0]=0;presentation.history.push('missed');presentation.visual.effects[0].x=99;presentation.noticeText='changed';
 finishRound(replay,{world,initial:false});world.hands[0].x=99;world.body.feet[0]=99;world.input.x=99;
 assert.equal(replay.start(),true);const frame=replay.current;
 assert.equal(frame.world.hands[0].x,-.16);assert.equal(frame.world.body.feet[0],-.15);assert.equal(frame.world.input.x,.16);
 assert.deepEqual(frame.presentation.held,[.2,0]);assert.deepEqual(frame.presentation.history,[]);assert.equal(frame.presentation.noticeText,'接到了');assert.equal(frame.presentation.visual.effects[0].x,.2);
 for(const key of ['plan','events','catches','hand','seed','finishWait','wait'])assert.equal(key in frame.world,false,key+' is not render data');
 assert.ok(Object.isFrozen(frame));assert.ok(Object.isFrozen(frame.world.body.feet));assert.ok(Object.isFrozen(frame.presentation.visual.effects[0]));assert.throws(()=>{frame.world.hands[0].x=8;},TypeError);
});

// A sliding-window buffer would erase earlier rods; a coarse uniform buffer would erase transitions.
test('adaptive bounded sampling keeps the beginning, all ten rods, seated transitions and ending',async()=>{
 const replay=await recorder({fps:60,maxFrames:100});const world=finishRound(replay,{fall:true});
 assert.ok(world.body.falls>0);assert.ok(replay.size<=100);assert.equal(replay.ready,true);
 const samples=frames(replay);assert.equal(samples[0].world.time,0);assert.equal(samples.at(-1).world.state,'done');assert.equal(samples.at(-1).world.index,10);
 assert.deepEqual([...new Set(samples.filter(f=>f.world.rod).map(f=>f.world.index))].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8,9]);
 for(const phase of ['upright','sitting','rising'])assert.ok(samples.some(f=>f.world.body.phase===phase),phase+' was retained');
 for(let i=0;i<=10;i++)assert.ok(samples.some(f=>f.world.index===i),'resolution '+i+' was retained');
 assert.ok(samples.some(f=>f.world.time>replay.duration*.25&&f.world.time<replay.duration*.5));
 assert.ok(samples.some(f=>f.world.time>replay.duration*.5&&f.world.time<replay.duration*.75));
});

// Using wall time or storing duplicate paused timestamps would grow a paused recording.
test('repeated simulation timestamps do not consume the frame budget or replay duration',async()=>{
 const replay=await recorder({maxFrames:100}),world=P.makeWorld();P.start(world);replay.record(world);P.advance(world,.05);replay.record(world);
 const size=replay.size;P.pause(world);for(let i=0;i<1000;i++)replay.record(world,{held:[0,0],history:[],noticeTime:0,noticeText:'paused'}, {force:true});assert.equal(replay.size,size);
 P.resume(world);replay.record(world);finishRound(replay,{world,initial:false});assert.equal(replay.ready,true);assert.equal(replay.duration,world.time);
});

// Advancing the live simulation, ignoring pause, or leaving replay active at its endpoint is unsafe.
test('playback pause, restart, stop and natural completion touch only the playback clock',async()=>{
 const replay=await recorder(),world=finishRound(replay),before=structuredClone(world);assert.equal(replay.start(),true);const first=replay.current;
 replay.advance(.2);assert.ok(replay.time>=.2);replay.setPaused(true);const time=replay.time,frame=replay.current;replay.advance(9);assert.equal(replay.time,time);assert.equal(replay.current,frame);assert.equal(replay.paused,true);
 replay.setPaused(false);replay.advance(.1);assert.ok(replay.time>time);replay.stop();assert.equal(replay.active,false);const stopped=replay.current;replay.advance(10);assert.equal(replay.current,stopped);
 assert.equal(replay.start(),true);assert.equal(replay.time,0);assert.equal(replay.current,first);replay.advance(replay.duration+10);assert.equal(replay.active,false);assert.equal(replay.time,replay.duration);assert.equal(replay.current.world.state,'done');assert.deepEqual(world,before);
 replay.reset();assert.equal(replay.current,null);assert.equal(replay.size,0);assert.equal(replay.ready,false);assert.equal(replay.failed,false);assert.equal(replay.duration,0);
});

// Discarding protected event frames on overflow would falsely advertise a partial recording as full.
test('unrepresentable forced-event density fails closed without throwing or disturbing gameplay',async()=>{
 const replay=await recorder({maxFrames:12}),world=P.makeWorld();P.start(world);replay.record(world);
 for(let i=0;i<30;i++){P.advance(world,1/60);const before=structuredClone(world);assert.doesNotThrow(()=>replay.record(world,present(world),{force:true}));assert.deepEqual(world,before);assert.ok(replay.size<=12);}
 finishRound(replay,{world,initial:false});assert.equal(replay.failed,true);assert.equal(replay.ready,false);assert.equal(replay.start(),false);
 replay.reset();assert.equal(replay.failed,false);
});

// Dropped beginning, skipped rod indices or a backwards timestamp would make a purported full round false.
test('late, incomplete and nonmonotonic recordings remain unavailable',async()=>{
 const late=await recorder(),w=P.makeWorld();P.start(w);P.advance(w,.1);finishRound(late,{world:w});assert.equal(late.ready,false);
 const missing=await recorder(),first=P.makeWorld();P.start(first);missing.record(first);const final=P.makeWorld();final.state='done';final.time=20;final.index=10;final.missed=10;missing.record(final);missing.finish();assert.equal(missing.ready,false);
 const backwards=await recorder(),b=P.makeWorld();P.start(b);backwards.record(b);P.advance(b,.1);backwards.record(b);b.time=.05;assert.doesNotThrow(()=>backwards.record(b));assert.equal(backwards.failed,true);
});

// A failing accessor or malformed pose must disable replay without aborting gameplay.
test('copy failures and invalid numeric render state fail closed',async()=>{
 for(const damage of [w=>Object.defineProperty(w,'hands',{get(){throw Error('copy unavailable');}}),w=>{w.body.feet[0]=NaN;},w=>{w.rod={lane:99,y:2};}]){
  const replay=await recorder(),w=P.makeWorld();P.start(w);damage(w);assert.doesNotThrow(()=>replay.record(w));assert.equal(replay.failed,true);replay.finish();assert.equal(replay.start(),false);
 }
});

// Recording during playback or after finish must not overwrite the finished round.
test('finished recordings reject later samples until reset',async()=>{
 const replay=await recorder();finishRound(replay);const duration=replay.duration,size=replay.size;replay.start();const current=replay.current;const other=P.makeWorld();other.time=123;replay.record(other);replay.finish();assert.equal(replay.duration,duration);assert.equal(replay.size,size);assert.equal(replay.current,current);assert.equal(replay.ready,true);
});

// Requiring a visible rod per index rejects a full rendered round when a drop and fall share one frame.
test('continuous ten-rod results include a real drop and fall that both occur between rendered frames',async()=>{
 const replay=await recorder(),world=P.makeWorld(42);P.start(world);world.wait=0;world.body.warningTime=.34;world.body.angle=-.35;world.body.x=.1;world.input={x:.63,y:1.95,engaged:true};for(const h of world.hands)h.x=.63;
 replay.record(world,present(world),{force:true});P.advance(world,.05);
 assert.deepEqual(world.events.map(e=>e.type),['drop','fall','miss']);assert.equal(world.index,1);assert.equal(world.rod,null);assert.equal(world.body.phase,'sitting');
 replay.record(world,{held:[0,0],history:['missed']},{force:true});world.events.length=0;P.releaseInput(world);finishRound(replay,{world,initial:false});
 assert.equal(replay.ready,true);const samples=frames(replay);assert.equal(samples[0].world.index,0);assert.equal(samples.at(-1).world.index,10);assert.equal(samples.at(-1).world.caught+samples.at(-1).world.missed,10);
 assert.ok(samples.some(f=>f.world.index===1&&f.world.body.phase==='sitting'));assert.equal(samples.some(f=>f.world.index===0&&f.world.rod!==null),false);
});
