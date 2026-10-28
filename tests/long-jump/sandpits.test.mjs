import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/long-jump/vendor/three.module.min.js';
import {fresh,pose,BOARD,PIT,step,result} from '../../public/games/long-jump/physics.mjs';
const module=await import('../../public/games/long-jump/sandpits.mjs').catch(()=>({}));
const make=()=>{assert.equal(typeof module.createSandpits,'function','visual sandpit scene module is available');return module.createSandpits(THREE,new THREE.Scene());};
const named=(pit,name)=>{const object=pit.group.getObjectByName(name);assert.ok(object,`missing ${name}`);return object;};
const landed=(part,x=110)=>({...fresh(),x,phase:'land',jumped:true,firstPart:part,landingPart:part,landingWorldX:x,landTime:.02});

test('ordinary pit begins beyond board and has a finite length that skilled flights can leave',()=>{
 const pits=make(),state=fresh();pits.update(state,pose(state));
 const fixed=named(pits,'ordinary-sandpit');const bounds=new THREE.Box3().setFromObject(fixed);
 assert.ok(bounds.min.x>BOARD);assert.ok(bounds.min.x<=PIT);assert.ok(bounds.max.x<PIT+9);
 assert.equal(named(pits,'delivered-sandpit').visible,false);pits.dispose();
});
test('far pit is absent in high flight, slides toward low descent, and stops animating while paused',()=>{
 const pits=make(),state={...fresh(),x:110,y:8,vy:1,vx:8,phase:'air',jumped:true};
 pits.update(state,pose(state),{elapsed:.1});const delivered=named(pits,'delivered-sandpit');assert.equal(delivered.visible,false);
 state.y=2.1;state.vy=-3;pits.update(state,pose(state),{elapsed:.01});assert.equal(delivered.visible,true);
 const first=delivered.position.x;pits.update(state,pose(state),{elapsed:.1});assert.ok(delivered.position.x<first,'pit must visibly slide in, not teleport');
 const paused=delivered.position.x;pits.update(state,pose(state),{elapsed:.2,paused:true});assert.equal(delivered.position.x,paused);pits.dispose();
});
test('existing first contact selects distinct persistent marks without changing landed physics or pose',()=>{
 for(const [part,kind] of [['左腳','feet'],['屁股','seat'],['額頭','head'],['左手','body']]){
  const pits=make(),state=landed(part),before=structuredClone(state),points=pose(state),pointsBefore=structuredClone(points);
  pits.update(state,points,{elapsed:.02});assert.deepEqual(state,before);assert.deepEqual(points,pointsBefore);
  const impact=named(pits,'sand-impact');assert.equal(impact.visible,true);assert.equal(impact.userData.kind,kind);
  assert.ok(impact.children.some(o=>o.visible&&o.name.startsWith(kind+'-')),'matching impression visible');
  state.phase='done';state.landTime=1.01;pits.update(state,pose(state),{elapsed:.02});
  assert.equal(impact.visible,true);assert.ok(named(pits,'sand-spray').children.some(o=>o.visible),'sand spray survives until real result capture');pits.dispose();
 }
});
test('a result reached before a render still has its receiving pit and impact before capture',()=>{
 const pits=make(),state={...landed('額頭',250),phase:'done',landTime:1.01};pits.update(state,pose(state));
 assert.equal(named(pits,'delivered-sandpit').visible,true);assert.equal(named(pits,'delivered-sandpit').position.x,250);
 assert.equal(named(pits,'sand-impact').visible,true);pits.dispose();
});
test('pit and marks retain world location through a physics-origin rebase',()=>{
 const pits=make(),state=landed('屁股',520);pits.update(state,pose(state));
 const world=named(pits,'sand-impact').position.x;state.x-=512;state.origin+=512;pits.update(state,pose(state));
 assert.equal(named(pits,'sand-impact').position.x+state.origin,world);
 assert.equal(named(pits,'delivered-sandpit').position.x+state.origin,520);pits.dispose();
});
test('early falls do not fabricate a distant pit, and retry clears all previous landing effects',()=>{
 const pits=make(),early={...landed('額頭',-10),fallen:true};pits.update(early,pose(early));
 assert.equal(named(pits,'delivered-sandpit').visible,false);assert.equal(named(pits,'sand-impact').visible,false);
 const state=landed('屁股');pits.update(state,pose(state));pits.reset();pits.update(fresh(),pose(fresh()));
 assert.equal(named(pits,'delivered-sandpit').visible,false);assert.equal(named(pits,'sand-impact').visible,false);
 assert.ok(named(pits,'sand-spray').children.every(o=>!o.visible));pits.dispose();
});
test('thousands of world updates reuse bounded geometry and never change an actual physics outcome',()=>{
 const pits=make(),state=fresh(),control=fresh();let meshes=0;pits.group.traverse(o=>{if(o.isMesh)meshes++;});
 for(let n=0;n<1500;n++){const input=[n%40<20,n%40>=20,n%40>=20,n%40<20];step(state,input);step(control,input);pits.update(state,pose(state),{elapsed:1/120});}
 assert.deepEqual(state,control);assert.deepEqual(result(state),result(control));let after=0;pits.group.traverse(o=>{if(o.isMesh)after++;});assert.equal(after,meshes);assert.ok(after<160);pits.dispose();
});

