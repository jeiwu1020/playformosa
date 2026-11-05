import * as THREE from './vendor/three.module.min.js';

// Screen composition in the existing camera, without moving the camera itself.
// Objects stay behind the athlete. Position is derived afresh for every capture.
export function skyAnchor(camera,x,y,depth){
 const point=new THREE.Vector3(x,y,0).unproject(camera),direction=new THREE.Vector3();camera.getWorldDirection(direction);
 return point.addScaledVector(direction,(depth-point.z)/direction.z);
}
export function createSkyLayers(scene){
 const root=new THREE.Group();root.name='sky-journey-root';scene.add(root);
 const shapes={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(1,8,5),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,7),rock:new THREE.OctahedronGeometry(1)};
 const groups=new Map();
 const group=id=>{const g=new THREE.Group();g.name='sky-'+id;g.visible=false;root.add(g);groups.set(id,g);return g;};
 function shape(g,type,color,x,y,z,sx,sy,sz,alpha=1){
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:alpha,depthWrite:false});
  const m=new THREE.Mesh(shapes[type],material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.skyAlpha=alpha;g.add(m);return m;
 }
 const box=(g,c,x,y,z,a,b,d)=>shape(g,'box',c,x,y,z,a,b,d);
 const ball=(g,c,x,y,z,a,b=a,d=a)=>shape(g,'ball',c,x,y,z,a,b,d);
 const rod=(g,c,x,y,z,a,b,angle=0)=>{const m=shape(g,'cylinder',c,x,y,z,a,b,a);m.rotation.z=angle;return m;};
 for(const [id,color] of [['cloud-near','#e2e9d9'],['cloud-far','#a8c2c4']]){
  const g=group(id);for(let i=0;i<7;i++)ball(g,color,-3.6+i*1.2,Math.sin(i*1.9)*.17,0,.88,.23+(i%3)*.05,.25);
 }
 const glow=group('airglow');
 for(let i=0;i<3;i++)shape(glow,'ball',['#6eacb9','#c8d8bb','#e1b783'][i],0,-i*.16,0,5.3,.24-i*.035,.08,.35-i*.04);
 const meteor=group('meteor');
 for(let i=0;i<2;i++){const tail=shape(meteor,'cone',i?'#97c3c6':'#e4d2ad',-.32-i*.24,.37+i*.22,0,.07,1.18,.035,.65);tail.rotation.z=-.7;}
 ball(meteor,'#f2d7a7',.02,-.09,.04,.10,.08,.05);
 const station=group('station');
 rod(station,'#f0e6c7',0,0,0,.28,1.65,Math.PI/2);box(station,'#8ca9a6',0,0,0,.44,.68,.55);
 rod(station,'#c2d3c6',0,0,0,.045,4.2,Math.PI/2);
 for(const side of [-1,1])for(const row of [-1,1]){
  box(station,'#d2b97e',side*1.5,row*.36,0,1.3,.64,.07);
  for(let i=0;i<3;i++)box(station,'#527f8e',side*(1.08+i*.4),row*.36,.06,.32,.53,.035);
 }
 rod(station,'#e5bc77',.4,.48,0,.035,.7,-.55);ball(station,'#fcdb9b',.57,.77,0,.09);
 const probe=group('probe');box(probe,'#d3b273',0,0,0,.65,.65,.62);box(probe,'#758e98',0,0,.34,.42,.42,.06);
 const dish=shape(probe,'cone','#e5e1c9',0,.62,0,.5,.27,.5);dish.rotation.x=.3;
 rod(probe,'#d0d9c9',0,.64,0,.025,1.15);ball(probe,'#f2ca89',0,1.2,0,.06);
 for(const side of [-1,1]){box(probe,'#cfb888',side*.98,0,0,1.16,.09,.65);for(let i=0;i<3;i++)box(probe,'#47778b',side*(.62+i*.33),.06,0,.27,.035,.59);}
 const debris=group('moon-stones');for(let i=0;i<5;i++)shape(debris,'rock',i%2?'#aaa992':'#d2c9ac',Math.sin(i*2)*2,-2+i*.9,0,.10+(i%2)*.06,.13,.1);
 const comet=group('comet');
 for(let i=0;i<3;i++){const tail=shape(comet,'cone',['#6e969f','#a8c4be','#e9dfb3'][i],-1.1-i*.18,.2+i*.15,-.2-i*.1,.22+i*.05,2.5+i*.5,.10,.6-i*.12);tail.rotation.z=-1.05;}
 shape(comet,'rock','#f0cf98',0,0,.1,.42,.34,.3);shape(comet,'rock','#af9478',.12,-.13,.34,.16,.13,.13);
 const boba=group('boba');ball(boba,'#d6b58a',0,0,0,1,.94,.84);ball(boba,'#efd8ad',-.16,.22,.64,.72,.58,.19);
 for(let i=0;i<9;i++){const a=i*2.4;ball(boba,'#735653',Math.sin(a)*.63,-.36+Math.cos(a)*.30,.69,.13,.12,.08);}
 rod(boba,'#ec9768',.48,1.03,0,.09,1.2,-.28);rod(boba,'#f8d4a6',.41,1.25,.08,.025,.4,-.28);
 const pineapple=group('pineapple');ball(pineapple,'#d7a655',0,0,0,.72,.91,.65);ball(pineapple,'#edc778',-.12,.15,.5,.52,.63,.16);
 for(let i=0;i<5;i++){const leaf=shape(pineapple,'cone',i%2?'#6fa590':'#8fb29a',(i-2)*.19,1.05+Math.sin(i)*.10,0,.17,.8,.17);leaf.rotation.z=(2-i)*.3;}
 ball(pineapple,'#497b86',0,.13,.67,.28,.31,.04);ball(pineapple,'#bcd7cd',-.08,.22,.72,.09,.10,.02);
 for(const x of [-.38,.38]){box(pineapple,'#bb874f',x,-.51,.45,.07,.16,.05);shape(pineapple,'cone','#eec493',x,-1.15,0,.11,.36,.11,.8);}
 const market=group('market');ball(market,'#7b9b91',0,-.63,0,1.35,.3,.65);shape(market,'rock','#597a7c',0,-.95,0,1.15,.55,.6);
 box(market,'#ddc18a',0,-.05,0,1.55,.57,.62);box(market,'#f1d7a0',0,.27,.03,1.8,.12,.81);
 for(const side of [-1,1]){rod(market,'#799894',side*.84,.66,0,.045,.86);ball(market,'#eea16d',side*.65,.70,.45,.14,.21,.13);}
 for(let i=0;i<5;i++)box(market,i%2?'#e8c37f':'#89aea0',-.76+i*.38,1.12,0,.37,.16,1);
 for(let i=0;i<3;i++)ball(market,'#d2aa70',-.45+i*.42,.37,.12,.13,.09,.11);
 const nebula=group('nebula');for(let i=0;i<3;i++){const m=shape(nebula,'ball',i%2?'#596281':'#466f82',-2+i*2,.7-i*.6,0,3.1,.63,.1,.12);m.rotation.z=.3;}
 for(const g of groups.values()){g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g);g.userData.templateWidth=Math.max(.1,bounds.max.x-bounds.min.x);g.userData.templateHeight=Math.max(.1,bounds.max.y-bounds.min.y);g.userData.templateCenter=bounds.getCenter(new THREE.Vector3());}
 function show(id,alpha,camera,x,y,depth,size,rotation=0,maxHeight=Infinity){
  const g=groups.get(id);if(!g)return;g.visible=alpha>.001;if(!g.visible)return;
  g.scale.setScalar(Math.min(size/g.userData.templateWidth,maxHeight/g.userData.templateHeight));g.rotation.set(0,0,rotation);g.position.copy(skyAnchor(camera,x,y,depth)).sub(g.userData.templateCenter.clone().multiplyScalar(g.scale.x).applyEuler(g.rotation));
  g.traverse(m=>{if(m.isMesh)m.material.opacity=alpha*m.userData.skyAlpha;});
 }
 return{root,update({journey:j,camera,width,height,time=0}){
  for(const g of groups.values()){g.visible=false;g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.setScalar(1);g.traverse(m=>{if(m.isMesh)m.material.opacity=m.userData.skyAlpha;});}
  const vw=camera.right-camera.left,vh=camera.top-camera.bottom,mobile=width<500,log=Math.log10(Math.max(1,j.altitude));
  show('cloud-far',j.clouds*.48,camera,0,-.57,-29,vw*1.45);
  show('cloud-near',j.clouds*.76,camera,.08*Math.sin(log),-.86+.08*Math.sin(log*2),-14,vw*1.4);
  show('airglow',j.horizon,camera,0,-.55+.10*Math.sin(log),-32,vw*1.7);
  show('meteor',j.horizon*.85,camera,-.63,.38,-28,vw*.15,-.12,vh*.20);
  for(const item of j.items){if(['airglow','lunar'].includes(item.id))continue;
   const left=['probe','pineapple'].includes(item.id),x=left?-.63:.63;
   const y=.34-item.progress*.63,depth=item.id==='comet'?-26:-17;
   show(item.id,item.weight,camera,x,y,depth,Math.min(vw*(mobile?.27:.27),vh*.49),Math.sin(time*.12+item.progress)*.07,vh*.39);
  }
  show('moon-stones',j.moon*.6,camera,-.65,-.2,-12,vw*.3);
  const haze=Math.max(0,Math.min(1,(log-8.7)/1.5));show('nebula',haze,camera,-.12,.25,-39,vw*1.25);
  // One pool, fewer peripheral stones on portrait phones. No per-frame geometry.
  const stones=groups.get('moon-stones');stones.children.forEach((m,i)=>m.visible=!mobile||i<3);
 }};
}
