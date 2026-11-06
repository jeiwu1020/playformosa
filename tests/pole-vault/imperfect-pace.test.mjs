import test from 'node:test';import assert from 'node:assert/strict';
import * as P from '../../public/games/pole-vault/physics.mjs';
import {JOURNEY_STAGES} from '../../public/games/pole-vault/sky-journey.mjs';
import {imperfectController,runPacedAttempt} from './helpers/pace-strategy.mjs';
for(const seed of[1,7,19,41])for(const reaction of[.4,.55])test(`finite ${reaction}s observation and missed inputs still produce a readable earned journey: seed ${seed}`,()=>{
 const r=runPacedAttempt(P,JOURNEY_STAGES,{controller:imperfectController(seed,{reaction,noise:.06,miss:.08})});
 assert.equal(r.crossings.length,22);assert.equal(r.state.phase,'air');assert.ok(r.crossings.at(-1).airTime<390);
 for(let i=1;i<r.crossings.length;i++){const d=r.crossings[i].airTime-r.crossings[i-1].airTime;assert.ok(d>=7.8&&d<=12.2);}
});
test('pace does not make non-correcting limb alternation an automatic flight',()=>{
 for(const seed of[1,7,19,41]){const r=runPacedAttempt(P,JOURNEY_STAGES,{controller:imperfectController(seed,{reaction:1e9}),seconds:45});assert.equal(r.state.phase,'done');assert.equal(r.crossings.length,0);assert.ok(r.state.airTime<20);assert.match(r.state.endReason,/失衡|升力|力氣/);}
});
test('supported coarse physics steps preserve scenic order without skipping subjects',()=>{
 const r=runPacedAttempt(P,JOURNEY_STAGES,{controller:imperfectController(7),dt:1/30});assert.equal(r.crossings.length,22);assert.deepEqual(r.crossings.map(s=>s.id),JOURNEY_STAGES.map(s=>s.id));
 for(let i=1;i<r.crossings.length;i++)assert.ok(r.crossings[i].airTime-r.crossings[i-1].airTime>7.5);
});
