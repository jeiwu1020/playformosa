import {createHash} from 'node:crypto';
export const profiles=Object.freeze({'100m':[{name:'expert',gap:.16},{name:'steady',gap:.25},{name:'learning',gap:.35},{name:'slow',gap:.45}],'400m':[{name:'expert',gap:1},{name:'steady',gap:1.1},{name:'learning',gap:1.3},{name:'slow',gap:1.4}]});
export function simulate(e,game,profile,seed,{traceEvery=0,reaction=.25,steer=true}={}){
 const r=e.createRace(seed),short=game==='100m';e.input(r,0,2,true);e.input(r,0,3,true);
 const pulse=k=>{e.input(r,0,k,true);e.input(r,0,k,false)};let side=0,next=0,hand=0,player=null;const hash=traceEvery?createHash('sha256'):null;
 for(let tick=0;tick<180*120;tick++){
  const p=r.runners[0];
  if(r.phase==='race'&&!p.started&&r.time>=reaction){e.input(r,0,2,false);e.input(r,0,3,false);}
  if(p.started&&p.finished===null){
   if(r.time>=next){if(short)pulse(1-side);pulse(side+2);side=1-side;next=r.time+(short?profile.gap:p.beatTarget*profile.gap);}
   if(!short&&steer&&r.time>=hand){const d=e.targetBank(p)-p.bank;if(Math.abs(d)>.07)pulse(d>0?0:1);hand=r.time+.4;}
   if((p.x??p.distance)>(short?99:399)){e.input(r,0,0,true);e.input(r,0,1,true);}
  }
  e.step(r,1/120);
  if(!player){if(hash&&tick%traceEvery===0)hash.update(JSON.stringify([r.clock,r.time,p]));if(p.finished!==null)player=structuredClone(p);}
  if(r.phase==='done')break;
 }
 if(!player)throw Error(game+' player did not finish');
 return {player,race:r,trace:hash?.digest('hex')??null,times:r.runners.map(p=>p.finished),rank:1+r.runners.slice(1).filter(p=>p.finished!==null&&p.finished<player.finished).length};
}
