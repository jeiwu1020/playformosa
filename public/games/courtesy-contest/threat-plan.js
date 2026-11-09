// Shared by the browser and server replay so ranked/offline rounds use one ramp.
export const THREAT_STEPS=Object.freeze([
 {afterCount:3,travelMs:3000},{afterCount:5,travelMs:2700},
 {afterCount:7,travelMs:2300},{afterCount:9,travelMs:2000},
 {afterCount:11,travelMs:1700},{afterCount:13,travelMs:1400},
 {afterCount:15,travelMs:1100},{afterCount:18,travelMs:900},
 {afterCount:21,travelMs:750},{afterCount:24,travelMs:650},
].map(Object.freeze));
export function createEscalatingThreatPlan(random=Math.random){
 let previous=-1;
 return THREAT_STEPS.map(step=>{
  const sample=random(),pick=Number.isFinite(sample)?Math.max(0,Math.min(2,Math.floor(sample*3))):0;
  const type=pick===previous?(pick+1)%3:pick;previous=type;
  return {...step,type,side:random()<.5?-1:1};
 });
}
export function isEscalatingThreatPlan(plan){
 return Array.isArray(plan)&&plan.length===THREAT_STEPS.length&&plan.every((event,i)=>
  event&&event.afterCount===THREAT_STEPS[i].afterCount&&event.travelMs===THREAT_STEPS[i].travelMs&&
  [0,1,2].includes(event.type)&&[-1,1].includes(event.side)&&(!i||event.type!==plan[i-1].type));
}
export function threatSpeedLabel(travelMs){return travelMs<=900?'極快':travelMs<=1400?'快':travelMs<=2300?'普通':'慢';}

// V11 keeps enough slots for a full round and ramps by active time, not only
// by how many encounters an especially fast player has already reached.
export const PRESSURE_STEPS=Object.freeze([3,5,7,...Array.from({length:21},(_,i)=>i+9)].map((afterCount,i)=>Object.freeze({
 afterCount,travelMs:[3000,2400,1800,1300,1000,800,650,550,450][i]??400,
})));
export function createPressureThreatPlan(random=Math.random){
 let previous=-1;
 return PRESSURE_STEPS.map(step=>{
  const sample=random(),pick=Number.isFinite(sample)?Math.max(0,Math.min(2,Math.floor(sample*3))):0;
  const type=pick===previous?(pick+1)%3:pick;previous=type;
  return {...step,type,side:random()<.5?-1:1};
 });
}
export function isPressureThreatPlan(plan){
 return Array.isArray(plan)&&plan.length===PRESSURE_STEPS.length&&plan.every((event,i)=>
  event&&event.afterCount===PRESSURE_STEPS[i].afterCount&&event.travelMs===PRESSURE_STEPS[i].travelMs&&
  [0,1,2].includes(event.type)&&[-1,1].includes(event.side)&&(!i||event.type!==plan[i-1].type));
}
export function threatEligible(event,count,atMs,pressure=false){
 return count>=event.afterCount||(pressure&&atMs>=15000&&count>=3);
}
export function threatTimingAt(event,atMs,pressure=false){
 if(!pressure)return {windupMs:800,travelMs:event.travelMs};
 const [windupMs,cap]=atMs>=20000?[550,400]:atMs>=15000?[650,550]:atMs>=10000?[700,850]:[800,3000];
 return {windupMs,travelMs:Math.min(event.travelMs,cap)};
}
