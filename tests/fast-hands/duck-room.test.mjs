import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';
import {createGameStage} from '../../public/games/fast-hands/three3d/stage.mjs';
import {sampleTimeline} from '../../public/games/fast-hands/three3d/timeline.mjs';
import {renderScene,demoSample} from '../../public/games/fast-hands/scene.mjs';

function stageFixture(){
 let scene,camera;
 const canvas={getBoundingClientRect:()=>({width:390,height:280}),addEventListener(){},removeEventListener(){}};
 const renderer={setPixelRatio(){},setSize(){},render(s,c){scene=s;camera=c;},dispose(){},shadowMap:{},info:{render:{calls:0,triangles:0}}};
 const stage=createGameStage(canvas,{rendererFactory:()=>renderer});
 stage.render(sampleTimeline(0),{now:0,force:true});
 return{stage,get scene(){return scene;},get camera(){return camera;}};
}
function shape(scene,names){
 return names.map(name=>{
  const root=scene.getObjectByName(name),result=[];
  root.traverse(object=>result.push({name:object.name,matrix:[...object.matrixWorld.elements],
   color:object.material?.color?.getHex(),roughness:object.material?.roughness,
   positions:object.geometry?[...object.geometry.attributes.position.array]:null}));
  return result;
 });
}
function geometryCount(root){let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return{meshes,triangles};}

// Catches forgetting to install the environment in the actual runtime stage,
// or putting a cabinet/prop in front of the hand/banknote/duck action plane.
test('duck runtime adds a rear room while retaining the exact tabletop contact height',()=>{
 const f=stageFixture();try{
  const room=f.scene.getObjectByName('duck-room-backdrop');
  assert.ok(room,'actual duck stage includes the room');
  assert.ok(new THREE.Box3().setFromObject(room).max.z<-.6,'background stays behind the actor');
  assert.ok(f.scene.getObjectByName('duck-room-cabinet-left'));
  const top=new THREE.Box3().setFromObject(f.scene.getObjectByName('table-top'));
  assert.ok(Math.abs(top.max.y-.85)<1e-10);
  assert.equal(f.camera.position.x,0);
 }finally{f.stage.dispose();}
});

// Catches accidental edits to the original character, props or choreography
// while the room decorator changes only the presentation environment.
test('room decoration preserves every actor and game-prop mesh through the complete choreography',()=>{
 const f=stageFixture(),baseline=createDemoWorld(THREE);
 try{for(const seconds of[0,.75,1.2,1.95,2.5,3.15,4.6,5.7,7]){
  const sample=sampleTimeline(seconds);baseline.update(sample);f.stage.render(sample,{now:seconds*1000,force:true});
  assert.deepEqual(shape(f.scene,['hero-runner','demo-banknote','demo-duck']),shape(baseline.scene,['hero-runner','demo-banknote','demo-duck']));
 }}finally{f.stage.dispose();baseline.dispose();}
});

test('duck room remains texture-free and within a small static mesh budget',()=>{
 const f=stageFixture();try{
  const room=f.scene.getObjectByName('duck-room-backdrop');assert.ok(room);
  const total=geometryCount(f.scene);
  assert.ok(total.meshes<=200,`${total.meshes} meshes`);assert.ok(total.triangles<=35500,`${total.triangles} triangles`);
  room.traverse(o=>{if(o.material){assert.equal(o.material.map,null);assert.equal(o.castShadow,false);}});
 }finally{f.stage.dispose();}
});

test('stage disposal releases all room geometry and material resources once',()=>{
 const f=stageFixture(),room=f.scene.getObjectByName('duck-room-backdrop');assert.ok(room);
 const resources=new Set();room.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
 const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
 f.stage.dispose();f.stage.dispose();
 for(const resource of resources)assert.equal(disposed.get(resource),1);
});

// Actual canvas pixels prove the no-WebGL path receives the same warmer room
// and a visible tabletop, rather than only changing unused scene constants.
test('2D fallback renders warm neutral depth and a readable natural tabletop',()=>{
 const canvas=createCanvas(720,400);canvas.getBoundingClientRect=()=>({width:720,height:400});
 renderScene(canvas,{...demoSample(0),demo:false},null);
 const pixel=(x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
 for(const [x,y] of[[650,60],[150,330]]){
  const [r,g,b,a]=pixel(x,y);assert.ok(r>g&&g>b,`warm room at ${x},${y}: ${[r,g,b]}`);assert.equal(a,255);
 }
 assert.notDeepEqual(pixel(650,60),pixel(650,220),'rear wall has depth, not a flat green panel');
 assert.notDeepEqual(pixel(150,330),pixel(150,352),'tabletop and front edge remain distinct');
});
