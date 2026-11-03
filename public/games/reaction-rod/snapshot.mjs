import * as THREE from './vendor/three.module.min.js';
import {RESULT_CAPTURE,resultCamera} from './framing.mjs';
import {createScene} from './scene.mjs';
import {drawResultCard} from './share.mjs';

function disposeScene(scene){
 const resources=new Set();
 scene?.traverse(object=>{if(object.geometry)resources.add(object.geometry);for(const material of [].concat(object.material||[]))resources.add(material);});
 for(const resource of resources){try{resource.dispose();}catch{}}
}
// Render only the immutable resolution state, including its still-present rod.
// Copy synchronously to 2D: the WebGL context is deliberately released afterwards.
export function captureResultPhoto({moment,createCanvas,Renderer=THREE.WebGLRenderer}){
 if(!moment?.rod)throw Error('Final moment unavailable');
 const snapshot=createCanvas(),photo=createCanvas();let renderer,view;
 try{
  view=createScene();view.update(moment,0);
  renderer=new Renderer({canvas:snapshot,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(1);renderer.setSize(RESULT_CAPTURE.width,RESULT_CAPTURE.height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.render(view.scene,resultCamera());
  photo.width=RESULT_CAPTURE.width;photo.height=RESULT_CAPTURE.height;
  const context=photo.getContext('2d');if(!context)throw Error('Photo canvas unavailable');
  context.drawImage(snapshot,0,0);return photo;
 }finally{
  try{renderer?.dispose();}catch{}
  try{renderer?.forceContextLoss?.();}catch{}
  disposeScene(view?.scene);
 }
}
// Dialog and exported score card receive the same frozen pixels, never a rerender.
export function captureResultCard({photo,record,createCanvas}){
 if(!photo?.width||!photo?.height)throw Error('Final photo unavailable');
 return drawResultCard(createCanvas(),photo,record);
}
