import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load=async()=>{assert.ok(fs.existsSync(new URL('../../public/games/fast-hands/auto-input.mjs', import.meta.url)),'actual pointer selection must exist');return import('../../public/games/fast-hands/auto-input.mjs');};
const event=(pointerType,overrides={})=>({pointerType,button:0,isPrimary:true,...overrides});
test('auto uses the actual starting pointer, including a touchscreen laptop and a mouse-equipped tablet',async()=>{const {resolveInputMode}=await load();assert.equal(resolveInputMode(event('touch'),'auto'),'touch');assert.equal(resolveInputMode(event('mouse'),'auto'),'mouse');});
test('manual preference rejects a different input without changing its record category',async()=>{const {resolveInputMode}=await load();assert.equal(resolveInputMode(event('touch'),'mouse'),null);assert.equal(resolveInputMode(event('mouse'),'touch'),null);assert.equal(resolveInputMode(event('mouse'),'mouse'),'mouse');});
test('secondary pointers, wrong mouse buttons, pen and unknown devices cannot enter a scored round',async()=>{const {resolveInputMode}=await load();for(const e of [event('touch',{isPrimary:false}),event('mouse',{button:2}),event('pen'),event(''),{},null])assert.equal(resolveInputMode(e,'auto'),null);});