import {trial} from './v8-scenarios.mjs';
import {createCharacter} from '../../public/games/long-jump/character.mjs';
const sandBounds=(pits)=>{pits.group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(named(pits,'delivered-sandpit').getObjectByName('sand-bed'));};
const worldPosition=object=>object.getWorldPosition(new THREE.Vector3());
test('real five-second rhythm landing fits the full rendered body rather than ending 0.43 unit before its foremost endpoint',()=>{
 const pits=make(),s=trial({air:'rhythm',flightSeconds:5,maxSeconds:20}),before=structuredClone(s),points=pose(s),character=createCharacter(THREE,new THREE.Scene());
 assert.equal(s.phase,'done');assert.ok(Math.max(...Object.values(points).map(p=>p.x+s.origin))-s.landingWorldX>4);
 character.update(points,s);pits.update(s,points);const sand=sandBounds(pits),body=character.bounds();
 assert.ok(sand.max.x>=body.max.x+.1,`pit ${sand.max.x} must cover foremost skin ${body.max.x}`);assert.ok(sand.min.x<=body.min.x-.1);assert.ok(sand.max.x-sand.min.x<12,'finite small pit');
 assert.ok(sand.min.x<=s.landingWorldX-s.origin-.5,'first-contact mark stays on sand');assert.deepEqual(s,before);pits.dispose();
});
test('both footprint depressions and their pushed-sand rims follow actual feet during the landing slide',()=>{
 const pits=make(),s=trial({flightSeconds:5,maxSeconds:20});const first={...s,x:s.x-2,phase:'land',landTime:.02};pits.update(first,pose(first));pits.update(s,pose(s),{elapsed:.1});
 const impact=named(pits,'sand-impact'),points=pose(s);impact.updateMatrixWorld(true);
 for(let i=0;i<2;i++){
  const mark=impact.getObjectByName('feet-'+(i?'right':'left')),rim=impact.children.filter(x=>x.name==='feet-pushed-sand')[i];
  assert.ok(Math.abs(worldPosition(mark).x-points['foot'+i].x)<1e-8,'current foot depression');assert.ok(Math.abs(worldPosition(rim).x-points['foot'+i].x)<1e-8,'rim must surround same footprint');
 }
 pits.dispose();
});
test('head and seated impressions meet their real contacting part without changing first-contact anchor',()=>{
 for(const [part,kind,key,markName] of [['額頭','head','head','head-crater'],['屁股','seat','hip','seat-depression']]){
  const pits=make(),s=landed(part,112);s.landingWorldX=110;pits.update(s,pose(s));
  const impact=named(pits,'sand-impact');impact.updateMatrixWorld(true);assert.equal(impact.position.x,110);assert.ok(Math.abs(worldPosition(impact.getObjectByName(markName)).x-pose(s)[key].x)<1e-8,kind+' under actual part');pits.dispose();
 }
});
test('short landing crossing the ordinary pit end is received rather than leaving the forward foot outside',()=>{
 const pits=make(),s=landed('左腳',18);s.landingWorldX=17;pits.update(s,pose(s));
 const delivered=named(pits,'delivered-sandpit');assert.equal(delivered.visible,true);assert.ok(sandBounds(pits).max.x>pose(s).foot0.x+.2);pits.dispose();
});
test('full receiving pit and marks survive real first-contact and settled origin rebases',()=>{
 const pits=make();let previous=null,landedFrames=0;
 const s=trial({flightSeconds:309.175,maxSeconds:330,onStep(s){if(s.phase==='land'||s.phase==='done'){pits.update(s,pose(s),{elapsed:1/120});landedFrames++;const sand=sandBounds(pits);for(const p of Object.values(pose(s)))assert.ok(p.x>=sand.min.x+.1&&p.x<=sand.max.x-.1);const anchor=named(pits,'sand-impact').position.x+s.origin;if(previous!==null)assert.ok(Math.abs(anchor-previous)<1e-8);previous=anchor;}}});
 assert.ok(s.origin>0);assert.ok(landedFrames>100);assert.ok(Math.abs(previous-s.landingWorldX)<1e-8);pits.dispose();
});

