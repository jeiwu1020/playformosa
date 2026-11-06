import {writeFileSync,mkdirSync} from 'node:fs';
import * as P from '../public/games/pole-vault/physics.mjs';
import {JOURNEY_STAGES} from '../public/games/pole-vault/sky-journey.mjs';
import {altitudeScene} from '../public/games/pole-vault/scenery.mjs';
import {imperfectController,runPacedAttempt} from '../tests/pole-vault/helpers/pace-strategy.mjs';
const cases=[];
for(const reaction of[.4,.55])for(const seed of[1,7,19,41]){
 const r=runPacedAttempt(P,JOURNEY_STAGES,{controller:imperfectController(seed,{reaction,noise:.06,miss:.08}),sampleEvery:.25});
 const city=[];let active=null;for(const s of r.samples){if(s.phase!=='air'||s.altitude>1200)continue;const main=altitudeScene(s).main,key=main.category==='building'?'city-'+main.group:main.id;if(key!==active){active=key;city.push({id:main.id,label:main.label,time:+s.airTime.toFixed(3)});}}
 cases.push({seed,reactionSeconds:reaction,beatJitterSeconds:.06,missProbability:.08,phase:r.state.phase,airTime:r.state.airTime,height:r.state.maxHeight,crossings:r.crossings,cityIntervals:city.slice(0,-1).map((x,i)=>({...x,seconds:+(city[i+1].time-x.time).toFixed(3)}))});
}
const failureControls=[['stop',()=>[]],['hold',()=>[1,1,1,1]],['uncorrected',imperfectController(7,{reaction:1e9})]].map(([name,controller])=>{const r=runPacedAttempt(P,JOURNEY_STAGES,{controller,seconds:45});return{name,phase:r.state.phase,height:r.state.maxHeight,airTime:r.state.airTime,reason:r.state.endReason};});
const report={ruleset:P.fresh().ruleset,simulatorOnly:true,notHumanTypicalPlay:true,allReferenceHeightsUnchanged:true,cases,failureControls};
const destination=new URL('../docs/pole-vault/PACE-SIMULATION.json',import.meta.url);mkdirSync(new URL('../docs/pole-vault/',import.meta.url),{recursive:true});writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,allStages:cases.every(x=>x.crossings.length===22),firstSeconds:cases.map(x=>x.crossings[0]?.airTime),lastSeconds:cases.map(x=>x.crossings.at(-1)?.airTime),failureControls},null,2));
