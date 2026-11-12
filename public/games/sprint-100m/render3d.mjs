import{cameraPlan}from'./camera.mjs';
import * as THREE from './vendor/three.module.min.js';
import{createCharacter}from'./character3d.mjs';
import{START_X,chest}from'./race.mjs';
import{sprintPose,viewport,cameraOffset,prepared}from'./pose3d.mjs';
// Match the actual torso mesh forward surface to the scoring chest plane.
export function torsoFront(character){const torso=character.group.getObjectByName('singlet'),p=torso.geometry.attributes.position,v=new THREE.Vector3();character.group.updateMatrixWorld(true);let front=-Infinity;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(torso.matrixWorld);front=Math.max(front,v.x);}return front;}
export function createSprintScene(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c8e3d7');scene.fog=new THREE.Fog('#c8e3d7',36,95);
 scene.add(new THREE.HemisphereLight(0xfffbef,0x688c7b,2.4));const sun=new THREE.DirectionalLight(0xffefd5,2.6);sun.position.set(-8,15,10);scene.add(sun);scene.add(sun.target);
 const mats=new Map(),boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,10,7);const mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.85}));return mats.get(c);};
 function shape(g,c,x,y,z,a,b,d){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(a,b,d);scene.add(m);return m;}
 const box=(c,x,y,z,a,b,d)=>shape(boxGeo,c,x,y,z,a,b,d);
 box('#a7c79d',50,-.22,-1,140,.35,35);box('#ce9278',50,-.01,0,125,.08,8.8);
 for(let lane=0;lane<4;lane++)box(lane%2?'#d49b7d':'#c68b70',50,.035,-3.3+lane*2.2,125,.012,2.15);
 for(let z=-4.4;z<4.5;z+=2.2)box('#fff5dd',50,.065,z,125,.012,.045);
 for(let x=0;x<=100;x+=10)box('#f9dab7',x,.07,0,.035,.01,8.8);
 for(let z=-4.4;z<4.4;z+=.4)for(let n=0;n<2;n++)box((Math.round((z+4.4)/.4)+n)%2?'#29444b':'#fff8e8',100.09+n*.18,.09,z,.18,.015,.4);
 for(let i=0;i<4;i++){const z=-3.3+i*2.2;box('#324f56',START_X-.15,.13,z+.205,.40,.17,.17);box('#324f56',START_X-1.05,.13,z-.205,.40,.17,.17);}
 // Low sidelines and spectators keep all four articulated silhouettes legible.
 for(let x=-8;x<120;x+=8){box('#fff0d2',x,.55,-6,7.8,1,.28);box('#4d8d79',x,1.08,-6,7.8,.12,.32);for(let j=0;j<3;j++){const tx=x-2.6+j*2.5;box('#698b60',tx,.8,-10,.12,1.6,.12);shape(sphereGeo,j%2?'#7aaf88':'#95bb8b',tx,1.8,-10,.7,.85,.65);}for(let row=0;row<2;row++)box('#b6ceb0',x,.4+row*.35,-13-row,7.8,.5,.9);for(let j=0;j<3;j++){shape(sphereGeo,['#dd987a','#6b9cac','#d0b675'][j],x-2+j*2,1.2,-13,.18,.28,.18);shape(sphereGeo,'#e8b886',x-2+j*2,1.58,-13,.14,.14,.14);}}
 const characters=['#ed782e','#e15759','#299c91','#8a73bd'].map((color,id)=>{const c=createCharacter(THREE,scene,{color});c.group.name='sprinter-'+id;c.group.position.z=[3.3,-3.3,-1.1,1.1][id];return c;});
 const shadows=characters.map(c=>{const m=new THREE.Mesh(new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:'#55493a',transparent:true,opacity:.16,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.10;m.position.z=c.group.position.z;scene.add(m);return m;});
 return{scene,sun,characters,shadows,update(race){for(const r of race.runners){const pose=sprintPose(r,r.poseTime??race.time,race.phase,prepared(race));const character=characters[r.id];character.group.position.x=0;character.update(pose.points,pose.state);if(r.started){character.group.position.x=chest(r)-torsoFront(character);character.group.updateMatrixWorld(true);}shadows[r.id].position.x=r.x+character.group.position.x;shadows[r.id].scale.set(r.fall>0?1.8:1,1,1);}scene.updateMatrixWorld(true);}};
}
export function createSprint3D(host,onFailure){
 let renderer;try{const probe=document.createElement('canvas');const gl=probe.getContext('webgl2');if(!gl)return null;gl.getExtension('WEBGL_lose_context')?.loseContext();renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch{return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.id='world3d';renderer.domElement.setAttribute('aria-label','四位立體選手的100公尺跑道');renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%';host.prepend(renderer.domElement);
 const world=createSprintScene(),camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,120);let width=1,height=1,active=true;
 const resize=()=>{const b=host.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);renderer.setSize(width,height,false)};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;renderer.domElement.hidden=true;onFailure?.('3D顯示中斷，目前使用2D相容模式。');});
 return{renderer,world,camera,get active(){return active},render(race,replay=null){if(!active)return false;world.update(race);const v=cameraPlan(race,width,height,replay);Object.assign(camera,{left:-v.viewWidth/2,right:v.viewWidth/2,top:v.viewHeight/2,bottom:-v.viewHeight/2});camera.position.set(v.targetX+v.offset.x,v.offset.y,v.targetZ+v.offset.z);camera.lookAt(v.targetX,v.targetY,v.targetZ);camera.updateProjectionMatrix();world.sun.position.x=race.runners[0].x-6;world.sun.target.position.x=race.runners[0].x;renderer.render(world.scene,camera);return true;},dispose(){observer.disconnect();renderer.dispose();world.scene.traverse(m=>{m.geometry?.dispose();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());else m.material?.dispose();});renderer.domElement.remove();}};
}
