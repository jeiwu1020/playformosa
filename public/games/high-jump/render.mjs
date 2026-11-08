import * as THREE from './vendor/three.module.min.js';
import {createSoftwareRenderer} from './software-renderer.mjs';
export function chooseRenderer(gpu,cpu){try{return gpu()}catch{return cpu()}}
import {createCharacter} from './character.mjs';
import {pose,TAKEOFF,RUN_START,approachZ,clamp,visibleBarHeight} from './physics.mjs';
// CPU-only tessellation LOD: same asset anatomy/materials/dimensions; no alternate character.
export function characterThree(T,software){if(!software)return T;return{...T,SphereGeometry:class extends T.SphereGeometry{constructor(r,w,h,...rest){super(r,Math.min(w||8,8),Math.min(h||6,6),...rest)}},CapsuleGeometry:class extends T.CapsuleGeometry{constructor(r,l){super(r,l,2,6)}},CylinderGeometry:class extends T.CylinderGeometry{constructor(a,b,h){super(a,b,h,6)}},TorusGeometry:class extends T.TorusGeometry{constructor(r,t){super(r,t,4,8)}}};}
export function runwayLayout(){const start=RUN_START-1.3,end=6.5;return{start,end,width:end-start,center:(start+end)/2};}
// Both edges use the normal of the same path followed by the athlete.
export function runwaySection(x,halfWidth,offset=0){const slope=(approachZ(x+.001)-approachZ(x-.001))/.002,len=Math.hypot(1,slope),nx=-slope/len,nz=1/len,z=approachZ(x);return{left:{x:x+nx*(offset+halfWidth),z:z+nz*(offset+halfWidth)},right:{x:x+nx*(offset-halfWidth),z:z+nz*(offset-halfWidth)}};}
export function cameraFrame(s,width,height){
 const ratio=width/height,base=ratio<.8?4.6:ratio<1.3?3.9:3.4;
 const progress=clamp((s.air||0)/.65,0,1),blend=progress*progress*(3-2*progress);
 // C1 proximity weight fades in AND out over 8→2m. No threshold camera cut.
 const smoothMax=(a,b)=>.5*(a+b+Math.sqrt((a-b)**2+.0025));
 const followX=s.x+.35;
 const closeSpan=base*(1-.48*blend),followCenter=(s.phase==='air'||Number.isFinite(s.launchY))?s.y+(2.25-(s.launchY??1.1))*(1-blend)+.25*blend:2.25;
 const distance=Math.sqrt((s.y-s.target)**2+.0001),p=clamp((8-distance)/6,0,1);
 const passage=clamp(((s.air||0)/(s.apexTime||1)-.5)/.3,0,1),near=clamp(3-Math.abs(s.x),0,1);
 // Near the actual pass, show the fixed bar as well as the athlete—even with extra clearance.
 const proximity=Math.max(p*p*(3-2*p),passage*passage*(3-2*passage)*near*near*(3-2*near))*blend;
 const barCenter=(s.y+s.target)/2+.4,barSpan=smoothMax(closeSpan,distance/2+1.6);
 const approachFollow=(s.launchX??s.x)+1.45;
 const approachX=.5*(-1.8+approachFollow-Math.sqrt((-1.8-approachFollow)**2+.04));
 return{ratio,span:closeSpan+(barSpan-closeSpan)*proximity,targetY:followCenter+(barCenter-followCenter)*proximity,lookX:approachX+(followX-approachX)*blend};
}
// Still-frame camera fits the original complete pose at the image's own aspect ratio.
export function resultCameraFrame(s,width,height){
 const points=Object.values(pose(s)).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
 const lookX=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,targetY=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2,ratio=width/height;
 const right=new THREE.Vector3(15,0,-6).normalize(),forward=new THREE.Vector3(6,4,15).normalize(),up=new THREE.Vector3().crossVectors(forward,right).normalize();
 let span=2.1;for(const p of points){const d=new THREE.Vector3(p.x-lookX,p.y-targetY,0);span=Math.max(span,(Math.abs(d.dot(right))+.5)/ratio,Math.abs(d.dot(up))+.5);}
 return{lookX,targetY,ratio,span};
}
export function earlyParkLayout(){return[{kind:'tree',x:-29,z:-6},{kind:'tree',x:-24,z:-7},{kind:'tree',x:-18,z:-6.5},{kind:'bench',x:-26,z:-5.2},{kind:'bench',x:-20,z:-5.2},{kind:'flag',x:-23,z:-8},{kind:'flag',x:-16,z:-8},{kind:'house',x:-28,z:-14},{kind:'house',x:-19,z:-15}];}
export function createWorld(host){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#beded1');scene.fog=new THREE.Fog('#beded1',32,85);
 const renderer=chooseRenderer(()=>new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),()=>createSoftwareRenderer());renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;if(!renderer.isSoftware){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}host.append(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','橘衣選手沿彎曲助跑道起跳，背越雙立柱橫桿，落在軟墊上');
 const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,120);scene.add(new THREE.HemisphereLight(0xfff7df,0x638775,2.4));const light=new THREE.DirectionalLight(0xffefcf,2.7);light.position.set(-6,16,12);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-12,right:12,top:16,bottom:-10});scene.add(light);
 const material=new Map();const mat=c=>{if(!material.has(c))material.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.85}));return material.get(c)};
 const boxG=new THREE.BoxGeometry(1,1,1),cylinderG=new THREE.CylinderGeometry(1,1,1,12),sphereG=new THREE.SphereGeometry(1,12,8);
 function shape(g,c,x,y,z,sx,sy,sz){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 const box=(c,x,y,z,w,h,d)=>shape(boxG,c,x,y,z,w,h,d),ball=(c,x,y,z,r)=>shape(sphereG,c,x,y,z,r,r,r);
 const runway=runwayLayout();
 box('#95b99a',0,-.28,0,100,.5,60);
 function ribbon(color,start,end,halfWidth,y,offset=0){const vertices=[],steps=Math.max(1,Math.ceil((end-start)/.25));for(let i=0;i<steps;i++){const a=runwaySection(start+(end-start)*i/steps,halfWidth,offset),b=runwaySection(start+(end-start)*(i+1)/steps,halfWidth,offset);for(const p of[a.left,b.left,b.right,a.left,b.right,a.right])vertices.push(p.x/runway.width,0,p.z);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat(color));mesh.material.side=THREE.DoubleSide;mesh.scale.x=runway.width;mesh.position.y=y;scene.add(mesh);return mesh;}
 ribbon('#d6936d',runway.start,runway.end,1.4,.06);ribbon('#e7b18a',runway.start+.05,runway.end-.05,1.05,.09);
 for(const offset of[-1.25,1.25])ribbon('#f8edcf',runway.start,runway.end,.02,.101,offset);
 // Flat dashed centerline, shared with the runner rather than a separate lane.
 for(let x=RUN_START;x<TAKEOFF.min-.35;x+=.72)ribbon('#b6bc8b',x,Math.min(x+.4,TAKEOFF.min-.35),.025,.105);
 ribbon('#9cc36d',TAKEOFF.min,TAKEOFF.max,.9,.123);ribbon('#f9f7d5',TAKEOFF.ideal-.0325,TAKEOFF.ideal+.0325,.9,.146);
 for(let i=0;i<3;i++){box(i%2?'#c56e4b':'#dc8055',2.15,.28,-1.05+i*1.05,4.5,.56,1.02);box('#efb477',2.15,.58,-1.05+i*1.05,4.45,.07,1.0);}for(let i=0;i<3;i++)box('#f8d6a0',1+i,.625,0,.08,.02,3.1);
 const poles=[-1.3,1.3].map(z=>{box('#395c53',0,.11,z,.8,.22,.6);return box('#477b73',0,1.1,z,.085,2.2,.085)});
 const bar=box('#efc35b',0,2,0,.08,.08,2.75);const barStripe=box('#f9f1d2',0,2,0,.084,.084,.3);
 // Height comparison buildings are scene geometry, not a score multiplier.
 const houses=[{x:-9,z:-10,h:3,w:3,c:'#e8c791'},{x:2,z:-12,h:6,w:3.5,c:'#d8a788'},{x:10,z:-14,h:12,w:4,c:'#88afa2'},{x:18,z:-21,h:30,w:5,c:'#b3c2b0'}];
 for(const h of houses){box(h.c,h.x,h.h/2,h.z,h.w,h.h,3);box('#596f67',h.x,h.h+.1,h.z,h.w+.25,.2,3.2);for(let y=1;y<h.h;y+=1.8)for(let x=-1;x<=1;x+=1)box('#617e76',h.x+x,y,h.z+1.51,.5,.8,.04);}
 for(let i=0;i<6;i++){const x=-13+i*5;shape(cylinderG,'#8b8061',x,.9,-7,.12,1.8,.12);ball('#719976',x,2.1,-7,1.0);}
 for(let i=0;i<5;i++){const x=-6+i*3;box('#f4e7be',x,.5,5,2.8,.7,.4);box('#648671',x,.9,5,2.9,.12,.5);}
 // Flags and spectators echo the warm miniature stadium from Long Jump.
 for(let i=0;i<8;i++){const x=-7+i*2;ball(i%2?'#cb8e67':'#d3b28a',x,1.3,5.6,.15);box(i%3?'#d99562':'#5b8e7c',x,.91,5.6,.26,.55,.25);}
 // Quiet park detail behind the extended approach; nothing crosses the player sightline.
 for(const p of earlyParkLayout()){
  if(p.kind==='tree'){shape(cylinderG,'#8b8061',p.x,.9,p.z,.13,1.8,.13);ball('#719976',p.x,2.1,p.z,1);}
  if(p.kind==='bench'){box('#648671',p.x,.55,p.z,1.8,.14,.6);box('#d9ba8e',p.x,.95,p.z-.23,1.8,.55,.13);for(const dx of[-.65,.65])box('#62766b',p.x+dx,.23,p.z,.12,.46,.45);}
  if(p.kind==='flag'){shape(cylinderG,'#648671',p.x,1.55,p.z,.045,3.1,.045);box('#e2ac68',p.x+.43,2.8,p.z,.85,.5,.025);}
  if(p.kind==='house'){box('#d8c5a1',p.x,1.8,p.z,4,3.6,3);box('#6f9382',p.x,3.65,p.z,4.2,.18,3.2);for(const dx of[-1,0,1])box('#7e9e91',p.x+dx,2,p.z+1.51,.5,.9,.03);}
 }
 const runner=createCharacter(characterThree(THREE,renderer.isSoftware),scene);const shadow=shape(cylinderG,'#6d9779',-7,.13,0,.48,.012,.25);let w=1,h=1;
 function resize(){const r=host.getBoundingClientRect(),nextW=Math.max(1,r.width),nextH=Math.max(1,r.height);if(nextW===w&&nextH===h)return;renderer.setSize(nextW,nextH,false);w=nextW;h=nextH;}
 function draw(s,still=false){const p=pose(s);runner.update(p,{...s,lean:p.lean});runner.group.position.z=s.z;shadow.position.set(s.x,.14,s.z);shadow.material.transparent=true;shadow.material.opacity=Math.max(.08,.28-s.y*.025);
 const height=visibleBarHeight(s);for(const pole of poles){pole.visible=true;pole.position.y=(height+.4)/2;pole.scale.y=(height+.4);}
 const drop=s.hit?Math.min(height-.15,4.9*s.barDrop*s.barDrop):0;for(const b of[bar,barStripe]){b.visible=true;b.position.y=height-drop;b.rotation.x=s.hit?Math.min(1.4,s.barDrop*2):0;b.position.x=s.hit?s.barDrop*.2:0;}
 const {ratio,span,targetY,lookX}=still?resultCameraFrame(s,w,h):cameraFrame(s,w,h);camera.left=-span*ratio;camera.right=span*ratio;camera.top=span;camera.bottom=-span;
 const z=still?s.z:0;camera.position.set(lookX+6,targetY+4,15+z);camera.lookAt(lookX,targetY,z);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 function capture(s,width,height){const oldW=w,oldH=h;try{w=Math.max(1,Math.round(width));h=Math.max(1,Math.round(height));renderer.setSize(w,h,false);draw(s,true);const shot=document.createElement('canvas');shot.width=renderer.domElement.width;shot.height=renderer.domElement.height;shot.getContext('2d').drawImage(renderer.domElement,0,0);return shot;}finally{w=oldW;h=oldH;renderer.setSize(w,h,false);draw(s);}}
 resize();return{capture,isSoftware:Boolean(renderer.isSoftware),canvas:renderer.domElement,draw,resize,dispose(){renderer.dispose();}};
}
