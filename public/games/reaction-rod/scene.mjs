import * as THREE from './vendor/three.module.min.js';
import {CONFIG,clamp,bodyPose,shoulder,legPose} from './physics.mjs';
import {playBounds} from './framing.mjs';
export function createScene(){
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8f1da');const camera=new THREE.OrthographicCamera(-2,2,1.5,-1.5,.1,30);camera.position.set(0,1.3,8);camera.lookAt(0,1.3,0);
scene.add(new THREE.HemisphereLight('#fff9e4','#97ae80',3.1));const sun=new THREE.DirectionalLight('#fff4d8',3.5);sun.position.set(-3,5,6);scene.add(sun);const fill=new THREE.DirectionalLight('#d3e6fc',1.1);fill.position.set(3,2,5);scene.add(fill);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.72});const cream=mat('#fff3d6'),orange=mat('#f58a5b'),dark=mat('#3d594a'),pink=mat('#f3a0a3'),teal=mat('#6da79b'),yellow=mat('#f4d77b'),white=mat('#fffef0'),skin=mat('#ffce91'),navy=mat('#526b67');const palette=[orange,teal,pink,yellow,orange];
function mesh(g,m,x=0,y=0,z=0,parent=scene){const a=new THREE.Mesh(g,m);a.position.set(x,y,z);parent.add(a);return a;}
const box=(w,h,d,m,x,y,z,parent=scene)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
function ball(r,m,x,y,z,parent=scene,scale){const a=mesh(new THREE.SphereGeometry(r,20,14),m,x,y,z,parent);if(scale)a.scale.set(...scale);return a;}
const cap=(r,len,m,x,y,z,parent=scene)=>mesh(new THREE.CapsuleGeometry(r,Math.max(.001,len-2*r),5,14),m,x,y,z,parent);
function line(m,r=.04){return cap(r,1,m,0,0,0);}
const up=new THREE.Vector3(0,1,0);function connect(a,p,q,z=.05){const pz=p.z??z,qz=q.z??z,delta=new THREE.Vector3(q.x-p.x,q.y-p.y,qz-pz),length=delta.length();a.position.set((p.x+q.x)/2,(p.y+q.y)/2,(pz+qz)/2);a.scale.y=length;a.quaternion.setFromUnitVectors(up,delta.normalize());}
box(1.98,.08,.36,dark,0,.005,-.10);cap(.045,2.55,cream,-.88,1.27,-.23);cap(.045,2.55,cream,.88,1.27,-.23);const cross=cap(.065,1.95,orange,0,2.53,-.23);cross.rotation.z=Math.PI/2;box(1.73,2.35,.02,mat('#edf3df'),0,1.29,-.35);
for(let i=0;i<13;i++)ball(.018,i%2?yellow:white,-.84+i*.14,2.56,-.15);const rods=[],bulbs=[];for(let i=0;i<5;i++){const x=CONFIG.lanes[i];box(.09,.075,.10,dark,x,2.48,-.02);bulbs.push(ball(.012,white,x,2.48,.04));const g=new THREE.Group();scene.add(g);g.position.set(x,CONFIG.spawnY,.22);cap(CONFIG.rodRadius,CONFIG.rodLength,palette[i],0,0,0,g);cap(.023,.055,cream,0,-.14,0,g);rods.push(g);}
const groundShadow=mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:'#52643e',opacity:.13,transparent:true,depthWrite:false}),0,.075,-.08);groundShadow.scale.set(.42,.05,1);
// Character-only palette adapted from the canonical long-jump hero; no runtime dependency.
const heroColors={skin:'#f1bd83',skinShade:'#e7a66e',orange:'#f47625',orangeDark:'#d8521e',navy:'#243d54',navyLight:'#35556b',brown:'#513627',brownLight:'#6b4931',white:'#fff8e8',ink:'#211e1b',ear:'#d98c68'};
const hero=Object.fromEntries(Object.entries(heroColors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.78})]));
const named=(name,obj)=>{obj.name='hero-'+name;return obj;};
const torso=new THREE.Group();torso.name='hero-torso';scene.add(torso);
named('singlet',cap(.17,.50,hero.orange,0,.18,.02,torso));
named('shorts',ball(1,hero.navy,0,0,.015,torso,[.18,.13,.16]));
named('waistband',box(.32,.035,.22,hero.navyLight,0,.08,.03,torso));
named('bib',box(.20,.145,.018,hero.white,0,.29,.195,torso));
named('neck',ball(.055,hero.skin,0,.47,.015,torso,[1,1.1,1]));
const collar=named('collar',mesh(new THREE.TorusGeometry(.08,.014,6,16),hero.orangeDark,0,.43,.015,torso));collar.rotation.x=Math.PI/2;
const head=new THREE.Group();head.name='hero-head';head.position.set(0,.70,-.055);head.scale.setScalar(.76);torso.add(head);
const face=named('face',ball(1,hero.skin,0,0,0,head,[.292,.30,.272]));
for(const [side,x]of [['left',-.286],['right',.286]]){named('ear-'+side,ball(1,hero.skin,x,-.012,0,head,[.054,.075,.046]));named('ear-inner-'+side,ball(1,hero.ear,x,-.013,.035,head,[.028,.048,.013]));}
named('hair-cap',mesh(new THREE.SphereGeometry(.305,18,10,0,Math.PI*2,0,1.25),hero.brown,0,.025,-.025,head));
for(let i=0;i<7;i++){const x=-.235+i*.071,y=.245+.035*Math.sin(i/6*Math.PI),z=-.02+(i%2)*.045;const tuft=named('tuft-'+i,ball(1,i%2?hero.brownLight:hero.brown,x,y,z,head,[.068,.108,.075]));tuft.rotation.z=-.45+i*.1;const tip=named('tuft-tip-'+i,ball(1,hero.brown,x+.025,y+.057,z,head,[.036,.067,.047]));tip.rotation.z=-.45+i*.1;}
for(const side of[-1,1]){const lock=named('side-lock-'+side,ball(1,hero.brown,side*.258,.10,-.03,head,[.055,.13,.11]));lock.rotation.z=side*.2;}
const eyes=[],brows=[];for(const [side,x]of[['left',-.091],['right',.091]]){named('eye-white-'+side,ball(1,hero.white,x,.045,.235,head,[.073,.087,.045]));eyes.push(named('pupil-'+side,ball(.032,hero.ink,x+.008,.025,.274,head,[1,1.125,.5625])));named('eye-glint-'+side,ball(1,hero.white,x+.003,.041,.289,head,[.010,.012,.005]));const brow=named('brow-'+side,cap(.023,.15,hero.brown,x,.147,.244,head));brow.rotation.z=side==='left'?-1.10:1.15;brows.push(brow);}
named('nose',ball(1,hero.skinShade,.006,-.029,.281,head,[.052,.043,.049]));
const mouth=new THREE.Group();head.add(mouth);named('mouth',ball(1,hero.ink,0,-.145,.231,mouth,[.119,.063,.028]));
const teeth=new THREE.Group();teeth.name='hero-teeth';head.add(teeth);for(let row=0;row<2;row++)for(let i=0;i<5;i++)named('tooth-'+row+'-'+i,box(.035,row===0?.033:.023,.014,hero.white,(i-2)*.039,row===0?-.126:-.161,.256,teeth));
const sweat=ball(.021,teal,.17,.74,.17,torso,[.7,1.4,.5]);
const arms=[],hands=[],fingers=[],rings=[],legs=[],feet=[];for(const side of[-1,1]){const i=hands.length,a={upper:named('upper-arm-'+i,line(hero.skin,.048)),lower:named('forearm-'+i,line(hero.skin,.038))};a.elbow=named('elbow-'+i,ball(.043,hero.skin,0,0,0));named('shoulder-'+i,ball(.065,hero.skin,side*.145,.40,.08,torso));arms.push(a);const g=new THREE.Group();g.name='hero-hand-'+i;scene.add(g);
// Palm/finger geometry and local transforms are intentionally identical to v4.
ball(.06,hero.skin,0,0,.02,g,[1,.96,.60]);const fs=[];for(let f=0;f<4;f++)fs.push(cap(.010,.045,hero.skin,-.034+f*.023,.047,.02,g));const thumb=cap(.018,.065,hero.skin,side*.055,-.006,.02,g);thumb.rotation.z=side*.6;box(.085,.026,.06,hero.white,0,-.056,.02,g);hands.push(g);fingers.push(fs);rings.push(mesh(new THREE.RingGeometry(.083,.089,36),new THREE.MeshBasicMaterial({color:'#ed8750',transparent:true,opacity:.8,depthWrite:false}),0,0,0,g));
const leg={upper:named('thigh-'+i,line(hero.skin,.06)),lower:named('calf-'+i,line(hero.skin,.045)),shorts:named('shorts-leg-'+i,line(hero.navy,.072)),sock:named('sock-'+i,line(hero.white,.047)),band: named('sock-band-'+i,line(hero.orange,.049))};leg.knee=named('knee-'+i,ball(.05,hero.skin,0,0,0));legs.push(leg);
const foot=new THREE.Group();foot.name='hero-foot-'+i;scene.add(foot);feet.push(foot);named('shoe-'+i,ball(.075,hero.navy,0,.089,.10,foot,[1.3,.61,1.2]));named('sole-'+i,ball(.075,hero.white,0,.049,.10,foot,[1.3,.12,1.21]));box(.077,.018,.014,hero.orange,0,.089,.185,foot);for(let k=0;k<2;k++)box(.034,.009,.01,hero.white,0,.10+k*.014,.183,foot);
}
const target=mesh(new THREE.RingGeometry(.035,.039,30),new THREE.MeshBasicMaterial({color:'#668c65',transparent:true,opacity:.4,depthWrite:false}),0,1.8,-.1);const particleGeometry=new THREE.SphereGeometry(.012,6,5);let effects=[];
function burst(e){for(let i=0;i<10;i++){const a=mesh(particleGeometry,palette[i%5],e.x,e.handY,.25);effects.push({mesh:a,age:0,vx:Math.cos(i*.628)*.5,vy:Math.sin(i*.628)*.55+.25});}}
function update(w,dt,held=[0,0]){const b=w.body,pose=bodyPose(w);torso.position.set(pose.torso.x,pose.torso.y,pose.torso.z);torso.rotation.z=-pose.angle;eyes.forEach(a=>a.scale.y=b.phase!=='upright'?.55:b.strain>.55?1.7:1.25);mouth.scale.y=b.strain>.55?1.12:1;brows[0].rotation.z=b.strain>.55?-1.32:-1.10;brows[1].rotation.z=b.strain>.55?1.37:1.15;sweat.visible=b.strain>.55||b.phase!=='upright';
// Physics and rendering share anchors, grounded feet and fixed-length bones.
torso.updateMatrixWorld(true);
for(let i=0;i<2;i++){
 const h=w.hands[i],side=h.side,s=shoulder(w,side),p={x:h.x,y:h.y,z:.20};
 hands[i].position.set(p.x,p.y,p.z);hands[i].rotation.z=clamp(-h.vx*.04,-.17,.17);
 rings[i].visible=i===w.activeHand&&b.phase==='upright';for(const f of fingers[i])f.rotation.x=held[i]>0?-.9:0;
 const delta=new THREE.Vector3(p.x-s.x,p.y-s.y,p.z-s.z),d=delta.length(),mid=new THREE.Vector3(s.x,s.y,s.z).addScaledVector(delta,.5);
 const normal=new THREE.Vector3(side*delta.y,-side*delta.x,0);if(normal.lengthSq()<1e-12)normal.set(side,0,0);normal.normalize();
 const elbow=mid.addScaledVector(normal,Math.sqrt(Math.max(0,.36*.36-(d/2)**2)));
 connect(arms[i].upper,s,elbow);connect(arms[i].lower,elbow,p);arms[i].elbow.position.copy(elbow);
 const {hip,knee,ankle}=legPose(w,side);feet[i].position.set(ankle.x,0,ankle.z-.10);legs[i].knee.position.set(knee.x,knee.y,knee.z);
 connect(legs[i].upper,hip,knee);connect(legs[i].lower,knee,ankle);
 const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
 connect(legs[i].shorts,hip,mix(hip,knee,.32));connect(legs[i].sock,mix(knee,ankle,.62),ankle);connect(legs[i].band,mix(knee,ankle,.62),mix(knee,ankle,.70));
}
for(let i=0;i<5;i++){rods[i].visible=w.state!=='done';rods[i].position.set(CONFIG.lanes[i],CONFIG.spawnY,.22);rods[i].rotation.z=0;bulbs[i].material=w.rod?.lane===i?yellow:white;}if(w.rod){rods[w.rod.lane].position.y=w.rod.y;}target.visible=w.input.engaged&&w.state==='playing'&&b.phase==='upright';target.position.set(w.input.x,w.input.y,-.1);for(const e of effects){e.age+=dt;e.vy-=2*dt;e.mesh.position.x+=e.vx*dt;e.mesh.position.y+=e.vy*dt;e.mesh.scale.setScalar(Math.max(0,1-e.age/.45));}effects=effects.filter(e=>{if(e.age>.45){scene.remove(e.mesh);return false;}return true;});}
function resize(width,height){const b=playBounds(width,height);camera.left=b.left;camera.right=b.right;camera.top=b.top-1.3;camera.bottom=b.bottom-1.3;camera.updateProjectionMatrix();return b;}
function clear(){effects.forEach(e=>scene.remove(e.mesh));effects=[];}
// Replay stores only detached effect values, never meshes or simulation state.
function captureVisual(){
 if(effects.length>100)throw Error('Too many replay particles');
 return{effects:effects.map(e=>({x:e.mesh.position.x,y:e.mesh.position.y,z:e.mesh.position.z,scale:e.mesh.scale.x,age:e.age,vx:e.vx,vy:e.vy,color:palette.indexOf(e.mesh.material)}))};
}
function restoreVisual(snapshot){
 try{
  const saved=snapshot?.effects;
  if(!Array.isArray(saved)||saved.length>100||saved.some(e=>!e||!['x','y','z','scale','age','vx','vy'].every(k=>Number.isFinite(e[k]))||e.scale<0||e.scale>1||e.age<0||e.age>.45||!Number.isInteger(e.color)||e.color<0||e.color>=palette.length)){clear();return false;}
  while(effects.length>saved.length)scene.remove(effects.pop().mesh);
  for(let i=0;i<saved.length;i++){
   const value=saved[i];let effect=effects[i];
   if(!effect){effect={mesh:mesh(particleGeometry,palette[value.color])};effects.push(effect);}
   effect.mesh.material=palette[value.color];effect.mesh.position.set(value.x,value.y,value.z);effect.mesh.scale.setScalar(value.scale);
   effect.age=value.age;effect.vx=value.vx;effect.vy=value.vy;
  }
  return true;
 }catch{clear();return false;}
}
return{scene,camera,update,resize,burst,clear,captureVisual,restoreVisual,hands,torso,arms,legs,feet,rods};}
