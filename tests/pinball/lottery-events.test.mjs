import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../public/games/overtime-pinball/lottery-events.js';
const advance=(s,now)=>L.advanceLottery(s,{now});
const hit=(s,now,extra={})=>L.hitLottery(s,{now,source:'main',...extra});
const equip=(s,id,now,extra={})=>L.hitLotteryEquipment(s,{stationId:id,now,source:'main',...extra});
test('first main collision draws once; visual spin does not require input',()=>{
 const s=L.createLotteryState(),spin=L.LOTTERY_RULES.spin;const c=hit(s,0,{random:()=>0});assert.equal(c[0].type,'lotteryDraw');assert.equal(s.phase,'drawing');assert.equal(hit(s,.2).length,0);advance(s,spin);assert.equal(s.phase,'active');assert.ok(L.lotteryEffects(s,spin).gateClosed);assert.equal(L.lotteryEffects(s,spin+8).gateClosed,false);
});
test('secondary workers never draw; every fresh box entry can draw without equipment charging',()=>{
 const s=L.createLotteryState(),spin=L.LOTTERY_RULES.spin;assert.deepEqual(hit(s,0,{source:'shadow'}),[]);hit(s,0,{random:()=>0});advance(s,spin);assert.equal(s.phase,'active');L.leaveLottery(s);assert.equal(hit(s,2)[0].type,'lotteryDraw');assert.equal(s.drawId,2);L.leaveLottery(s);advance(s,20);assert.equal(s.phase,'ready');equip(s,'desk',21,{source:'shadow'});equip(s,'desk',21);equip(s,'chair',21.1);assert.equal(s.phase,'ready');L.leaveLottery(s);assert.equal(hit(s,22)[0].type,'lotteryDraw');
});
test('bag has three different prizes; no consecutive repeat across bags',()=>{
 const s=L.createLotteryState(),awards=[];for(let i=0;i<7;i++){const t=i*30;L.leaveLottery(s);hit(s,t,{random:()=>0});awards.push(s.prize);advance(s,t+25);}assert.equal(new Set(awards.slice(0,3)).size,3);assert.equal(new Set(awards.slice(3,6)).size,3);for(let i=1;i<awards.length;i++)assert.notEqual(awards[i],awards[i-1]);
});
test('effects freeze with gameplay clock, reject rollback, end without reviving clones',()=>{
 const s=L.createLotteryState(),activeAt=5+L.LOTTERY_RULES.spin;hit(s,5,{random:()=>0});advance(s,activeAt);const e=L.lotteryEffects(s,activeAt);advance(s,5);assert.deepEqual(L.lotteryEffects(s,activeAt),e);assert.deepEqual(L.endLottery(s).map(c=>c.type),['lotteryEnded']);assert.equal(L.lotteryEffects(s,10).gateClosed,false);assert.deepEqual(hit(s,20),[]);
});
test('chain award is capped, ignores secondary/recursive/duplicate contacts',()=>{
 const s=L.createLotteryState(),spin=L.LOTTERY_RULES.spin;s.bag=['busy'];hit(s,0);advance(s,spin);const data={targets:['desk','chair','copier'],contactId:1};assert.equal(equip(s,'desk',spin,data)[0].targets.length,2);assert.equal(equip(s,'desk',spin,data).length,0);assert.equal(equip(s,'desk',spin+.1,{...data,contactId:2,source:'shadow'}).length,0);assert.equal(equip(s,'desk',spin+.2,{...data,contactId:3,source:'chain'}).length,0);let total=s.chainPaid;for(let i=4;i<100;i++){const c=equip(s,'desk',spin+1,{...data,contactId:i});total+=c.reduce((v,e)=>v+(e.points||0),0);}assert.equal(total,L.LOTTERY_RULES.chainCap);assert.equal(s.chainPaid,L.LOTTERY_RULES.chainCap);
});
test('invalid hits do not draw; a fresh box entry replaces an active prize without stacking',()=>{
 const s=L.createLotteryState(),spin=L.LOTTERY_RULES.spin;assert.deepEqual(hit(s,NaN),[]);hit(s,0,{random:()=>0});advance(s,spin);assert.equal(s.phase,'active');L.leaveLottery(s);assert.equal(hit(s,2)[0].type,'lotteryDraw');assert.equal(s.phase,'drawing');assert.equal(s.until,0);advance(s,20);assert.equal(s.phase,'ready');equip(s,'launcher',21);equip(s,'lottery',21);equip(s,'',21);assert.equal(s.phase,'ready');
});
test('upgrade modifier is only offered while active, bounded, no remote impulse',()=>{
 const s=L.createLotteryState(),spin=L.LOTTERY_RULES.spin;s.bag=['upgrade'];hit(s,0);advance(s,spin);assert.equal(L.lotteryEffects(s,spin+.2).assistHoldMultiplier,1.35);assert.equal(L.lotteryEffects(s,spin+.2).assistImpulseMultiplier,1.12);assert.equal(L.lotteryEffects(s,spin+12).assistImpulseMultiplier,1);assert.equal(L.lotteryPresentation(s,spin+.2).label,'人體工學升級');
});
