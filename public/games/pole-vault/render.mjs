import * as THREE from './vendor/three.module.min.js';
import {vaultOffsetX} from './altitude.mjs';
import {createCharacter} from './character.mjs';
import {pose,poleRig,PLANT_X,PLANT_WINDOW} from './physics.mjs';
import {createSoftwareRenderer} from './software-renderer.mjs';
import {milestones,sceneAltitude,projectAltitudePose,vaultDisplay} from './milestones.mjs';
import {catalog,altitudeScene,landmarkPose,sceneryCaption,environment,landmarkRoofY} from './scenery.mjs';
import {createSceneryModels,animateScenery} from './scenery-models.mjs';
import {skyJourney} from './sky-journey.mjs';
import {createSkyLayers,skyAnchor} from './sky-models.mjs';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const formatHeight=h=>h>=1e12?(h/1000).toExponential(2)+' km':h>=1000?(h/1000).toLocaleString('en-US',{maximumFractionDigits:1})+' km':h.toLocaleString('en-US',{maximumFractionDigits:1})+' m';

// Physics and display consume this one shaft, including both exact grip samples.
export const plantedPolePath=s=>poleRig(s).path.map(p=>[p.x,p.y,p.z]);
export function cameraFraming(s,worldY,width,height){
 const ratio=width/height,groundAhead=width<500?.55:ratio<1.1?1:1.55;
 const blend=s.phase==='run'||s.phase==='plant'?0:smooth(0,.75,s.airTime||0);
 return{ahead:groundAhead+((width<500?-.45:groundAhead)-groundAhead)*blend,
  targetY:Math.max(2,worldY+1.65)*(1-blend)+(worldY+(width<500?.4:1))*blend,
  side:3.3+3.7*(s.phase==='run'||s.phase==='plant'?0:smooth(0,1,s.airTime||0))};
}


