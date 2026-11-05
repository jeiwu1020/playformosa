import test from 'node:test';import assert from 'node:assert/strict';
import * as api from '../../public/games/pole-vault/sky-journey.mjs';
const state=h=>({phase:'air',altitude:h,maxHeight:h,t:30});
test('22 named sky stages advance monotonically and name their dominant subject at the exact threshold',()=>{
 assert.equal(api.JOURNEY_STAGES?.length,22);let last=0;const ids=new Set();
 for(const stage of api.JOURNEY_STAGES){assert.ok(stage.start>last);last=stage.start;ids.add(stage.id);const j=api.skyJourney(state(stage.start));assert.equal(j.main.id,stage.id);assert.equal(j.items[0].id,stage.id);assert.ok(j.items[0].weight>=.6);assert.ok(stage.label&&stage.note&&stage.datum);}
 assert.equal(ids.size,22);
});
test('sky names are category-labelled and share the frozen finish frame without changing gameplay',()=>{
 const s={...state(1e15),phase:'finish',finishAltitude:4e5},before=structuredClone(s);const j=api.skyJourney(s);assert.equal(j.main.id,'station');assert.equal(j.main.fantasy,false);assert.deepEqual(s,before);
 assert.equal(api.skyJourney(state(1e9)).main.datum,'幻想星際旅行');assert.equal(api.skyJourney(state(3.844e8)).main.datum,'地月距離示意');
});
test('the named journey is bounded across descent, capture history and extreme finite heights',()=>{
 assert.ok(api.JOURNEY_STAGES);for(const h of [0,44999,45000,1e5,4e5,1e9,1e19,1e149,Number.MAX_VALUE]){const a=api.skyJourney(state(h)),b=api.skyJourney({...state(h),t:1e12});assert.deepEqual(a,b);assert.ok(a.items.length<=2);assert.ok(a.items.every(x=>Number.isFinite(x.progress)&&Number.isFinite(x.weight)));}
});
