// Small shared construction vocabulary; visible details are batched into vertex-colour meshes.
export function createArt(THREE){
 const shapes={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,10,6),cone:new THREE.ConeGeometry(1,1,8),cylinder:new THREE.CylinderGeometry(1,1,1,12),pyramid:new THREE.ConeGeometry(1,1,4),flare:new THREE.CylinderGeometry(1,.72,1,4),ring:new THREE.TorusGeometry(1,.08,6,24),arch:new THREE.TorusGeometry(1,.16,5,16,Math.PI),shell:new THREE.SphereGeometry(1,12,8,0,Math.PI,0,Math.PI*.58)};
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.87,side:THREE.DoubleSide});
 function part(list,shape,color,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){list.push({shape,color,x,y,z,sx,sy,sz,rx,ry,rz});}
 function batch(parts,name){const positions=[],normals=[],colors=[],p=new THREE.Vector3(),n=new THREE.Vector3(),mat=new THREE.Matrix4(),normal=new THREE.Matrix3(),q=new THREE.Quaternion(),color=new THREE.Color();
  for(const a of parts){const g=shapes[a.shape];mat.compose(new THREE.Vector3(a.x,a.y,a.z),q.setFromEuler(new THREE.Euler(a.rx,a.ry,a.rz)),new THREE.Vector3(a.sx,a.sy,a.sz));normal.getNormalMatrix(mat);color.set(a.color);const pos=g.attributes.position,nor=g.attributes.normal,indices=g.index?.array;for(let j=0;j<(indices?.length??pos.count);j++){const i=indices?indices[j]:j;p.fromBufferAttribute(pos,i).applyMatrix4(mat);n.fromBufferAttribute(nor,i).applyNormalMatrix(normal);positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);colors.push(color.r,color.g,color.b);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;return mesh;
 }
 return{part,batch,material,dispose(){Object.values(shapes).forEach(g=>g.dispose());material.dispose();}};
}
