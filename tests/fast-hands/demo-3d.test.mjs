import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {sampleTimeline} from '../../public/games/fast-hands/three3d/timeline.mjs';
test('3D teaching demonstration uses the exact approved seven-second choreography and never a score',async()=>{
 assert.ok(fs.existsSync(new URL('../../public/games/fast-hands/three3d/presentation.mjs', import.meta.url)),'integrated demonstration exists');const{demo3D}=await import('../../public/games/fast-hands/three3d/presentation.mjs');
 for(const ms of [0,700,1000,1949,1950,2500,3150,5000,6999]){const d=demo3D(ms);assert.deepEqual(d.sample,sampleTimeline(ms/1000));assert.equal(d.state.elapsedMs,0);assert.equal(d.scoring,false);assert.ok(d.state.controlX>=.1&&d.state.controlX<=.9);}
 assert.equal(demo3D(0).state.phase,'armed');assert.equal(demo3D(1000).state.phase,'outbound');assert.equal(demo3D(1950).state.phase,'returning');assert.equal(demo3D(3150).state.phase,'success');assert.deepEqual(demo3D(7000),demo3D(0));
});

test('demo steps keep labels short instead of narrating the closing pose',()=>{for(const t of [3.5,5.7,7])assert.doesNotMatch(sampleTimeline(t).label,/雙手|落桌|招牌|食指|拇指/);});
