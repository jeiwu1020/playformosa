// Planar equipment footprint: core plus the copier's protruding paper tray.
import {stageYaw} from './activities.js';
export function stationShapes(o,view='reverse'){
 if(o.type==='cabinet')return [{x:o.x,z:o.z,hx:o.hx,hz:o.hz}];
 const shapes=[{x:o.x,z:o.z,r:o.r}];
 if(o.type==='copier'){const yaw=stageYaw(view),front=-2.55*(o.visualScale||1);shapes.push({x:o.x-Math.sin(yaw)*front,z:o.z+Math.cos(yaw)*front,r:.95*(o.visualScale||1)});}
 return shapes;
}
export function sweepCircle(from,to,shape,radius){
 const x=from.x-shape.x,z=from.z-shape.z,dx=to.x-from.x,dz=to.z-from.z,r=shape.r+radius,c=x*x+z*z-r*r;
 let t=0;if(c>0){const a=dx*dx+dz*dz,b=x*dx+z*dz,disc=b*b-a*c;if(a<1e-12||b>=0||disc<0)return null;t=(-b-Math.sqrt(disc))/a;if(t<0||t>1)return null;}
 const px=x+dx*t,pz=z+dz*t,d=Math.hypot(px,pz);const nx=d>1e-8?px/d:1,nz=d>1e-8?pz/d:0;return {t,nx,nz,x:shape.x+nx*r,z:shape.z+nz*r,shape};
}
export function firstStationContact(from,to,stations,view,radius){let first=null;for(const station of stations)for(const shape of stationShapes(station,view)){const hit=shape.hx?sweepRect(from,to,shape,radius):sweepCircle(from,to,shape,radius);if(hit&&(!first||hit.t<first.t))first={...hit,station};}return first;}
export function dockingPoint(i,o,t){
 const from=i.from,dock=i.dock;
 if(!i.automatic){const e=t*t*(3-2*t);return{x:from.x+(dock.x-from.x)*e,z:from.z+(dock.z-from.z)*e};}
 const start=Math.atan2(from.z-o.z,from.x-o.x),end=Math.hypot(dock.x-o.x,dock.z-o.z)<.1?start:Math.atan2(dock.z-o.z,dock.x-o.x),delta=i.approach?.delta??Math.atan2(Math.sin(end-start),Math.cos(end-start)),outer=i.approach?.outer??Math.max(o.r+1.5,o.type==='copier'?4.25:0),initial=Math.hypot(from.x-o.x,from.z-o.z),final=Math.hypot(dock.x-o.x,dock.z-o.z),ease=v=>v*v*(3-2*v);
 const turn=i.approach?.turn||0,lead=start+delta*turn;
 let angle=start,radius=outer;if(turn&&t<.2){angle=start+delta*turn*ease(t/.2);radius=initial;}else if(turn&&t<.4){angle=lead;radius=initial+(outer-initial)*ease((t-.2)/.2);}else if(turn&&t<.8)angle=lead+delta*(1-turn)*ease((t-.4)/.4);else if(t<.2)radius=initial+(outer-initial)*ease(t/.2);else if(t<.8)angle=start+delta*ease((t-.2)/.6);else{angle=end;radius=outer+(final-outer)*ease((t-.8)/.2);}return{x:o.x+Math.cos(angle)*radius,z:o.z+Math.sin(angle)*radius};
}

export function sweepRect(from,to,s,r){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lx=from.x-s.x,lz=from.z-s.z,qx=clamp(lx,-s.hx,s.hx),qz=clamp(lz,-s.hz,s.hz),ex=lx-qx,ez=lz-qz,d=Math.hypot(ex,ez),dx=to.x-from.x,dz=to.z-from.z;
 if(d<=r){let nx,nz,x,z;if(d>1e-8){nx=ex/d;nz=ez/d;x=s.x+qx+nx*r;z=s.z+qz+nz*r;}else if(s.hx-Math.abs(lx)<s.hz-Math.abs(lz)){nx=lx<0?-1:1;nz=0;x=s.x+nx*(s.hx+r);z=from.z;}else{nx=0;nz=lz<0?-1:1;x=from.x;z=s.z+nz*(s.hz+r);}return{t:0,nx,nz,x,z,shape:s};}
 let best=null;const add=h=>{if(h&&h.t>=0&&h.t<=1&&(!best||h.t<best.t))best=h;};
 for(const sign of [-1,1]){if(dx*sign<0){const t=(s.x+sign*(s.hx+r)-from.x)/dx,z=from.z+dz*t;if(Math.abs(z-s.z)<=s.hz)add({t,x:s.x+sign*(s.hx+r),z,nx:sign,nz:0,shape:s});}if(dz*sign<0){const t=(s.z+sign*(s.hz+r)-from.z)/dz,x=from.x+dx*t;if(Math.abs(x-s.x)<=s.hx)add({t,x,z:s.z+sign*(s.hz+r),nx:0,nz:sign,shape:s});}}
 for(const sx of [-1,1])for(const sz of [-1,1]){const h=sweepCircle(from,to,{x:s.x+sx*s.hx,z:s.z+sz*s.hz,r:0},r);if(h&&(h.x-s.x)*sx>=s.hx&&(h.z-s.z)*sz>=s.hz)add({...h,shape:s});}return best;
}
export function planApproach(i,o,view,obstacles){
 const a=Math.atan2(i.from.z-o.z,i.from.x-o.x),b=Math.hypot(i.dock.x-o.x,i.dock.z-o.z)<.1?a:Math.atan2(i.dock.z-o.z,i.dock.x-o.x),short=Math.atan2(Math.sin(b-a),Math.cos(b-a)),choices=[short,short+(short<=0?2:-2)*Math.PI];let best=null;
 const shapes=obstacles.filter(other=>other.id!==o.id).flatMap(other=>stationShapes(other,view));
 const score=(outer,delta,turn=0)=>{const candidate={outer,delta,turn},route={...i,approach:candidate};let blocked=0,previous=i.from;
  // Sweep between samples as well as checking points: a narrow cabinet corner must not fall between checks.
  for(let n=1;n<=60;n++){const p=dockingPoint(route,o,n/60);if(Math.abs(p.x)>17.2||p.z<-19.2)blocked+=5;for(const s of shapes)if(s.hx?sweepRect(previous,p,s,.65):sweepCircle(previous,p,s,.65))blocked++;previous=p;}
  const cost=blocked*100+Math.abs(delta)+Math.abs(outer-o.r-1.5)*.1+turn*.1;if(!best||cost<best.cost)best={...candidate,cost,blocked};
 };
 const radii=[Math.max(o.r+1.5,o.type==='copier'?4.25:0),Math.max(o.r+.85,o.type==='copier'?4.25:0)];
 for(const outer of radii)for(const delta of choices)score(outer,delta);
 // A contact beside a cabinet may have no room to move radially outward. Turn along the contact radius first.
 if(best.blocked){for(const outer of radii)for(const delta of choices)for(const turn of [.25,.5,.75,1])score(outer,delta,turn);}
 return best;
}
