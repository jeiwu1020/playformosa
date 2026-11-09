// Finite visual observations and timed key holds. Uses observed lean only,
// estimates angular motion from prior samples, and never reads exact spin.
export function player({mode='as',period=.12,duty=1,reaction=.25,pulse=.10,threshold=.10,seed=1,miss=.03,jitter=.06,noise=.02,correct=true,derivative=.3,rescue='arm',chordLag=0}={}){
 let z=seed,nextBeat=0,lastBeat=0,leg=0,nextLook=0,lastLook=0,lastAngle=0,arm=-1,until=0,skipped=false,handLeg=0,handOn=false,handQueue=[];
 const rand=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/2**32);
 return s=>{
  const t=s.airTime;
  if(t>=nextBeat){lastBeat=t;nextBeat=t+period*(1+(rand()-.5)*jitter*2);leg=1-leg;skipped=rand()<miss;}
  if(t>=nextLook){const seen=s.lean+(rand()-.5)*noise*2,velocity=lastLook?(seen-lastAngle)/(t-lastLook):0;lastLook=t;lastAngle=seen;nextLook=t+reaction*(.9+rand()*.2);const signal=seen+velocity*derivative;arm=correct&&Math.abs(signal)>threshold?(signal>0?1:0):-1;until=t+pulse;}
  const keys=[false,false,false,false],on=!skipped&&t-lastBeat<period*duty;
  keys[leg+2]=on;
  if(!handQueue.length||handQueue.at(-1).leg!==leg||handQueue.at(-1).on!==on)handQueue.push({at:t+chordLag,leg,on});
  while(handQueue.length&&handQueue[0].at<=t){const e=handQueue.shift();handLeg=e.leg;handOn=e.on;}
  if(mode==='diagonal')keys[1-handLeg]=handOn;
  if(mode==='both-hands')keys[0]=keys[1]=true;
  if(mode==='same-side')keys[leg]=on;
  if(t<until&&arm>=0){keys[0]=arm===0;keys[1]=arm===1;if(rescue==='side'){keys[2]=arm===0;keys[3]=arm===1;}}
  return keys;
 };
}
export function attempt(P,controller,seconds=120){const s=P.fresh();let peak=0,wobble=0,activeArms=0,total=0,above45=0,firstWobble=null;while(s.phase!=='done'&&s.t<seconds){const beat=Math.floor(s.t/.28),on=s.t%.28<.1;let keys=s.phase==='run'?[1,1,on&&beat%2===0,on&&beat%2===1]:s.phase==='plant'?(s.charge<.8?[1,1,0,0]:[]):s.phase==='air'?controller(s):[];P.step(s,keys);if(s.phase==='air'){total++;activeArms+=Number(Boolean(keys[0]||keys[1]));peak=Math.max(peak,Math.abs(s.lean));if(Math.abs(s.lean)>.45){wobble++;firstWobble??=s.airTime;}if(Math.abs(s.lean)>.785)above45++;}}
 return{airTime:+s.airTime.toFixed(3),phase:s.phase,height:+s.maxHeight.toPrecision(6),peakDegrees:+(peak*180/Math.PI).toFixed(2),wobbleSeconds:+(wobble*P.DT).toFixed(3),above45Seconds:+(above45*P.DT).toFixed(3),firstWobble,armFraction:+(activeArms/Math.max(total,1)).toFixed(3),reason:s.endReason,energy:+s.energy.toFixed(3)};}
