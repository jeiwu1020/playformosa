import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, input, step, targetBank, FIXED_DT, RULES_VERSION } from '../../public/games/run-400m/race.mjs';
const pulse=(r,key)=>{input(r,0,key,true);input(r,0,key,false);};
function run(gap,seconds=90,steer=true){const r=createRace(42);input(r,0,2,true);input(r,0,3,true);let next=0,side=0,nextHand=0;for(let i=0;i<(seconds+4)/FIXED_DT;i++){const p=r.runners[0];if(r.phase==='race'&&!p.started){input(r,0,2,false);input(r,0,3,false);}if(p.started&&p.finished===null){if(r.time>=next){pulse(r,2+side);side=1-side;next=r.time+(typeof gap==='number'?gap:p.beatTarget*gap.multiplier);}if(steer&&r.time>=nextHand){const delta=targetBank(p)-p.bank;if(Math.abs(delta)>.1)pulse(r,delta>0?0:1);nextHand=r.time+.55;}}step(r,FIXED_DT);if(r.runners[0].finished!==null)break;}return r;}
for(const multiplier of [.85,1,1.1,1.3])test(`following phase cadence at ${multiplier}x finishes a lap without falls`,()=>{const p=run({multiplier}).runners[0];assert.notEqual(p.finished,null);assert.ok(p.finished<90);assert.equal(p.falls,0);assert.ok(p.stamina>15);});
test('slow half-second steps visibly progress without needing rapid taps',()=>{const p=run(.55,12).runners[0];assert.ok(p.distance>15,`distance ${p.distance}`);assert.ok(p.v>2);});
test('a missed hand correction gives time to recover, but hands still matter',()=>{const r=run(.4,3),p=r.runners[0];p.distance=20;p.v=8;p.bank=targetBank(p)+.25;p.imbalance=0;for(let i=0;i<120;i++)step(r,FIXED_DT);assert.equal(p.falls,0);assert.ok(p.imbalance<.55);const unattended=run(.3,60,false).runners[0];assert.ok(unattended.falls>0);});
test('retuned records are isolated from original scores',()=>assert.notEqual(RULES_VERSION,'400m-prototype-v2'));
