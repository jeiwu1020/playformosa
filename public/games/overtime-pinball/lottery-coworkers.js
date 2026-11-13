/** Decorative employees baked from the actual character factory, never physics workers.
 * Every provided station gets a coworker; no silent population cap.
 * Two pose frames, one body + one face draw per visible employee.
 */
export function createLotteryCoworkers({T,scene,createCharacter,poseCharacter,placements=[],mapX=x=>x}){
 const root=new T.Group();root.name='lotteryDecorativeCoworkers';root.visible=false;scene.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set();const shirts=[0x91c8b4,0xf4d274,0x98bdd9,0xe8a6b4,0xc6b4df,0xfff1cf,0xe5bc86,0x80b8b7,0xc9d98b,0xcc9a88,0xa4aed5,0xdcbfce];
 function bake(actor){
  actor.updateMatrixWorld(true);const positions=[],normals=[],colors=[];let face=null;
  actor.traverse(m=>{
   if(!m.isMesh||m.material.side===T.BackSide)return;for(let a=m;a;a=a.parent)if(!a.visible)return;
   const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
   if(m.material.map){face={geometry:g,texture:m.material.map};geometries.add(g);textures.add(m.material.map);return;}
   const p=g.getAttribute('position'),n=g.getAttribute('normal'),c=m.material.color;
   for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));colors.push(c.r,c.g,c.b);}g.dispose();
  });
  const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(positions,3));body.setAttribute('normal',new T.Float32BufferAttribute(normals,3));body.setAttribute('color',new T.Float32BufferAttribute(colors,3));body.computeBoundingSphere();geometries.add(body);return {body,face};
 }
 placements.forEach((p,i)=>{
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z))throw new TypeError('coworker placement requires finite physics coordinates');
  const node=new T.Group();node.position.set(mapX(p.x),p.y??1.4,p.z);node.rotation.y=p.rotation??Math.PI;node.userData={decorativeOnly:true,stationId:p.stationId,activity:p.activity||'busy',baseY:p.y??1.4,baseRotation:p.rotation??Math.PI};root.add(node);
  const actor=createCharacter(false),sourceG=new Set(),sourceM=new Set();
  actor.traverse(m=>{
   if(!m.isMesh)return;sourceG.add(m.geometry);
   if(m.material.side===T.BackSide)return;
   sourceM.add(m.material);if(m.material.color?.getHex()===0xfff1cf)m.material.color.setHex(shirts[i%shirts.length]);
   // Keep the real character's part sizes, joints, face and props, but not the
   // player's close-up tessellation for twelve distant decorative coworkers.
   // Never mutate the factory's geometry: outlines may share its original.
   const p=m.geometry.parameters||{};let low=null;
   if(m.geometry.type==='SphereGeometry')low=new T.SphereGeometry(p.radius,8,6,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);
   else if(m.geometry.type==='CapsuleGeometry')low=new T.CapsuleGeometry(p.radius,p.length,2,6);
   else if(m.geometry.type==='TorusGeometry')low=new T.TorusGeometry(p.radius,p.tube,4,12,p.arc);
   else if(m.geometry.type==='CylinderGeometry')low=new T.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,8,p.heightSegments,p.openEnded,p.thetaStart,p.thetaLength);
   if(low){m.geometry=low;sourceG.add(low);}
  });
  const bodyMaterial=new T.MeshToonMaterial({vertexColors:true});materials.add(bodyMaterial);let faceMaterial;
  for(let frame=0;frame<2;frame++){
   poseCharacter(actor,{activity:node.userData.activity,time:frame*.22,progress:.6});const baked=bake(actor);const group=new T.Group();group.visible=frame===0;node.add(group);group.add(new T.Mesh(baked.body,bodyMaterial));
   if(baked.face){if(!faceMaterial){faceMaterial=new T.MeshBasicMaterial({map:baked.face.texture,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true});materials.add(faceMaterial);}group.add(new T.Mesh(baked.face.geometry,faceMaterial));}
  }
  if(p.stoolScale){const scale=p.stoolScale,geometry=new T.BoxGeometry(1,1,1),material=new T.MeshToonMaterial({color:0x387b78}),dummy=new T.Object3D();geometries.add(geometry);materials.add(material);
   for(const group of node.children){const stool=new T.InstancedMesh(geometry,material,5);stool.name='coworker-seat';group.add(stool);const parts=[[0,-.5528-.075*scale,.32,1.15*scale,.15*scale,1.1*scale],...[-.42,.42].flatMap(x=>[-.4,.4].map(z=>[x*scale,.85*scale-p.y,.32+z*scale,.1*scale,1.7*scale,.1*scale]))];parts.forEach((v,k)=>{dummy.position.set(v[0],v[1],v[2]);dummy.scale.set(v[3],v[4],v[5]);dummy.updateMatrix();stool.setMatrixAt(k,dummy.matrix);});stool.instanceMatrix.needsUpdate=true;}
  }
  sourceG.forEach(g=>g.dispose());sourceM.forEach(m=>m.dispose());
 });
 let disposed=false;
 return {root,update(active,now){
  if(disposed)return;root.visible=!!active;if(!active)return;
  root.children.forEach((n,i)=>{const frame=Math.floor(now*4+i*.5)%2;n.children.forEach((g,k)=>g.visible=k===frame);/* World roots stay anchored: pose frames animate hands/body, not feet into floor or chair. */});
 },dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},stats(){return {employees:root.children.length,activeDrawCalls:root.children.reduce((n,c)=>n+c.children[0].children.length,0),poseTriangles:[...geometries].reduce((v,g)=>v+g.getAttribute('position').count/3,0)};}};
}
