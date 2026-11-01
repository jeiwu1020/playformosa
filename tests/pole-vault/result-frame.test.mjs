import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../../public/games/pole-vault/result-frame.mjs').catch(()=>({}));
test('result image retains the verified clearance frame despite later attempt/drop/landing states',()=>{
 assert.equal(typeof api.createResultFrame,'function');const f=api.createResultFrame();const clear={phase:'finish',t:5,events:['clearance'],cleared:true,hitBar:false,stats:{beats:12},y:100};f.observe({phase:'run',t:1,events:[]});f.observe({phase:'finish',t:4,events:['crossing-frame'],hitBar:false});f.observe(clear);clear.stats.beats=999;for(const phase of['finish','drop','land','done'])f.observe({phase,t:20,events:[],y:0});assert.equal(f.kind,'clearance');assert.equal(f.state.t,5);assert.equal(f.state.phase,'finish');assert.equal(f.state.stats.beats,12);
});
test('failed clearance preserves a labeled crossing attempt, never mislabels landing as success',()=>{
 assert.equal(typeof api.createResultFrame,'function');const f=api.createResultFrame();f.observe({phase:'finish',t:5,events:['crossing-frame'],hitBar:true});for(let i=0;i<5000;i++)f.observe({phase:'drop',t:i,events:[],y:0});f.observe({phase:'done',t:100,events:[]});assert.equal(f.kind,'attempt');assert.equal(f.state.t,5);assert.equal(f.state.hitBar,true);
});
test('a new attempt gets its own fallback and cannot inherit a previous clearance image',()=>{
 assert.equal(typeof api.createResultFrame,'function');const a=api.createResultFrame();a.observe({phase:'finish',events:['clearance'],t:5,hitBar:false});const b=api.createResultFrame();b.observe({phase:'run',events:[],t:1});b.observe({phase:'land',events:[],t:8});assert.equal(b.kind,'preflight');assert.equal(b.state.t,1);assert.equal(a.state.t,5);
});
