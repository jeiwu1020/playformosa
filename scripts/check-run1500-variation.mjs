import * as engine from '../public/games/run-1500m/race.mjs';
import {simulate,strategies} from '../tests/run-1500m/simulation.mjs';
import {writeFileSync} from 'node:fs';
const cases=[],summary=[];
for(const strategy of Object.keys(strategies)){
 let maxSpread=0;
 for(let scenario=0;scenario<75;scenario++){
  const times=engine.RACE_PLANS.map(plan=>simulate(engine,{planId:plan.id,strategy,scenario}).seconds);
  const spread=Math.max(...times)-Math.min(...times);maxSpread=Math.max(maxSpread,spread);cases.push({strategy,scenario,times,spread});
 }
 summary.push({strategy,maxSpread});console.log(strategy,maxSpread.toFixed(6));
}
const report={rules:engine.RULES,races:cases.length*engine.RACE_PLANS.length,plans:engine.RACE_PLANS,scenarios:'5 lane/supply routes × 15 start delays × 4 pace strategies × 4 plans',limitSeconds:1,summary,cases};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
if(summary.some(x=>x.maxSpread>report.limitSeconds))process.exitCode=1;
