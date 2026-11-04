import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';

// Portable V2 baseline from commit 24278f2127c8df0a0af39ccc904d95d60793cf6c.
// Generated from the verified V2 restore before this eye-only change. Tests never
// import that restore or require any machine-specific path.
const V2 = {
  nonEyeMeshes:147,
  geometryMaterials:'641470050fdce85f2bb6d407fed143c28be9ae912c0d1b12b83ce42e64d0f257',
  nonEyeObjects:192,
  matrices701:'fbd329846d456fb2656a4b37c7ed35f3e0533bfb94874f3ea7d9e56cea5db66b',
};
const isEye=name=>/^hero-(?:eye-white|iris|pupil|eye-glint)(?:-|$)/.test(name);
const closeVector=(a,b,epsilon=1e-10)=>assert.ok(a.distanceTo(b)<epsilon,`${a.toArray()} != ${b.toArray()}`);
function pairs(w){return ['left','right'].map(side=>Object.fromEntries(['eye-white','iris','pupil','eye-glint'].map(part=>[part,w.scene.getObjectByName('hero-'+part+'-'+side)])));}

test('original V2 colored eyes retain the same geometry, size, material and glint',()=>{
  const w=createDemoWorld(THREE);
  for(const eye of pairs(w)){
    for(const [part,scale,color] of [
      ['eye-white',[.071,.038,.037],0xfff8e8],
      ['iris',[.030,.025,.014],0x7b8b82],
      ['pupil',[.014,.019,.007],0x211e1b],
      ['eye-glint',[.008,.009,.004],0xfff8e8],
    ]){
      const mesh=eye[part];assert.ok(mesh,'original '+part+' must be present');
      assert.deepEqual(mesh.scale.toArray(),scale);
      assert.ok(mesh.material.isMeshStandardMaterial,'preserve original shading');
      assert.equal(mesh.material.color.getHex(),color);
      assert.equal(mesh.material.roughness,.78);
      assert.equal(mesh.geometry.attributes.position.count,221);
    }
  }
  w.dispose();
});

test('both original iris and pupil layers stay centered and parallel to world +Z',()=>{
  const w=createDemoWorld(THREE),front=new THREE.Vector3(0,0,1),eyes=pairs(w);
  for(let i=0;i<=700;i++){
    w.update(i/100);
    for(const eye of eyes){
      const center=eye['eye-white'].getWorldPosition(new THREE.Vector3());
      for(const [part,offset] of [['iris',.033],['pupil',.044]]){
        const mesh=eye[part],point=mesh.getWorldPosition(new THREE.Vector3());
        closeVector(point.clone().sub(center).normalize(),front);
        closeVector(mesh.getWorldDirection(new THREE.Vector3()),front);
        assert.ok(Math.abs(point.distanceTo(center)-offset*.91)<1e-10,'original layer depth is preserved');
      }
      // The original glint stays in the same position relative to the pupil.
      const glint=eye['eye-glint'].getWorldPosition(new THREE.Vector3());
      const pupil=eye.pupil.getWorldPosition(new THREE.Vector3());
      closeVector(glint.sub(pupil),new THREE.Vector3(-.007,.010,.001).multiplyScalar(.91));
    }
  }
  w.dispose();
});

test('all colored eye layers move continuously and identically after reverse seeking',()=>{
  const w=createDemoWorld(THREE),eyes=pairs(w),forward=[];
  const layers=eyes.flatMap(e=>[e.iris,e.pupil,e['eye-glint']]);
  assert.ok(layers.every(Boolean),'all original eye layers are restored');
  let previous=null;
  for(let i=0;i<=700;i++){
    w.update(i/100);const matrices=layers.map(o=>Array.from(o.matrixWorld.elements));forward.push(matrices);
    if(previous)for(let j=0;j<layers.length;j++)assert.ok(Math.max(...matrices[j].map((n,k)=>Math.abs(n-previous[j][k])))<.003,'eye transform jumps');
    previous=matrices;
  }
  for(let i=700;i>=0;i--){w.update(i/100);assert.deepEqual(layers.map(o=>Array.from(o.matrixWorld.elements)),forward[i]);}
  w.dispose();
});

test('all non-eye geometry and materials exactly match the portable V2 baseline',()=>{
  const w=createDemoWorld(THREE),meshes=[],hash=createHash('sha256');
  w.scene.traverse(o=>{if(o.isMesh&&!isEye(o.name))meshes.push(o)});meshes.sort((a,b)=>a.name.localeCompare(b.name));
  assert.equal(meshes.length,V2.nonEyeMeshes);
  for(const o of meshes){
    hash.update(o.name);
    for(const key of Object.keys(o.geometry.attributes).sort()){
      const a=o.geometry.attributes[key];hash.update(key);hash.update(JSON.stringify({itemSize:a.itemSize,normalized:a.normalized,array:Array.from(a.array)}));
    }
    hash.update(JSON.stringify(o.geometry.index?Array.from(o.geometry.index.array):null));
    const m=o.material;hash.update(JSON.stringify({type:m.type,color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,transparent:m.transparent,opacity:m.opacity,side:m.side,depthWrite:m.depthWrite,depthTest:m.depthTest}));
  }
  assert.equal(hash.digest('hex'),V2.geometryMaterials);w.dispose();
});

test('701 frames of all non-eye matrices including head, brows, face and hands exactly match V2',()=>{
  const w=createDemoWorld(THREE),objects=[],hash=createHash('sha256');w.scene.traverse(o=>{if(!isEye(o.name))objects.push(o)});objects.sort((a,b)=>a.name.localeCompare(b.name));
  assert.equal(objects.length,V2.nonEyeObjects);
  for(let i=0;i<=700;i++){w.update(i/100);for(const o of objects){hash.update(o.name);hash.update(JSON.stringify(o.matrixWorld.elements));}}
  assert.equal(hash.digest('hex'),V2.matrices701);w.dispose();
});
