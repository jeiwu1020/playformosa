// Decorative landmarks only. Route collision volumes and flight boosts live in wind.mjs.
export function createWindModels(THREE,parent,mat){
 const models=[],warmGeometry=new THREE.ConeGeometry(.14,.38,5),coolGeometry=new THREE.ConeGeometry(.09,.22,5);
 for(const id of ['ac','thermal','fan','glide','water','relay-1','relay-2']){const kind=id.startsWith('relay-')?'thermal':id;
  const group=new THREE.Group();group.name='wind-'+id;parent.add(group);const airGroup=new THREE.Group();airGroup.name='air-'+id;parent.add(airGroup);const rotors=[],air=[];
  function mesh(name,g,c,x=0,y=0,z=0){const m=new THREE.Mesh(g,mat(c));m.name=name;m.position.set(x,y,z);group.add(m);return m;}
  const box=(name,x,y,z,w,h,d,c)=>mesh(name,new THREE.BoxGeometry(w,h,d),c,x,y,z);
  // The visible intake faces the throwing-side camera; exhaust flows along +X.
  function fan(name,x,y,z,r){const rotor=new THREE.Group();rotor.name=name+'-rotor';rotor.position.set(x,y,z);group.add(rotor);rotors.push(rotor);for(let i=0;i<4;i++){const arm=new THREE.Group();arm.rotation.x=i*Math.PI/2;const blade=new THREE.Mesh(new THREE.BoxGeometry(.10,r*.66,r*.24),mat('#ed9851'));blade.position.y=r*.40;blade.rotation.x=.35;arm.add(blade);rotor.add(arm);}const hub=mesh(name+'-hub',new THREE.SphereGeometry(r*.18,10,6),'#506967',x-.06,y,z);for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,p=new THREE.Vector3(x-.12,y+Math.cos(a)*r,z+Math.sin(a)*r),q=new THREE.Vector3(x-.12,y+Math.cos(b)*r,z+Math.sin(b)*r),rim=mesh(name+'-cage',new THREE.CylinderGeometry(.045,.045,p.distanceTo(q),6),'#496b68');rim.position.copy(p).add(q).multiplyScalar(.5);rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());}return hub;}
  if(kind==='ac'){
   box('ac-feet',0,.10,0,1.2,.20,.85,'#4f6965');box('ac-housing',0,.70,0,1.35,1.05,1.12,'#e7e8d8');
   box('ac-front',-.69,.72,0,.035,.88,.98,'#aebeb4');fan('ac',-.73,.73,0,.40);
   for(let i=0;i<5;i++)box('ac-side-grille',-.25,.42+i*.12,.57,.7,.035,.035,'#637d76');
   box('ac-top-seam',0,1.24,0,1.40,.06,1.16,'#b8c6bc');
  }
  if(kind==='fan'){
   box('fan-base',0,.12,0,1.40,.24,1.40,'#476b65');box('fan-stand',0,.90,0,.22,1.55,.22,'#698c80');
   fan('fan',0,2,0,.94);box('fan-motor',.22,2,0,.38,.46,.46,'#54776d');
   for(let i=-2;i<=2;i++)box('fan-guard',-.16,2,i*.25,.035,1.64,.025,'#718e80');
  }
  if(id==='thermal'){
   box('thermal-plinth',0,.11,0,1.65,.22,1.65,'#ad9271');box('thermal-vent',0,.25,0,1.42,.12,1.42,'#7c7161');
   for(let i=0;i<7;i++)box('thermal-grille',-.57+i*.19,.33,0,.06,.05,1.25,'#e9ba79');
  }
  if(kind==='water'){for(let i=0;i<5;i++){const p=mesh('grass-skim',new THREE.BoxGeometry(.25,.018,.06),'#d7c594',(i-2)*.25,.035,(i%2)*.15);airGroup.add(p);}}
  else for(let i=0;i<(kind==='thermal'?9:3);i++){
   // Small arrowheads make direction legible without giant orbiting hoops.
   const warm=kind==='thermal',a=mesh(warm?'warm-air':'outgoing-air',warm?warmGeometry:coolGeometry,warm?'#edb56e':'#d8efdd');if(!warm)a.rotation.z=-Math.PI/2;
   airGroup.add(a);air.push({mesh:a,index:i});
  }
  models.push({id,kind,group,airGroup,rotors,air});
 }
 return models;
}
export function animateWindModel(model,time){for(const rotor of model.rotors)rotor.rotation.x=time*6;for(const{mesh,index}of model.air){const t=(time*.65+index/3)%1;if(model.kind==='glide')mesh.position.set((t-.5)*3,18+index*.5,Math.sin(t*3+index)*.4);else if(model.kind==='thermal')mesh.position.set((index%3-1)*(model.zone?.halfX||4)*.5,(model.zone?.minY||3)+2+t*Math.min(12,(model.zone?.maxY||20)-(model.zone?.minY||3)-4)+Math.floor(index/3)*.7,(Math.floor(index/3)-1)*(model.zone?.halfZ||10)*.8);else mesh.position.set((model.kind==='ac'?.86:.25)+t*1.35,model.kind==='ac'?.73:2,(index-1)*.20);mesh.scale.setScalar(.6+.4*Math.sin(Math.PI*t));}}
