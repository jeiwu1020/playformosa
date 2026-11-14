import {sweepRect} from './contact.js';
// One shared sampled centreline for physics and the visible inner-rim mail chute; local bridges share the same elevation.
export const MAIL={entryX:-7,entryZ:34,halfMouth:2.2,minSpeed:16,minUpstream:12,minTravelSpeed:32,maxTravelSpeed:40,mouthDepth:1.2,clearance:.7,rearmDistance:2,points:350,exit:{x:7,z:34,vx:-12,vz:-34}};
const controls=[[-7,34],[-12,35],[-16,33],[-16.4,28],[-16.4,-13],[-14,-18],[0,-19],[14,-18],[16.4,-13],[16.4,28],[16,33],[12,35],[7,34]];
const point=t=>{const f=t*(controls.length-1),n=Math.min(controls.length-2,Math.floor(f)),u=f-n,p0=controls[Math.max(0,n-1)],p1=controls[n],p2=controls[n+1],p3=controls[Math.min(controls.length-1,n+2)];return{x:cat(p0[0],p1[0],p2[0],p3[0],u),z:cat(p0[1],p1[1],p2[1],p3[1],u)};};
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Only the occupied side-furniture section is raised. Entry, upper fork and
// exits remain on the floor. Mirrors use the same height, never a visual fake.
export const mailHeight=z=>6.2*ease((34-z)/7)*ease((z-8)/9);
export const MAIL_PATH=Array.from({length:385},(_,n)=>{const p=point(n/384);return {...p,y:mailHeight(p.z)};});
export const MAIL_LENGTHS=[0];for(let n=1;n<MAIL_PATH.length;n++)MAIL_LENGTHS.push(MAIL_LENGTHS[n-1]+Math.hypot(MAIL_PATH[n].x-MAIL_PATH[n-1].x,MAIL_PATH[n].z-MAIL_PATH[n-1].z,MAIL_PATH[n].y-MAIL_PATH[n-1].y));
export const MAIL_LENGTH=MAIL_LENGTHS.at(-1);
// Acceleration starts on the straight; the rear curve always slows for readability.
export function mailPhase(distance,direction=1,entrySpeed=32){const p=distance/MAIL_LENGTH;
 if(p<.1)return{id:'intake',label:direction===1?'氣送收件':'快遞收件',speed:entrySpeed};
 if(p<.28)return{id:'outbound',label:direction===1?'氣送加速':'轉寄快線',speed:direction===1?54:44};
 if(p<.66)return{id:'bend',label:'上方轉運',speed:30};
 return{id:'return',label:direction===1?'急件噴出':'退件連發',speed:direction===1?52:p<.8?44:58};
}
export function mailPoint(distance){const d=Math.max(0,Math.min(MAIL_LENGTH,distance));let lo=1,hi=MAIL_PATH.length-1;while(lo<hi){const m=(lo+hi)>>1;if(MAIL_LENGTHS[m]<d)lo=m+1;else hi=m;}const a=MAIL_PATH[lo-1],b=MAIL_PATH[lo],length=MAIL_LENGTHS[lo]-MAIL_LENGTHS[lo-1],t=(d-MAIL_LENGTHS[lo-1])/length;return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,dy:(b.y-a.y)/length,dx:(b.x-a.x)/length,dz:(b.z-a.z)/length};}
export function mailEntry(from,to){if(from.z<MAIL.entryZ||to.z>=MAIL.entryZ||to.vz>-MAIL.minUpstream||Math.hypot(to.vx,to.vz)<MAIL.minSpeed)return null;const t=(MAIL.entryZ-from.z)/(to.z-from.z),x=from.x+(to.x-from.x)*t;for(const direction of [1,-1])if(Math.abs(x-MAIL.entryX*direction)<=MAIL.halfMouth)return{x,z:MAIL.entryZ,direction};return null;}
export const WORKFLOW={goals:['print','sign','mail'],points:1800,duration:6,cooldown:8,hitPoints:300,hits:3};
export const freshWorkflow=()=>({lights:[false,false,false],active:false,until:0,readyAt:0,hitsLeft:0,rounds:0});

export const freshMailLatch=()=>({blocked:false,direction:1,travel:0});
export function lockMailExit(latch,direction){Object.assign(latch,{blocked:true,direction,travel:0});}
const mouthShape=direction=>({x:MAIL.exit.x*direction,z:MAIL.entryZ,hx:MAIL.halfMouth,hz:MAIL.mouthDepth});
export function mailMouthContains(p,direction,radius=.65){return !!sweepRect(p,p,mouthShape(direction),radius+MAIL.clearance);}
export function advanceMailLatch(latch,from,to,radius=.65){
 if(!latch.blocked||!from||!to)return;
 const distance=Math.hypot(to.x-from.x,to.z-from.z);if(!Number.isFinite(distance))return;
 // Animation and teleport never call this. Only fully clear physical flight earns credit.
 if(sweepRect(from,to,mouthShape(latch.direction),radius+MAIL.clearance))latch.travel=0;else latch.travel+=distance;
 if(latch.travel>=MAIL.rearmDistance){latch.blocked=false;latch.travel=0;}
}