test('a jump touching down before the pit never gains fake sand just because its body later slides across the board',()=>{
 const pits=make(),s=landed('左腳',PIT+1);s.landingWorldX=PIT-1;pits.update(s,pose(s));assert.equal(named(pits,'sand-impact').visible,false);assert.equal(named(pits,'delivered-sandpit').visible,false);pits.dispose();
});
test('geometry, material and particle pools remain bounded across long flights, repeated landings and disposal',()=>{
 const scene=new THREE.Scene(),pits=module.createSandpits(THREE,scene);const pool=()=>{const geometry=new Set(),material=new Set();let meshes=0;pits.group.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);material.add(o.material);meshes++;}});return{geometry,material,meshes};};const before=pool();
 for(let i=0;i<90;i++){const s=landed(['左腳','額頭','屁股'][i%3],100+i*10000);pits.update(s,pose(s),{elapsed:.1});assert.ok(named(pits,'delivered-sandpit').scale.x<=10/7.2);pits.reset();}
 const after=pool();assert.deepEqual(after,before);assert.equal(named(pits,'sand-spray').children.length,32);let disposed=0;for(const g of before.geometry)g.addEventListener('dispose',()=>disposed++);for(const m of before.material)m.addEventListener('dispose',()=>disposed++);pits.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,before.geometry.size+before.material.size);
});
test('landing effects do not change live simulation or final score across the cosmic boundary input stream',()=>{
 const pits=make(),control=fresh();let frames=0;const s=trial({flightSeconds:309.175,maxSeconds:330,onStep(s,input){step(control,input);pits.update(s,pose(s),{elapsed:1/120});assert.deepEqual(s,control);frames++;}});assert.ok(frames>30000);assert.deepEqual(result(s),result(control));pits.dispose();
});

import {cameraFrame} from '../../public/games/long-jump/physics.mjs';
import {gameLayout,renderCameraBounds} from '../../public/games/long-jump/layout.mjs';
import {paintScoreCard} from '../../public/games/long-jump/capture.mjs';
test('unchanged portrait and landscape result crop contains the complete athlete and its current contact impression',()=>{
 const cases=[trial({air:'left',flightSeconds:1.5,maxSeconds:20}),trial({air:'rhythm',flightSeconds:5,maxSeconds:20}),trial({air:'left',flightSeconds:1,maxSeconds:20}),trial({flightSeconds:309.175,maxSeconds:330})];
 for(const s of cases)for(const viewport of [[390,844],[844,390],[1280,800]]){
  const l=gameLayout({width:viewport[0],height:viewport[1],coarsePointer:true,standalone:true}),scene=new THREE.Scene(),pits=module.createSandpits(THREE,scene),character=createCharacter(THREE,scene),points=pose(s);character.update(points,s);pits.update(s,points);scene.updateMatrixWorld(true);
  const f=cameraFrame(s,l.arenaWidth,l.playHeight),camera=new THREE.OrthographicCamera();Object.assign(camera,renderCameraBounds(f,l.playHeight,l.arenaHeight));camera.position.set(f.centerX,f.centerY+4,16);camera.lookAt(f.centerX,f.centerY,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const focus=new THREE.Vector3(s.x,s.y+.3,0).project(camera),source={width:l.arenaWidth,height:l.arenaHeight};let crop;
  const context={fillRect(){},fillText(){},strokeRect(){},drawImage(_source,sx,sy,sw,sh){crop={sx,sy,sw,sh};}};
  paintScoreCard(source,result(s),{x:(focus.x+1)/2,y:(1-focus.y)/2},()=>({getContext:()=>context}));
  const body=character.bounds(),kind=named(pits,'sand-impact').userData.kind,current=named(pits,kind==='feet'?'feet-left':kind==='head'?'head-crater':'seat-depression'),mark=new THREE.Box3().setFromObject(current);
  for(const bounds of [body,mark])for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)/2*source.width,py=(1-p.y)/2*source.height;
   assert.ok(px>=crop.sx&&px<=crop.sx+crop.sw&&py>=crop.sy&&py<=crop.sy+crop.sh,`${viewport} ${s.landingPart} subject/current mark cropped at ${px},${py}`);
  }
  pits.dispose();
 }
});
