import * as engine from '../public/games/run-1500m/race.mjs';
import {simulate,strategies} from '../tests/run-1500m/simulation.mjs';
import {writeFileSync} from 'node:fs';
const cases=[],summary=[],rivals=[[],[],[]];
for(const strategy of Object.keys(strategies)){
 let maxSpread=0;const playerTimes=[],ranks=[];
 for(let scenario=0;scenario<75;scenario++){
  const races=engine.RACE_PLANS.map(plan=>{
   const {race}=simulate(engine,{planId:plan.id,strategy,scenario});
   while(race.phase!=='done'&&race.time<240)engine.step(race,1/120);
   const times=race.runners.map(p=>p.finished);if(times.some(x=>!Number.isFinite(x)))throw Error('Unfinished racer');
   times.slice(1).forEach((x,i)=>rivals[i].push(x));playerTimes.push(times[0]);ranks.push(1+times.slice(1).filter(t=>t<times[0]).length);return times;
  });
  const times=races.map(x=>x[0]),spread=Math.max(...times)-Math.min(...times);maxSpread=Math.max(maxSpread,spread);cases.push({strategy,scenario,races,spread});
 }
 summary.push({strategy,maxSpread,playerMin:Math.min(...playerTimes),playerMax:Math.max(...playerTimes),ranks:[...new Set(ranks)].sort()});console.log(strategy,JSON.stringify(summary.at(-1)));
}
const report={rules:engine.RULES,races:1200,plans:engine.RACE_PLANS,scenarios:'5 lane/supply routes × 15 start delays × 4 pace strategies × 4 plans',limitSeconds:1,summary,rivals:rivals.map((times,i)=>({id:i+1,min:Math.min(...times),max:Math.max(...times)})),cases};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
if(summary.some(x=>x.maxSpread>report.limitSeconds))process.exitCode=1;
