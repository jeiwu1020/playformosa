import {COMPANY_POINTS} from './company-design.js';
import {MAIL_PATH} from './mail-run.js';
import {MAIL_BRANCHES,SHORT_PATH} from './office-routes.js';
// Gameplay has one full-table pose. Only equipment work starts a finite close-up.
export const SLOPE=.035;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const controlSide=(side,view='reverse')=>view==='reverse'?(side==='left'?'right':'left'):side;
export function overviewPose(w,h,view='reverse'){const distance=w<h?112:82,sign=view==='reverse'?1:-1;return {position:[0,-.2+distance*.7,15+sign*distance],target:[0,-.2,15],fov:w<h?66:62};}
const world=(x,y,z)=>[x===0?0:-x,y*Math.cos(SLOPE)-z*Math.sin(SLOPE),y*Math.sin(SLOPE)+z*Math.cos(SLOPE)];
function fitDistance(points,target,w,h,pitch,sign,fov,mx=.91,my=.85){
 const length=Math.hypot(1,pitch),tan=Math.tan(fov*Math.PI/360),aspect=Math.max(.1,w/Math.max(1,h));let distance=1;
 for(const point of points){const p=world(...point),px=p[0]-target[0],py=p[1]-target[1],pz=p[2]-target[2],depth=Math.max(Math.abs(px)/(tan*aspect*mx),Math.abs(py-sign*pitch*pz)/(length*tan*my));distance=Math.max(distance,(depth+(pitch*py+sign*pz)/length)/length);}
 return distance;
}
// Bound real ground court, office and route/actor heights independently; no tall
// imaginary exterior-front corners that unnecessarily shrink the whole table.
const fullBounds=[...COMPANY_POINTS];
for(const [xs,zs,ys]of[[[-24.5,24.5],[-36,-15],[0]],[[-19,19],[-20,50.3],[0,7.5]],[[-18.8,18.8],[52.3],[2.2,6.05]]])
 for(const x of xs)for(const z of zs)for(const y of ys)fullBounds.push([x,y,z]);
for(const p of MAIL_PATH)for(const dx of [-1.8,1.8])for(const y of [0,5])fullBounds.push([p.x+dx,y+(p.y||0),p.z]);
// Keep both outer lanes visible in portrait; larger distinct machines replace duplicates.
const criticalBounds=[];
for(const x of[-17.6,17.6])for(const z of[-20,49])for(const y of[0,4.8])criticalBounds.push([x,y,z]);
for(const p of MAIL_PATH)for(const dx of[-.85,.85])for(const y of[.3,4.8])criticalBounds.push([p.x+dx,y+(p.y||0),p.z]);
// Mobile gameplay excludes only decorative forecourt/sign. Actual court, all
// rail samples plus actor envelopes remain in the fit; physics are unchanged.
const mobileBounds=[];
for(const [xs,zs,ys]of[[[-18.8,18.8],[-20,50.3],[0,5]],[[-18.8,18.8],[52.3],[2.2,6.05]]])
 for(const x of xs)for(const z of zs)for(const y of ys)mobileBounds.push([x,y,z]);
