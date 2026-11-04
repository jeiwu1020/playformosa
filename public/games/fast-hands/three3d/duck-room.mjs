// Original, texture-free room geometry inspired by the public tabletop setting.
// Installed only by the duck stage. The portable world, rig and motion remain
// unchanged, and the world's existing disposal owns every added resource.
export function decorateDuckRoom(THREE,world){
 const {scene}=world;
 const backdrop=new THREE.Group();backdrop.name='duck-room-backdrop';scene.add(backdrop);
 const boxGeometry=new THREE.BoxGeometry(1,1,1);
 const palette={wall:'#c9c0b1',cabinet:'#d4cdbc',cabinetInset:'#c5bdac',counter:'#a69c8c',wood:'#948675',handle:'#746d61',pot:'#a28d73',leaf:'#7d8a70',leafLight:'#929b80',ceramic:'#b3b9aa'};
 const materials=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new THREE.MeshStandardMaterial({color,roughness:.94})]));
 function mesh(name,geometry,material,x,y,z,sx=1,sy=1,sz=1){
  const object=new THREE.Mesh(geometry,materials[material]||material);object.name=name;
  object.position.set(x,y,z);object.scale.set(sx,sy,sz);backdrop.add(object);return object;
 }
 function box(name,material,x,y,z,sx,sy,sz){return mesh(name,boxGeometry,material,x,y,z,sx,sy,sz);}
 box('duck-room-rear-wall','wall',0,1.6,-1.49,7,3.3,.06);

 // A single low-contrast masonry batch, not hundreds of draw calls or a photo.
 const positions=[],colors=[],normals=[],tileColors=['#b9b0a3','#c0b7a9','#b3aa9d','#c5bcaf'].map(c=>new THREE.Color(c));
 for(let row=0;row<14;row++)for(let column=0;column<24;column++){
  const x=-3.6+column*.30+(row%2)*.15,y=.24+row*.155,c=tileColors[(row*7+column*3)%tileColors.length];
  for(const [dx,dy] of [[0,0],[.286,0],[.286,.139],[0,0],[.286,.139],[0,.139]]){
   positions.push(x+dx,y+dy,-1.452);normals.push(0,0,1);colors.push(c.r,c.g,c.b);
  }
 }
 const masonry=new THREE.BufferGeometry();masonry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));masonry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));masonry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 mesh('duck-room-masonry',masonry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),0,0,0);

 // Cream doors and an inset lower counter suggest a quiet domestic setting.
 // Everything is behind z=-.6, clear of all hands, notes and duck trajectories.
 box('duck-room-cabinet-frame','wood',0,1.96,-1.28,1.88,.87,.20);
 for(const side of[-1,1]){
  box('duck-room-cabinet-'+(side<0?'left':'right'),'cabinet',side*.464,1.97,-1.16,.908,.82,.075);
  box('duck-room-cabinet-handle-'+side,'handle',side*.061,1.72,-1.108,.018,.13,.018);
 }
 box('duck-room-upper-trim','cabinetInset',0,2.407,-1.19,1.94,.035,.24);
 box('duck-room-counter-shadow','wood',0,.99,-1.13,3.35,.11,.44);
 box('duck-room-countertop','counter',0,1.055,-1.10,3.4,.038,.53);
 for(const side of[-1,1]){
  box('duck-room-lower-cabinet-'+side,'cabinetInset',side*.94,.68,-1.20,1.08,.52,.22);
  box('duck-room-lower-handle-'+side,'handle',side*.94,.89,-1.077,.16,.014,.014);
 }
 // One small plant and two quiet canisters on the rear counter, never on the
 // playing surface. Low-poly silhouettes keep the foreground action readable.
 mesh('duck-room-plant-pot',new THREE.CylinderGeometry(.068,.052,.13,12),'pot',1.10,1.14,-1.03);
 const leafGeometry=new THREE.SphereGeometry(1,8,6);
 for(let i=0;i<5;i++){
  const angle=(i-2)*.6,leaf=mesh('duck-room-leaf-'+i,leafGeometry,i%2?'leaf':'leafLight',1.10+Math.sin(angle)*.072,1.25+Math.cos(angle)*.058,-1.03+(i%2)*.014,.026,.085,.016);
  leaf.rotation.z=-angle*.6;
 }
 const jarGeometry=new THREE.CylinderGeometry(1,1,1,12);
 mesh('duck-room-ceramic-jar',jarGeometry,'ceramic',-1.12,1.15,-1.04,.065,.15,.065);
 mesh('duck-room-jar-lid',jarGeometry,'wood',-1.12,1.23,-1.04,.069,.016,.069);
 mesh('duck-room-small-canister',jarGeometry,'cabinet',-.94,1.125,-1.08,.048,.10,.048);

 // Recolor only environment materials. Their shared identity stays owned by
 // the original world, while character and game-prop materials are untouched.
 const recolor=(name,color)=>{const material=scene.getObjectByName(name).material;material.color.set(color);material.roughness=.95;};
 recolor('table-top','#bfb5a3');recolor('table-front-edge','#978a76');
 recolor('table-leg--0.73-0.2','#7d7362');recolor('demo-ground','#d2cbbc');
 // The existing placement mark becomes a subdued contact patch, same height.
 const marker=scene.getObjectByName('duck-place-marker');
 marker.material=new THREE.MeshBasicMaterial({color:'#776b55',transparent:true,opacity:.10,depthWrite:false});

 // Sparse mineral flecks are one small static batch, with no texture fetches.
 const flecks=[],normal=[];
 for(let i=0;i<150;i++){
  const x=-.82+((i*67)%151)/151*1.64,z=.13+((i*43)%149)/149*.69,size=.0015+(i%3)*.0007;
  for(const [dx,dz] of [[-size,-size],[-size,size],[size,size],[-size,-size],[size,size],[size,-size]]){flecks.push(x+dx,.8506,z+dz);normal.push(0,1,0);}
 }
 const surface=new THREE.BufferGeometry();surface.setAttribute('position',new THREE.Float32BufferAttribute(flecks,3));surface.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
 const grain=new THREE.Mesh(surface,new THREE.MeshBasicMaterial({color:'#776d5c',transparent:true,opacity:.16,depthWrite:false}));grain.name='duck-room-stone-flecks';scene.add(grain);
 scene.background.set('#e8e2d6');
 return backdrop;
}
