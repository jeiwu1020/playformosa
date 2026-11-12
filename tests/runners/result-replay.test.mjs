import test from 'node:test';import assert from 'node:assert/strict';
test('finish replay is bounded, records only authoritative snapshots and never mutates live races',async()=>{
 const {createFinishRecorder,sampleFinishClip}=await import('../../public/games/shared/runner-replay.mjs');
 const rec=createFinishRecorder();const race={clock:0,time:0,random:()=>.5,phase:'race',runners:[{id:0,distance:0,lane:1,bank:.2,held:[false,false,false,false],finished:null}]};
 for(let i=0;i<72000;i++){race.clock=race.time=i/60;race.runners[0].distance=i/200;rec.capture(race,race.clock);}
 assert.ok(rec.size<=183);race.runners[0].finished=1200;race.runners[0].distance=400;rec.finish(race,race.clock);
 const clip=rec.clip();assert.ok(clip.end-clip.start<=5.1);assert.ok(clip.frames.length<=183);const snapshot=sampleFinishClip(clip,clip.start);snapshot.runners[0].distance=-100;assert.equal(race.runners[0].distance,400);assert.notEqual(sampleFinishClip(clip,clip.start).runners[0].distance,-100);assert.equal(sampleFinishClip(clip,clip.end).runners[0].distance,400);
});
test('400m contextual verdicts have at least eight deterministic factual scenarios',async()=>{
 const {runnerVerdict}=await import('../../public/games/shared/runner-result.mjs');
 const base={rank:2,falls:0,falseStarts:0,stamina:35,steps:200,perfectSteps:80,reaction:.2,splits:[14,29,44,61]};
 const variants=[{falls:3},{falls:1},{falseStarts:1},{stamina:5},{stamina:80},{perfectSteps:190},{reaction:1},{rank:1},{splits:[18,36,51,63]}];
 const texts=variants.map(x=>runnerVerdict('run-400m',{...base,...x}));assert.ok(new Set(texts).size>=8);texts.forEach((x,i)=>assert.equal(runnerVerdict('run-400m',{...base,...variants[i]}),x));
});
test('1500m contextual verdicts have at least eight deterministic factual scenarios',async()=>{
 const {runnerVerdict}=await import('../../public/games/shared/runner-result.mjs');
 const base={rank:2,penalty:0,energy:40,slipSeconds:10,laneChanges:3,cansCollected:[],splits:[]};
 const variants=[{penalty:1},{energy:5},{energy:80},{cansCollected:['a','b','c']},{slipSeconds:60},{laneChanges:20},{laneChanges:0},{rank:1},{cansCollected:['a','b']}];
 const texts=variants.map(x=>runnerVerdict('run-1500m',{...base,...x}));assert.ok(new Set(texts).size>=8);texts.forEach((x,i)=>assert.equal(runnerVerdict('run-1500m',{...base,...variants[i]}),x));
});
test('finish snapshot remains deeply frozen while 1500m mutable state continues',async()=>{
 const {freezeRunnerResult}=await import('../../public/games/shared/runner-result.mjs');const r={phase:'race',falseStarts:0,time:130,runners:[{id:0,name:'你',finished:130,energy:30,s:1500,steps:300,laneChanges:8,cansCollected:['a'],splits:[{distance:1500,time:130}],held:{a:false}},{id:1,name:'AI',finished:null,s:1490}]};
 const value=freezeRunnerResult('run-1500m',r,'1500m-rival-tiers-v5');r.runners[0].energy=99;r.runners[0].splits[0].time=999;r.runners[1].finished=129;
 assert.equal(value.seconds,130);assert.equal(value.metrics.energy,30);assert.equal(value.metrics.splits[0].time,130);assert.equal(value.rank,1);assert.equal(value.runners[1].finished,null);assert.ok(Object.isFrozen(value.metrics.splits));assert.ok(value.verdict);
});
test('1500m replay snapshots exclude growing input history and have constant serialized size',async()=>{
 const {createFinishRecorder,sampleFinishClip}=await import('../../public/games/shared/runner-replay.mjs');
 const {createRace,input}=await import('../../public/games/run-1500m/race.mjs');
 const race=createRace();
 function snapshot(){const rec=createFinishRecorder();rec.capture(race,0);rec.finish(race,0);return rec.clip();}
 const empty=snapshot();
 for(let i=0;i<10000;i++)input(race,'a',i%2===0);
 assert.equal(race.inputs.length,10000,'the original engine still retains its own input audit history');
 const busy=snapshot();
 for(const frame of busy.frames){assert.equal('inputs' in frame.race,false);assert.equal('seed' in frame.race,false);assert.equal('accumulator' in frame.race,false);}
 assert.equal(JSON.stringify(busy).length,JSON.stringify(empty).length,'snapshot cost is independent of input history length');
 assert.deepEqual(sampleFinishClip(busy,0).runners,race.runners,'render/HUD runner state remains exact');
 assert.deepEqual(sampleFinishClip(busy,0).supplies,race.supplies);
 assert.equal(race.inputs.length,10000,'recording never mutates live engine state');
});
