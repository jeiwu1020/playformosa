const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const link=(p,l,a)=>({x:p.x+l*Math.cos(a),y:p.y+l*Math.sin(a)});
function chain(root,target,l1,l2,bend){const dx=target.x-root.x,dy=target.y-root.y,d=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+1e-6,l1+l2-1e-6),a=Math.atan2(dy,dx),off=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));return[link(root,l1,a+bend*off),link(root,d,a)];}
function arm3(root,target){const dx=target.x-root.x,dy=target.y-root.y,dz=target.z-root.z,d=clamp(Math.hypot(dx,dy,dz),.020001,.659999),n={x:dx/Math.hypot(dx,dy,dz),y:dy/Math.hypot(dx,dy,dz),z:dz/Math.hypot(dx,dy,dz)},along=(.34**2+d*d-.32**2)/(2*d),off=Math.sqrt(Math.max(0,.34**2-along**2)),flat=Math.hypot(n.x,n.z)||1,up={x:-n.y*n.x/flat,y:flat,z:-n.y*n.z/flat};return[{x:root.x+n.x*along-up.x*off,y:root.y+n.y*along-up.y*off,z:root.z+n.z*along-up.z*off},{x:root.x+n.x*d,y:root.y+n.y*d,z:root.z+n.z*d}];}
export function createDiscusPose(s){const j=s.j||[0,0,0,0],lean=s.lean||0,hip={x:Math.sin(lean)*.15,y:1-.26*Math.max(j[0],j[1]),z:0};const points={hip,shoulder:{x:hip.x+Math.sin(lean)*.65,y:hip.y+Math.cos(lean)*.65},head:{x:hip.x+Math.sin(lean)*1.01,y:hip.y+Math.cos(lean)*1.01}};
 // Local +X is forward; both knees bend forward, never mirrored backwards.
 for(let i=0;i<2;i++){const z=i===0?.205:-.205,root={...hip,z},target={x:i===0?.18:-.18,y:.12+(s.footLift?.[i]??(s.support===i?0:Math.max(0,j[i]-.06)*.25))};points['hip'+i]=root;[points['knee'+i],points['foot'+i]]=chain(root,target,.55,.55,1);points['knee'+i].z=z;points['foot'+i].z=z;}
 const shoulder=points.shoulder;
 const committed=['cast','flight','done'].includes(s.phase),windup=committed?(s.castStartCharge??j[3]):j[3];let sweep=.15+2*windup;
 if(s.phase==='cast'){const u=Math.min(1,(s.castTime||0)/.22),t=u*u;sweep+=(-sweep+.15)*t;}
 if(['flight','done'].includes(s.phase)){const speed=4*windup/.22;sweep=.15-1.1*(1-Math.exp(-(s.flightTime||0)*speed/1.1));}
 const castU=s.phase==='cast'?Math.min(1,(s.castTime||0)/.22):(['flight','done'].includes(s.phase)?1:0);
 const twist=.38*windup*(1-castU*castU);
 for(let i=0;i<2;i++){const z=i===0?.205:-.205;points['shoulder'+i]={x:shoulder.x+z*Math.sin(twist),y:shoulder.y,z:z*Math.cos(twist)};}
 const rightRoot=points.shoulder0,leftRoot=points.shoulder1;
 const reach=windup+(1-windup)*castU*castU,radius=.36+.24*reach;
 const right={x:rightRoot.x+radius*Math.cos(sweep),y:rightRoot.y-.48+.62*reach,z:rightRoot.z+radius*Math.sin(sweep)};
 const left={x:leftRoot.x+.16+.12*j[2],y:leftRoot.y-.48+.45*j[2],z:leftRoot.z-.08-.45*j[2]};
 [points.elbow0,points.hand0]=arm3(rightRoot,right);
 [points.elbow1,points.hand1]=arm3(leftRoot,left);
 points.shoulder.z=0;points.head.z=0;
 if(['flight','done'].includes(s.phase)){
 if(['backward','unstable'].includes(s.reason)){const u=Math.min(1,Math.max(0,((s.flightTime||0)-.2)/.6)),t=u*u*(3-2*u),angle=-1.05*t,c=Math.cos(angle),sn=Math.sin(angle),pivot={...hip};for(const p of Object.values(points)){const x=p.x-pivot.x,y=p.y-pivot.y;p.x=pivot.x+x*c-y*sn;p.y=pivot.y+x*sn+y*c;}const floor=Math.min(...Object.entries(points).map(([k,v])=>v.y-(k==='head'?.32:k==='hip'?.23:.12)));for(const p of Object.values(points))p.y-=floor;}}
 return{points,lean,twist,yaw:s.yaw??-Math.PI/2,originX:s.originX||0,originZ:s.originZ||0};}
export function worldPosePoint(pose,key,index=0){const p=pose.points[key],z=p.z??(index===0?.205:-.205),c=Math.cos(pose.yaw),sn=Math.sin(pose.yaw);return{x:pose.originX+p.x*c+z*sn,y:p.y,z:pose.originZ-p.x*sn+z*c};}
export function anchorBody(s){const p=createDiscusPose(s),local=worldPosePoint({...p,originX:0,originZ:0},'foot'+s.support,s.support);s.originX=s.anchor.x-local.x;s.originZ=s.anchor.z-local.z;}
export function releaseGeometry(s){const p=createDiscusPose(s),hand=worldPosePoint(p,'hand0'),support=worldPosePoint(p,'foot'+s.support,s.support),shoulder=worldPosePoint(p,'shoulder');const rx=hand.x-support.x,rz=hand.z-support.z,r=Math.hypot(rx,rz)||1;const tx=rz/r,tz=-rx/r;const elevation=clamp(Math.atan2(hand.y-shoulder.y+.22,.62)+s.lean*.5+(1-Math.max(...s.j.slice(0,2)))*.08,-.35,1.35);return{hand,direction:Math.atan2(tz,tx),elevation};}
