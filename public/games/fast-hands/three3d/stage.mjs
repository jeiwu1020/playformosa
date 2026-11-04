import * as THREE from './vendor/three.module.min.js';
import {createDemoWorld} from './world.mjs';
import {viewPlan} from './view.mjs';

// Presentation only. Input timing and scoring never depend on render frames.
export function createGameStage(canvas,{onUnavailable=()=>{},rendererFactory=options=>new THREE.WebGLRenderer(options),devicePixelRatio=globalThis.devicePixelRatio||1}={}){
 let renderer,world,camera,observer,disposed=false,lastKey='',lastRender=-Infinity,width=0,height=0,dirty=true;
 const metrics={calls:0,triangles:0,renderMs:0,pixelRatio:Math.min(1.4,Math.max(1,devicePixelRatio)),frames:0};
 function resize(){
  if(disposed)return;
  const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
  if(w===width&&h===height)return;
  width=w;height=h;renderer.setSize(w,h,false);
  const plan=viewPlan(w,h,'front');Object.assign(camera,plan.frustum);camera.position.fromArray(plan.position);camera.lookAt(...plan.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();dirty=true;
 }
 function dispose(){
  if(disposed)return;disposed=true;observer?.disconnect();canvas.removeEventListener('webglcontextlost',lost);world?.dispose();renderer?.dispose();
 }
 function unavailable(error){if(disposed)return;dispose();onUnavailable(error?.message||'3D rendering is unavailable');}
 function lost(event){event.preventDefault();unavailable(new Error('WebGL context lost'));}
 try{
  renderer=rendererFactory({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(metrics.pixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=false;
  world=createDemoWorld(THREE);camera=new THREE.OrthographicCamera(-2,2,1,-1,.1,30);
  canvas.addEventListener('webglcontextlost',lost);
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(canvas);}
  resize();
 }catch(error){dispose();throw error;}
 function render(sample,{now=performance.now(),maxFps=60,force=false}={}){
  if(disposed)return false;
  const key=JSON.stringify(sample);resize();
  if(!force&&!dirty&&key===lastKey)return false;
  if(now<lastRender)lastRender=-Infinity;
  if(!force&&!dirty&&now-lastRender<1000/Math.max(1,maxFps)-.1)return false;
  try{
   const start=performance.now();world.update(sample);renderer.render(world.scene,camera);
   metrics.renderMs=performance.now()-start;metrics.calls=renderer.info.render.calls;metrics.triangles=renderer.info.render.triangles;metrics.frames++;
   lastRender=now;lastKey=key;dirty=false;return true;
  }catch(error){unavailable(error);return false;}
 }
 return {render,resize,dispose,metrics};
}
