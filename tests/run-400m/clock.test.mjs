import test from'node:test';import assert from'node:assert/strict';import{frameBudget}from'../../public/games/run-400m/clock.mjs';
test('a slow but responsive frame counts all elapsed time rather than clipping at 100ms',()=>{const r=frameBudget(.32);assert.equal(r.pause,false);assert.ok(Math.abs(r.steps/120+r.remainder-.32)<1e-10);assert.ok(r.steps>30);});
test('mixed render frame rates preserve the same simulation duration',()=>{let remainder=0,ticks=0;for(const elapsed of[.16,.24,.05,.35,.2]){const r=frameBudget(elapsed,remainder);ticks+=r.steps;remainder=r.remainder;}assert.ok(Math.abs(ticks/120+remainder-1)<1e-10);});
test('a true long interruption is explicitly paused, not silently dropped',()=>{assert.equal(frameBudget(2).pause,true);assert.equal(frameBudget(2).steps,0);});
