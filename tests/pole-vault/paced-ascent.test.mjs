import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../../public/games/pole-vault/flight-profile.mjs';
import * as P from '../../public/games/pole-vault/physics.mjs';
import {JOURNEY_STAGES,skyJourney} from '../../public/games/pole-vault/sky-journey.mjs';
import {milestones} from '../../public/games/pole-vault/milestones.mjs';
import {altitudeScene} from '../../public/games/pole-vault/scenery.mjs';
import {corrected} from './helpers/motion-strategy.mjs';

const skyHeights=[45000,70000,100000,180000,400000,1200000,4000000,20000000,100000000,1000000000,8000000000,50000000000,300000000000,2000000000000,10000000000000,70000000000000,500000000000000,3000000000000000,20000000000000000,100000000000000000,800000000000000000,6000000000000000000];
function run(air=corrected,limit=420,dt=P.DT){
 const s=P.fresh(),crossings=[],cities=[],seen=new Set();let active=null;
 while(s.phase!=='done'&&s.t<limit){
  const beat=Math.floor(s.t/.28),on=s.t%.28<.1;
  const input=s.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:s.phase==='plant'?(s.charge<.82?[1,1,0,0]:[]):s.phase==='air'?air(s):[];
  P.step(s,input,dt);
  if(s.phase==='air'){
   for(const stage of JOURNEY_STAGES)if(s.altitude>=stage.start&&!seen.has(stage.id)){seen.add(stage.id);crossings.push({id:stage.id,time:s.airTime});}
   if(s.altitude<1000){const main=altitudeScene(s).main,key=main.category==='building'?'city-'+main.group:main.id;if(key!==active){active=key;cities.push({id:main.id,time:s.airTime});}}
  }
 }
 return{s,crossings,cities};
}

