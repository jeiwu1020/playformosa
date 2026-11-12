// Shared world definitions: scene units, not metres. Rescue geometry remains in physics.js.
export const WINDOWS=[-1,1].flatMap(side=>[-6,12,26].map((z,n)=>({id:`window-${side}-${n}`,side,z,halfLength:3.5,points:20})));
export const LAMPS=[{id:'admin',label:'行政',x:-4,z:8,r:2.4},{id:'pantry',label:'茶水',x:4,z:16,r:2.4},{id:'meeting',label:'會議',x:0,z:38,r:2.4}];
export const BONUS={points:1500,duration:4,cooldown:10};
export function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);}
// Solid side furniture uses the same positions for rendering and collision.
export const SOLID_PROPS=[[-16,-11],[16,-11],[-16,27],[16,27]].map(([x,z],n)=>({id:`plant-${n}`,type:'plant',x,z,r:.75,label:'盆栽也不准下班'}));
