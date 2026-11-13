import {sweepCircle} from './contact.js';
const HOME={x:0,z:-16},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const bossPath=side=>[HOME,{x:0,z:-19},{x:13*side,z:-19},{x:13*side,z:-7},{x:16*side,z:-4},{x:16*side,z:14.7},{x:-16*side,z:14.7},{x:-16*side,z:-4},{x:-13*side,z:-7},{x:-13*side,z:-19},{x:0,z:-19},HOME];
export const normalizeLimit=n=>[60,180].includes(Number(n))?Number(n):0;
export const freshRound=limit=>({limit:normalizeLimit(limit),remaining:normalizeLimit(limit)||null,warning:false,ending:null,reason:null,reentry:null,reentries:0});
export const freshBoss=()=>({phase:'home',x:HOME.x,z:HOME.z,previousX:HOME.x,previousZ:HOME.z,elapsed:0,nextAt:18,kickReady:0,kickUntil:0,cycle:0,path:[],leg:0});
export function startReentry(g){
 const r=g.round;if(!r.limit||r.remaining<=0||r.ending||r.reentry)return false;
 r.reentries++;const side=g.ball.x===0?(r.reentries%2?1:-1):Math.sign(g.ball.x);
 r.reentry={elapsed:0,duration:1.5,from:{x:g.ball.x,z:g.ball.z},side};
 g.combo=0;g.lastHit=-99;g.comboRoutes.active=null;g.mailRun=null;g.shortRun=null;g.interaction=null;g.opportunity=null;g.arming=null;g.cancelInput();
 g.central.available=false;g.central.litBefore=false;g.flippers={left:0,right:0};g.flipperStroke={left:0,right:0};g.flipperPulse={left:0,right:0};g.chairBoost.remaining=0;g.effect=null;g.hop=0;g.ball.vx=g.ball.vz=0;
 g.emit('reentryStart',{count:r.reentries});return true;
}
export function updateReentry(g,dt){
 const r=g.round.reentry;if(!r)return;
 r.elapsed=Math.min(r.duration,r.elapsed+dt);const t=r.elapsed/r.duration,u=t*t*(3-2*t);
 // Return around the outside to the clear upper-office aisle, away from the exit.
 // A controlled side launch avoids a direct copier hit; no new invulnerability,
 // collision, lamp or reward checks are introduced during the return animation.
 g.ball.x=r.from.x*(1-u)+r.side*14*Math.sin(Math.PI*u);g.ball.z=r.from.z+(-11.3-r.from.z)*u;g.hop=Math.sin(Math.PI*t)*.8;
 g.tapQueue.length=0;g.pendingTap=null;
 if(r.elapsed>=r.duration-1e-8){Object.assign(g.ball,{x:0,z:-11.3,vx:r.side*6,vz:10});g.round.reentry=null;g.hop=.3;g.cancelInput();g.interactionReady=Math.max(g.interactionReady,g.time+.6);g.bossPatrol.kickReady=Math.max(g.bossPatrol.kickReady,(g.playClock??g.time)+.6);g.emit('reentryEnd');}
}
export function startTimedEnding(g){
 const r=g.round;if(r.ending)return;r.remaining=0;r.reason='time';g.endOvertime?.();
 r.reentry=null;
 r.ending={elapsed:0,from:{x:g.ball.x,z:g.ball.z},bossFrom:{x:g.bossPatrol.x,z:g.bossPatrol.z},kicked:false};
 g.mailRun=null;g.shortRun=null;g.interaction=null;g.opportunity=null;g.arming=null;g.cancelInput();g.flipperStroke={left:0,right:0};g.flipperPulse={left:0,right:0};g.ball.vx=g.ball.vz=0;
 g.bossPatrol.phase='chase';g.emit('timeUp');
}
// Free play and controllable work share the round clock. Work does not earn base pay.
export function updateRound(g,dt,{billable=true}={}){
 const r=g.round;
 if(r.ending){const e=r.ending;e.elapsed+=dt;const t=clamp(e.elapsed/1.15,0,1),ease=t*t*(3-2*t),b=g.bossPatrol;
  b.x=e.bossFrom.x+(e.from.x-e.bossFrom.x)*ease;b.z=e.bossFrom.z+(e.from.z-1.9-e.bossFrom.z)*ease;
  if(e.elapsed>=1.15&&!e.kicked){e.kicked=true;b.phase='kick';g.emit('forcedKick');}
  if(e.kicked){const q=clamp((e.elapsed-1.15)/.85,0,1),u=q*q*(3-2*q);g.ball.x=e.from.x*(1-u);g.ball.z=e.from.z+(52-e.from.z)*u;g.hop=Math.sin(q*Math.PI)*1.5;}
  if(e.elapsed>=2){g.state='over';g.hop=0;g.emit('over',{reason:'time'});}return true;
 }
 if(r.remaining===null)return false;
 const before=r.remaining;r.remaining=Math.max(0,before-dt);
 if(!r.warning&&r.remaining<=5){r.warning=true;g.emit('timeWarning');}
 if(r.remaining<=1e-8){if(billable&&!r.reentry)g.time+=before;startTimedEnding(g);return true;}return false;
}
export function updateBoss(g,dt){
 const now=g.playClock??g.time,b=g.bossPatrol;b.previousX=b.x;b.previousZ=b.z;if(!g.patrolEnabled)return;
 if(b.phase==='home'&&now>=b.nextAt){b.phase='warning';b.elapsed=0;g.emit('bossWarning');}
 if(b.phase==='warning'){b.elapsed+=dt;if(b.elapsed<2)return;const side=b.cycle%2?1:-1;b.phase='patrol';b.path=bossPath(side);b.leg=1;g.emit('bossPatrol');}
 if(b.phase!=='patrol')return;
 let travel=dt*15;
 while(travel>0&&b.leg<b.path.length){const p=b.path[b.leg],dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz);if(d<=travel){b.x=p.x;b.z=p.z;travel-=d;b.leg++;}else{b.x+=dx/d*travel;b.z+=dz/d*travel;travel=0;}}
 if(b.leg===b.path.length){b.phase='home';b.cycle++;const sample=g.random?.(),r=Number.isFinite(sample)?clamp(sample,0,1):(b.cycle*.61803398875)%1;b.nextAt=now+18+12*r;g.emit('bossHome');}
}
export function patrolContact(g,from,to){
 const b=g.bossPatrol;if(b.phase!=='patrol'||(g.playClock??g.time)<b.kickReady)return null;
 const h=sweepCircle({x:from.x-b.previousX,z:from.z-b.previousZ},{x:to.x-b.x,z:to.z-b.z},{x:0,z:0,r:1.3},g.ball.r);
 if(!h)return null;return {...h,x:h.x+b.previousX+(b.x-b.previousX)*h.t,z:h.z+b.previousZ+(b.z-b.previousZ)*h.t,station:{id:'patrol-boss',type:'boss',patrol:true}};
}
export function kickByPatrol(g){
 const b=g.ball,p=g.bossPatrol,dx=clamp(-b.x*.35,-6,6),dz=22;
 b.vx=dx;b.vz=dz;g.hop=.8;p.kickReady=(g.playClock??g.time)+2;p.kickUntil=(g.playClock??g.time)+.45;g.interactionReady=Math.max(g.interactionReady,g.time+.45);g.emit('bossKick');
}
