/** V2 note + duck. Logical canvas 720×470. Event times in ms; physical times in s.
 * Linear air drag dv/dt=g-v/tau for the banknote; ordinary freefall for released duck.
 * Frozen states; caller must assign every transition's return value.
 */
export const CONFIG=Object.freeze({g:9.81,tau:.12,pxPerM:150,noteX:290,noteY:75,noteWidth:110,noteHeight:52,floorY:410,duckX:555,duckY:380,duckFloorY:390,duckRadiusX:30,duckRadiusY:20});
const freeze=Object.freeze,finite=Number.isFinite;
const noteDrop=t=>CONFIG.g*CONFIG.tau*(t-CONFIG.tau*(1-Math.exp(-t/CONFIG.tau)))*CONFIG.pxPerM;
// Analytic position with a one-time root solve for the exact physical floor deadline.
let lo=0,hi=10;for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(noteDrop(mid)<CONFIG.floorY-CONFIG.noteY-CONFIG.noteHeight)lo=mid;else hi=mid;}const floorMs=(lo+hi)/2*1000;
export const NOTE_FLOOR_MS=floorMs;
const terminal=s=>s.status==='success'||s.status==='failed';
const validTime=(s,n)=>s&&finite(n)&&n>=0&&n>=s.lastAt&&!terminal(s);
const validPoint=(x,y)=>finite(x)&&finite(y);
export function newChallenge(now=0){if(!finite(now)||now<0)return null;return freeze({status:'idle',noteY:CONFIG.noteY,duckX:CONFIG.duckX,duckY:CONFIG.duckY,startAt:null,duckReleaseAt:null,duckReleaseY:null,pointerId:null,lastAt:now,elapsedMs:0,reason:null});}
export function noteRect(s){return {x:CONFIG.noteX,y:s.noteY,width:CONFIG.noteWidth,height:CONFIG.noteHeight};}
function noteHit(s,x,y){const r=noteRect(s);return validPoint(x,y)&&x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height;}
export function duckHit(s,x,y){return validPoint(x,y)&&((x-s.duckX)/CONFIG.duckRadiusX)**2+((y-s.duckY)/CONFIG.duckRadiusY)**2<=1+1e-12;}
export function overlap(s){const r=noteRect(s),x=Math.max(r.x,Math.min(s.duckX,r.x+r.width)),y=Math.max(r.y,Math.min(s.duckY,r.y+r.height));return duckHit(s,x,y);}
export function tick(s,now){if(!validTime(s,now))return s;if(s.startAt===null)return s;const floor=now-s.startAt>=floorMs,elapsedMs=Math.min(now-s.startAt,floorMs),sample=s.startAt+elapsedMs;let duckY=s.duckY;if(s.duckReleaseAt!==null){const t=Math.max(0,(sample-s.duckReleaseAt)/1000);duckY=Math.min(CONFIG.duckFloorY,s.duckReleaseY+.5*CONFIG.g*t*t*CONFIG.pxPerM);}return freeze({...s,noteY:floor?CONFIG.floorY-CONFIG.noteHeight:CONFIG.noteY+noteDrop(elapsedMs/1000),duckY,elapsedMs,lastAt:sample,status:floor?'failed':s.status,reason:floor?'note-floor':s.reason,pointerId:floor?null:s.pointerId});}
export function down(s,x,y,now,id=0){if(!validTime(s,now)||!validPoint(x,y))return s;const n=tick(s,now);if(terminal(n))return n;
 if(n.status==='idle'&&noteHit(n,x,y))return freeze({...n,status:'holdingNote',pointerId:id,lastAt:now});
 if(n.status==='falling'&&duckHit(n,x,y))return freeze({...n,status:'draggingDuck',pointerId:id,duckX:x,duckY:y,lastAt:now});
 if(n.status==='releasedDuck'&&noteHit(n,x,y)&&duckHit(n,x,y))return freeze({...n,status:'success',pointerId:null,lastAt:now});
 return s;
}
export function move(s,x,y,now,id=0){if(!validTime(s,now)||!validPoint(x,y)||s.status!=='draggingDuck'||s.pointerId!==id)return s;const n=tick(s,now);if(terminal(n))return n;return freeze({...n,duckX:x,duckY:y,lastAt:now});}
export function up(s,x,y,now,id=0){if(!validTime(s,now)||!validPoint(x,y)||s.pointerId!==id)return s;
 if(s.status==='holdingNote')return freeze({...s,status:'falling',startAt:now,lastAt:now,pointerId:null});
 if(s.status==='draggingDuck'){const n=tick(s,now);if(terminal(n))return n;return freeze({...n,status:'releasedDuck',duckX:x,duckY:y,duckReleaseY:y,duckReleaseAt:now,pointerId:null,lastAt:now});}return s;
}
export function cancel(s,now,reason='cancelled'){if(!validTime(s,now))return s;const n=tick(s,now);if(terminal(n))return n;return freeze({...n,status:'failed',reason,pointerId:null,lastAt:now});}
