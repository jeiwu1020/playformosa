import{LAMPS}from'../public/games/overtime-pinball/board-features.js';
import test from'node:test';import assert from'node:assert/strict';import * as T from'../public/games/overtime-pinball/vendor/three.module.min.js';import{buildOfficeFeatures}from'../public/games/overtime-pinball/office-features.js';
const build=view=>{const office=new T.Group();const box=(w,h,d,color,parent,x=0,y=0,z=0)=>{let m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color}));m.position.set(x,y,z);parent.add(m);return m;};const cylinder=(r,h,color,parent,x=0,y=0,z=0)=>{let m=new T.Mesh(new T.CylinderGeometry(r,r,h),new T.MeshBasicMaterial({color}));m.position.set(x,y,z);parent.add(m);return m;};return buildOfficeFeatures({T,office,box,cylinder,label:(text,w,h)=>{let m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial());m.userData.text=text;return m},C:{yellow:0xffff00,cream:0xffffff,ink:0x111111,blue:0x0000ff},view,stableWindows:true});};
test('word floor plaques use large square single-character labels and readable orientation',()=>{for(const view of['original','reverse']){let f=build(view);for(const lamp of f.lights){assert.ok(lamp.icon.geometry.parameters.width>=3.6);assert.equal(lamp.icon.geometry.parameters.width,lamp.icon.geometry.parameters.height);assert.equal(lamp.icon.rotation.z,view==='original'?Math.PI:0);assert.equal(lamp.icon.userData.occludes,false);}}});

test('all word plaques respect depth, never paint over equipment or worker feet',()=>{for(const view of['original','reverse'])for(const lamp of build(view).lights){assert.equal(lamp.guide,undefined);assert.equal(lamp.rim,undefined);for(const mesh of [lamp.icon,lamp.ring,lamp.tile]){assert.equal(mesh.material.depthTest,true);assert.equal(mesh.material.depthFunc,T.LessEqualDepth);assert.equal(mesh.renderOrder,0);}}});

test('rendered plaque centers and circles exactly match core hit regions in both views',()=>{for(const view of ['original','reverse']){const lights=build(view).lights;assert.equal(lights.length,LAMPS.length);lights.forEach((l,i)=>{assert.equal(l.icon.position.x,-LAMPS[i].x);assert.equal(l.icon.position.z,LAMPS[i].z);assert.equal(l.ring.geometry.parameters.outerRadius,LAMPS[i].r);assert.equal(l.ring.position.x,l.icon.position.x);assert.equal(l.ring.position.z,l.icon.position.z);});}});
test('word pads are low profile visual rollovers, with letters above their solid top',()=>{for(const l of build('reverse').lights){assert.equal(l.pedestal.geometry.parameters.height,.18);assert.equal(l.pedestal.geometry.parameters.radiusTop,l.ring.geometry.parameters.outerRadius);assert.ok(l.icon.position.y>l.pedestal.position.y+.09);assert.ok(l.icon.position.y<.3);assert.equal(l.pedestal.position.x,l.icon.position.x);assert.equal(l.pedestal.position.z,l.icon.position.z);assert.equal(l.pedestal.userData.occludes,false);}});

import {StableRig,SLOPE} from '../public/games/overtime-pinball/camera.js';
import {LAYOUT} from '../public/games/overtime-pinball/route-layout.js';
import {ASSISTS} from '../public/games/overtime-pinball/assist-machines.js';
const projected=(x,y,z,view,w=1440,h=900)=>{
 const pose=new StableRig(view).update(0,w,h,{x:0,z:0});
 const camera=new T.PerspectiveCamera(pose.fov,w/h,.1,350);
 camera.position.set(...pose.position);camera.lookAt(new T.Vector3(...pose.target));camera.updateMatrixWorld(true);
 const p=new T.Vector3(-x,y,z).applyAxisAngle(new T.Vector3(1,0,0),SLOPE).project(camera);
 return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};
};
test('fake plaque is fully beside copier on default desktop, mirrored in opposite view',()=>{
 const lamp=LAMPS.find(p=>p.id==='fake'),copier=LAYOUT.copier;
 for(const view of ['reverse','original']) for(const [w,h] of [[1440,900],[1920,1080],[390,844]]){
  const l=[-lamp.r,lamp.r].flatMap(dx=>[-lamp.r,lamp.r].map(dz=>projected(lamp.x+dx,.255,lamp.z+dz,view,w,h)));
  const c=[-copier.r,copier.r].flatMap(dx=>[-copier.r,copier.r].flatMap(dz=>[0,5.3].map(y=>projected(copier.x+dx,y,copier.z+dz,view,w,h))));
  if(view==='reverse')assert.ok(Math.max(...l.map(p=>p.x))<Math.min(...c.map(p=>p.x)),'default camera: whole plaque left of copier');
  else assert.ok(Math.min(...l.map(p=>p.x))>Math.max(...c.map(p=>p.x)),'opposite camera: same physical plaque right of copier');
 }
});
test('fake lamp circle clears all drawer bodies and full extension footprints',()=>{
 const p=LAMPS.find(p=>p.id==='fake');
 for(const o of Object.values(ASSISTS).filter(o=>o.hx)){
  const end=o.x+o.inward*(o.hx+o.extension),minX=Math.min(o.x-o.hx,end),maxX=Math.max(o.x+o.hx,end);
  const dx=Math.max(minX-p.x,0,p.x-maxX),dz=Math.max(Math.abs(p.z-o.z)-o.hz,0);
  assert.ok(Math.hypot(dx,dz)>p.r,'lamp does not overlap drawer sweep');
 }
});

import {Game} from '../public/games/overtime-pinball/physics.js';
test('fake word scores at its new visible pad, not its former floor position',()=>{
 for(const view of ['reverse','original']){
  const g=new Game({view,patrol:false});g.start();
  g.updateLamps({x:0,z:-9},{x:0,z:-9});assert.equal(g.lamps[0],false);
  const p=LAMPS[0];g.updateLamps({x:p.x-p.r-1,z:p.z},{x:p.x+p.r+1,z:p.z});
  assert.equal(g.lamps[0],true);assert.equal(g.income.lights,20);
 }
});
