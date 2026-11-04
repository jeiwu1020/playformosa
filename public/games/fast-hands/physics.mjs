/** Analytic free-fall mini-game. Units: metres/seconds in formulas, milliseconds in event APIs.
 * All returned states are frozen. Assign the returned value after every action.
 * A frame only samples the trajectory; it never integrates or advances the physics.
 */
export const CONFIG=Object.freeze({g:9.81,height:2,catchMin:.9,catchMax:1.7,returnLimit:2});
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export const position=t=>valid(t) ? 0.5*CONFIG.g*t*t : null;
export const velocity=t=>valid(t)?CONFIG.g*t:null;
const floorMs=Math.sqrt(2*CONFIG.height/CONFIG.g)*1000;
const freeze=Object.freeze;
const terminal=r=>r.status==='success'||r.status==='failed';
const accepts=(r,n)=>r&&valid(n)&&n>=r.lastAt&&!terminal(r);
export function createRun(startMs){if(!valid(startMs))return null;return freeze({status:'falling',start:startMs,startedAt:startMs,lastAt:startMs,distanceM:0,velocityMps:0,elapsedMs:0,caughtAt:null,reactionMs:null,returnMs:0,reason:null,catchVelocityMps:null});}
export function tick(r,nowMs){if(!accepts(r,nowMs))return r;
 if(r.status==='falling'){const elapsedMs=Math.min(nowMs-r.start,floorMs),atFloor=nowMs-r.start>=floorMs;return freeze({...r,status:atFloor?'failed':'falling',lastAt:atFloor?r.start+floorMs:nowMs,elapsedMs,distanceM:atFloor?CONFIG.height:position(elapsedMs/1000),velocityMps:atFloor?0:velocity(elapsedMs/1000),reason:atFloor?'floor':null});}
 if(r.status==='caught'){const returnMs=Math.min(nowMs-r.caughtAt,CONFIG.returnLimit*1000),expired=nowMs-r.caughtAt>=CONFIG.returnLimit*1000;return freeze({...r,status:expired?'failed':'caught',lastAt:r.caughtAt+returnMs,elapsedMs:r.reactionMs+returnMs,returnMs,reason:expired?'return-timeout':null});}return r;
}
export function grab(r,nowMs){if(!accepts(r,nowMs)||r.status!=='falling')return r;const next=tick(r,nowMs);if(next.status==='failed')return next;
 // Numerical tolerance only compensates floating-point sqrt inversion at the inclusive boundaries.
 const epsilon=1e-12;if(next.distanceM<CONFIG.catchMin-epsilon)return freeze({...next,status:'failed',reason:'too-early'});if(next.distanceM>CONFIG.catchMax+epsilon)return freeze({...next,status:'failed',reason:'too-late'});
 return freeze({...next,status:'caught',caughtAt:nowMs,reactionMs:next.elapsedMs,returnMs:0,catchVelocityMps:next.velocityMps,velocityMps:0});
}
export function stop(r,nowMs){if(!accepts(r,nowMs)||r.status!=='caught')return r;const next=tick(r,nowMs);return next.status==='caught'?freeze({...next,status:'success',reason:null}):next;}
