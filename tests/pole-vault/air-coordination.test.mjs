import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../public/games/pole-vault/physics.mjs';
import {player,attempt} from './helpers/balance-player.mjs';
import {before,currentSource} from './helpers/balance-parent.mjs';

const seeds=[1,7,19,41],dts=[1/120,1/60,1/30];
const options={miss:.03,noise:.01,jitter:.06};
const keys=mask=>[0,1,2,3].map(i=>!!(mask&(1<<i)));
function airborne(time=4){return Object.assign(P.fresh(),{phase:'air',t:10,airTime:time,y:101.18,altitude:100,maxHeight:100,vx:.8,vy:30,launchX:0,launchY:1.18,launchLean:.17,launchCharge:.82,launchSpeed:20,lastWorkTime:time});}

test('fast AS plus sampled JK correction loses balance promptly across speeds and seeds',()=>{
 for(const period of[.08,.12,.18,.25])for(const reaction of[.15,.3])for(const seed of seeds){
  const r=attempt(P,player({...options,mode:'as',period,reaction,pulse:.18,threshold:.025,derivative:.5,seed}),45);
  assert.match(r.reason,/失衡/,JSON.stringify(r));assert.ok(r.airTime<30,JSON.stringify(r));
 }
});
test('cross-paired practice tolerates 30ms hand/foot staggering and finite visual corrections',()=>{
 for(const chordLag of[0,.03])for(const seed of seeds){
  const r=attempt(P,player({...options,mode:'diagonal',period:.25,chordLag,reaction:.25,pulse:.08,threshold:.15,derivative:.2,seed}),75);
  assert.equal(r.phase,'air',JSON.stringify(r));assert.ok(r.airTime>70);
 }
});
test('cross-pairing alone is not an automatic balance controller',()=>{
 for(const period of[.08,.12,.25,.4]){
  const r=attempt(P,player({...options,mode:'diagonal',period,correct:false}),30);
  assert.match(r.reason,/失衡/);assert.ok(r.airTime<10);
 }
});
function rescue(delay,seed){
 const idle=player({...options,mode:'diagonal',period:.25,correct:false,seed});
 const active=player({...options,mode:'diagonal',period:.25,reaction:.15,pulse:.08,threshold:.15,derivative:.2,seed});
 const s=P.fresh();let warning=null,recovered=null,safeFor=0;
 while((s.phase==='run'||s.phase==='plant'||s.phase==='air')&&s.airTime<30){
  const beat=Math.floor(s.t/.28),on=s.t%.28<.1;let input=s.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:s.phase==='plant'?(s.charge<.8?[1,1,0,0]:[]):null;
  if(s.phase==='air'){
   if(warning===null&&Math.abs(s.lean)>=.5)warning=s.airTime;
   const responding=warning!==null&&s.airTime>=warning+delay;input=responding?active(s):idle(s);
   if(responding&&Math.abs(s.lean)<.15){safeFor+=P.DT;if(safeFor>=3)recovered=s.airTime;}else safeFor=0;
  }
  P.step(s,input);
 }
 return{s,warning,recovered};
}
test('a visibly tilted natural flight can be rescued, but delaying a full second loses the window',()=>{
 let saved=0;
 for(const seed of seeds){const early=rescue(0,seed),late=rescue(1,seed);if(early.s.phase==='air'&&early.recovered)saved++;assert.equal(late.recovered,null);assert.match(late.s.endReason,/失衡/);}
 assert.ok(saved>=3,`only ${saved}/4 prompt responses recovered and held safe posture for 3 seconds`);
});
test('actual cross-key timing, including pairs spanning launch grace, is matched once',()=>{
 for(const dt of dts)for(const pair of[[0,3],[3,0],[1,2],[2,1]])for(const start of[.3,.4]){
  const s=airborne(start-dt),input=[false,false,false,false];input[pair[0]]=true;P.step(s,input,dt);
  const ticks=Math.floor(.075/dt+1e-9);for(let i=1;i<ticks;i++)P.step(s,input,dt);
  input[pair[1]]=true;P.step(s,input,dt);for(let i=0;i<20;i++)P.step(s,input,dt);
  assert.equal(s.balanceCoordination,1,`dt ${dt}, pair ${pair}, start ${start}`);
  assert.equal(s.balanceEdges.length,0);
 }
});
test('a pair more than one supported tick beyond the timing window is not forgiven',()=>{
 for(const dt of dts){
  const s=airborne(),input=[true,false,false,false];P.step(s,input,dt);
  const ticks=Math.floor(.075/dt+1e-9)+1;for(let i=1;i<ticks;i++)P.step(s,input,dt);
  input[3]=true;P.step(s,input,dt);for(let i=0;i<20;i++)P.step(s,input,dt);
  assert.ok(s.balanceCoordination<.9);
 }
});
test('release edges pair too, and a pending queue replays consistently across supported frame sizes',()=>{
 for(const dt of dts)for(const pair of[[0,3],[3,0],[1,2],[2,1]]){
  const s=airborne(),input=[false,false,false,false];input[pair[0]]=input[pair[1]]=true;s.held=[...input];s.j=input.map(Number);
  input[pair[0]]=false;P.step(s,input,dt);const ticks=Math.floor(.075/dt+1e-9);for(let i=1;i<ticks;i++)P.step(s,input,dt);
  input[pair[1]]=false;P.step(s,input,dt);for(let i=0;i<20;i++)P.step(s,input,dt);assert.equal(s.balanceCoordination,1);
 }
 const results=[];
 for(const dt of dts){
  const s=airborne(),input=[true,false,false,false];s.held=[...input];s.balanceCoordination=.8;s.balanceEdges=[{limb:0,held:true,time:3.975}];
  const events=[[4+1/30,3,true],[4+2/30,2,true],[4+4/30,1,true],[4+5/30,0,false],[4+7/30,3,false],[4+8/30,2,false],[4+12/30,1,false]];
  let next=0;while(s.airTime<4.6-1e-9){while(next<events.length&&events[next][0]<=s.airTime+dt+1e-9){const[,key,value]=events[next++];input[key]=value;}P.step(s,input,dt);}
  assert.equal(s.balanceEdges.length,0);results.push(s.balanceCoordination);
 }
 for(const result of results)assert.ok(Math.abs(result-results[0])<1e-12,results.join(', '));
});
test('missed pairs are not reused, and cancellation clears only pending edges',()=>{
 const s=airborne();P.step(s,[1,0,0,0]);for(let i=0;i<12;i++)P.step(s,[1,0,0,0]);assert.ok(s.balanceCoordination<1);
 const coordination=s.balanceCoordination;P.step(s,[1,0,1,0]);assert.ok(s.balanceEdges.length>0);P.cancelMotion(s);
 assert.equal(s.balanceEdges.length,0);assert.equal(s.balanceCoordination,coordination);assert.equal(P.fresh().balanceCoordination,undefined);
});
test('launch protection and all pre-launch state remain exactly the approved parent',()=>{
 assert.ok(currentSource.includes('function airCoordination('));
 for(const dt of dts)for(const cadence of[.16,.28,.6,.8]){
  const a=P.fresh(),b=before.fresh();while(a.phase!=='done'&&(a.phase!=='air'||a.airTime+dt<.32)&&a.t<15){
   const beat=Math.floor(a.t/cadence),on=a.t%cadence<.1,input=a.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:a.phase==='plant'&&a.charge<.82?[1,1,0,0]:[];
   P.step(a,input,dt);before.step(b,input,dt);assert.deepEqual(a,b);
  }
 }
});
test('all 256 limb transitions keep earned work, energy and lift unchanged for the same starting state',()=>{
 const fields=['phase','vy','energy','j','held','airEffort','efficiency','airWork','airLift','workUnits','lastWorkTime','difficulty','wind','combo','stats'];
 for(const dt of dts)for(let prior=0;prior<16;prior++)for(let next=0;next<16;next++){
  const a=airborne();Object.assign(a,{j:keys(prior).map(Number),held:keys(prior),lean:.2,momentum:.4,spin:.4});const b=structuredClone(a);
  P.step(a,keys(next),dt);before.step(b,keys(next),dt);for(const field of fields)assert.deepEqual(a[field],b[field],field);
  assert.ok(Number.isFinite(a.lean)&&Number.isFinite(a.spin)&&Math.abs(a.momentum)<=5);assert.ok(a.balanceCoordination>=0&&a.balanceCoordination<=1);
 }
});
test('finish, clearance, drop and landing are unchanged and lock the score once',()=>{
 for(const dt of dts){const a=airborne(),b=structuredClone(a);P.requestFinish(a);before.requestFinish(b);while(a.phase!=='done'&&a.t<30){P.step(a,[],dt);before.step(b,[],dt);assert.deepEqual(a,b);}assert.equal(a.phase,'done');assert.equal(a.scoreLockCount,1);}
});
