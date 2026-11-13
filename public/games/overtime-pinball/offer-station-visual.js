import {stationShapes} from './contact.js';
// One floor outline, no mutation of equipment materials or collision geometry.
export function createOfferStationVisual({T,office,stations,view}){
 const root=new T.Group();root.name='optional-work-target';root.visible=false;office.add(root);
 const material=new T.MeshBasicMaterial({color:0xffd96b,depthWrite:false,side:T.DoubleSide});
 const edges=[];for(let i=0;i<4;i++){const mesh=new T.Mesh(new T.BoxGeometry(1,.06,1),material);root.add(mesh);edges.push(mesh);}
 let last=null;
 function update(id){root.visible=!!id;if(!id)return;if(id===last)return;const o=stations.find(o=>o.id===id);if(!o){root.visible=false;return;}last=id;
  const shapes=stationShapes(o,view),xmin=Math.min(...shapes.map(s=>s.x-(s.hx??s.r))),xmax=Math.max(...shapes.map(s=>s.x+(s.hx??s.r))),zmin=Math.min(...shapes.map(s=>s.z-(s.hz??s.r))),zmax=Math.max(...shapes.map(s=>s.z+(s.hz??s.r)));
  const w=xmax-xmin+.5,h=zmax-zmin+.5,cx=-(xmin+xmax)/2,cz=(zmin+zmax)/2;
  edges.forEach((e,i)=>{const horizontal=i<2;e.scale.set(horizontal?w:.12,1,horizontal?.12:h);e.position.set(cx+(horizontal?0:(i===2?-1:1)*w/2),.13,cz+(horizontal?(i===0?-1:1)*h/2:0));});
 }
 return {root,update,dispose(){office.remove(root);edges.forEach(e=>e.geometry.dispose());material.dispose();}};
}
