// Finite-reaction synthetic controls, not a claim about typical human play.
export function imperfectController(seed,{noise=.04,miss=.04,reaction=.4}={}){
 let z=seed,beat=0,nextBeat=0,nextLook=0,until=0,turn=0;
 const random=()=>((z=Math.imul(z,1664525)+1013904223)>>>0)/2**32;
 return s=>{
  const t=s.airTime;
  if(t>=nextBeat){nextBeat=t+.4+(random()-.5)*noise*2;if(random()>miss)beat=1-beat;}
  if(t>=nextLook){nextLook=t+reaction+(random()-.5)*.1;const signal=s.lean*1.5+s.spin*.85+(random()-.5)*.025;turn=Math.abs(signal)>.14?-Math.sign(signal):0;until=t+.10+(random()-.5)*.025;}
  return t<until&&turn?(turn>0?[1,0,1,0]:[0,1,0,1]):[beat,!beat,!beat,beat];
 };
}
export function runPacedAttempt(P,stages,{controller,seconds=410,dt=P.DT,sampleEvery=0}={}){
 const s=P.fresh(),seen=new Set(),crossings=[],samples=[];let nextSample=0;
 while(s.phase!=='done'&&s.t<seconds){
  const beat=Math.floor(s.t/.28),on=s.t%.28<.1;
  const keys=s.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:s.phase==='plant'?(s.charge<.80?[1,1,0,0]:[]):s.phase==='air'?controller(s):[];
  P.step(s,keys,dt);
  for(const stage of stages)if(s.maxHeight>=stage.start&&!seen.has(stage.id)){seen.add(stage.id);crossings.push({id:stage.id,label:stage.label,height:stage.start,airTime:+s.airTime.toFixed(3)});}
  if(sampleEvery&&s.t>=nextSample){nextSample+=sampleEvery;samples.push(structuredClone(s));}
 }
 return{state:s,crossings,samples};
}
