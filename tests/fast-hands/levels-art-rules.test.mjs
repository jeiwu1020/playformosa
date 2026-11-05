import test from 'node:test';import assert from 'node:assert/strict';
import * as rules from '../../public/games/fast-hands/levels-rules.mjs';
const random=()=>.5;
const live=(state,now=0)=>{const next=rules.beginRound(state,now,random);return rules.advance(next,next.readyAt);};
test('catch survival continues after ten, stops at first miss and records reached stage',()=>{
 let state=rules.newMatch('catch',{random});
 assert.equal(state.total,Infinity);
 for(let i=0;i<15;i++){state=live(state,i*10000);state=rules.press(state,state.targetAt);assert.equal(state.phase,'feedback');assert.equal(state.results.at(-1).round,i+1);}
 state=live(state,160000);state=rules.press(state,state.targetAt+state.windowMs+1);assert.equal(state.phase,'done');assert.equal(state.results.length,16);assert.equal(state.results.filter(r=>r.winner==='player').length,15);
});
test('catch speed strictly increases through 100 stages but has a safe bounded floor',()=>{
 assert.ok(rules.catchStageSettings,'stage config must be exported for measured tuning');let previous=Infinity;
 for(let level=1;level<=100;level++){const {flightMs,windowMs}=rules.catchStageSettings(level);assert.ok(flightMs<previous);assert.ok(flightMs>=220);assert.ok(windowMs>=35);assert.ok(windowMs<=flightMs*.25);previous=flightMs;}
 assert.equal(rules.catchStageSettings(1).flightMs,220+300*.86**4);assert.ok(rules.catchStageSettings(10).flightMs<300);
});
test('each catch round has its own inclusive window, and practice cannot end scored progress',()=>{
 let state=live(rules.newMatch('catch',{practice:true,random}));assert.equal(state.flightMs,650);assert.equal(state.windowMs,100);
 assert.equal(rules.press(state,state.targetAt+100).phase,'done');assert.equal(rules.newMatch('catch').results.length,0);
 for(const offset of [-1,1]){state=live(rules.newMatch('catch'));assert.equal(rules.press(state,state.targetAt+offset*state.windowMs).results[0].winner,'player');assert.equal(rules.press(state,state.targetAt+offset*(state.windowMs+1)).results[0].winner,'none');}
});
test('AI is faster than old midpoint and remains beatable without input-dependent rerolls',()=>{
 let state=live(rules.newMatch('duel',{random}));assert.ok(state.aiMs>=150&&state.aiMs<=280);assert.ok(state.aiMs<320);
 const aiMs=state.aiMs;for(const reaction of [100,180,240,500])assert.equal(rules.press(state,state.liveAt+reaction).results[0].aiMs,aiMs);
 const fast=rules.beginRound(rules.newMatch('duel'),0,()=>0),slow=rules.beginRound(rules.newMatch('duel'),0,()=>.99);assert.equal(fast.aiMs,150);assert.ok(slow.aiMs>280&&slow.aiMs<=440);
});
test('sixteen art items each map to an exclusive generated image tile, no emoji payload',()=>{
 assert.equal(rules.ITEMS.length,16);assert.deepEqual(rules.ITEMS.map(i=>i.artIndex),Array.from({length:16},(_,i)=>i));
 for(const item of rules.ITEMS){assert.equal('emoji' in item,false);assert.ok(item.name);}
});
test('atlas crop excludes the next-row bear from dumpling and preserves the bear hat',()=>{
 assert.equal(typeof rules.itemArtFrame,'function');const dumpling=rules.itemArtFrame(11),bear=rules.itemArtFrame(15);
 assert.ok((dumpling.top+dumpling.height)*1254<920);assert.ok(bear.top*1254<927);assert.ok(bear.top*1254>895);
 for(let i=0;i<16;i++){const f=rules.itemArtFrame(i);assert.ok(f.left>=0&&f.top>=0&&f.left+f.width<=1&&f.top+f.height<=1);}
});
