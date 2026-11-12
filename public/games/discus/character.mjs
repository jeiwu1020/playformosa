import{SOLE}from'./shoe-contact.mjs';
// Original procedural runner, visually guided by the site's hero illustration.
// All anatomical endpoints come from physics; hair, face and clothing are cosmetic only.
export function createCharacter(THREE,scene){
 const group=new THREE.Group();group.name='hero-runner';scene.add(group);
 const colors={skin:0xf1bd83,skinShade:0xe7a66e,orange:0xf47625,orangeDark:0xd8521e,navy:0x243d54,navyLight:0x35556b,brown:0x513627,brownLight:0x6b4931,white:0xfff8e8,ink:0x211e1b,ear:0xd98c68};
 const mat=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.78})]));
 const geo={sphere:new THREE.SphereGeometry(1,16,12),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),cone:new THREE.ConeGeometry(1,1,10),hair:new THREE.SphereGeometry(.305,18,10,0,Math.PI*2,0,1.25),collar:new THREE.TorusGeometry(.102,.019,6,16)};
 const caps={};function capsule(length,r){const key=length+':'+r;return caps[key]??=new THREE.CapsuleGeometry(r,length-2*r,5,12);}
 function mesh(parent,name,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,mat[material]);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 function sphere(parent,name,material,x,y,z,sx,sy=sx,sz=sx){return mesh(parent,name,geo.sphere,material,x,y,z,sx,sy,sz);}
 function node(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
 const body=node(group,'body');const singlet=mesh(body,'singlet',capsule(.64,.215),'orange',0,.32,0);
 const shorts=sphere(body,'shorts','navy',0,-.025,0,.235,.17,.225);
 mesh(body,'waistband',geo.cylinder,'navyLight',0,.025,0,.229,.055,.218);
 mesh(body,'bib',geo.box,'white',0,.34,.218,.255,.185,.018);
 sphere(body,'neck','skin',0,.704,0,.099,.102,.095);
 const collar=mesh(body,'collar',geo.collar,'orangeDark',0,.64,0);collar.rotation.x=Math.PI/2;
 const head=node(group,'head');sphere(head,'face','skin',0,0,0,.292,.30,.272);
 for(const [side,x]of [['left',-.286],['right',.286]]){sphere(head,'ear-'+side,'skin',x,-.012,0,.054,.075,.046);sphere(head,'ear-inner-'+side,'ear',x,-.013,.035,.028,.048,.013);}
 const hair=node(head,'hair');mesh(hair,'hair-cap',geo.hair,'brown',0,.025,-.025);
 for(let i=0;i<7;i++){const x=-.235+i*.071,y=.245+.035*Math.sin(i/6*Math.PI),z=-.02+(i%2)*.045;const tuft=sphere(hair,'tuft-'+i,i%2?'brownLight':'brown',x,y,z,.068,.108,.075);tuft.rotation.z=-.45+i*.10;const tip=mesh(hair,'tuft-tip-'+i,geo.sphere,'brown',x+.025,y+.057,z,.036,.067,.047);tip.rotation.z=-.45+i*.10;}
 for(const side of [-1,1]){const lock=sphere(hair,'side-lock-'+side,'brown',side*.258,.10,-.03,.055,.13,.11);lock.rotation.z=side*.2;}
 for(const [side,x]of [['left',-.091],['right',.091]]){
  sphere(head,'eye-white-'+side,'white',x,.045,.235,.073,.087,.045);
  sphere(head,'pupil-'+side,'ink',x+.008,.025,.274,.032,.036,.018);
  sphere(head,'eye-glint-'+side,'white',x+.003,.041,.289,.010,.012,.005);
  const brow=mesh(head,'brow-'+side,capsule(.15,.023),'brown',x,.147,.244);brow.rotation.z=side==='left'?-1.10:1.15;
 }
 sphere(head,'nose','skinShade',.006,-.029,.281,.052,.043,.049);
 const mouth=sphere(head,'mouth','ink',0,-.145,.231,.119,.063,.028);
 const teeth=node(head,'teeth');for(let row=0;row<2;row++)for(let i=0;i<5;i++){const x=(i-2)*.039,y=row===0?-.126:-.161;mesh(teeth,'tooth-'+row+'-'+i,geo.box,'white',x,y,.256,.035,row===0?.033:.023,.014);}
 const limbs=[];
 for(let i=0;i<2;i++){
  const upperArm=mesh(group,'upper-arm-'+i,capsule(.34,.074),'skin');
  const forearm=mesh(group,'forearm-'+i,capsule(.32,.065),'skin');
  const elbow=sphere(group,'elbow-'+i,'skinShade',0,0,0,.075);
  const thigh=mesh(group,'thigh-'+i,capsule(.55,.097),'skin');
  const knee=sphere(group,'knee-'+i,'skinShade',0,0,0,.098);
  const shin=mesh(group,'shin-'+i,capsule(.55,.078),'skin');
  const shortsLeg=mesh(group,'shorts-leg-'+i,geo.cylinder,'navy',0,0,0,.124,.19,.124);
  const shortsHem=mesh(group,'shorts-hem-'+i,geo.cylinder,'navyLight',0,0,0,.126,.022,.126);
  const sock=mesh(group,'sock-'+i,geo.cylinder,'white',0,0,0,.085,.18,.085);
  const sockBand=mesh(group,'sock-band-'+i,geo.cylinder,'orange',0,0,0,.087,.026,.087);
  const hand=node(group,'hand-'+i);sphere(hand,'palm-'+i,'skin',0,0,0,.065,.071,.043);const fingers=node(hand,'fingers-'+i);
  for(let f=0;f<4;f++){const finger=mesh(fingers,'finger-'+i+'-'+f,capsule(.062,.012),'skin',(f-1.5)*.027,-.068+Math.abs(f-1.5)*.004,0);finger.rotation.z=(f-1.5)*.10;}
  const thumb=mesh(fingers,'thumb-'+i,capsule(.062,.015),'skin',-.065,-.012,0);thumb.rotation.z=-.8;
  const shoe=node(group,'shoe-'+i);sphere(shoe,'shoe-upper-'+i,'navy',.035,-.004,0,.18,.069,.102);
  mesh(shoe,'sole-'+i,geo.sphere,'white',SOLE.x,SOLE.y,SOLE.z,SOLE.rx,SOLE.ry,SOLE.rz);
  mesh(shoe,'heel-'+i,geo.sphere,'orange',-.095,.006,0,.045,.041,.098);
  const accent=mesh(shoe,'shoe-stripe-'+i,geo.box,'orange',.048,.013,.101,.14,.027,.012);accent.rotation.z=-.23;
  for(let k=0;k<2;k++)mesh(shoe,'lace-'+i+'-'+k,geo.box,'white',.012+k*.045,.052,.058,.025,.012,.09);
  limbs.push({upperArm,forearm,elbow,thigh,knee,shin,shortsLeg,shortsHem,sock,sockBand,hand,shoe});
 }
 const up=new THREE.Vector3(0,1,0),from=new THREE.Vector3(),to=new THREE.Vector3(),direction=new THREE.Vector3();
 function point(obj,p,z){obj.position.set(p.x,p.y,p.z??z);}
 function bone(obj,a,b,z,length){from.set(a.x,a.y,a.z??z);to.set(b.x,b.y,b.z??z);direction.subVectors(to,from);obj.position.copy(from).add(to).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(up,direction.clone().normalize());obj.scale.set(1,direction.length()/length,1);}
 function band(obj,a,b,z,fraction){obj.position.set(a.x+(b.x-a.x)*fraction,a.y+(b.y-a.y)*fraction,(a.z??z)+((b.z??z)-(a.z??z))*fraction);direction.set(b.x-a.x,b.y-a.y,(b.z??z)-(a.z??z)).normalize();obj.quaternion.setFromUnitVectors(up,direction);}
 function update(points,state){
  // Follow the actual rig axis, including the failure fall applied by pose.mjs.
  const torsoTilt=-Math.atan2(points.shoulder.x-points.hip.x,points.shoulder.y-points.hip.y);
  point(body,points.hip,0);body.rotation.set(0,Math.PI/2+(state.twist||0),torsoTilt,'ZYX');point(head,points.head,0);
  const glance=state.phase==='land'||state.phase==='done'||Math.abs(Math.sin(state.lean||0))>.45;
  head.rotation.set(0,Math.PI/2+(state.twist||0)*.5,torsoTilt,'ZYX');
  for(let i=0;i<2;i++){const z=i===0?.205:-.205,l=limbs[i],elbow=points['elbow'+i],wrist=points['hand'+i],knee=points['knee'+i],foot=points['foot'+i];
   bone(l.upperArm,points['shoulder'+i]??points.shoulder,elbow,z,.34);bone(l.forearm,elbow,wrist,z,.32);point(l.elbow,elbow,z);
   bone(l.thigh,points['hip'+i]??points.hip,knee,z,.55);bone(l.shin,knee,foot,z,.55);point(l.knee,knee,z);
   band(l.shortsLeg,points['hip'+i]??points.hip,knee,z,.15);band(l.shortsHem,points['hip'+i]??points.hip,knee,z,.31);band(l.sock,knee,foot,z,.76);band(l.sockBand,knee,foot,z,.67);
   point(l.hand,wrist,z);if(wrist.z!==undefined){direction.set(wrist.x-elbow.x,wrist.y-elbow.y,wrist.z-(elbow.z??z)).normalize();l.hand.quaternion.setFromUnitVectors(up.clone().negate(),direction);}else l.hand.rotation.z=Math.atan2(wrist.x-elbow.x,elbow.y-wrist.y);
   point(l.shoe,foot,z);l.shoe.rotation.z=foot.y>.14?.12:0;
  }
  group.updateMatrixWorld(true);
 }
 return{group,update,bounds(){group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(group);}};
}
