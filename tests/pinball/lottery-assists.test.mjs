import test from 'node:test';import assert from 'node:assert/strict';
import {freshAssists,updateAssists,resolveAssist} from '../../public/games/overtime-pinball/assist-machines.js';
import {LOTTERY_RULES,createLotteryState,hitLottery,advanceLottery} from '../../public/games/overtime-pinball/lottery-events.js';
function core({upgrade=true,enabled=true}={}){const lottery=createLotteryState();lottery.bag=['upgrade'];if(upgrade){hitLottery(lottery,{now:0});advanceLottery(lottery,{now:LOTTERY_RULES.spin});}return {lottery,lotteryEnabled:enabled,playClock:LOTTERY_RULES.spin+.2,time:1,assists:freshAssists(),ball:{x:0,z:0,vx:0,vz:0,r:.65},flipperStroke:{left:0,right:0},bonus:0,hits:0,interactionReady:0,emit(){}};}
const contact=(id,poweredContact=true)=>({station:{assistId:id},impactAmount:1,nx:id.includes('Right')||id==='right'?-1:1,nz:0,poweredContact});
test('active upgrade extends only LR hold and does not move remote actor',()=>{
 const upgraded=core(),normal=core({upgrade:false});const before={...upgraded.ball};for(const g of [upgraded,normal]){updateAssists(g,0,{left:true});updateAssists(g,.39,{});}assert.deepEqual(upgraded.ball,before);assert.equal(upgraded.assists.left.amount,1);assert.ok(normal.assists.left.amount<1);assert.ok(upgraded.assists.upperLeft.amount>normal.assists.upperLeft.amount);
});
test('four drawers only amplify genuine powered contacts, capped44',()=>{
 for(const id of ['left','right','upperLeft','upperRight']){const g=core(),base=core({upgrade:false});g.assists[id].amount=base.assists[id].amount=1;resolveAssist(g,contact(id));resolveAssist(base,contact(id));assert.ok(Math.hypot(g.ball.vx,g.ball.vz)>Math.hypot(base.ball.vx,base.ball.vz));assert.ok(Math.hypot(g.ball.vx,g.ball.vz)<=44+1e-9);}
});
test('passive housing, spent stroke, and center do not get raffle impulse',()=>{
 for(const mode of ['passive','spent','center']){const id=mode==='center'?'center':'left',g=core(),base=core({upgrade:false});for(const v of [g,base]){v.assists[id].amount=1;v.assists[id].spent=mode==='spent';v.ball.vx=-10;v.ball.vz=3;resolveAssist(v,contact(id,mode!=='passive'));}assert.deepEqual(g.ball,base.ball);}
});
test('expiry, round ending, and feature disabled immediately restore ordinary force/hold',()=>{
 for(const mode of ['expired','ended','disabled']){const g=core(),base=core({upgrade:false});if(mode==='expired')g.playClock=14;if(mode==='ended')g.lottery.phase='ended';if(mode==='disabled')g.lotteryEnabled=false;for(const v of [g,base]){updateAssists(v,0,{left:true});updateAssists(v,.39,{});}assert.equal(g.assists.left.amount,base.assists.left.amount);g.assists.left.amount=base.assists.left.amount=1;resolveAssist(g,contact('left'));resolveAssist(base,contact('left'));assert.deepEqual(g.ball,base.ball);}
});
