import {createCharacter,poseCharacter} from './character.js';

// Bake the actual worker's flying pose once. Both coworkers retain its face,
// glasses, clothes and proportions without duplicating its articulated draw calls.
function bakeWorker(T){
 const actor=createCharacter();poseCharacter(actor,{activity:'flight',time:0});actor.updateMatrixWorld(true);
 const positions=[],normals=[],colors=[],ownedGeometry=new Set(),ownedMaterials=new Set();let faceGeometry,faceTexture;
 actor.traverse(mesh=>{
  if(!mesh.isMesh)return;
  ownedGeometry.add(mesh.geometry);
  // character.js deliberately shares its outline material with the real player.
  if(mesh.material.side===T.BackSide)return;
  ownedMaterials.add(mesh.material);
  for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
  if(mesh.material.map){faceGeometry=geometry;faceTexture=mesh.material.map;return;}
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),c=mesh.material.color;
  for(let i=0;i<p.count;i++){
   positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);
  }
  geometry.dispose();
 });
 const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(positions,3));body.setAttribute('normal',new T.Float32BufferAttribute(normals,3));body.setAttribute('color',new T.Float32BufferAttribute(colors,3));body.computeBoundingSphere();
 ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());
 return {body,faceGeometry,faceTexture};
}

export function createShadowWorkerVisuals({T,office}){
 const root=new T.Group();root.name='overtimeShadowWorkers';office.add(root);
 const baked=bakeWorker(T),materials=[],tints=[0xb5f2f5,0xdcc8ff];let disposed=false;
 for(let i=0;i<2;i++){
  const worker=new T.Group();worker.name='shadow-worker-'+i;worker.visible=false;root.add(worker);
  const bodyMaterial=new T.MeshToonMaterial({color:tints[i],vertexColors:true,transparent:true,opacity:.82,depthWrite:true});
  const faceMaterial=new T.MeshBasicMaterial({map:baked.faceTexture,color:0xffffff,transparent:true,opacity:.96,depthWrite:false,side:T.DoubleSide});materials.push(bodyMaterial,faceMaterial);
  const body=new T.Mesh(baked.body,bodyMaterial);body.name='shadow-worker-body';worker.add(body);
  const face=new T.Mesh(baked.faceGeometry,faceMaterial);face.name='shadow-worker-face';worker.add(face);
 }
 return {root,update(workers=[],now=0){
  if(disposed)return;
  const live=workers.filter(w=>!w.dead).slice(0,2);
  root.children.forEach((node,i)=>{
   const w=live[i];node.visible=!!w;if(!w)return;
   node.position.set(-w.x,1.34,w.z);
   const moving=Math.hypot(w.vx||0,w.vz||0)>.001;
   node.rotation.set(Math.sin(now*4+i)*.12,moving?Math.atan2(-(w.vx||0),w.vz||0)+Math.PI:Math.PI,Math.sin(now*6+i)*.12);
  });
 },dispose(){
  if(disposed)return;disposed=true;office.remove(root);
  baked.body.dispose();baked.faceGeometry.dispose();baked.faceTexture.dispose();materials.forEach(m=>m.dispose());
 }};
}
