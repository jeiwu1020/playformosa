import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../public/games/overtime-pinball/lottery-events.js';
const advance=(s,now)=>L.advanceLottery(s,{now});
const hit=(s,now,extra={})=>L.hitLottery(s,{now,source:'main',...extra});
const equip=(s,id,now,extra={})=>L.hitLotteryEquipment(s,{stationId:id,now,source:'main',...extra});
test('first main collision draws once; visual spin does not require input',()=>{
 const s=L.createLotteryState();const c=hit(s,0,{random:()=>0});assert.equal(c[0].type,'lotteryDraw');assert.equal(s.phase,'drawing');assert.equal(hit(s,.2).length,0);advance(s,.8);assert.equal(s.phase,'active');assert.ok(L.lotteryEffects(s,.8).gateClosed);assert.equal(L.lotteryEffects(s,8.8).gateClosed,false);
});
test('secondary workers never draw or charge; must leave box and hit 3 distinct devices',()=>{
 const s=L.createLotteryState();assert.deepEqual(hit(s,0,{source:'shadow'}),[]);hit(s,0,{random:()=>0});advance(s,9);assert.equal(s.phase,'charging');equip(s,'desk',9,{source:'shadow'});equip(s,'desk',9);equip(s,'desk',9.1);equip(s,'chair',9.2);assert.equal(s.charged.length,2);equip(s,'copier',9.3);assert.equal(s.phase,'ready');assert.equal(hit(s,10).length,0);L.leaveLottery(s);assert.equal(hit(s,10).length,1);
});
test('bag has three different prizes; no consecutive repeat across bags',()=>{
 const s=L.createLotteryState(),awards=[];for(let i=0;i<7;i++){const t=i*30;L.leaveLottery(s);hit(s,t,{random:()=>0});awards.push(s.prize);advance(s,t+20);for(const id of ['a','b','c'])equip(s,id,t+21);}assert.equal(new Set(awards.slice(0,3)).size,3);assert.equal(new Set(awards.slice(3,6)).size,3);for(let i=1;i<awards.length;i++)assert.notEqual(awards[i],awards[i-1]);
});
test('effects freeze with gameplay clock, reject rollback, end without reviving clones',()=>{
 const s=L.createLotteryState();hit(s,5,{random:()=>0});advance(s,5.8);const e=L.lotteryEffects(s,5.8);advance(s,5);assert.deepEqual(L.lotteryEffects(s,5.8),e);assert.deepEqual(L.endLottery(s).map(c=>c.type),['lotteryEnded']);assert.equal(L.lotteryEffects(s,10).gateClosed,false);assert.deepEqual(hit(s,20),[]);
});
test('chain award is capped, ignores secondary/recursive/duplicate contacts',()=>{
 const s=L.createLotteryState();s.bag=['busy'];hit(s,0);advance(s,1);const data={targets:['desk','chair','copier'],contactId:1};assert.equal(equip(s,'desk',1,data)[0].targets.length,2);assert.equal(equip(s,'desk',1,data).length,0);assert.equal(equip(s,'desk',1.1,{...data,contactId:2,source:'shadow'}).length,0);assert.equal(equip(s,'desk',1.2,{...data,contactId:3,source:'chain'}).length,0);let total=s.chainPaid;for(let i=4;i<100;i++){const c=equip(s,'desk',2,{...data,contactId:i});total+=c.reduce((v,e)=>v+(e.points||0),0);}assert.equal(total,L.LOTTERY_RULES.chainCap);assert.equal(s.chainPaid,L.LOTTERY_RULES.chainCap);
});
test('invalid hits and unknown devices cannot charge; prize duration is non-stacking',()=>{
 const s=L.createLotteryState();assert.deepEqual(hit(s,NaN),[]);hit(s,0,{random:()=>0});advance(s,1);const until=s.until;L.leaveLottery(s);hit(s,2);assert.equal(s.until,until);advance(s,20);equip(s,'launcher',21);equip(s,'lottery',21);equip(s,'',21);assert.equal(s.charged.length,0);
});
test('upgrade modifier is only offered while active, bounded, no remote impulse',()=>{
 const s=L.createLotteryState();s.bag=['upgrade'];hit(s,0);advance(s,.8);assert.equal(L.lotteryEffects(s,1).assistHoldMultiplier,1.35);assert.equal(L.lotteryEffects(s,1).assistImpulseMultiplier,1.12);assert.equal(L.lotteryEffects(s,13).assistImpulseMultiplier,1);assert.equal(L.lotteryPresentation(s,1).label,'人體工學升級');
});
