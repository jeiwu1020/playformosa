import {Game,STEP} from './physics.js';
// Estimate only: assumes no future input. Uses the same wall/equipment rules.
export function predictLanding(ball,flippers,live={}){
 if(live.round?.ending||live.round?.reentry||live.mailRun||ball.vz<=0||ball.z<12||ball.z>=41.6)return null;
 const g=new Game({view:live.view||'reverse',roundLimit:live.round?.limit||0,patrol:live.patrolEnabled??false});g.start();if(live.bossPatrol)g.bossPatrol=structuredClone(live.bossPatrol);if(live.round)g.round=structuredClone(live.round);if(live.central)g.central=structuredClone(live.central);g.interactionsEnabled=false;g.ball={...ball};g.flippers={...flippers};g.flipperStroke={...g.flipperStroke,...live.flipperStroke};g.cooldowns={...live.cooldowns};g.effectTime=live.effectTime||0;g.bonusUntil=live.bonusUntil||0;g.bonusReady=live.bonusReady||0;g.lamps=[...(live.lamps||g.lamps)];g.lampInside=[...(live.lampInside||g.lampInside)];g.windowReady={...live.windowReady};g.chairBoost={...g.chairBoost,...live.chairBoost};g.mailReady=live.mailReady||0;g.time=live.time||0;g.simTime=live.simTime||0;const points=[{x:ball.x,z:ball.z}];
 for(let n=0;n<312;n++){
  const before={...g.ball};g.update(STEP,{});
  if(g.round.ending||g.round.reentry)return null;
  if(g.ball.z>=41.6&&before.z<41.6){const t=(41.6-before.z)/(g.ball.z-before.z),x=before.x+(g.ball.x-before.x)*t;points.push({x,z:41.6});return {x,z:41.6,seconds:(n+t)*STEP,points};}
  if(n%12===0)points.push({x:g.ball.x,z:g.ball.z});
  if(g.state==='over'||g.ball.vz<0)return null;
 }
 return null;
}
