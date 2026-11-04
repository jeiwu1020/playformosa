import * as THREE from './three3d/vendor/three.module.min.js';
import {createLevelWorld} from './levels-world.mjs';

// Only rendering is owned here. Timers, input, scoring and fallback UI stay in
// the level app, so a denied/lost WebGL context never blocks a playable round.
export function createLevelStage(canvas,{mode='duel',onUnavailable=()=>{},onReady=()=>{},rendererFactory=options=>new THREE.WebGLRenderer(options),devicePixelRatio=globalThis.devicePixelRatio||1,loadTextures=true,textureLoader=new THREE.TextureLoader()}={}){
  let renderer,world,camera,observer,disposed=false,width=0,height=0,lastRender=-Infinity,lastPhase='',lastResults=-1,dirty=true,artReady=mode==='catch'||!loadTextures;
  const metrics={frames:0,calls:0,triangles:0,pixelRatio:Math.min(1.5,Math.max(1,devicePixelRatio)),renderMs:0};
  function resize(){
    if(disposed||!renderer)return;
    const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    if(w===width&&h===height)return;
    width=w;height=h;renderer.setSize(w,h,false);
    const aspect=w/h,viewHeight=Math.max(2.42,3.06/aspect),viewWidth=viewHeight*aspect;
    camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.position.set(0,2.35,6);camera.lookAt(0,1.15,.15);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);dirty=true;
  }
  function dispose(){
    if(disposed)return;disposed=true;observer?.disconnect();canvas.removeEventListener('webglcontextlost',lost);world?.dispose();renderer?.dispose();
  }
  function unavailable(error){if(disposed)return;dispose();onUnavailable(error?.message||'3D rendering is unavailable');}
  function lost(event){event.preventDefault();unavailable(new Error('WebGL context lost'));}
  try{
    renderer=rendererFactory({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(metrics.pixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    if(renderer.shadowMap)renderer.shadowMap.enabled=false;
    world=createLevelWorld(THREE,{mode});camera=new THREE.OrthographicCamera(-2,2,1,-1,.1,30);
    canvas.addEventListener('webglcontextlost',lost);
    if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(canvas);}
    resize();
    if(loadTextures&&mode==='duel'&&typeof document!=='undefined')textureLoader.load(new URL('./assets/duel-items-atlas.png',import.meta.url).href,texture=>{if(disposed){texture.dispose();return;}world.setItemTexture(texture);dirty=true;artReady=true;onReady();},undefined,()=>unavailable(new Error('Generated atlas image failed to load')));
  }catch(error){unavailable(error);}
  function render(state,now=globalThis.performance?.now?.()||0){
    if(disposed)return false;
    resize();
    const changed=state.phase!==lastPhase||(state.results?.length||0)!==lastResults;
    if(now<lastRender)lastRender=-Infinity;
    const fps=['idle','paused','waiting'].includes(state.phase)?30:60;
    if(!dirty&&!changed&&now-lastRender<1000/fps-.2)return false;
    try{
      const start=globalThis.performance?.now?.()||0;world.update({state,now});renderer.render(world.scene,camera);
      metrics.frames++;metrics.calls=renderer.info?.render?.calls||0;metrics.triangles=renderer.info?.render?.triangles||0;metrics.renderMs=(globalThis.performance?.now?.()||0)-start;
      lastRender=now;lastPhase=state.phase;lastResults=state.results?.length||0;dirty=false;return true;
    }catch(error){unavailable(error);return false;}
  }
  return {render,resize,dispose,metrics,get world(){return world;},get camera(){return camera;},get available(){return !disposed;},get artReady(){return artReady;}};
}
