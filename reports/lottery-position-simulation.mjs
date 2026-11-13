// Reproducible paired physics probe, not a human success-rate estimate.
// Run after lottery integration: node reports/lottery-position-simulation.mjs [seed-count]
// Set SIM_SECONDS for unlimited censoring (default 180s wall simulation).
import {LOTTERY_BOX} from '../public/games/overtime-pinball/lottery-layout.js';
import {Game,BUMPERS,STEP} from '../public/games/overtime-pinball/physics.js';
import {stationShapes} from '../public/games/overtime-pinball/contact.js';
import {LAMPS,SOLID_PROPS} from '../public/games/overtime-pinball/board-features.js';
import {ASSISTS} from '../public/games/overtime-pinball/assist-machines.js';
import {writeFileSync,readFileSync} from 'node:fs';
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const box=LOTTERY_BOX;
function gap(s,b=box){if(s.hx!==undefined)return Math.hypot(Math.max(0,Math.abs(s.x-b.x)-s.hx-b.hx),Math.max(0,Math.abs(s.z-b.z)-s.hz-b.hz));return Math.hypot(Math.max(0,Math.abs(s.x-b.x)-b.hx),Math.max(0,Math.abs(s.z-b.z)-b.hz))-s.r;}
const candidates=[box,{...box,x:0,z:7},{...box,x:3,z:5},{...box,x:-3,z:5}].map(b=>({box:b,views:Object.fromEntries(['original','reverse'].map(view=>[view,[...BUMPERS.flatMap(o=>stationShapes(o,view).map(s=>({id:o.id,...s}))),...LAMPS,...SOLID_PROPS,...Object.entries(ASSISTS).map(([id,s])=>({id,...s,...(s.extension?{x:s.x+s.inward*s.extension/2,hx:s.hx+s.extension/2}:{})}))].map(s=>({id:s.id,gap:gap(s,b)})).sort((a,b)=>a.gap-b.gap).slice(0,5)]))}));
const seeds=Number(process.argv[2]||12),unlimited=Number(process.env.SIM_SECONDS||180),rows=[];
function run(seed,view,limit,policy,enabled,extendedCap=null){
 const gameRandom=rng(Math.imul(seed,2654435761)>>>0);let opening=true;const g=new Game({view,roundLimit:limit,random:()=>{if(opening){opening=false;return (seed-.5)/seeds;}return gameRandom();}});g.start();g.lotteryRandom=rng(seed^0x4af19b);
 if(!('lotteryEnabled'in g)||!g.lottery)throw Error('Lottery core not integrated: cannot report fake baseline comparisons');g.lotteryEnabled=enabled;
 const counts=Object.fromEntries(BUMPERS.map(b=>[b.id,0])),offers={},events={},controlRandom=rng(seed^0x982ab);let current={left:false,right:false},previousInput={left:false,right:false},lastOffer=null,steps=0;
 const cap=extendedCap??(limit?limit+120:unlimited);
 for(;steps<cap/STEP&&g.state==='playing';steps++){
  const tick=steps%24,cycle=Math.floor(steps/24);
  if(policy==='silent')current={left:false,right:false};
  if(policy==='alternating')current={left:cycle%2===0&&tick<3,right:cycle%2===1&&tick<3};
  if(policy==='random'&&tick===0)current={left:controlRandom()<.45,right:controlRandom()<.45};
  if(policy==='random'&&tick===3)current={left:false,right:false};
  if(policy==='reactive')current={left:tick<3&&g.ball.x<0,right:tick<3&&g.ball.x>=0};
  // Only ordinary game.update input: no direct scoring, rescue or forced QTE success.
  for(const side of ['left','right']){if(current[side]&&!previousInput[side])g.tapFlipper(side);if(!current[side]&&previousInput[side])g.releaseFlipper(side);}previousInput={...current};
  g.update(STEP,current);
  const offer=g.getInteractionOffer?.();if(offer&&offer.id!==lastOffer){offers[offer.stationId]=(offers[offer.stationId]||0)+1;lastOffer=offer.id;}
  for(const e of g.drainEvents()){events[e.type]=(events[e.type]||0)+1;if(e.type==='interactionStart'&&e.station?.id==='launcher')counts.launcher++;if((e.type==='hit'||e.type==='propHit')&&e.id in counts)counts[e.id]++;}
  if(![g.ball.x,g.ball.z,g.ball.vx,g.ball.vz,g.score].every(Number.isFinite))throw Error('non-finite physics');
 }
 return{seed,view,limit,policy,enabled,seconds:steps*STEP,playClock:g.playClock,score:g.score,interaction:g.interaction?{station:g.interaction.stationId,stage:g.interaction.stage,elapsed:g.interaction.elapsed,duration:g.interaction.duration,from:g.interaction.from,dock:g.interaction.dock}:null,releaseError:g.releaseError,mailRun:g.mailRun,roundReentry:g.round.reentry,gameTime:g.time,simSteps:steps,state:g.state,censored:g.state!=='over',reentries:g.round.reentries,counts,offers,events,draws:g.lottery.drawId};
}
if(process.argv.includes('--complete-censored')){const old=JSON.parse(readFileSync(new URL('lottery-position-results.json',import.meta.url)));for(const row of old.rows){if(row.limit&&row.censored){const completed=run(row.seed,row.view,row.limit,row.policy,row.enabled,720);completed.initialWallCapSnapshot={seconds:row.seconds,playClock:row.playClock,interaction:row.interaction};rows.push(completed);}else rows.push(row);}}else for(const view of ['original','reverse'])for(const limit of [60,180,0])for(const policy of ['silent','random','alternating','reactive'])for(let seed=1;seed<=seeds;seed++)for(const enabled of [false,true])rows.push(run(seed,view,limit,policy,enabled));
const groups=[];
for(const view of ['original','reverse'])for(const limit of [60,180,0])for(const policy of ['silent','random','alternating','reactive']){
 const aggregate=enabled=>{const r=rows.filter(x=>x.view===view&&x.limit===limit&&x.policy===policy&&x.enabled===enabled),counts=Object.fromEntries(BUMPERS.map(b=>[b.id,r.reduce((a,x)=>a+x.counts[b.id],0)]));return{runs:r.length,scoreMean:r.reduce((a,x)=>a+x.score,0)/r.length,secondsMean:r.reduce((a,x)=>a+x.seconds,0)/r.length,draws:r.reduce((a,x)=>a+x.draws,0),censored:r.filter(x=>x.censored).length,counts,reachRuns:Object.fromEntries(BUMPERS.map(b=>[b.id,r.filter(x=>x.counts[b.id]>0).length]))};};
 const baseline=aggregate(false),lottery=aggregate(true);groups.push({view,limit,policy,baseline,lottery,lostEquipment:Object.keys(baseline.counts).filter(id=>baseline.counts[id]>0&&lottery.counts[id]===0)});
}
const result={note:'Paired same seeded start/control RNG. Independent lotteryRandom stream supplied; runtime must consume it. Unlimited censored at configured wall cap. Timed samples with initial cap can be rerun to 720s via --complete-censored and preserve initial snapshot. Bots are not human success rates. Geometric and camera occlusion tests remain necessary.',seeds,unlimited,candidates,groups,rows};
writeFileSync(new URL('lottery-position-results.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({runs:rows.length,candidates,groups},null,2));
