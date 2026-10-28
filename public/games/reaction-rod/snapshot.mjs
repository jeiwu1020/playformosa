import * as THREE from './vendor/three.module.min.js';
import {RESULT_CAPTURE,resultCamera} from './framing.mjs';
import {drawResultCard} from './share.mjs';
// Render the existing frozen end-pose scene, never advance/rewind the world or mutate live camera.
export function captureResultCard({view,record,createCanvas,Renderer=THREE.WebGLRenderer}){
 const snapshot=createCanvas(),card=createCanvas();let renderer;
 try{renderer=new Renderer({canvas:snapshot,antialias:true,alpha:false,powerPreference:'default'});renderer.setPixelRatio(1);renderer.setSize(RESULT_CAPTURE.width,RESULT_CAPTURE.height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.render(view.scene,resultCamera());drawResultCard(card,snapshot,record);return card;}finally{renderer?.dispose();renderer?.forceContextLoss?.();}
}
