/** Offline source-model demo. Exact original seven-second choreography, 24 fps. */
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createDemoWorld} from '../public/games/fast-hands/three3d/world.mjs';
import {viewPlan} from '../public/games/fast-hands/three3d/view.mjs';
import {rasterizeScene} from './render-fast-hands-levels.mjs';
const target=path.resolve(process.argv[2]??'evidence/duck-demo-frames');fs.mkdirSync(target,{recursive:true});
const width=720,height=560,fps=24,frames=168,world=createDemoWorld(THREE),plan=viewPlan(width,height,'front');
const camera=new THREE.OrthographicCamera(...['left','right','top','bottom','near','far'].map(key=>plan.frustum[key]));camera.position.fromArray(plan.position);camera.lookAt(...plan.target);
const metadata={kind:'Offline source-model demo, not browser video',width,height,fps,frames,duration:7,posterTime:5.7,samples:[]};
for(let frame=0;frame<frames;frame++){
 const time=frame/fps,sample=world.update(time);const {canvas,stats}=rasterizeScene(THREE,world.scene,camera,{width,height,supersample:1});
 fs.writeFileSync(path.join(target,String(frame).padStart(4,'0')+'.png'),canvas.toBuffer('image/png'));metadata.samples.push({frame,time,phase:sample.phase,contacts:sample.contacts});if(frame%24===0)console.log(frame,JSON.stringify(stats));
}
world.update(metadata.posterTime);const poster=rasterizeScene(THREE,world.scene,camera,{width,height,supersample:2});fs.writeFileSync('public/games/fast-hands/assets/front-demo-poster.png',poster.canvas.toBuffer('image/png'));fs.writeFileSync(path.join(target,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');world.dispose();
