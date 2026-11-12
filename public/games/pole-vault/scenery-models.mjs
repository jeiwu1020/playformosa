import * as THREE from './vendor/three.module.min.js';
// Original procedural low-poly additions, using the same materials/mesh pipeline
// as the existing landmarks. No downloaded/generated bitmap assets or services.
export function createSceneryModels({group,box,ball,beam,shape,coneG,cylG}){
 const models={},make=id=>models[id]=group('scenery-'+id);
 const clock=make('brickclock');box('#bd775b',0,2.8,0,1.45,5.6,1.2,clock);box('#ebd1a5',0,5.25,0,1.8,.28,1.5,clock);shape(coneG,'#4d7c7c',0,6.05,0,1.2,1.35,1.1,clock);ball('#fff0cf',0,4.7,.65,.55,.55,.05,clock);beam('#3f595f',[0,4.7,.72],[0,5.07,.72],.035,clock);beam('#3f595f',[0,4.7,.72],[.28,4.58,.72],.035,clock);for(const y of[1,2,3])for(const x of[-.39,.39])box('#628c91',x,y,.62,.28,.48,.05,clock);
 const water=make('watertower');for(const x of[-.65,.65])for(const z of[-.65,.65]){beam('#ac8b66',[x,0,z],[x,4,z],.12,water);beam('#a0aa9c',[x,1,z],[-x,3,z],.045,water);}shape(new THREE.CylinderGeometry(1.05,1.05,1.5,12),'#91b5aa',0,4.6,0,1,1,1,water);shape(coneG,'#d6b687',0,5.62,0,1.13,.7,1.13,water);box('#718b82',0,3.78,0,2.3,.18,2.3,water);
 const dome=make('observatory');shape(new THREE.CylinderGeometry(1.5,1.65,2.8,12),'#dac49b',0,1.4,0,1,1,1,dome);ball('#85b6ad',0,2.8,0,1.5,1.4,1.5,dome);beam('#e8dfba',[0,3.1,.7],[.5,4.05,1.4],.18,dome);for(const x of[-.8,0,.8])box('#5f8e94',x,1.5,1.48,.45,.9,.08,dome);box('#efe4c4',0,.13,0,3.8,.26,3.8,dome);
 const twin=make('twinspire');for(const x of[-.7,.7]){box('#7aabaa',x,3,0,1.1,6,1.15,twin);shape(coneG,'#e7d4aa',x,6.5,0,.85,1.2,.8,twin);for(const y of[1,2,3,4,5])box('#c3d2bb',x,y,.59,.9,.10,.05,twin);}box('#d5c9a3',0,3.7,0,.5,.3,.5,twin);
 const terrace=make('terrace');for(let i=0;i<5;i++){const w=3-i*.4,y=i*1.1;box('#d6cdb0',0,y+.5,0,w,1.0,1.8,terrace);box('#6f9d80',0,y+1.05,.1,w+.18,.17,2.1,terrace);for(const x of[-.6,0,.6])if(Math.abs(x)<w/2-.15)box('#7baba8',x,y+.5,.92,.36,.65,.04,terrace);}ball('#94b47c',0,5.7,0,.55,.5,.45,terrace);
 const arch=make('archtower');for(const x of[-.55,.55])beam('#aebfb3',[x,0,0],[x*.35,5.4,0],.12,arch);shape(new THREE.TorusGeometry(.85,.15,6,16),'#e1bc80',0,5.3,0,1,1,.65,arch);box('#78a4a4',0,5.05,0,1.35,.36,.75,arch);beam('#b6c9b7',[0,5.9,0],[0,6.5,0],.05,arch);
 // Landmark silhouettes use local ground zero; real-world heights live in the catalog.
 const lincoln=make('lincoln');
 box('#ded4b8',0,.16,0,4.8,.32,2.9,lincoln);box('#eee5cc',0,.40,0,4.35,.16,2.55,lincoln);
 box('#cbbf9d',0,1.35,-.30,3.3,1.8,1.25,lincoln);
 for(const x of[-1.8,-1.2,-.6,0,.6,1.2,1.8])for(const z of[-1.02,1.02]){shape(cylG,'#f0e7cd',x,1.36,z,.12,1.7,.12,lincoln);box('#e6dcc0',x,2.18,z,.32,.16,.32,lincoln);}
 box('#eee2c4',0,2.39,0,4.5,.30,2.7,lincoln);box('#d5c6a7',0,2.60,0,4.65,.14,2.85,lincoln);
 const christ=make('christ');
 box('#adaca1',0,.22,0,1.5,.44,1.05,christ);box('#ccc9b8',0,.65,0,.90,.44,.82,christ);
 shape(new THREE.CylinderGeometry(.25,.52,1.65,7),'#dce2cf',0,1.70,0,1,1,1,christ);
 box('#d5dccb',0,2.52,0,.54,.58,.40,christ);ball('#e4e8d7',0,3.06,0,.26,.31,.25,christ);
 for(const side of[-1,1]){beam('#dde4d1',[side*.20,2.65,0],[side*1.30,2.70,0],.17,christ);beam('#e5e9d7',[side*1.30,2.70,0],[side*1.75,2.78,0],.10,christ);}
 const eye=make('londoneye');
 box('#b6c7bd',0,.10,0,3.7,.20,1.25,eye);
 shape(new THREE.TorusGeometry(2.6,.065,5,40),'#e5e5ce',0,3.05,0,1,1,1,eye);
 for(const z of[-.30,.30])for(const side of[-1,1])beam('#adc4c0',[side*1.6,.2,z],[0,3.05,z],.11,eye);
 beam('#819ea0',[0,3.05,-.45],[0,3.05,.45],.17,eye);
 for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.cos(a)*2.6,y=3.05+Math.sin(a)*2.6;beam('#b9ceca',[0,3.05,0],[x,y,0],.022,eye);ball('#8bb5b4',x,y,0,.20,.14,.25,eye);}
 const washington=make('washington');
 box('#d8ccb0',0,.16,0,1.15,.32,1.15,washington);
 shape(new THREE.CylinderGeometry(.32,.49,6.4,4,1,false,Math.PI/4),'#ece0bf',0,3.52,0,1,1,1,washington);
 shape(new THREE.ConeGeometry(.32,.65,4,1,false,Math.PI/4),'#f2e8cc',0,7.045,0,1,1,1,washington);
 const esb=make('esb');
 for(const [w,y,h]of[[2.7,.45,.9],[2.25,1.5,1.2],[1.85,3.7,3.2],[1.40,5.85,1.1],[.95,6.8,.8],[.60,7.55,.7]]){box('#c2bfa6',0,y,0,w,h,w*.72,esb);for(const x of[-.3,0,.3])if(Math.abs(x)<w*.4)box('#829f9e',x,y,w*.365,.065,h*.80,.035,esb);}
 box('#dbd6b8',0,8.1,0,.38,.45,.38,esb);beam('#d9ddcb',[0,8.32,0],[0,9.35,0],.06,esb);
 const cn=make('cntower');
 box('#bfbdab',0,.12,0,1.25,.24,1.25,cn);shape(new THREE.CylinderGeometry(.18,.43,6.6,8),'#d6d6c1',0,3.5,0,1,1,1,cn);
 shape(new THREE.CylinderGeometry(.84,.52,.42,16),'#bfc5b5',0,6.48,0,1,1,1,cn);shape(new THREE.CylinderGeometry(.81,.84,.25,16),'#789c9e',0,6.8,0,1,1,1,cn);shape(new THREE.CylinderGeometry(.47,.81,.24,16),'#dedcc3',0,7.04,0,1,1,1,cn);
 beam('#d7d9c8',[0,7.16,0],[0,8.8,0],.10,cn);beam('#d1a181',[0,8.8,0],[0,9.55,0],.045,cn);
 const skytree=make('skytree'),legs=Array.from({length:3},(_,i)=>[Math.cos(i*Math.PI*2/3),Math.sin(i*Math.PI*2/3)]);
 box('#c5d1c5',0,.1,0,2.2,.2,2.2,skytree);
 for(const [x,z]of legs)beam('#c6d7cf',[x,.2,z],[x*.18,7.5,z*.18],.085,skytree);
 for(let level=0;level<7;level++){const y=.2+level,lower=1-(y-.2)*.112,upper=1-(y+.8)*.112;for(let i=0;i<3;i++){const a=legs[i],b=legs[(i+1)%3];beam('#9cbcb6',[a[0]*lower,y,a[1]*lower],[b[0]*upper,y+1,b[1]*upper],.030,skytree);beam('#bdd0c6',[a[0]*lower,y,a[1]*lower],[b[0]*lower,y,b[1]*lower],.035,skytree);}}
 for(const[y,r,h]of[[5.7,.70,.40],[7.35,.48,.32]]){shape(new THREE.CylinderGeometry(r*.85,r,h,12),'#d6dfcf',0,y,0,1,1,1,skytree);shape(new THREE.CylinderGeometry(r*.86,r*.86,.14,12),'#86aaa8',0,y+.12,0,1,1,1,skytree);}
 beam('#d5ddcb',[0,7.5,0],[0,9.6,0],.065,skytree);
 const burj=make('burj');
 for(let i=0;i<9;i++){const y=i*.86,h=.96,r=1.08-i*.10;shape(new THREE.CylinderGeometry(r,r+.055,h,6),'#8daead',0,y+h/2,0,1,1,1,burj);for(const angle of[0,Math.PI*2/3,Math.PI*4/3]){const extension=(9-i)*.045;box('#b5c9bb',Math.cos(angle)*r*.65,y+h/2,Math.sin(angle)*r*.65,r*.42,h,.32+extension,burj);}shape(new THREE.CylinderGeometry(r+.02,r+.02,.07,6),'#d1d6bc',0,y+h,0,1,1,1,burj);}
 beam('#c9d9c9',[0,7.8,0],[0,9.7,0],.055,burj);
 // Convex closed panels keep aircraft swept-wing silhouettes light and original.
 function panel(parent,color,points,y,thickness){if(points.reduce((area,p,i)=>{const q=points[(i+1)%points.length];return area+p[0]*q[1]-q[0]*p[1];},0)>0)points=[...points].reverse();const verts=[],index=[],n=points.length;for(const side of[-1,1])for(const[x,z]of points)verts.push(x,y+side*thickness/2,z);for(let i=1;i<n-1;i++)index.push(0,i+1,i,n,n+i,n+i+1);for(let i=0;i<n;i++){const j=(i+1)%n;index.push(i,j,n+j,i,n+j,n+i);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(index);geometry.computeVertexNormals();return shape(geometry,color,0,0,0,1,1,1,parent);}
 function aircraft(id,research=false){const g=make(id),body=research?'#e3e5d6':'#eee5cc',span=research?3.4:2.15,length=research?1.9:2.15;
  ball(body,0,.66,0,research?.16:.25,research?.16:.25,length,g);ball('#7da8ad',0,.76,length*.68,.13,.10,.30,g);
  for(const side of[-1,1]){panel(g,research?'#a9c4bf':'#99b6ad',[[side*.12,.55],[side*span,research?-.15:-.30],[side*span,research?-.48:-.65],[side*.12,-.25]],.63,.075);panel(g,'#b8cabe',[[side*.08,-length*.65],[side*.90,-length*.90],[side*.85,-length],[side*.08,-length*.91]],.77,.06);
   if(!research){ball('#b8c5b6',side*.82,.30,-.12,.17,.18,.51,g);ball('#657f80',side*.82,.30,.29,.13,.13,.045,g);beam('#9bada1',[side*.82,.45,-.1],[side*.82,.64,-.1],.07,g);}
  }
  const fin=box('#8eafa8',0,1.04,-length*.76,.08,.68,.65,g);fin.rotation.x=-.23;
  if(research){beam('#8d9d98',[0,.66,length*.88],[0,.66,length+.50],.025,g);for(const side of[-1,1])ball('#b9c8b8',side*.30,.53,-1.1,.09,.10,.32,g);}
  else for(const side of[-1,1])for(let i=0;i<7;i++)box('#829e9f',side*.241,.73,.95-i*.28,.025,.10,.10,g);
  return g;
 }
 aircraft('jet');aircraft('research',true);
 const weather=make('weatherballoon');ball('#e8eadc',0,2.65,0,.90,1.02,.90,weather);shape(new THREE.ConeGeometry(.17,.24,6),'#d8dfcc',0,1.60,0,1,1,1,weather).rotation.x=Math.PI;
 beam('#9ba99d',[0,.33,0],[0,1.56,0],.018,weather);box('#c2bea5',0,.18,0,.25,.30,.19,weather);box('#7faaa6',0,.24,.105,.14,.13,.025,weather);
 // Airborne subjects have no literal foundation; align their lowest vertex too.
 for(const id of['lincoln','christ','londoneye','washington','esb','cntower','skytree','burj','jet','research','weatherballoon']){const model=models[id];model.updateMatrixWorld(true);const floor=new THREE.Box3().setFromObject(model).min.y;for(const child of model.children)child.position.y-=floor;}
 const balloon=make('balloon');for(let i=0;i<8;i++)shape(new THREE.SphereGeometry(1,3,8,i*Math.PI/4,Math.PI/4),i%2?'#f0c274':'#db8762',0,2.35,0,1.1,1.4,1.1,balloon);for(const x of[-.28,.28])for(const z of[-.25,.25])beam('#8e8065',[x,.4,z],[x*.8,1.05,z*.8],.025,balloon);box('#b99365',0,.23,0,.7,.5,.6,balloon);box('#e7c48b',0,.48,0,.78,.1,.68,balloon);
 function bird(parent,x=0,y=0,z=0,size=1,eagle=false){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(size);parent.add(g);const wings=[];const color=eagle?'#6f6856':'#607e86';ball(color,0,.02,0,.20,.16,.55,g);ball(eagle?'#e8dfc2':'#83a1a0',0,.14,.48,.17,.18,.20,g);shape(coneG,'#dbb66d',0,.12,.69,.10,.2,.10,g).rotation.x=Math.PI/2;for(const side of[-1,1]){const wing=new THREE.Group();wing.position.set(side*.10,-.03,0);g.add(wing);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.24,side*1.35,-.13,-.05,side*.9,-.18,-.54,0,0,-.28],3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const mesh=shape(geometry,color,0,0,0,1,1,1,wing);mesh.material=mesh.material.clone();mesh.material.side=THREE.DoubleSide;wings.push({wing,side});}box(color,0,-.03,-.54,.38,.04,.5,g);return wings;}
 const birds=make('birds');birds.userData.wings=[...bird(birds,-.9,.2,0,.65),...bird(birds,.65,.65,-.3,.5),...bird(birds,.25,-.25,.2,.6)];
 const eagle=make('eagle');eagle.userData.wings=bird(eagle,0,0,0,1,true);
 const plane=make('plane');ball('#e9dfc0',0,0,0,.28,.30,1.2,plane);box('#d68c63',0,-.04,-.05,3.5,.1,.65,plane);box('#a9c5b5',0,.1,-.86,1.1,.07,.45,plane);box('#668c91',0,.36,-.84,.06,.62,.6,plane);ball('#83b0b0',0,.23,.23,.25,.2,.38,plane);const prop=new THREE.Group();prop.position.set(0,0,1.23);plane.add(prop);box('#677d79',0,0,0,1.25,.07,.05,prop);box('#677d79',0,0,0,.07,1.25,.05,prop);plane.userData.propeller=prop;
 const airship=make('airship');ball('#d6cba9',0,.6,0,2.1,.72,.72,airship);box('#a5b9ad',0,.6,.7,3,.11,.05,airship);box('#c58d67',0,-.38,0,1.2,.45,.65,airship);for(const x of[-.45,.45])beam('#9c9d85',[x,-.15,0],[x,.1,0],.035,airship);for(const z of[-.5,.5])box('#83a8a0',-1.7,.58,z,.8,.1,.8,airship);box('#83a8a0',-1.7,1.05,0,.85,.8,.08,airship);
 const ufo=make('ufo');shape(new THREE.CylinderGeometry(1.1,1.5,.25,16),'#a7bdb1',0,0,0,1,1,1,ufo);ball('#85b7b2',0,.27,0,.72,.42,.72,ufo);shape(new THREE.CylinderGeometry(.6,1.0,.2,16),'#7c9495',0,-.2,0,1,1,1,ufo);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(i%2?'#e9c481':'#b8d8bb',Math.cos(a)*1.16,.02,Math.sin(a)*1.16,.09,.07,.09,ufo);}return models;
}
export function animateScenery(model,clock){
 for(const{wing,side}of model.userData.wings||[])wing.rotation.z=side*(.1+Math.sin(clock*2.3)*.13);
 if(model.userData.propeller)model.userData.propeller.rotation.z=clock*8;
}
