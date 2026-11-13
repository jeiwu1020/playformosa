import test from 'node:test';
import assert from 'node:assert/strict';
import {LOTTERY_BOX as box} from '../../public/games/overtime-pinball/lottery-layout.js';
import {BUMPERS} from '../../public/games/overtime-pinball/physics.js';
import {stationShapes} from '../../public/games/overtime-pinball/contact.js';
import {LAMPS,SOLID_PROPS} from '../../public/games/overtime-pinball/board-features.js';
import {ASSISTS} from '../../public/games/overtime-pinball/assist-machines.js';
function gap(s){return s.hx!==undefined?Math.hypot(Math.max(0,Math.abs(s.x-box.x)-s.hx-box.hx),Math.max(0,Math.abs(s.z-box.z)-s.hz-box.hz)):Math.hypot(Math.max(0,Math.abs(s.x-box.x)-box.hx),Math.max(0,Math.abs(s.z-box.z)-box.hz))-s.r;}
for(const view of ['original','reverse'])test('lottery aisle preserves ball-diameter clearance from devices, lamps and extended assists '+view,()=>{
 const shapes=[...BUMPERS.flatMap(o=>stationShapes(o,view).map(s=>({id:o.id,...s}))),...LAMPS,...SOLID_PROPS,...Object.entries(ASSISTS).map(([id,s])=>({id,...s,...(s.extension?{x:s.x+s.inward*s.extension/2,hx:s.hx+s.extension/2}:{})}))];
 for(const s of shapes)assert.ok(gap(s)>1.3,`${view}/${s.id}: gap ${gap(s)} cannot pass diameter 1.3`);
 assert.ok(box.x-box.hx>-17&&box.x+box.hx<17);assert.ok(box.z-box.hz>-12&&box.z+box.hz<0);
});
