import * as THREE from './vendor/three.module.min.js';
// Presentation only. Physics reach anchors and SI pointer conversion are unchanged.
export const RESULT_CAPTURE=Object.freeze({width:900,height:1120});
export function playBounds(width,height){const aspect=Math.max(.2,width/Math.max(height,1)),spanY=Math.max(2.70,2.05/aspect),spanX=spanY*aspect;return{left:-spanX/2,right:spanX/2,top:1.3+spanY/2,bottom:1.3-spanY/2};}
export function resultCamera(){const b=playBounds(RESULT_CAPTURE.width,RESULT_CAPTURE.height),camera=new THREE.OrthographicCamera(b.left,b.right,b.top-1.3,b.bottom-1.3,.1,30);camera.position.set(0,1.3,8);camera.lookAt(0,1.3,0);return camera;}
