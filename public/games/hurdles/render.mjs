import * as THREE from './vendor/three.module.min.js';
import {createCharacter} from './character.mjs';
import {pose,HURDLES,HURDLE_HEIGHT} from './physics.mjs';
import {createSoftwareRenderer} from './software-renderer.mjs';
export function createWorld(host){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c3e5df');scene.fog=new THREE.Fog('#c3e5df',32,65);
 let renderer;const probe=document.createElement('canvas');const available=probe.getContext('webgl2');if(available){available.getExtension('WEBGL_lose_context')?.loseContext();try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{}}
 renderer??=createSoftwareRenderer();renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','同款四肢選手在跨欄跑道上的即時畫面');renderer.domElement.setAttribute('role','img');
 if(!renderer.isSoftware){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;}
 const camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,80);scene.add(new THREE.HemisphereLight(0xfffbef,0x688c7b,2.4));const sun=new THREE.DirectionalLight(0xfff1d7,2.8);sun.position.set(-5,12,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:10,bottom:-7});scene.add(sun);scene.add(sun.target);
 const mats={};const material=c=>mats[c]??=new THREE.MeshStandardMaterial({color:c,roughness:.85});
 const boxG=new THREE.BoxGeometry(1,1,1),sphereG=new THREE.SphereGeometry(1,12,8),cylG=new THREE.CylinderGeometry(1,1,1,10);
 function shape(geo,c,x,y,z,sx,sy,sz,parent=scene){const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(c,x,y,z,w,h,d,parent)=>shape(boxG,c,x,y,z,w,h,d,parent);
 box('#84ae8d',55,-.23,-3,160,.4,32);box('#db8d6f',55,-.03,0,135,.12,6.8);box('#e4a382',55,.035,0,135,.02,1.9);
 for(const z of[-3,-1,1,3])box('#fff4d9',55,.05,z,135,.018,.035);
 for(let x=0;x<=110;x+=10){box('#f7d2ab',x,.06,0,.025,.015,6);if(x%20===0){const marker=box('#f5ecce',x,.12,3.6,.7,.22,.3);}}
 for(let x=-5;x<130;x+=9){const base=box('#f9efd7',x,.48,-4.6,8.9,.9,.35);box('#317c78',x,1,-4.6,8.9,.1,.42);for(let i=0;i<4;i++){shape(cylG,'#4b9785',x-3+i*2,.55,-7,.07,1.1,.07);shape(sphereG,i%2?'#90bd8b':'#6aa78e',x-3+i*2,1.2,-7,.50,.60,.45);}
  // Repeating stepped spectator terraces, restrained enough to read the hurdle silhouettes.
  for(let row=0;row<3;row++)box(row%2?'#b9d8b0':'#d8e3bf',x,.28+row*.32,-9-row*.65,8.8,.45,.6);
  for(let i=0;i<5;i++){const c=['#f27642','#447c88','#f6d188','#9f7093','#7da88d'][(i+Math.round(x))%5+5>=5?((i+Math.round(x))%5+5)%5:0];shape(sphereG,c,x-3.4+i*1.6,1.6+(i%2)*.3,-10,.16,.23,.16);shape(sphereG,'#dfae7d',x-3.4+i*1.6,1.9+(i%2)*.3,-10,.13,.13,.13);}
 }
 for(let x=-10;x<140;x+=20){shape(sphereG,'#8dc2a9',x,.5,-19,8,1.4,4);shape(sphereG,'#a6cdb2',x+7,.5,-22,6,1.6,3);for(let k=0;k<3;k++)shape(sphereG,'#eff4e5',x+k*.9,7+(x%3)*.2,-22,1.3,.45,.7);}
 for(let x=4;x<115;x+=18){shape(cylG,'#315e65',x,2.25,-4.7,.035,4.5,.035);const flag=box(x%3?'#f3b961':'#e58160',x+.55,4.1,-4.7,1.1,.45,.035);flag.rotation.z=-.06;}
 const hurdles=HURDLES.map((x,i)=>{const g=new THREE.Group();g.position.x=x;scene.add(g);box('#315d67',0,.045,0,.68,.09,2.15,g);for(const z of[-.9,.9])box('#eff3dd',0,HURDLE_HEIGHT/2,z,.08,HURDLE_HEIGHT,.09,g);box('#f8f1df',0,HURDLE_HEIGHT,0,.10,.14,2.02,g);for(let z=-.8;z<=.8;z+=.4)box(i%2?'#d7684d':'#38697a',.055,HURDLE_HEIGHT,z,.018,.14,.2,g);return g;});
 for(let z=-3;z<=3;z+=.4)for(let x=109.7;x<110.3;x+=.3)box((Math.round((z+3)/.4)+Math.round((x-109.7)/.3))%2?'#243d54':'#fff8e8',x,.065,z,.3,.02,.4);
 for(const z of[-3.6,3.6]){box('#2b6868',110,2,z,.35,4,.35);box('#f4c577',110,3.6,z,.43,.35,.43);}box('#2b6868',110,4.2,0,.45,.8,7.6);
 const character=createCharacter(THREE,scene),shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,24),new THREE.MeshBasicMaterial({color:'#584d3e',transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.075;scene.add(shadow);
 let w=1,h=1;const resize=()=>{const r=host.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);renderer.setSize(w,h,false);};new ResizeObserver(resize).observe(host);resize();
 function render(s,recordedPoints){const ratio=w/h,viewHeight=ratio<.8?8.7:ratio<1.1?7.4:5.6,viewWidth=viewHeight*ratio;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();const ahead=ratio<.8?1.1:ratio<1.1?1.6:2.5,targetX=s.x+ahead;camera.position.set(targetX+4,4.5,12);camera.lookAt(targetX,1.8,0);sun.position.x=s.x-5;sun.target.position.x=s.x;
 character.update(recordedPoints??pose(s),s);shadow.position.x=s.x;shadow.scale.setScalar(Math.max(.45,1-(s.y-1.18)*.15));hurdles.forEach((g,i)=>{g.rotation.z=-s.hurdles[i].angle;});renderer.render(scene,camera);}
 return{renderer,scene,camera,character,render,resize,get software(){return !!renderer.isSoftware;},capture(s){const oldW=w,oldH=h;w=1000;h=550;renderer.setSize(w,h,false);render(s);const c=document.createElement('canvas');c.width=renderer.domElement.width;c.height=renderer.domElement.height;c.getContext('2d').drawImage(renderer.domElement,0,0);w=oldW;h=oldH;renderer.setSize(w,h,false);render(s);return c;}};
}
