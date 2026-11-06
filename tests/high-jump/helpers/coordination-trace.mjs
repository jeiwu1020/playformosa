import * as P from '../../../public/games/high-jump/physics.mjs';
import {launchAuto} from './reproduce-asjk.mjs';

export {launchAuto};
// Drive ordinary control flags from a single copied takeoff. No score/state edits.
export function clearanceTrace(initial,{hands='lead',legs='after-hips',handDelay=.12,legDelay=.12}={}){
 const s=P.snapshot(initial),trajectory=[],history=[];let hipsPassed=false;
 for(let n=0;n<3000&&s.phase!=='done';n++){
  const p=P.pose(s);if(p.hip.x>=0)hipsPassed=true;
  const arms=hands==='none'?false:hands==='late'?s.air>=s.apexTime*1.15:s.air>=handDelay;
  const tuck=legs==='none'?false:legs==='early'?s.air>=legDelay:legs==='late'?s.air>=s.apexTime*1.3:hipsPassed;
  for(let i=0;i<4;i++)P.setLimb(s,P.KEYS[i],i<2?tuck:arms&&(hands!=='one'||i===2));
  P.advance(s,1/240);if(s.phase==='air')trajectory.push([s.x,s.y]);history.push(P.snapshot(s));
 }
 return{state:s,trajectory,history};
}