// Screen-space rows retain their real height anchors but never collide.
export function layoutLandmarkLabels(candidates,minY,maxY,gap=28,maxCount=4){
 const rows=candidates.filter(c=>Number.isFinite(c.y)&&c.y>=minY&&c.y<=maxY).sort((a,b)=>a.y-b.y).slice(0,maxCount);let last=minY-gap;
 return rows.map(c=>{const y=Math.max(c.y,last+gap);last=y;return{...c,anchorY:c.y,y};}).filter(c=>c.y<=maxY);
}
export function createWorld(host){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c3e5df');scene.fog=new THREE.Fog('#c3e5df',36,80);
 let renderer;const probe=document.createElement('canvas');
 try{const gl=probe.getContext('webgl2');if(gl){gl.getExtension('WEBGL_lose_context')?.loseContext();renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}}catch{}
 renderer??=createSoftwareRenderer();renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','橘色背心四肢選手，在連續立體世界中助跑、彎桿、起跳；由街景升向太空。');renderer.domElement.setAttribute('role','img');
 if(!renderer.isSoftware){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;}
 if(getComputedStyle(host).position==='static')host.style.position='relative';
 const labels=document.createElement('canvas');labels.setAttribute('aria-hidden','true');Object.assign(labels.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});host.appendChild(labels);const labelContext=labels.getContext('2d');
 const camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,110);
 const ambient=new THREE.HemisphereLight(0xfffbef,0x688c7b,2.5);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xfff1d7,2.6);sun.position.set(-5,12,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:9,bottom:-6});scene.add(sun);scene.add(sun.target);
 const mats={},material=c=>mats[c]??=new THREE.MeshStandardMaterial({color:c,roughness:.87});
 const boxG=new THREE.BoxGeometry(1,1,1),sphereG=new THREE.SphereGeometry(1,10,7),cylG=new THREE.CylinderGeometry(1,1,1,8),coneG=new THREE.ConeGeometry(1,1,6),octG=new THREE.OctahedronGeometry(1);
 const group=(name,x=0,y=0,z=0)=>{const g=new THREE.Group();g.name=name;g.position.set(x,y,z);scene.add(g);return g;};
 function shape(geo,c,x,y,z,sx,sy,sz,parent=scene){const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const box=(c,x,y,z,w,h,d,parent)=>shape(boxG,c,x,y,z,w,h,d,parent);
 const ball=(c,x,y,z,rx,ry=rx,rz=rx,parent)=>shape(sphereG,c,x,y,z,rx,ry,rz,parent);
 const up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),v1=new THREE.Vector3(),v2=new THREE.Vector3();
 function beam(c,a,b,r=.045,parent=scene){const m=shape(cylG,c,0,0,0,r,1,r,parent);setBeam(m,a,b,r);return m;}
 function setBeam(m,a,b,r){v1.set(...a);v2.set(...b);delta.subVectors(v2,v1);m.position.copy(v1).add(v2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,delta.clone().normalize());m.scale.set(r,Math.max(.001,delta.length()),r);}

 // One continuous miniature landscape. Every summit/roof uses the same altitude
 // transform as the athlete; details are illustrative rather than survey-scale.
 const ground=group('runway-and-landing');
 box('#91b89d',16,-.28,-5,72,.45,35,ground);box('#d88a6c',13,-.035,0,41,.12,5.5,ground);box('#e7a985',13,.035,0,41,.035,1.8,ground);
 for(const z of[-2.5,-.94,.94,2.5])box('#fff2d5',13,.058,z,41,.018,.035,ground);
 for(let x=-4;x<PLANT_X;x+=2)box('#f8ddbb',x,.064,-.64,.04,.018,.23,ground);
 const zone=box('#abd9a0',PLANT_X,.073,0,PLANT_WINDOW,.023,1.79,ground);
 for(const x of[PLANT_X-PLANT_WINDOW/2,PLANT_X+PLANT_WINDOW/2])box('#fcf2d6',x,.09,0,.08,.04,1.8,ground);
 box('#365d64',PLANT_X+.25,.085,0,.53,.08,.54,ground);box('#172e40',PLANT_X+.25,.13,0,.30,.035,.30,ground);
 // An orange three-piece crash pad, not a track finish line.
 for(let i=0;i<3;i++){box(i===1?'#efaf71':'#d87a55',PLANT_X+3.7,.32,-1+i*1.0,5.2,.64,.94,ground);box('#f9c58c',PLANT_X+3.7,.65,-1+i*1.0,5.15,.07,.9,ground);}
 for(let i=0;i<3;i++)box('#fff1ce',PLANT_X+2.25+i*1.2,.69,0,.12,.018,2.8,ground);
 for(const x of[PLANT_X+1.25,PLANT_X+6.15]){box('#2e6c70',x,.58,-2.2,.15,1.15,.15,ground);box('#f8d08a',x,1.05,-2.2,.42,.18,.23,ground);}
 // Park edge, spectator pennants, starting-block rhythm marks.
 for(let x=-3;x<25;x+=4){box('#eae5c8',x,.32,-3.25,3.92,.65,.30,ground);box('#3b827a',x,.68,-3.25,3.96,.09,.37,ground);}
 for(const x of[-2,7,16]){beam('#416e6b',[x,.3,-3.6],[x,3.3,-3.6],.032,ground);const flag=box('#e88b5d',x+.42,3.05,-3.6,.82,.42,.035,ground);flag.rotation.z=-.09;}
 for(let i=0;i<8;i++)ball(i%2?'#80b59a':'#a0c8a1',-6+i*4,.6,-10,2.5,1.0,1.2,ground);

 const landmarkPositions=new Map();
 const mark=(id,x,z)=>{const m=milestones.find(m=>m.id===id);landmarkPositions.set(id,new THREE.Vector3(x,sceneAltitude(m.height),z));return sceneAltitude(m.height);};
 const chairH=mark('chair',PLANT_X-4.6,1.9),chair=group('landmark-chair',PLANT_X-4.6,0,1.9);
 for(const x of[-.26,.26])for(const z of[-.23,.23])box('#ad754f',x,chairH*.27,z,.055,chairH*.54,.055,chair);
 box('#edb765',0,chairH*.54,0,.66,.08,.63,chair);box('#edb765',0,chairH*.88,-.27,.64,chairH*.24,.07,chair);
 for(const x of[-.27,.27])box('#a96f4c',x,chairH*.75,-.27,.055,chairH*.5,.055,chair);
 const busH=mark('bus',PLANT_X-6.0,-5.1),bus=group('landmark-city-bus',PLANT_X-6.0,0,-5.1);
 box('#dfb669',0,busH*.49,0,4.2,busH*.80,1.28,bus);box('#f9e7bd',0,busH*.90,0,4.18,busH*.17,1.3,bus);
 box('#498c8c',0,busH*.65,.65,3.75,busH*.33,.045,bus);
 for(let i=0;i<5;i++)box('#f6dda6',-1.5+i*.73,busH*.65,.69,.065,busH*.36,.045,bus);
 box('#368178',0,busH*.29,.66,4.15,.18,.035,bus);box('#fff0c7',1.95,busH*.35,.62,.15,.12,.12,bus);
 for(const x of[-1.35,1.35])for(const z of[-.57,.57]){const wheel=shape(cylG,'#284b55',x,.27,z,.28,.16,.28,bus);wheel.rotation.x=Math.PI/2;ball('#d8ddcf',x,.27,z>.0?.69:-.69,.12,.12,.05,bus);}
 const treeH=mark('tree',PLANT_X+1.5,-7),tree=group('landmark-big-tree',PLANT_X+1.5,0,-7);
 shape(cylG,'#a9825a',0,treeH*.36,0,.21,treeH*.72,.22,tree);beam('#a9825a',[0,treeH*.4,0],[-.65,treeH*.7,.1],.14,tree);beam('#a9825a',[0,treeH*.5,0],[.7,treeH*.75,0],.12,tree);
 ball('#6a9f79',0,treeH*.79,0,1.25,treeH*.21,1.0,tree);ball('#95b97c',-.83,treeH*.70,.2,.8,.77,.7,tree);ball('#88b582',.85,treeH*.77,.05,.75,.72,.74,tree);
 const aptH=mark('apartment',PLANT_X+6.5,-9),apartment=group('landmark-ten-floor-apartment',PLANT_X+6.5,0,-9);
 box('#d8c99c',0,aptH/2,0,2.8,aptH,1.9,apartment);box('#f3dfb3',0,aptH-.06,0,3.0,.12,2.1,apartment);
 for(let f=0;f<10;f++)for(const x of[-.88,0,.88]){box(f%3===0?'#e3b478':'#6b9c9b',x,.35+f*(aptH-.55)/10,1.0,.48,.36,.04,apartment);box('#efe3be',x,.16+f*(aptH-.55)/10,1.11,.61,.07,.24,apartment);}
 box('#365e64',0,.45,1.0,.6,.9,.05,apartment);


 // Extra low-sky landmarks use distinct silhouettes and alternating background lanes.
 const arcH=mark('arc',PLANT_X+7,-11),arc=group('landmark-arc',PLANT_X+7,0,-11);
 for(const x of[-.95,.95]){box('#d8bf90',x,arcH*.42,0,.9,arcH*.84,1.2,arc);box('#b49670',x,arcH*.28,.62,.55,arcH*.32,.04,arc);}
 box('#ead3a9',0,arcH*.91,0,2.9,arcH*.18,1.4,arc);box('#c8a778',0,arcH*.79,0,2.9,.13,1.44,arc);
 const archCurve=new THREE.TorusGeometry(.62,.15,4,12,Math.PI);const arcTop=shape(archCurve,'#e6cfa3',0,arcH*.57,.5,1,1,1,arc);
 const libertyH=mark('liberty',PLANT_X-5,-9),liberty=group('landmark-liberty',PLANT_X-5,libertyH-4.8,-9);
 box('#bcaa89',0,.55,0,1.65,1.1,1.1,liberty);box('#e0cba5',0,1.13,0,1.85,.12,1.2,liberty);
 shape(new THREE.CylinderGeometry(.32,.65,2.25,7),'#6db09a',0,2.3,0,1,1,1,liberty);ball('#83c2aa',0,3.65,0,.31,.38,.28,liberty);
 for(let i=0;i<7;i++){const a=(i/6)*Math.PI;beam('#99cdb0',[Math.cos(a)*.20,3.84+Math.sin(a)*.16,.02],[Math.cos(a)*.57,3.84+Math.sin(a)*.45,.02],.035,liberty);}
 beam('#6db09a',[.28,3.2,0],[.64,4.35,0],.12,liberty);box('#bb9551',.64,4.43,0,.25,.22,.25,liberty);shape(coneG,'#ffc46c',.64,4.67,0,.16,.26,.16,liberty);
 beam('#6db09a',[-.27,3.2,0],[-.56,2.64,.16],.13,liberty);const tablet=box('#9ac6ab',-.48,2.7,.28,.48,.70,.12,liberty);tablet.rotation.z=-.18;
 const bigH=mark('bigben',PLANT_X+6.8,-8),big=group('landmark-bigben',PLANT_X+6.8,0,-8);
 box('#cda878',0,bigH*.37,0,1.15,bigH*.74,1.15,big);for(const x of[-.42,.42])box('#eee0b7',x,bigH*.37,.59,.10,bigH*.74,.04,big);
 box('#b48f62',0,bigH*.79,0,1.45,bigH*.13,1.45,big);ball('#fff1cb',0,bigH*.79,.74,.48,.48,.035,big);
 beam('#42585b',[0,bigH*.79,.80],[0,bigH*.79+.32,.80],.025,big);beam('#42585b',[0,bigH*.79,.80],[.25,bigH*.79-.12,.80],.025,big);
 shape(new THREE.ConeGeometry(.9,bigH*.15,4),'#4c7a79',0,bigH*.92,0,1,1,1,big);beam('#cfb17d',[0,bigH*.96,0],[0,bigH,0],.035,big);
 const needleH=mark('needle',PLANT_X-5.5,-10),needle=group('landmark-needle',PLANT_X-5.5,0,-10);
 for(const x of[-.72,.72])beam('#d9dfcc',[x,0,0],[x*.28,needleH*.83,0],.08,needle);
 shape(new THREE.CylinderGeometry(1.5,1.05,.35,16),'#e6e2c7',0,needleH*.86,0,1,1,1,needle);shape(new THREE.CylinderGeometry(1.05,1.3,.30,16),'#547f80',0,needleH*.89,0,1,1,1,needle);
 shape(new THREE.ConeGeometry(1.45,.45,16),'#d5c8a7',0,needleH*.92,0,1,1,1,needle);beam('#e8e1bf',[0,needleH*.93,0],[0,needleH,0],.04,needle);
 const gatewayH=mark('gateway',PLANT_X+7,-14),gateway=group('landmark-gateway',PLANT_X+7,0,-14);
 for(let i=0;i<24;i++){const a=i/24*Math.PI,b=(i+1)/24*Math.PI;beam('#b9c9c4',[Math.cos(a)*2.5,Math.sin(a)*gatewayH,0],[Math.cos(b)*2.5,Math.sin(b)*gatewayH,0],.12,gateway);}

 // Four tapered lattice legs and observation decks make the Eiffel silhouette.
 const eiffelH=mark('eiffel',PLANT_X-3.7,-10.5),eiffel=group('landmark-eiffel-tower',PLANT_X-3.7,0,-10.5);
 const levels=[{y:0,r:1.65},{y:eiffelH*.30,r:.86},{y:eiffelH*.56,r:.43},{y:eiffelH*.89,r:.14}];
 for(const sideX of[-1,1])for(const sideZ of[-1,1])for(let i=0;i<levels.length-1;i++){
  const a=levels[i],b=levels[i+1];beam('#947d66',[sideX*a.r,a.y,sideZ*a.r*.55],[sideX*b.r,b.y,sideZ*b.r*.55],i===0?.085:.060,eiffel);
 }
 for(let j=0;j<3;j++){const a=levels[j],b=levels[j+1];for(let k=0;k<3;k++){const t0=k/3,t1=(k+1)/3,y0=a.y+(b.y-a.y)*t0,y1=a.y+(b.y-a.y)*t1,r0=a.r+(b.r-a.r)*t0,r1=a.r+(b.r-a.r)*t1;for(const sign of[-1,1])beam('#af9675',[-r0,y0,sign*r0*.55],[r1,y1,sign*r1*.55],.026,eiffel);}}
 for(const [fraction,r]of[[.30,1.03],[.56,.59],[.89,.27]])box('#b89970',0,eiffelH*fraction,0,r*2,.13,r*1.25,eiffel);
 beam('#b49061',[0,eiffelH*.89,0],[0,eiffelH,0],.045,eiffel);


 const tokyoH=mark('tokyo',PLANT_X+7,-10),tokyo=group('landmark-tokyo',PLANT_X+7,0,-10);
 for(const side of[-1,1]){beam('#d76c4b',[side*1.55,0,0],[side*.32,tokyoH*.66,0],.09,tokyo);beam('#f2e7cd',[side*.32,tokyoH*.66,0],[0,tokyoH,0],.06,tokyo);}
 for(let i=0;i<8;i++){const y=tokyoH*i*.10,r=1.55*(1-i*.10);beam(i%2?'#f4e7ce':'#d76549',[-r,y,0],[r*.88,y+tokyoH*.10,0],.045,tokyo);beam(i%2?'#f4e7ce':'#d76549',[r,y,0],[-r*.88,y+tokyoH*.10,0],.045,tokyo);}
 box('#f0e8d2',0,tokyoH*.47,0,1.4,.28,.8,tokyo);box('#d85f45',0,tokyoH*.72,0,.68,.22,.6,tokyo);beam('#d85f45',[0,tokyoH*.84,0],[0,tokyoH,0],.05,tokyo);

 // Eight flared bamboo sections, green glass, gold corner coins and a spire.
 const taipeiH=mark('taipei101',PLANT_X-4,-8),taipei=group('landmark-taipei-101',PLANT_X-4,0,-8);
 box('#76a79b',0,taipeiH*.12,0,1.75,taipeiH*.24,1.75,taipei);
 const sectionH=taipeiH*.076;
 for(let i=0;i<8;i++){
  const bottom=taipeiH*.24+i*sectionH,wide=1.55-(i>5?(i-5)*.055:0);
  const section=shape(new THREE.CylinderGeometry(wide*.70,wide*.55,sectionH,4),'#64a093',0,bottom+sectionH/2,0,1,1,1,taipei);section.rotation.y=Math.PI/4;
  box('#b4ccb1',0,bottom+sectionH-.025,0,wide+.04,.08,wide+.04,taipei);
  for(const x of[-.40,0,.40])box('#aac6b3',x,bottom+sectionH*.48,wide*.50,.035,sectionH*.65,.025,taipei);
  if(i%2===0)ball('#d1b06d',0,bottom+sectionH*.75,wide*.52,.13,.13,.04,taipei);
 }
 box('#80b0a0',0,taipeiH*.88,0,.55,taipeiH*.065,.55,taipei);beam('#bdd1b0',[0,taipeiH*.9,0],[0,taipeiH,0],.055,taipei);

 // Faceted ridgeline, not another tower. Peak top is exactly the shared benchmark.
 const mountainH=mark('yushan',PLANT_X+.5,-30),mountains=group('landmark-yushan-ridge',PLANT_X+.5,0,-30);
 shape(coneG,'#89b4ad',0,mountainH/2,0,8.5,mountainH,5.5,mountains);
 shape(coneG,'#9dc0b5',-7,mountainH*.33,-3,7,mountainH*.66,4,mountains);
 shape(coneG,'#759e9c',6,mountainH*.36,2,6,mountainH*.72,4,mountains);
 shape(coneG,'#dce5d1',0,mountainH*.94,0,1.03,mountainH*.12,.67,mountains);


 // Mountain elevations compare sea-level figures; these miniature profiles are
 // intentionally different, not five copies of a cone. Nearby peaks flank the runner.
 const fujiH=mark('fuji',PLANT_X-5,-14),fuji=group('landmark-fuji',PLANT_X-5,fujiH-5,-14);
 shape(new THREE.ConeGeometry(3.8,5,20),'#779fa5',0,2.5,0,1,1,.6,fuji);
 shape(new THREE.ConeGeometry(1.3,1.7,20),'#eeeade',0,4.15,0,1,1,.6,fuji);box('#e1e0cf',0,4.94,0,.30,.12,.20,fuji);
 const blancH=mark('montblanc',PLANT_X+7,-14),blanc=group('landmark-montblanc',PLANT_X+7,blancH-4,-14);
 ball('#b4c9cb',0,1.8,0,3.6,2.2,1.5,blanc);ball('#f0eee0',0,2.65,.1,2.5,1.35,1.2,blanc);ball('#d8e4dc',-2,1.9,.1,1.5,1.1,.8,blanc);
 for(const x of[-1.3,-.4,.7])beam('#a3bac2',[x,1.1,1.1],[x+.4,3.25,1.1],.07,blanc);
 const kiliH=mark('kilimanjaro',PLANT_X-5,-15),kili=group('landmark-kilimanjaro',PLANT_X-5,kiliH-4,-15);
 shape(new THREE.CylinderGeometry(1.7,4,3.6,12),'#a58e7e',0,1.8,0,1,1,.58,kili);
 shape(new THREE.CylinderGeometry(1.55,1.7,.40,12),'#eee3ce',0,3.8,0,1,1,.58,kili);ball('#928b7f',0,4,.1,1.0,.025,.35,kili);
 const everH=mark('everest',PLANT_X+6.5,-15),ever=group('landmark-everest',PLANT_X+6.5,everH-5.5,-15);
 const summit=shape(new THREE.ConeGeometry(3.0,5.5,3),'#91a8b3',0,2.75,0,1,1,.7,ever);summit.rotation.y=.28;
 const snow=shape(new THREE.ConeGeometry(1.2,2.2,3),'#e8eee4',0,4.4,0,1,1,.7,ever);snow.rotation.y=.28;
 shape(new THREE.ConeGeometry(1.8,3.5,4),'#a8bec5',-2.1,1.75,.1,1,1,.65,ever);shape(new THREE.ConeGeometry(1.6,3,4),'#738e9e',2,1.5,-.2,1,1,.65,ever);

 // Real-height crossings share the athlete floor datum. Background-relative
 // separation is stylized; neighbourhood weights only control distance/haze.
 const additions=createSceneryModels({group,box,ball,beam,shape,coneG,cylG});
 const sceneryById={chair,bus,tree,apartment,arc,liberty,bigben:big,needle,gateway,eiffel,tokyo,taipei101:taipei,yushan:mountains,fuji,montblanc:blanc,kilimanjaro:kili,everest:ever,...additions};
 mountains.scale.y=.20;mountains.position.y=mountainH*.80;
 const scenery=[];
 for(const entry of catalog){const model=sceneryById[entry.id];if(!model)continue;
  model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);let highest=null;
  model.traverse(o=>{const a=o.geometry?.attributes?.position;if(!a)return;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(!highest||v.y>highest.y)highest=v;}});
  model.userData.sceneryId=entry.id;if(entry.height){model.userData.comparisonId=entry.id;model.userData.referenceHeight=entry.height;}
  model.userData.comparisonTopLocal=model.worldToLocal(highest.clone());
  const originalScale=model.scale.clone(),baseLocal=(bounds.min.y-model.position.y)/model.scale.y;
  const footCenter=model.worldToLocal(new THREE.Vector3((bounds.min.x+bounds.max.x)/2,bounds.min.y,(bounds.min.z+bounds.max.z)/2));
  const footWidth=(bounds.max.x-bounds.min.x)/model.scale.x,footDepth=(bounds.max.z-bounds.min.z)/model.scale.z;
  const foundation=entry.category==='building'?box('#b5bba3',0,0,0,1,1,1,model):entry.category==='mountain'?shape(new THREE.CylinderGeometry(1,8,1,8),'#91aaa0',0,0,0,1,1,1,model):null;
  if(foundation)foundation.userData.sceneryFoundation=true;
  model.traverse(o=>{if(!o.isMesh)return;o.material=o.material.clone();o.userData.sceneryColor=o.material.color.clone();});
  model.visible=false;scenery.push({entry,model,originalScale,originalPosition:model.position.clone(),templateWidth:Math.max(.1,bounds.max.x-bounds.min.x),templateHeight:Math.max(.1,bounds.max.y-bounds.min.y),baseLocal,footCenter,footWidth,footDepth,foundation});
 }
 let activeShowcase=null,activeJourney=null;
 const skyLayers=createSkyLayers(scene);
 const clouds=group('layered-clouds');
 for(let i=0;i<15;i++){const y=5+i*1.65,x=PLANT_X+Math.sin(i*2.3)*11,z=-13-(i%3)*4;
  ball(i%3?'#edf0d9':'#d5e5d5',x,y,z,1.4+(i%3)*.3,.28,.7,clouds);ball('#f1f1df',x-.7,y+.15,z,.76,.36,.54,clouds);ball('#edf0dd',x+.6,y+.12,z,.86,.32,.61,clouds);}
 const spaceH=mark('space',PLANT_X+3,-8),space=group('orbital-world');
 // Earth limb enters from below in the same ascending world.
 ball('#8bc9bf',PLANT_X+1,spaceH-15,-42,23,12,10,space);ball('#b2d4b5',PLANT_X-7,spaceH-7.7,-33,7,2.8,1.4,space);ball('#a5cfae',PLANT_X+9,spaceH-8.1,-33,6,2.1,1.1,space);
 for(let i=0;i<5;i++)ball('#d4e5d6',PLANT_X-15+i*7,spaceH-4.9+Math.sin(i)*.6,-31,3.5,.17,.5,space);
 const stars=group('endless-fixed-starfield');
 for(let i=0;i<85;i++){const x=PLANT_X-25+((i*17)%53),y=26+((i*23)%70)*.55,z=-19-((i*7)%20);const r=i%7===0?.075:.035;shape(octG,i%5?'#f3efce':'#efa66f',x,y,z,r,r,r,stars);}
 const satelliteH=mark('satellite',PLANT_X-3.0,-5),satellite=group('orbital-satellite',PLANT_X-3,satelliteH-.45,-5);
 box('#e4dfc2',0,0,0,.75,.60,.55,satellite);beam('#bac7bc',[-2.1,0,0],[2.1,0,0],.047,satellite);
 for(const side of[-1,1]){box('#e4b978',side*1.45,0,0,1.8,.10,1.2,satellite);for(let j=0;j<4;j++)box('#47667a',side*(.80+j*.43),.065,0,.36,.04,1.10,satellite);}
 beam('#c6d3ca',[0,.25,0],[0,.75,.2],.035,satellite);shape(coneG,'#f4e6c9',0,.75,.2,.30,.16,.30,satellite);
 const fantasyPlanet=group('fantasy-ringed-planet',PLANT_X+5,43,-13);ball('#e1ac7e',0,0,0,1.8,1.8,1.8,fantasyPlanet);
 const ring=shape(new THREE.TorusGeometry(2.55,.12,5,40),'#efd2a3',0,0,0,1,1,1,fantasyPlanet);ring.rotation.x=1.10;ring.rotation.y=.12;
 ball('#81b5b0',PLANT_X-7,48,-20,1.0,1.0,1.0,space);
 const moonH=mark('moon',PLANT_X+4,-5),moon=group('moon-finale',PLANT_X+4,moonH-1.25,-5);ball('#e8e5c7',0,0,0,1.25,1.25,1.25,moon);
 for(const [x,y,z,r]of[[-.4,.35,1.02,.23],[.42,-.2,1.1,.28],[.32,.65,.91,.14],[-.5,-.5,.89,.19]])ball('#c4c9ad',x,y,z,r,r,.06,moon);
 beam('#a1aaa0',[0,1.15,0],[0,1.95,0],.025,moon);const moonFlag=box('#e88b5d',.27,1.77,0,.54,.25,.025,moon);moonFlag.rotation.z=-.06;

 // Fixed-count cosmetic weather; never feeds wind, lift, energy or input.
 const rain=group('cosmetic-rain'),rainMaterial=new THREE.MeshBasicMaterial({color:'#6d929d',transparent:true,opacity:0,depthWrite:false});
 for(let i=0;i<24;i++){const drop=new THREE.Mesh(boxG,rainMaterial);drop.scale.set(.014,.27,.014);drop.rotation.z=-.13;rain.add(drop);}
 for(const layer of[clouds,space,stars,satellite,fantasyPlanet,moon])layer.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=false;}});
 const character=createCharacter(THREE,scene);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.46,16),new THREE.MeshBasicMaterial({color:'#594e3d',transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.08;scene.add(shadow);
 const pole=group('spring-pole'),poleSegments=Array.from({length:32},(_,i)=>shape(cylG,i%5===0?'#ee985f':'#f6edcf',0,0,0,.035,1,.035,pole));
 const poleTip=ball('#547d79',0,0,0,.07,.07,.07,pole);
 // Fixed mesh count: telescoping uprights, not a growing stack per metre.
 const standards=group('rising-vault-standards');
 const uprights=[-2.3,2.3].map(z=>beam('#2c7376',[PLANT_X+2,0,z],[PLANT_X+2,3,z],.065,standards));
 const crossbar=beam('#ef915c',[PLANT_X+2,3,-2.45],[PLANT_X+2,3,2.45],.047,standards);crossbar.name='earned-height-crossbar';
 const collars=[-2.3,2.3].map(z=>ball('#f9df8d',PLANT_X+2,3,z,.13,.10,.13,standards));

 const streaks=group('ascent-speed-trails');for(let i=0;i<6;i++){const m=box(i%2?'#f8d9a1':'#e6edcd',0,0,0,.035,.5+(i%3)*.25,.035,streaks);m.material=m.material.clone();m.material.transparent=true;m.material.depthWrite=false;}
 let width=1,height=1,lastState=null;
 function size(w,h){width=w;height=h;renderer.setSize(w,h,false);const dpr=Math.min(globalThis.devicePixelRatio||1,2);labels.width=Math.round(w*dpr);labels.height=Math.round(h*dpr);labelContext.setTransform(dpr,0,0,dpr,0,0);}
 const resize=()=>{const bounds=host.getBoundingClientRect();size(Math.max(1,bounds.width),Math.max(1,bounds.height));if(lastState)render(lastState);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const skyGround=new THREE.Color('#c3e5df'),skyHigh=new THREE.Color('#80adb4'),skyOrbit=new THREE.Color('#263e59'),skyDeep=new THREE.Color('#182b43');
 function drawLabels(altitude){
  const ctx=labelContext;ctx.clearRect(0,0,width,height);const mobile=width<500;
  if(activeShowcase){const item=activeJourney?.altitude>=45000?{...activeJourney.main,category:'journey'}:activeShowcase.main,neighbour=activeShowcase.items.find(m=>m.height&&m.group===item.group&&m.id!==item.id&&m.weight>.1);
   const title=(item.category==='building'||item.category==='mountain'?'高度對照 · ':item.category==='airborne'?'飛行景觀 · ':'天空旅程 · ')+item.label;
   const reference=item.category==='journey'?(item.fantasy?'幻想彩蛋 · 不影響成績':'景觀示意 · 不作高度基準'):neighbour?`${item.category==='mountain'?'海拔比較 · ':''}${item.height.toLocaleString('en-US')} m ／ ${neighbour.label} ${neighbour.height.toLocaleString('en-US')} m`:(sceneryCaption(item).startsWith(item.label+' · ')?sceneryCaption(item).slice(item.label.length+3):sceneryCaption(item));
   ctx.font=`700 ${mobile?11:13}px system-ui, sans-serif`;ctx.textBaseline='middle';const tw=Math.max(ctx.measureText(title).width,ctx.measureText(reference).width),w=Math.min(width-16,tw+20),x=(width-w)/2;
   ctx.fillStyle='rgba(255,248,224,.94)';ctx.beginPath();ctx.roundRect(x,10,w,44,7);ctx.fill();ctx.fillStyle='#365c64';ctx.textAlign='center';ctx.fillText(title,width/2,24);ctx.font=`600 ${mobile?10:11}px system-ui, sans-serif`;ctx.fillText(reference,width/2,43);ctx.textAlign='left';
  }
  const mountainRefs=activeShowcase?.items.filter(m=>m.category==='mountain'&&m.weight>.1)||[];
  if(mountainRefs.length&&activeShowcase.main.category!=='mountain'){const text='海拔比較（非離地山高） · '+mountainRefs.slice(0,2).map(m=>m.label+' '+Math.round(m.height).toLocaleString('en-US')+'m').join(' ／ ');ctx.font=`600 ${mobile?9:11}px system-ui`;ctx.fillStyle='rgba(255,248,224,.9)';ctx.beginPath();ctx.roundRect(8,height-43,width-16,22,5);ctx.fill();ctx.fillStyle='#365c64';ctx.fillText(text,14,height-29);}
  if(activeJourney?.altitude>=45000){ctx.font=`600 ${mobile?10:12}px system-ui, sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(247,233,198,.90)';ctx.fillText(activeJourney.main.note,width/2,height-43,width-24);ctx.textAlign='left';}
  if(altitude>=100000){ctx.font=`600 ${mobile?9:11}px system-ui, sans-serif`;ctx.fillStyle='rgba(247,233,198,.75)';ctx.fillText('太空想像 · 行星為遠方背景',mobile?13:22,height-21);}
 }
 function render(s){
  lastState=s;const altitude=Math.max(0,s.altitude??((s.y??1.18)-1.18)),display=vaultDisplay(s),worldY=display.worldY,ratio=width/height,viewHeight=ratio<.8?8.0:ratio<1.1?7.2:6.4,viewWidth=viewHeight*ratio;
  const offsetX=vaultOffsetX(s,PLANT_X),visualX=s.x+offsetX;
  camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  const framing=cameraFraming(s,worldY,width,height),targetX=visualX+framing.ahead,targetY=framing.targetY;
  camera.position.set(targetX+framing.side,targetY+2.15,13.5);camera.lookAt(targetX,targetY,0);camera.updateMatrixWorld(true);
  activeShowcase=altitudeScene(s);activeJourney=skyJourney(s);const atmosphere=environment({...s,altitude:activeJourney.altitude});
  const sky=new THREE.Color().setRGB(...atmosphere.sky,THREE.SRGBColorSpace);sky.lerp(new THREE.Color('#1c4057'),smooth(25000,95000,activeJourney.altitude)*(1-atmosphere.space)*.65);scene.background.copy(sky);scene.fog.color.copy(sky);
  skyLayers.update({journey:activeJourney,camera,width,height,time:s.t||0});
  for(const item of scenery){
   const exhibit=activeShowcase.items.find(m=>m.id===item.entry.id),model=item.model;
   model.visible=!!exhibit;model.userData.sceneryRole=exhibit?.role??null;if(!exhibit){model.position.copy(item.originalPosition);model.scale.copy(item.originalScale);model.userData.showcaseScale=0;continue;}
   const p=landmarkPose(exhibit,width<500),pair=exhibit.clusterSize||1,targetWidth=item.entry.category==='mountain'?(width<500?2.8:4.8)/Math.sqrt(pair):item.entry.category==='building'?(width<500?2.2:3.1)/Math.sqrt(pair):width<500?2.25:3.0;
   const scale=p.scale*targetWidth/item.templateWidth;model.scale.copy(item.originalScale).multiplyScalar(scale);
   if(exhibit.height)model.scale.y=item.originalScale.y*Math.min(scale,p.scale*(item.entry.category==='mountain'?3.5:7.4)/item.templateHeight);
   model.userData.showcaseScale=p.scale;
   const top=model.userData.comparisonTopLocal,z=p.z,roofX=visualX+z*framing.side/13.5+p.lane;
   const targetY=exhibit.height?landmarkRoofY(exhibit,activeShowcase.altitude,s.phase==='run'||s.phase==='plant'?0:smooth(0,.75,s.airTime||0)):worldY+1.8+Math.sin((s.t||0)*.2)*.1;
   // Background-only relative separation keeps the exact real-H floor crossing.
   // Rear-depth compensation must not add another screen-row offset.
   const desired=new THREE.Vector3(visualX,targetY,0).project(camera),actual=new THREE.Vector3(roofX,targetY,z).project(camera),unit=new THREE.Vector3(roofX,targetY+1,z).project(camera).y-actual.y;
   const roofY=targetY+(desired.y-actual.y)/unit;
   model.position.set(roofX-top.x*model.scale.x,roofY-top.y*model.scale.y,z-top.z*model.scale.z);
   if(item.foundation){const base=model.position.y+item.baseLocal*model.scale.y;item.foundation.visible=base>0;
    item.foundation.position.set(item.footCenter.x,(base/2-model.position.y)/model.scale.y,item.footCenter.z);
    item.foundation.scale.set(item.footWidth*(item.entry.category==='mountain'?.5:1),Math.max(.001,base)/model.scale.y,item.footDepth*(item.entry.category==='mountain'?.5:1));
   }
   animateScenery(model,s.t||0);model.traverse(o=>{if(!o.isMesh||!o.userData.sceneryColor)return;
    const near=smooth(.28,.85,p.scale),foot=o.userData.sceneryFoundation;
    o.material.color.copy(o.userData.sceneryColor).lerp(sky,foot?.99*(1-near):(1-p.scale)*.50);
    o.material.opacity=p.opacity*(foot?.01+.99*near:1);o.material.transparent=o.material.opacity<1;o.material.depthWrite=o.material.opacity>=.999;
   });
  }
  // Distant wisps drift more gently than the architecture, without touching camera.
  clouds.visible=atmosphere.clouds>.00001;clouds.position.y=worldY*.12;clouds.traverse(o=>{if(o.isMesh)o.material.opacity=atmosphere.clouds;});

  sun.position.set(visualX-5,worldY+12,9);sun.target.position.set(visualX,worldY,0);ambient.intensity=1.8+.7*atmosphere.day;sun.intensity=1.2+1.4*atmosphere.day;
  const points=display.points;const padLift=!s.scoreLocked&&visualX>PLANT_X+1&&(s.falling||s.phase==='land'||s.phase==='done')?.65*(1-smooth(.3,1.8,worldY)):0;for(const p of Object.values(points)){p.x+=offsetX;p.y+=padLift;}character.update(points,s);
  shadow.position.x=visualX;shadow.visible=worldY<1.8;shadow.scale.setScalar(Math.max(.4,1-worldY*.3));
  zone.material.color.set(s.phase==='plant'?'#edbd71':'#abd9a0');
  // A single analytic curve survives carry -> plant -> recoil; after release
  // the unloaded straight pole falls away around its planted tip.
  let path;
  if(s.phase==='run'||s.phase==='plant'||s.phase==='air'&&s.airTime<.34)path=poleRig(s).path;
  else{
   const frozen={...s,x:s.launchX+.35,y:s.launchY+.95,lean:.10,phase:'air',airTime:.34};
   const rig=poleRig(frozen),angle=Math.min(1.5,Math.max(0,(s.airTime||0)-.34))*1.8,ca=Math.cos(angle),sa=Math.sin(angle);
   path=rig.path.map(p=>{const x=p.x-rig.tip.x,y=p.y-rig.tip.y;return{x:rig.tip.x+x*ca-y*sa,y:Math.max(.14,rig.tip.y+x*sa+y*ca),z:p.z};});
  }
  pole.visible=worldY<6&&s.phase!=='finish';poleSegments.forEach((m,i)=>{const a=path[i],b=path[i+1];setBeam(m,[a.x,a.y,a.z],[b.x,b.y,b.z],.033);});poleTip.position.set(path[0].x,path[0].y,path[0].z);
  const barY=display.barY,barX=(s.barX||PLANT_X+2)+offsetX,bottom=Math.max(0,barY-8);
  standards.visible=s.phase!=='run'||s.x>10;
  uprights.forEach((m,i)=>setBeam(m,[barX,bottom,i===0?-2.3:2.3],[barX,barY+.3,i===0?-2.3:2.3],.065));
  const drop=s.hitBar?Math.min(1,(s.finishTime||0)*.6):0;
  setBeam(crossbar,[barX,barY-drop,-2.45],[barX+.12*drop,barY-drop*1.8,2.45],.047);crossbar.material.color.set(s.hitBar?'#c85d49':s.finishAttempted?'#e3a239':'#ef915c');
  collars.forEach((m,i)=>m.position.set(barX,barY,i===0?-2.3:2.3));
  const earthRecede=smooth(6,9,Math.log10(Math.max(1,activeJourney.altitude))),earthScale=viewWidth*(1.6-1.35*earthRecede)/46;
  space.visible=atmosphere.space>.00001;space.scale.setScalar(earthScale);space.position.copy(skyAnchor(camera,-.15-.45*earthRecede,-1.58+.78*earthRecede,-48)).sub(new THREE.Vector3(PLANT_X+1,spaceH-15,-42).multiplyScalar(earthScale));space.traverse(o=>{if(o.isMesh)o.material.opacity=atmosphere.space*(1-.25*earthRecede);});
  stars.visible=atmosphere.stars>.00001;stars.position.set(visualX-PLANT_X+.2*Math.sin(worldY*.2),worldY-38+.35*Math.sin(worldY*.3),0);stars.traverse(o=>{if(o.isMesh)o.material.opacity=atmosphere.stars;});
  const satelliteFade=smooth(250000,400000,altitude)*(1-smooth(700000,1400000,altitude));satellite.visible=satelliteFade>.00001;satellite.position.copy(skyAnchor(camera,-.64,-.12,-24));satellite.scale.setScalar(Math.min(viewWidth*.23,viewHeight*.22)/4.3);satellite.traverse(o=>{if(o.isMesh)o.material.opacity=satelliteFade;});
  const planetDepth=-40,planetLane=width<500?1.8:4.2,planetX=visualX+planetDepth*framing.side/13.5+planetLane,planetY=worldY+2+2.15*(framing.side*(planetX-visualX)+13.5*planetDepth)/(framing.side*framing.side+13.5*13.5);
  fantasyPlanet.visible=atmosphere.space>.00001;fantasyPlanet.position.copy(skyAnchor(camera,-.67,.62,-38));fantasyPlanet.scale.setScalar(Math.min(viewWidth*.21,viewHeight*.24)/5.35);fantasyPlanet.rotation.y=(s.t||0)*.015;fantasyPlanet.traverse(o=>{if(o.isMesh)o.material.opacity=atmosphere.space*.42;});
  const moonVisit=activeJourney.items.find(x=>x.id==='lunar'),moonProgress=moonVisit?.progress??0;
  moon.visible=atmosphere.space>.5&&activeJourney.altitude<1.1e9;moon.position.copy(skyAnchor(camera,.65,.29-moonProgress*.6,-27));moon.scale.setScalar(Math.min(viewWidth*(.07+activeJourney.moon*(width<500?.20:.29)),viewHeight*.45)/2.5);moon.traverse(o=>{if(o.isMesh)o.material.opacity=atmosphere.space*(.38+activeJourney.moon*.62)*(1-smooth(8e8,1.1e9,activeJourney.altitude));});
  rain.visible=atmosphere.rain>.001;rainMaterial.opacity=atmosphere.rain*.24;rain.children.forEach((m,i)=>m.position.set(visualX-viewWidth*.7+(i*.618%1)*viewWidth*1.4,worldY+viewHeight*.7-((i*.37+(s.t||0)*1.1)%1)*viewHeight*1.4,-4));
  const trailFade=1-smooth(45000,100000,altitude);streaks.visible=s.phase==='air'&&s.vy>0&&altitude>15&&trailFade>.00001;streaks.children.forEach(m=>m.material.opacity=trailFade);
  streaks.children.forEach((m,i)=>m.position.set(visualX+(i%2?1:-1)*(1.5+i*.15),worldY-.4+((i*.53+(s.t||0)*3)%2.5),-.6));
  renderer.render(scene,camera);drawLabels(altitude);
  if(standards.visible&&(s.phase==='air'||s.phase==='finish')&&!s.falling){const q=new THREE.Vector3(barX,barY+.55,0).project(camera),ctx=labelContext;ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillStyle=altitude>30000?'#fff0be':'#365c64';ctx.fillText((s.finishAttempted?'鎖定橫桿 ':'上升橫桿 ')+formatHeight(s.barHeight),clamp((q.x+1)*width/2,65,width-65),clamp((1-q.y)*height/2,120,height-35));ctx.textAlign='left';}
 }
 return{renderer,scene,camera,character,render,resize,get software(){return !!renderer.isSoftware;},capture(s){
  const oldW=width,oldH=height,oldState=lastState;size(1000,550);render(s);const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=550;const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0,1000,550);ctx.drawImage(labels,0,0,1000,550);size(oldW,oldH);render(oldState??s);return canvas;
 }};
}
