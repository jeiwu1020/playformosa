// Two lightweight, score-only workers. No Game, DOM, input, camera or task hooks.
import {stationShapes,sweepCircle,sweepRect} from './contact.js';
const STEP=1/120, R=.65, EPS=.002, MAX_SPEED=44, EXIT_MARGIN=.15;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,f)=>Number.isFinite(n)?n:f;
export function createShadowState(){return {workers:[],nextId:1,accumulator:0};}
export function clearShadowWorkers(state){state.workers.length=0;state.accumulator=0;}
const eligible=s=>s&&s.type!=='launcher'&&!s.patrol&&!s.dynamicPatrol;
function shapesOf(s,view){
 if(Number.isFinite(s.hx)&&Number.isFinite(s.hz))return [{x:s.x,z:s.z,hx:s.hx,hz:s.hz}];
 return stationShapes(s,view).filter(p=>Number.isFinite(p.r));
}
function solids(world,view){return [...(world.stations||[]).filter(eligible).flatMap(station=>shapesOf(station,view).map(shape=>({shape,station}))),...(world.props||[]).flatMap(p=>shapesOf(p,view).map(shape=>({shape})))];}
function distance(p,s){return 'hx' in s?Math.hypot(Math.max(0,Math.abs(p.x-s.x)-s.hx),Math.max(0,Math.abs(p.z-s.z)-s.hz)):Math.hypot(p.x-s.x,p.z-s.z)-s.r;}
const pointSegment=(p,s)=>{const dx=s.bx-s.ax,dz=s.bz-s.az,t=clamp(((p.x-s.ax)*dx+(p.z-s.az)*dz)/(dx*dx+dz*dz||1),0,1);return {x:s.ax+dx*t,z:s.az+dz*t,t};};
function field(w){return {halfWidth:finite(w.halfWidth,18),top:finite(w.top,-20),door:finite(w.door,46.5),drain:finite(w.drain,50),gravity:finite(w.gravity,6)};}
export function spawnShadowWorkers(state,{now,duration=12,count=2,origin,velocity={},view='reverse',world={}}){
 if(!Number.isFinite(now)||!Number.isFinite(origin?.x)||!Number.isFinite(origin?.z)||!(duration>0))return [];
 const f=field(world),obstacles=solids(world,view),spawned=[];
 const safe=p=>Math.abs(p.x)<f.halfWidth-R-EPS&&p.z>f.top+R+EPS&&p.z<f.door-R&&obstacles.every(o=>distance(p,o.shape)>R+.1)&&(world.rails||[]).every(s=>{const q=pointSegment(p,s);return Math.hypot(p.x-q.x,p.z-q.z)>R+(s.r??.35)+.1;})&&state.workers.every(w=>Math.hypot(w.x-p.x,w.z-p.z)>R+w.r+.1);
 const limit=Math.max(0,Math.min(2-state.workers.length,Math.floor(finite(count,0))));
 for(let k=0;k<limit;k++){
  let p=null;const sign=k===0?-1:1;
  for(const radius of [1.6,2.3,3.2,4.5,6]){for(let j=0;j<16;j++){const angle=sign*Math.PI/2+j*Math.PI/8,candidate={x:origin.x+Math.sin(angle)*radius,z:origin.z-Math.cos(angle)*radius};if(safe(candidate)){p=candidate;break;}}if(p)break;}
  if(!p)break;
  const vx=finite(velocity.vx,0),vz=finite(velocity.vz,-20),speed=clamp(Math.hypot(vx,vz)||20,14,MAX_SPEED),a=Math.atan2(vz,vx)+sign*.28;
  const w={id:state.nextId++,...p,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,r:R,spawnedAt:now,expiresAt:now+Math.min(duration,12),contacts:{},dead:false};state.workers.push(w);spawned.push(w.id);
 }
 return spawned;
}
function capsuleHit(from,to,s,r){
 const dx=s.bx-s.ax,dz=s.bz-s.az,len=Math.hypot(dx,dz),radius=r+(s.r??s.radius??.35);
 if(len<1e-9)return sweepCircle(from,to,{x:s.ax,z:s.az,r:radius-r},r);
 const ux=dx/len,uz=dz/len,nx=-uz,nz=ux,toLocal=p=>({x:(p.x-s.ax)*ux+(p.z-s.az)*uz,z:(p.x-s.ax)*nx+(p.z-s.az)*nz});
 const a=toLocal(from),b=toLocal(to),h=sweepRect(a,b,{x:len/2,z:0,hx:len/2,hz:0},radius);
 if(!h)return null;return {...h,x:s.ax+h.x*ux+h.z*nx,z:s.az+h.x*uz+h.z*nz,nx:h.nx*ux+h.nz*nx,nz:h.nx*uz+h.nz*nz};
}
function normalizeFlippers(flippers){
 const entries=Array.isArray(flippers)?flippers:Object.entries(flippers||{}).map(([side,f])=>({...f,side}));
 return entries.filter(f=>Number.isFinite((f.segment||f).ax)).map(f=>({...f,...(f.segment||{}),r:f.r??f.radius??.4}));
}
function advance(w,dt,now,world,obstacles,flippers,events){
 const f=field(world);
 for(const [id,latch] of Object.entries(w.contacts))if(latch.inside){const matching=obstacles.filter(o=>o.station?.id===id);if(matching.every(o=>distance(w,o.shape)>w.r+EXIT_MARGIN))latch.inside=false;}
 w.vz+=f.gravity*dt;const damping=Math.exp(-.025*dt);w.vx*=damping;w.vz*=damping;
 const cap=()=>{const speed=Math.hypot(w.vx,w.vz);if(speed>MAX_SPEED){w.vx*=MAX_SPEED/speed;w.vz*=MAX_SPEED/speed;}};cap();
 let remaining=dt;
 for(let collision=0;collision<2&&remaining>1e-8;collision++){
  const from={x:w.x,z:w.z},to={x:w.x+w.vx*remaining,z:w.z+w.vz*remaining};let hit=null;
  const add=(h,meta={})=>{if(h&&(!hit||h.t<hit.t))hit={...h,...meta};};
  for(const o of obstacles)add('hx' in o.shape?sweepRect(from,to,o.shape,w.r):sweepCircle(from,to,o.shape,w.r),o);
  for(const rail of world.rails||[])add(capsuleHit(from,to,rail,w.r));
  for(const flipper of flippers)add(capsuleHit(from,to,flipper,w.r),{flipper});
  // Walls and the existing closed-door / side sill geometry, as swept planes.
  const plane=(axis,value,nx,nz,allowed=()=>true)=>{const delta=to[axis]-from[axis];if(delta*(axis==='x'?nx:nz)>=0)return;const t=(value-from[axis])/delta;if(t>=0&&t<=1){const p={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t};if(allowed(p))add({t,...p,nx,nz});}};
  plane('x',-f.halfWidth+w.r,1,0);plane('x',f.halfWidth-w.r,-1,0);plane('z',f.top+w.r,0,1);
  plane('z',f.door-w.r,0,-1,p=>world.gateClosed||Math.abs(p.x)>8.8);
  if(!hit){w.x=to.x;w.z=to.z;break;}
  w.x=hit.x+hit.nx*EPS;w.z=hit.z+hit.nz*EPS;
  const vn=w.vx*hit.nx+w.vz*hit.nz;if(vn<0){w.vx-=1.85*vn*hit.nx;w.vz-=1.85*vn*hit.nz;}
  if(hit.station){
   const s=hit.station,id=s.id,latch=w.contacts[id]||(w.contacts[id]={inside:false,lastHit:-Infinity});
   if(!latch.inside&&now-latch.lastHit>=.15){const points=Math.max(0,Math.round(finite(s.points,0)*.5));if(points)events.push({type:'shadowHit',id:w.id,stationId:id,points,x:w.x,z:w.z});w.vx+=hit.nx*finite(s.power,0)*.65;w.vz+=hit.nz*finite(s.power,0)*.65;latch.lastHit=now;}
   latch.inside=true;
  }
  if(hit.flipper?.rising){const q=pointSegment(w,hit.flipper),sign=hit.flipper.side==='right'?-1:1;w.vz=-38-8*q.t;w.vx=sign*(3+9*q.t);}
  cap();remaining*=1-hit.t;
 }
 // Collision budget exhausted: drop residual movement, never tunnel through a third solid.
 w.x=clamp(w.x,-f.halfWidth+w.r,f.halfWidth-w.r);w.z=Math.max(w.z,f.top+w.r);
 if(w.z>f.drain){w.dead=true;events.push({type:'shadowRemoved',id:w.id,reason:'drain'});}
}
export function stepShadowWorkers(state,{dt,now,world={},flippers=[],view='reverse'}){
 if(!(dt>0)||!Number.isFinite(dt)||!Number.isFinite(now))return [];
 const events=[],obstacles=solids(world,view),segments=normalizeFlippers(flippers);
 // Caller passes monotonic active-play time. Ignore long background catch-up deltas.
 state.accumulator=(state.accumulator||0)+Math.min(dt,.25);
 for(const w of state.workers)if(now>=w.expiresAt&&!w.dead){w.dead=true;events.push({type:'shadowRemoved',id:w.id,reason:'expired'});}
 let tick=now-state.accumulator;
 while(state.accumulator+1e-10>=STEP){
  tick+=STEP;
  const alpha=clamp((tick-(now-Math.min(dt,.25)))/Math.min(dt,.25),0,1);
  const current=segments.map(s=>{const p=s.previous?.segment||s.previous;if(!p)return s;const result={...s};for(const k of ['ax','az','bx','bz'])result[k]=finite(p[k],s[k])+(s[k]-finite(p[k],s[k]))*alpha;return result;});
  for(const w of state.workers)if(!w.dead)advance(w,STEP,tick,world,obstacles,current,events);
  state.accumulator=Math.max(0,state.accumulator-STEP);
 }
 state.workers=state.workers.filter(w=>!w.dead);return events;
}