test('pacing preserves every sourced height and all 22 existing sky thresholds',()=>{
 assert.deepEqual(JOURNEY_STAGES.map(s=>s.start),skyHeights);
 for(const[id,h]of[['arc',49.54],['liberty',92.99],['eiffel',330],['tokyo',333],['taipei101',508],['cntower',553.33],['skytree',634],['burj',829.8],['fuji',3776],['yushan',3952],['montblanc',4807],['kilimanjaro',5895],['everest',8848.86]])assert.equal(milestones.find(x=>x.id===id).height,h);
});
test('successful earned flight visits all sky subjects with readable intervals instead of years',()=>{
 const r=run();assert.equal(r.s.phase,'air');assert.equal(r.crossings.length,22,'all 22 subjects are actually reached by unchanged input/physics');
 assert.ok(r.crossings[0].time>100&&r.crossings[0].time<210,'city and atmosphere remain a readable journey');
 assert.ok(r.crossings.at(-1).time<390,'last subject reachable within 6.5 minutes of successful flight');
 for(let i=1;i<r.crossings.length;i++){const gap=r.crossings[i].time-r.crossings[i-1].time;assert.ok(gap>=7.8&&gap<=12.2,`${r.crossings[i].id} interval ${gap}`);}
});
test('city groups no longer vanish in one or two seconds',()=>{
 const r=run(corrected,140);const selected=new Set(['lincoln','christ','arc','liberty','bigben','londoneye','washington','needle','gateway','eiffel','tokyo','esb','taipei101','cntower','skytree','burj']);
 const intervals=r.cities.slice(0,-1).map((x,i)=>({...x,duration:r.cities[i+1].time-x.time})).filter(x=>selected.has(x.id));
 assert.ok(intervals.length>=10,'multiple distinct real skyline groups observed');
 for(const row of intervals)assert.ok(row.duration>=4.5&&row.duration<=11,`${row.id} main view ${row.duration}`);
});
test('mountain geometry remains readable even when an overlapping aircraft owns the caption',()=>{
 const s=P.fresh(),visible=new Map();
 while(s.phase!=='done'&&s.t<150){const beat=Math.floor(s.t/.28),on=s.t%.28<.1;P.step(s,s.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:s.phase==='plant'?(s.charge<.82?[1,1,0,0]:[]):s.phase==='air'?corrected(s):[]);
  for(const item of altitudeScene(s).items)if(item.category==='mountain'&&item.weight>.25){const range=visible.get(item.id)??[s.airTime,s.airTime];range[1]=s.airTime;visible.set(item.id,range);}
 }
 for(const id of['fuji','yushan','montblanc','kilimanjaro','everest']){assert.ok(visible.has(id),id+' is visible');const[a,b]=visible.get(id);assert.ok(b-a>=6&&b-a<=16,`${id} visible for ${b-a} seconds`);}
});
test('height pace is continuous and finite and cannot generate lift',()=>{
 assert.equal(typeof F.plannedAscentSeconds,'function');assert.ok(Array.isArray(F.PACE_STOPS));
 let last=-1;for(const h of[0,.9,3.2,30,100,508,829.8,4000,45000,1e8,1e18,1e100,1e150]){const q=F.plannedAscentSeconds(h);assert.ok(Number.isFinite(q)&&q>=last);last=q;assert.ok(Number.isFinite(F.ascentVelocity(2e7,h)));assert.equal(F.ascentVelocity(0,h),0);assert.ok(F.ascentVelocity(-1,h)<0);}
 for(const row of F.PACE_STOPS){const h=row.height,e=Math.max(1e-7,h*1e-7),a=F.ascentVelocity(1000,Math.max(0,h-e)),b=F.ascentVelocity(1000,h+e);assert.ok(Math.abs(a-b)/Math.max(1,a,b)<.0001,`continuous speed at ${h}`);}
 for(const h of[NaN,-10,Infinity])assert.ok(Number.isFinite(F.ascentVelocity(30,h)));
});
test('paced rules preserve failures and never migrate old best scores',()=>{
 for(const air of[()=>[],()=>[1,1,1,1]]){const r=run(air,30);assert.equal(r.s.phase,'done');assert.ok(r.s.maxHeight<20);assert.ok(r.s.t<20);}
 const records=new Map([['pf-pole-vault-best-v1','123'],['pf-pole-vault-best-v2','987654']]);const storage={getItem:k=>records.get(k),setItem:(k,v)=>records.set(k,v)};
 assert.equal(F.RULESET,'real-altitude-v3');assert.equal(F.BEST_SCORE_KEY,'pf-pole-vault-best-v3');assert.equal(F.loadBest(storage),0);F.storeBest(508,storage);assert.equal(F.loadBest(storage),508);assert.equal(records.get('pf-pole-vault-best-v2'),'987654');assert.equal(records.get('pf-pole-vault-best-v1'),'123');
 const r=run(()=>[],30);assert.equal(r.s.ruleset,F.RULESET);assert.equal(r.s.scoreSnapshot.ruleset,F.RULESET);
});
test('a large frame cannot advance multiple scenic bands or supply exhausted lift',()=>{
 for(const h of[100,45000,1e9,1e18,1e100]){
  const a=Object.assign(P.fresh(),{phase:'air',airTime:2,y:h+1.18,altitude:h,maxHeight:h,vy:0,lastWorkTime:2,launchY:1.18,launchSpeed:20}),b=structuredClone(a);P.step(a,[],10);P.step(b,[],1/30);assert.deepEqual(a,b);assert.equal(a.phase,'finish');
 }
});
test('the existing numeric ceiling finishes once instead of trapping an earned flight',()=>{
 const s=Object.assign(P.fresh(),{phase:'air',airTime:2,t:6,y:1e150,altitude:1e150,maxHeight:1e150,vy:100,lastWorkTime:2,launchY:1.18,launchSpeed:20});
 P.step(s,[],P.DT);assert.equal(s.phase,'finish');assert.equal(s.scoreLockCount,1);assert.match(s.endReason,/高度上限/);assert.equal(s.scoreSnapshot.height,1e150);assert.equal(s.scoreSnapshot.ruleset,F.RULESET);
 while(s.phase!=='done'&&s.t<20)P.step(s,[],P.DT);
 assert.equal(s.phase,'done');assert.equal(s.scoreLockCount,1);assert.equal(s.maxHeight,1e150);assert.ok(Number.isFinite(s.altitude));
});
