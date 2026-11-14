// Cache static device envelopes once; project with the actual current camera.
export function createTabletCueProjection(T,{office,stations,camera,frame,height}){
 let corners;
 return()=>{if(!corners){office.updateWorldMatrix(true,true);corners=[];for(const group of Object.values(stations)){const b=new T.Box3().setFromObject(group);if(b.isEmpty())continue;b.max.y+=1;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])corners.push(new T.Vector3(x,y,z));}}
 const f=frame(),H=height(),axis=office.localToWorld(new T.Vector3(0,0,15)).project(camera);let top=Infinity;for(const p of corners){const q=p.clone().project(camera);if(q.z>=-1&&q.z<=1)top=Math.min(top,H-f.y-(q.y+1)*f.h/2);}return{centerX:f.x+(axis.x+1)*f.w/2,top};};
}
