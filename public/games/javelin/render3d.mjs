import * as THREE from './vendor/three.module.min.js';
import {createCharacter} from './character3d.mjs';
import {javelinPose} from './pose.mjs';
export {javelinPose} from './pose.mjs';
const mix=(a,b,t)=>a+(b-a)*t;
export function cameraPlan(s,width,height){
 const aspect=Math.max(.3,width/Math.max(1,height)),following=!!s.projectile&&s.stopped;
 const p=s.projectile,targetX=following?p.x:s.x>-8?s.x/2:s.x+1.2,targetY=following?Math.max(1.2,p.y*.7):1.1;
 const viewWidth=following?Math.max(12,aspect*9):Math.max(7.8,aspect*6.7),viewHeight=viewWidth/aspect;
 return{targetX,targetY,targetZ:following?p.z||0:0,viewWidth,viewHeight,offset:{x:1.4,y:7,z:16}};
}
export function createJavelinScene(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c8e3d7');scene.fog=new THREE.Fog('#c8e3d7',48,135);
 scene.add(new THREE.HemisphereLight(0xfffbef,0x688c7b,2.4));const sun=new THREE.DirectionalLight(0xffefd5,2.6);sun.position.set(-8,15,10);scene.add(sun);scene.add(sun.target);
 const mats=new Map(),boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,10,7);const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.83}));return mats.get(c)};
 function shape(g,c,x,y,z,a,b,d){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(a,b,d);scene.add(m);return m;}
 const box=(c,x,y,z,a,b,d)=>shape(boxGeo,c,x,y,z,a,b,d);
 box('#9cbb90',45,-.22,0,210,.4,100);box('#cf947a',-15,.005,0,34,.08,4);for(const z of[-2,2])box('#fff6df',-15,.055,z,34,.015,.06);
 // A clear line and open green landing sector are not confused with the runway.
 box('#fff9df',0,.07,0,.14,.02,4.3);box('#d47341',-.16,.067,0,.14,.02,4.3);
 for(let x=10;x<=130;x+=10){box('#d8e4b4',x,.035,0,.045,.01,x*.5);for(const z of[-1,1]){const line=box('#f8efd1',x-5,.04,z*(x-5)*.26,10.34,.016,.045);line.rotation.y=-z*Math.atan(.26);}}
 // Low mint stands, tree islands and restrained stadium lights keep the rig readable.
 for(let x=-30;x<140;x+=8){for(let row=0;row<3;row++)box(row%2?'#a6bda0':'#b4c9ab',x,.35+row*.40,-13-row,7.8,.45,.9);for(let j=0;j<4;j++){shape(sphereGeo,['#e4a374','#519783','#8fabc0','#d0b675'][j],x-3+j*1.8,1.12,-13,.16,.23,.16);shape(sphereGeo,'#efbc89',x-3+j*1.8,1.42,-13,.13,.13,.13);}box('#fff0d2',x,.42,-6,7.8,.75,.18);box('#5a8c75',x,.82,-6,7.8,.10,.24);}
 for(const x of[-24,16,56,96]){box('#789283',x,4,-18,.16,8,.16);box('#f9f1d8',x,8,-18,2.3,.4,.6);}
 const character=createCharacter(THREE,scene);character.group.name='javelin-athlete';
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,20),new THREE.MeshBasicMaterial({color:'#55493a',transparent:true,opacity:.17,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.08;scene.add(shadow);
 const spear=new THREE.Group();spear.name='javelin';scene.add(spear);
 function shaft(c,length,r,x){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,10),mat(c));m.rotation.z=Math.PI/2;m.position.x=x;spear.add(m);return m;}
 shaft('#f8e6b2',2.12,.022,-.1);shaft('#d46734',.30,.033,0);const tip=new THREE.Mesh(new THREE.ConeGeometry(.025,.28,10),mat('#5d7475'));tip.rotation.z=-Math.PI/2;tip.position.x=.96;spear.add(tip);shaft('#e67736',.42,.023,-.74);
 const marker=box('#f3b46b',0,.11,0,.15,.18,.15);marker.name='landing-marker';marker.visible=false;
 return{scene,character,spear,sun,shadow,marker,update(s){const pose=javelinPose(s);character.update(pose.points,pose.state);shadow.position.x=s.x;
  if(s.projectile){const p=s.projectile;const angle=p.angle??Math.atan2(p.vy,p.vx),yaw=Math.atan2(p.vz||0,p.vx||1);spear.position.set(p.x-1.1*Math.cos(angle)*Math.cos(yaw),p.y-1.1*Math.sin(angle), (p.z||0)-1.1*Math.cos(angle)*Math.sin(yaw));spear.rotation.set(0,-yaw,angle);marker.visible=!!p.landed;if(marker.visible)marker.position.set(p.x,.12,p.z||0);}else{const h=pose.points.hand1;spear.position.set(h.x,h.y,-.205);spear.rotation.set(0,0,s.armAngle||.18);marker.visible=false;}
  sun.position.x=s.x-6;sun.target.position.x=s.x;scene.updateMatrixWorld(true);return pose;}};
}
export function createJavelin3D(host,onFailure){
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}catch{onFailure?.('此裝置未提供 WebGL，使用相容示意畫面。');return null;}
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.id='world3d';renderer.domElement.setAttribute('aria-label','立體標槍選手與助跑道');renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%';host.prepend(renderer.domElement);
 const world=createJavelinScene(),camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,180);let width=1,height=1,active=true,previous=null;
 const resize=()=>{const b=host.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);renderer.setSize(width,height,false)};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;renderer.domElement.hidden=true;onFailure?.('3D顯示中斷，切換相容示意畫面。');});
 return{renderer,world,camera,get active(){return active},render(s){if(!active)return false;world.update(s);const plan=cameraPlan(s,width,height),now=performance.now()/1000;if(!previous||s.phase==='ready'||s.time<previous.time)previous={x:plan.targetX,y:plan.targetY,time:s.time,wall:now};const blend=1-Math.exp(-Math.min(.05,Math.max(0,now-previous.wall))*5);previous.x=mix(previous.x,plan.targetX,blend);previous.y=mix(previous.y,plan.targetY,blend);previous.time=s.time;previous.wall=now;Object.assign(camera,{left:-plan.viewWidth/2,right:plan.viewWidth/2,top:plan.viewHeight/2,bottom:-plan.viewHeight/2});camera.position.set(previous.x+plan.offset.x,previous.y+plan.offset.y,plan.offset.z);camera.lookAt(previous.x,previous.y,plan.targetZ);camera.updateProjectionMatrix();renderer.render(world.scene,camera);return true},dispose(){observer.disconnect();renderer.dispose();renderer.domElement.remove();}};
}
