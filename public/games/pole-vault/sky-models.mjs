import * as THREE from './vendor/three.module.min.js';

// Screen composition in the existing camera, without moving the camera itself.
// Objects stay behind the athlete. Position is derived afresh for every capture.
export function skyAnchor(camera,x,y,depth){
 const point=new THREE.Vector3(x,y,0).unproject(camera),direction=new THREE.Vector3();camera.getWorldDirection(direction);
 return point.addScaledVector(direction,(depth-point.z)/direction.z);
}
export function createSkyLayers(scene){
 const root=new THREE.Group();root.name='sky-journey-root';scene.add(root);
 const shapes={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(1,8,5),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,7),rock:new THREE.OctahedronGeometry(1),ring:new THREE.TorusGeometry(1,.055,4,18)};
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

 const ring=(g,c,r=1)=>{const m=shape(g,'ring',c,0,0,.1,r,r,r);m.rotation.x=1.05;m.rotation.z=.18;return m;};
 const boundary=group('karman');ring(boundary,'#a8dbd4',1.3);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(boundary,'#e9d29b',Math.cos(a)*1.3,Math.sin(a)*.67,.1,.08);}
 const sat=group('satellite');box(sat,'#dfcc97',0,0,0,.6,.75,.6);for(const x of[-1,1]){box(sat,'#517b91',x*.9,0,0,.9,.9,.08);rod(sat,'#c1d3c5',x*.45,0,0,.025,.6,Math.PI/2);}shape(sat,'cone','#efdfb8',0,.7,0,.4,.3,.4);
 const cargo=group('cargo');rod(cargo,'#d7dcc9',0,0,0,.65,1.3);shape(cargo,'cone','#afc1bb',0,.95,0,.65,.6,.65);box(cargo,'#bd865f',0,0,.63,.65,.5,.05);for(const x of[-1,1])box(cargo,'#7399a6',x*.95,0,0,.65,.8,.08);rod(cargo,'#d9aa68',0,-.8,0,.27,.45);
 const field=group('asteroids');for(let i=0;i<7;i++){const a=i*2.1;shape(field,'rock',i%2?'#c5ad84':'#8d9b91',Math.cos(a)*1.3,Math.sin(a)*.9,Math.sin(i)*.3,.17+(i%3)*.1,.23+(i%2)*.15,.2);}
 const mars=group('mars');ball(mars,'#c67f5e',0,0,0,1);for(const[x,y,r]of[[-.4,.3,.24],[.3,-.25,.3],[.25,.43,.12]])ball(mars,'#a8644f',x,y,.83,r,r*.65,.04);ball(mars,'#e3c4a0',0,.85,0,.36,.14,.43);
 const jupiter=group('jupiter');ball(jupiter,'#cfb281',0,0,0,1.05,.98,1);for(const[y,c]of[[.48,'#a8755c'],[.13,'#e6cfa3'],[-.25,'#b58763'],[-.55,'#e4c69a']])ball(jupiter,c,0,y,.82,.87,.085,.1);ball(jupiter,'#b46a55',.35,-.27,.99,.27,.14,.04);
 const saturn=group('saturn');ball(saturn,'#d7bd8d',0,0,0,.78);ring(saturn,'#ae9e81',1.4);ring(saturn,'#e2cda4',1.14);ball(saturn,'#e1ca9f',-.1,.23,.7,.53,.15,.08);
 const neptune=group('neptune');ball(neptune,'#527fba',0,0,0,1);ball(neptune,'#385e8f',.27,-.12,.91,.32,.19,.06);for(const y of[-.5,.38])ball(neptune,'#94bfcc',-.1,y,.78,.69,.07,.1);
 // Existing milk-tea world gains a pearl orbit, using the same shared geometry.
 ring(boba,'#bfa17b',1.35);
 const temple=group('temple');ball(temple,'#82a498',0,-.87,0,1.3,.22,.65);box(temple,'#c27759',0,-.16,0,1.5,.9,.7);box(temple,'#e3c18a',0,.38,0,1.9,.15,.94);box(temple,'#71978a',0,.6,0,1.4,.2,.8);box(temple,'#d6af71',0,.79,0,.9,.15,.65);for(const x of[-.78,.78]){rod(temple,'#b26952',x,.05,.42,.06,.7);ball(temple,'#e6a06c',x,.1,.61,.13,.21,.1);}box(temple,'#466966',0,-.12,.38,.44,.65,.04);
 const cat=group('cat');ball(cat,'#ead5aa',0,-.2,0,.8,.85,.55);ball(cat,'#f1dfb9',0,.73,0,.63,.58,.5);for(const x of[-.37,.37]){shape(cat,'cone','#dec79d',x,1.28,0,.22,.5,.22);ball(cat,'#354d50',x*.6,.8,.47,.055);ball(cat,'#e39b78',x,.62,.44,.1,.055,.04);}ball(cat,'#dcaa69',0,-.16,.55,.35,.43,.07);rod(cat,'#e6c690',-.85,.61,0,.17,.9,-.27);ball(cat,'#efd9b2',-.97,1.04,0,.2,.24,.18);box(cat,'#cc8b69',0,.31,.4,.55,.1,.1);
 const lunch=group('lunch');box(lunch,'#c5c3a5',0,0,0,1.9,.35,1.15);box(lunch,'#eee3be',-.42,.23,0,.85,.16,.9);ball(lunch,'#bd8257',.42,.32,.17,.37,.2,.21);rod(lunch,'#e0ba8a',.73,.32,.17,.065,.45,Math.PI/2);for(const[z,c]of[[-.3,'#8ca879'],[.38,'#d49d61']])ball(lunch,c,.4,.28,z,.23,.14,.15);ring(lunch,'#accfc1',1.37);
 const bus=group('bus');box(bus,'#9bbcb1',-.27,.1,0,1.6,1.05,.7);box(bus,'#e4cd93',-.27,.7,0,1.68,.18,.8);for(const x of[-.76,-.25,.26])box(bus,'#4b727c',x,.34,.37,.38,.39,.04);for(const x of[-.83,.32])ball(bus,'#4d6666',x,-.45,.07,.18,.2,.22);rod(bus,'#d5c39a',1.02,.22,0,.045,2.1);box(bus,'#739c8b',1.02,1.14,0,.63,.42,.13);ball(bus,'#ecbf78',1.02,1.14,.11,.11,.12,.025);
 const gate=group('gateway');for(const x of[-.8,.8])box(gate,'#7c9da7',x,0,0,.25,2.35,.3);box(gate,'#e3c18c',0,1.25,0,1.9,.28,.4);box(gate,'#a9c3b7',0,-1.2,0,2,.17,.7);ball(gate,'#637a9f',0,0,-.15,.65,1.05,.05);for(let i=0;i<5;i++){const a=i*1.7;ball(gate,'#e3d09c',Math.sin(a)*.42,Math.cos(a)*.82,0,.055);}
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
   const left=['probe','pineapple','satellite','mars','saturn','temple','lunch'].includes(item.id),x=left?-.63:.63;
   const shortWide=width/height>2.2,y=shortWide?-.25-item.progress*.18:.34-item.progress*.63,depth=item.id==='comet'?-26:-17;
   show(item.id,item.weight,camera,x,y,depth,Math.min(vw*(mobile?.27:.27),vh*.49),Math.sin(time*.12+item.progress)*.07,vh*(shortWide?.27:.39));
  }
  show('moon-stones',j.moon*.6,camera,-.65,-.2,-12,vw*.3);
  const haze=Math.max(0,Math.min(1,(log-8.7)/1.5));show('nebula',haze,camera,-.12,.25,-39,vw*1.25);
  // One pool, fewer peripheral stones on portrait phones. No per-frame geometry.
  const stones=groups.get('moon-stones');stones.children.forEach((m,i)=>m.visible=!mobile||i<3);
 }};
}