for(const path of [MAIL_PATH,SHORT_PATH,...Object.values(MAIL_BRANCHES).map(b=>b.path)])for(const p of path)for(const dx of [-1.8,1.8])for(const y of [0,5])mobileBounds.push([p.x+dx,y+(p.y||0),p.z]);
function fullTableFit(w,h,pitch,sign,fov,top=0,bottom=0,portrait=false,compact=false){
 const length=Math.hypot(1,pitch),tan=Math.tan(fov*Math.PI/360),highY=tan*(.97-2*top/h),lowY=tan*(-.97+2*bottom/h),kx=tan*w/Math.max(1,h)*(portrait?1.02:.94);
 const points=(compact?mobileBounds:fullBounds).map(p=>{const[x,y,z]=world(...p);return{x,a:(pitch*y+sign*z)/length,b:(y-sign*pitch*z)/length};});
 // Camera depth must satisfy horizontal bounds and a nonempty vertical interval.
 const lower=Math.max(...points.map(p=>p.b+highY*p.a)),upper=Math.min(...points.map(p=>p.b+lowY*p.a));
 const depth=Math.max((lower-upper)/(highY-lowY),...points.map(p=>p.a+Math.abs(p.x)/kx),...criticalBounds.map(p=>{const[x,y,z]=world(...p);return (pitch*y+sign*z)/length+Math.abs(x)/(tan*w/h*.98);}));
 // Anchor the lowest real geometry above the home indicator. Controls overlay
 // this region; their height must not shrink or lift the board.
 const vertical=upper-lowY*depth;
 const center=(Math.max(...points.map(p=>p.a))+Math.min(...points.map(p=>p.a)))/2;
 return{x:0,y:(vertical+center*pitch)/length,z:sign*(-pitch*vertical+center)/length,distance:(depth-center)/length,close:0};
}
const ease=t=>t*t*t*(t*(t*6-15)+10);
export class StableRig{
 constructor(view='reverse'){this.view=view;this.reset();}
 reset(){this.key=null;this.mode='full';this.motion=null;this.x=0;this.z=9.5;this.y=0;this.distance=null;this.gate=false;this.close=0;}
 update(dt,w,h,ball,interaction=null,station=null,comfort=false,fitFrame=false){
  const portrait=fitFrame?.portrait??(w<h),pitch=portrait?1.35:clamp(1.35/(w/h),.45,.85),fov=portrait?32:38,sign=this.view==='reverse'?1:-1,top=Number.isFinite(fitFrame?.cameraTop)?Math.max(0,fitFrame.cameraTop):portrait&&fitFrame?.safeTop!==undefined?100+(fitFrame?.safeTop||0):0,bottom=4+(fitFrame?.safeBottom||0),key=`${w}:${h}:${portrait}:${pitch}:${comfort}:${top}:${bottom}:${!!fitFrame?.compact}`;
  if(!interaction&&!fitFrame?.mail){if(ball.z+Math.max(0,ball.vz||0)*.4>=20)this.gate=true;else if(ball.z<12)this.gate=false;}
  if(this.key!==key){
   this.key=key;this.full=fullTableFit(w,h,pitch,sign,fov,top,bottom,portrait,!!fitFrame?.compact);
   Object.assign(this,this.full);this.mode='full';this.motion=null;
  }
  // The resolved-result launch animation gives half a second to reopen the table
  // before physics releases the person. Mail/gate/ball never change this target.
  const close=!!interaction&&!!station&&interaction.stage!=='launch',mode=close?`station:${station.id}`:'full';
  if(mode!==this.mode){
   let to=this.full;
   if(close){const dock=interaction.dock,target=world((dock.x+station.x)/2,2.2,(dock.z+station.z)/2),points=[],r=station.r+2.6;
    for(const x of[station.x-r,station.x+r])for(const z of[station.z-r,station.z+r])for(const y of[0,7])points.push([x,y,z]);
    for(const p of[dock,interaction.from].filter(Boolean))for(const x of[p.x-1.5,p.x+1.5])for(const z of[p.z-1.5,p.z+1.5])for(const y of[0,5])points.push([x,y,z]);
    to={x:target[0],y:target[1],z:target[2],distance:Math.max(12,fitDistance(points,target,w,h,pitch,sign,fov,.85,.83),this.full.distance*(comfort?.58:.22)),close:1};
   }
   this.motion={from:{x:this.x,y:this.y,z:this.z,distance:this.distance,close:this.close},to,elapsed:0,duration:close?(comfort?1.4:1.2):.5};this.mode=mode;
  }
  if(this.motion){const m=this.motion;m.elapsed=Math.min(m.duration,m.elapsed+Math.max(0,dt));const t=ease(m.elapsed/m.duration);for(const k of['x','y','z','distance','close'])this[k]=m.from[k]+(m.to[k]-m.from[k])*t;if(m.elapsed>=m.duration){Object.assign(this,m.to);this.motion=null;}}
  return {position:[this.x,this.y+this.distance*pitch,this.z+sign*this.distance],target:[this.x,this.y,this.z],fov};
 }
}
