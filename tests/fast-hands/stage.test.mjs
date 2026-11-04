import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {viewPlan} from '../../public/games/fast-hands/three3d/view.mjs';

// These catch loss of the requested front view and presentation lifecycle errors.
test('game stage defaults to the requested front camera at every viewport shape',()=>{
 for(const [w,h] of [[390,280],[1280,650],[244,240],[0,0]])assert.equal(viewPlan(w,h).position[0],0);
});
test('stage renders the real character, bounds DPR, skips unchanged poses and releases resources',async()=>{
 assert.ok(fs.existsSync(new URL('../../public/games/fast-hands/three3d/stage.mjs', import.meta.url)),'3D stage lifecycle exists');
 const {createGameStage}=await import('../../public/games/fast-hands/three3d/stage.mjs');
 const {sampleTimeline}=await import('../../public/games/fast-hands/three3d/timeline.mjs');
 const listeners=new Map(),canvas={getBoundingClientRect:()=>({width:390,height:280}),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 const frames=[];let disposed=0,pixelRatio,size;
 const renderer={setPixelRatio:v=>pixelRatio=v,setSize:(w,h)=>size=[w,h],render:(scene,camera)=>frames.push({scene,camera}),dispose:()=>disposed++,shadowMap:{enabled:true},info:{render:{calls:155,triangles:33342},memory:{geometries:31}}};
 const stage=createGameStage(canvas,{rendererFactory:()=>renderer,devicePixelRatio:3});
 stage.render(sampleTimeline(0),{now:0});
 assert.equal(frames.length,1);assert.equal(pixelRatio,1.4);assert.deepEqual(size,[390,280]);
 assert.ok(frames[0].scene.getObjectByName('hero-iris-left'));
 assert.equal(frames[0].camera.position.x,0);assert.equal(renderer.shadowMap.enabled,false);
 stage.render(sampleTimeline(0),{now:100});assert.equal(frames.length,1,'idle does not redraw');
 stage.render(sampleTimeline(1),{now:200});assert.equal(frames.length,2);
 stage.dispose();stage.dispose();assert.equal(disposed,1);
 stage.render(sampleTimeline(2),{now:300});assert.equal(frames.length,2,'disposed stage cannot render');
 assert.equal(listeners.size,0);
});
test('context loss stops 3D and calls the playable fallback once',async()=>{
 assert.ok(fs.existsSync(new URL('../../public/games/fast-hands/three3d/stage.mjs', import.meta.url)),'3D stage lifecycle exists');
 const {createGameStage}=await import('../../public/games/fast-hands/three3d/stage.mjs');
 const listeners=new Map(),canvas={getBoundingClientRect:()=>({width:390,height:280}),addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 let failures=0,disposed=0,prevented=0;
 const renderer={setPixelRatio(){},setSize(){},render(){},dispose:()=>disposed++,shadowMap:{},info:{render:{}}};
 const stage=createGameStage(canvas,{rendererFactory:()=>renderer,onUnavailable:()=>failures++});
 const lost=listeners.get('webglcontextlost');lost({preventDefault:()=>prevented++});lost({preventDefault:()=>prevented++});
 assert.equal(failures,1);assert.equal(disposed,1);assert.equal(prevented,2);stage.dispose();
});
