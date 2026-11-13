import {lotteryEffects} from './lottery-events.js';
import {sweepRect,sweepCircle} from './contact.js';
// Same dimensions drive collision and visible office machinery.
export const ASSISTS={left:{x:-10.5,z:1.5,hx:1.15,hz:2.1,extension:4.2,inward:1,cooldown:.75},right:{x:10.5,z:1.5,hx:1.15,hz:2.1,extension:4.2,inward:-1,cooldown:.75},upperLeft:{x:-12.6,z:-8.8,hx:1.15,hz:1.7,extension:4.2,inward:1,inputSide:'left',cooldown:.65,kickX:30,kickZ:-24,upper:true},upperRight:{x:12.6,z:-8.8,hx:1.15,hz:1.7,extension:4.2,inward:-1,inputSide:'right',cooldown:.65,kickX:30,kickZ:-24,upper:true},center:{x:0,z:21,r:2.3,cooldown:.9}};
const DRAWERS=Object.keys(ASSISTS).filter(id=>id!=='center');
export const ASSIST_OBSTACLES=DRAWERS.map(id=>({...ASSISTS[id],id:'assist-'+id,type:'cabinet'}));
export const freshAssists=()=>Object.fromEntries(Object.keys(ASSISTS).map(id=>[id,{amount:0,previousAmount:0,age:99,nextReady:0,spent:false,aim:0}]));
export function retractAssists(g){for(const s of Object.values(g.assists)){s.amount=0;s.previousAmount=0;s.age=99;}}
export function updateAssists(g,dt,pressed){
 const raffle=g.lotteryEnabled?lotteryEffects(g.lottery,g.playClock):null;
 const l=g.flipperStroke.left>0,r=g.flipperStroke.right>0;
 for(const[id,s]of Object.entries(g.assists)){
  s.previousAmount=s.amount;
  const fresh=id==='center'?false:pressed[ASSISTS[id].inputSide||id];
  if(fresh&&g.time>=s.nextReady){s.age=0;s.spent=false;s.aim=l&&r?0:l?-1:1;s.nextReady=g.time+ASSISTS[id].cooldown;g.emit('assistStroke',{id});}
  s.age+=dt;const rise=id==='center'?.07:.08,hold=id==='center'?.08:.26*(raffle?.assistHoldMultiplier??1),fall=id==='center'?.16:.22;
  s.amount=s.age<rise?s.age/rise:s.age<rise+hold?1:Math.max(0,1-(s.age-rise-hold)/fall);
 }
}
export function assistColliders(states){return Object.entries(ASSISTS).flatMap(([id,o])=>{
 const amount=states[id].amount;if(id==='center')return [];
 const extension=o.extension*amount;return[{...o,id:'assist-'+id,assistId:id,type:'cabinet',x:o.x+o.inward*extension/2,hx:o.hx+extension/2}];
});}
// Solve expanding drawers at a shared time with the moving actor. The housing
// stays fixed; the inner face and its rounded corners move with the stroke.
export function firstAssistContact(from,to,states,radius){
 let first=null;const dx=to.x-from.x,dz=to.z-from.z;
 for(const id of DRAWERS){
  const o=ASSISTS[id],s=states[id],a=s.previousAmount??s.amount,b=s.amount,
   front0=o.x+o.inward*(o.hx+o.extension*a),front1=o.x+o.inward*(o.hx+o.extension*b),move=front1-front0,
   shapeAt=t=>({x:o.x+o.inward*o.extension*(a+(b-a)*t)/2,z:o.z,hx:o.hx+o.extension*(a+(b-a)*t)/2,hz:o.hz});
  const add=h=>{if(!h||h.t<0||h.t>1)return;const amount=a+(b-a)*h.t,shape=shapeAt(h.t),relative=(dx-move)*h.nx+dz*h.nz,hit={...h,shape,station:{...o,id:'assist-'+id,assistId:id,type:'cabinet'},impactAmount:amount,poweredContact:h.nx*o.inward>.7&&relative<0};if(!first||hit.t<first.t)first=hit;};
  // Existing overlaps and the permanent housing remain ordinary solid contacts.
  add(sweepRect(from,from,shapeAt(0),radius));
  add(sweepRect(from,to,{x:o.x,z:o.z,hx:o.hx,hz:o.hz},radius));
  const gap=(from.x-front0)*o.inward-radius,closing=(dx-move)*o.inward;
  if(gap>=0&&closing<0){const t=-gap/closing,z=from.z+dz*t;if(Math.abs(z-o.z)<=o.hz)add({t,x:from.x+dx*t,z,nx:o.inward,nz:0});}
  for(const sign of[-1,1]){
   if(dz*sign<0){const t=(o.z+sign*(o.hz+radius)-from.z)/dz,x=from.x+dx*t,front=front0+move*t,rear=o.x-o.inward*o.hx;if((x-rear)*o.inward>=0&&(front-x)*o.inward>=0)add({t,x,z:o.z+sign*(o.hz+radius),nx:0,nz:sign});}
   const cornerZ=o.z+sign*o.hz,h=sweepCircle({x:from.x-front0,z:from.z},{x:to.x-front1,z:to.z},{x:0,z:cornerZ,r:0},radius);
   if(h&&h.nx*o.inward>=0&&h.nz*sign>=0)add({...h,x:h.x+front0+move*h.t});
  }
 }
 return first;
}
export function resolveAssist(g,c){
 const id=c.station.assistId,s=g.assists[id],o=ASSISTS[id],b=g.ball;
 // Only the inward drawer face strikes; solid rear/side housing stays passive.
 if((c.impactAmount??s.amount)>.2&&!s.spent&&c.poweredContact!==false&&(id==='center'||c.nx*o.inward>.7)){
  s.spent=true;let vx=id==='center'?s.aim*18:o.inward*(o.kickX||32),vz=id==='center'?-32:(o.kickZ||-26);
  // The award strengthens an actual inward powered strike, never a key press
  // or passive rear/side collision. Center launcher retains its existing rule.
  const raffle=id!=='center'&&g.lotteryEnabled?lotteryEffects(g.lottery,g.playClock):null;
  if(raffle&&raffle.assistImpulseMultiplier>1){vx*=raffle.assistImpulseMultiplier;vz*=raffle.assistImpulseMultiplier;const speed=Math.hypot(vx,vz);if(speed>raffle.speedCap){vx*=raffle.speedCap/speed;vz*=raffle.speedCap/speed;}}
  if(id==='center'){const length=Math.hypot(vx,vz),radius=o.r+b.r+.01;b.x=o.x+vx/length*radius;b.z=o.z+vz/length*radius;}
  else{b.x=o.x+o.inward*(o.hx+o.extension*s.amount+b.r+.01);}
  b.vx=vx;b.vz=vz;g.hop=id==='center'?1.2:.45;const points=id==='center'?60:40;if(g.award)g.award('rescue',points);else g.bonus+=points;g.hits++;g.interactionReady=Math.max(g.interactionReady,g.time+.25);g.emit('assistKick',{id,vx,vz,points});
 }else{const vn=b.vx*c.nx+b.vz*c.nz;if(vn<0){b.vx-=1.8*vn*c.nx;b.vz-=1.8*vn*c.nz;}}
}
