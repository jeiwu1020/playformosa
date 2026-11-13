import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as T from '../public/games/overtime-pinball/vendor/three.module.min.js';
import {createCharacter,poseCharacter} from '../public/games/overtime-pinball/character.js';
import {createShadowWorkerVisuals} from '../public/games/overtime-pinball/shadow-worker-visual.js';
globalThis.document={createElement:()=>createCanvas(256,256)};
const visibleMeshes=root=>{const a=[];root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;a.push(o)});return a;};
function sourceBounds(){const p=createCharacter();poseCharacter(p,{activity:'flight',time:0});p.updateMatrixWorld(true);const b=new T.Box3();for(const o of visibleMeshes(p)){if(o.material.side===T.BackSide)continue;const points=o.geometry.getAttribute('position');for(let i=0;i<points.count;i++)b.expandByPoint(new T.Vector3().fromBufferAttribute(points,i).applyMatrix4(o.matrixWorld));}return b;}
test('shadows use the exact posed worker body and face, not a substitute block character',()=>{
 const v=createShadowWorkerVisuals({T,office:new T.Group()});v.update([{id:1,x:0,z:0,vx:0,vz:0}],0);
 const worker=v.root.children[0],body=worker.getObjectByName('shadow-worker-body'),face=worker.getObjectByName('shadow-worker-face');
 assert.ok(body,'baked main character body');assert.ok(face?.material.map,'same detailed character face texture');
 body.geometry.computeBoundingBox();face.geometry.computeBoundingBox();const b=body.geometry.boundingBox.clone().union(face.geometry.boundingBox),expected=sourceBounds();
 assert.ok(b.min.distanceTo(expected.min)<1e-5);assert.ok(b.max.distanceTo(expected.max)<1e-5);
 assert.equal(worker.scale.x,1);assert.equal(worker.position.y,1.34);
 assert.ok(body.geometry.getAttribute('color'),'original costume colors remain');v.dispose();
});
test('two pooled original-character shadows share geometry but have isolated tint and slight transparency',()=>{
 const office=new T.Group(),v=createShadowWorkerVisuals({T,office});v.update([{id:1,x:4,z:8,vx:1,vz:2},{id:2,x:5,z:9},{id:3,x:6,z:10}],1);
 assert.equal(v.root.children.filter(c=>c.visible).length,2);assert.equal(v.root.children[0].position.x,-4);
 const [a,b]=v.root.children.map(n=>n.getObjectByName('shadow-worker-body'));assert.ok(a&&b);assert.equal(a.geometry,b.geometry);assert.notEqual(a.material,b.material);assert.notEqual(a.material.color.getHex(),b.material.color.getHex());
 assert.ok(a.material.opacity>=.75&&a.material.opacity<1);assert.equal(a.material.transparent,true);assert.equal(a.material.depthTest,true);
 const meshes=visibleMeshes(v.root);assert.ok(meshes.length<=6,'at most six draws for two recognizable workers');assert.ok(meshes.every(o=>!o.castShadow&&!o.receiveShadow));
 let lights=0;v.root.traverse(o=>{if(o.isLight)lights++});assert.equal(lights,0);
 const geo=a.geometry,mat=a.material;for(let i=0;i<100;i++)v.update([{id:1,x:i,z:0}],i);assert.equal(a.geometry,geo);assert.equal(a.material,mat);
 v.update([],0);assert.equal(v.root.children.filter(c=>c.visible).length,0);v.dispose();assert.equal(office.children.length,0);
});
test('dispose releases unique owned resources once and does not damage the real character',()=>{
 const real=createCharacter(),outline=real.getObjectByName('torso').children[0].children[0].material;let outlineDisposed=0;outline.addEventListener('dispose',()=>outlineDisposed++);
 const v=createShadowWorkerVisuals({T,office:new T.Group()}),resources=new Set();v.root.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);if(o.material.map)resources.add(o.material.map)}});
 const disposed=new Map([...resources].map(x=>[x,0]));for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,disposed.get(r)+1));v.dispose();v.dispose();assert.ok([...disposed.values()].every(n=>n===1));assert.equal(outlineDisposed,0);
});
