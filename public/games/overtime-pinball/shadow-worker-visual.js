// Two pooled lightweight coworkers. No lights, shadow maps, textures, camera writes or game mutation.
export function createShadowWorkerVisuals({T,office}){
 const root=new T.Group();root.name='overtimeShadowWorkers';office.add(root);
 const cube=new T.BoxGeometry(1,1,1),head=new T.SphereGeometry(.32,8,6),ring=new T.RingGeometry(.55,.7,16);
 const colors=[0x68d8e1,0xc49bff],materials=[];
 for(let i=0;i<2;i++){
  const worker=new T.Group();worker.name='shadow-worker-'+i;worker.scale.setScalar(1.35);worker.visible=false;root.add(worker);
  const suit=new T.MeshBasicMaterial({color:colors[i]}),skin=new T.MeshBasicMaterial({color:0xffdfad}),ink=new T.MeshBasicMaterial({color:0x243b48}),glow=new T.MeshBasicMaterial({color:colors[i],side:T.DoubleSide});materials.push(suit,skin,ink,glow);
  function part(geometry,material,x,y,z,sx=1,sy=1,sz=1){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);worker.add(mesh);return mesh;}
  part(cube,suit,0,.9,0,.65,.68,.35);part(head,skin,0,1.51,0);part(cube,ink,0,1.72,.02,.55,.15,.4);
  for(const side of [-1,1]){part(cube,ink,side*.18,.34,0,.21,.62,.25);part(cube,suit,side*.47,.85,0,.18,.6,.22);}
  part(cube,skin,0,.9,-.205,.11,.47,.04);const halo=part(ring,glow,0,.035,0);halo.rotation.x=-Math.PI/2;
  worker.userData.halo=halo;
 }
 return {root,update(workers=[],now=0){const live=workers.filter(w=>!w.dead).slice(0,2);root.children.forEach((node,i)=>{const w=live[i];node.visible=!!w;if(!w)return;node.position.set(-w.x,0,w.z);node.rotation.y=Math.atan2(-(w.vx||0),w.vz||1);node.rotation.z=Math.sin(now*9+i)*.08;node.userData.halo.scale.setScalar(1+Math.sin(now*7+i)*.05);});},dispose(){office.remove(root);cube.dispose();head.dispose();ring.dispose();materials.forEach(m=>m.dispose());}};
}
