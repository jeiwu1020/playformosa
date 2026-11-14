/** Pure overtime event reducer. Times are monotonic gameplay seconds supplied by Core.
 * Commands must be consumed once. No DOM, timers, physics, or direct income writes.
 */
const LIMITS = Object.freeze({ words: 4, pool: 5000, shadows: 1000, claim: 8, grace: 3 });
export { LIMITS as OVERTIME_LIMITS };
const amount = n => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
const put = (o,k,v) => Object.defineProperty(o,k,{value:v,writable:true,enumerable:true,configurable:true});
const successful = e => e.kind === 'perfect' || e.kind === 'complete';
const station = e => typeof e.stationId === 'string' && e.stationId.length > 0 && e.stationId !== 'launcher' && e.activityId !== 'launcher';
const cue = name => ({type:'overtimeCue',cue:name});
const changed = s => ({type:'overtimeChanged',phase:s.phase,cycle:s.cycle,pool:s.pool,litCount:s.litCount,words:{...s.words},until:s.until});
const active = s => s.phase === 'frenzy' || s.phase === 'claim';
const addPool = (s,n) => {s.pool=Math.min(LIMITS.pool,s.pool+amount(n));};
export function createOvertimeState() {
  return {phase:'collecting',cycle:0,words:{},litCount:0,pool:500,poolContributions:{},rescueBonuses:0,shadowPaid:0,patrolAwarded:{},startedAt:null,until:null,claimWork:null,settled:false};
}
function resetCycle(s) {
  const {cycle,patrolAwarded}=s;
  Object.assign(s,createOvertimeState(),{cycle,patrolAwarded});
}
function enterClaim(s,now) {
  s.phase='claim';s.until=now+LIMITS.claim;s.claimWork=null;
  return [{type:'clearShadows'},cue('claim'),changed(s)];
}
function validTime(e) {return Number.isFinite(e.now) && e.now >= 0;}
function hasGrace(s) {return s.claimWork && !s.claimWork.cancelled;}
/** reason=approved, timeout, roundEnd. Only activated events can pay. roundEnd is terminal. */
export function settleOvertime(s,{now,reason}) {
  if(s.settled || !Number.isFinite(now))return [];
  const c=[];
  if(active(s)) {
    const provisional=reason!=='approved';
    c.push({type:'award',category:'jackpot',points:provisional?Math.floor(s.pool/2):s.pool,provisional});
    c.push(cue(provisional?'provisional':'approved'));
  }
  c.push({type:'clearShadows'});
  if(reason==='roundEnd'){s.settled=true;s.phase='ended';s.until=null;s.claimWork=null;}
  else resetCycle(s);
  c.push(changed(s));return c;
}
function expireClaim(s,now) {
  if(s.phase!=='claim')return [];
  if(now>=s.until && (!hasGrace(s) || now>s.until+LIMITS.grace))return settleOvertime(s,{now,reason:'timeout'});
  return [];
}
export function advanceOvertime(s,e) {
  if(s.settled || !validTime(e))return [];
  if(s.phase==='ready' && e.canStart) {
    s.phase='frenzy';s.cycle++;s.startedAt=e.now;s.until=null;addPool(s,300);
    return [{type:'spawnShadows',count:2,cycle:s.cycle},cue('frenzy'),changed(s)];
  }
  if(s.phase==='frenzy' && e.now>s.startedAt && e.shadowCount===0) {
    return enterClaim(s,e.now);
  }
  return expireClaim(s,e.now);
}
export function onOvertimeWorkStart(s,e) {
  if(s.settled || !validTime(e) || s.phase!=='claim')return [];
  const expired=expireClaim(s,e.now);if(expired.length)return expired;
  if(s.claimWork){
    // A fresh operation cannot transfer or extend the original operation's grace.
    if(s.claimWork.stationId!==e.stationId || s.claimWork.startedAt!==e.now)s.claimWork.cancelled=true;
  } else if(station(e) && e.now<s.until) s.claimWork={stationId:e.stationId,startedAt:e.now,cancelled:false};
  return [];
}
export function onOvertimeWork(s,e) {
  if(s.settled || !validTime(e))return [];
  const expired=expireClaim(s,e.now);if(expired.length)return expired;
  if(!station(e))return [];
  if(s.phase==='claim') {
    if(e.kind==='cancelled' && s.claimWork?.stationId===e.stationId)s.claimWork.cancelled=true;
    const within=e.now<s.until;
    // After cutoff require the exact operation identity, not only the same station.
    const grace=hasGrace(s) && e.stationId===s.claimWork.stationId && e.startedAt===s.claimWork.startedAt && e.now<=s.until+LIMITS.grace;
    if(successful(e) && (within||grace)) {
      if(e.isPatrolling && e.patrolCycle!==undefined && e.patrolCycle!==null)put(s.patrolAwarded,String(e.patrolCycle),true);
      return settleOvertime(s,{now:e.now,reason:'approved'});
    }
    return [];
  }
  const c=[];
  if(successful(e)) {
    const n=own(s.poolContributions,e.stationId)||0;
    if(n<2){addPool(s,Math.floor(amount(e.points)*.25));put(s.poolContributions,e.stationId,n+1);}
    if(e.isPatrolling && e.patrolCycle!==undefined && e.patrolCycle!==null) {
      const key=String(e.patrolCycle);
      if(!own(s.patrolAwarded,key)){put(s.patrolAwarded,key,true);addPool(s,200);c.push(cue('patrol-approved'));}
    }
  }
  c.push(changed(s));return c;
}
export function onOvertimeSave(s,e) {
  if(s.settled || !validTime(e) || s.phase!=='frenzy' || !e.precise || s.rescueBonuses>=5)return [];
  s.rescueBonuses++;addPool(s,100);return [changed(s)];
}
export function onOvertimeShadowHit(s,e) {
  if(s.settled || !validTime(e) || s.phase!=='frenzy')return [];
  const points=Math.min(amount(e.points),LIMITS.shadows-s.shadowPaid);
  if(!points)return [];
  s.shadowPaid+=points;return [{type:'award',category:'clones',points,provisional:false},changed(s)];
}

export function onOvertimeWord(s,e) {
 if(s.settled||!validTime(e)||s.phase!=='collecting'||!['fake','pretend','very','busy'].includes(e.wordId)||own(s.words,e.wordId))return [];
 put(s.words,e.wordId,true);s.litCount++;const c=[cue('word')];
 if(s.litCount===LIMITS.words){s.phase='ready';c.push(cue('ready'));}
 return c.concat(changed(s));
}
