// Reproducible offline export of the actual 400 m / 1500 m meshes and poses.
// Run: node tools/render-runner-rig.mjs --write-assets --review-dir /tmp/runner-review
// No server, browser, game physics or GPU is involved. Runtime paths/frame layout
// retain the original 260 indices, with 12 standing settle poses in spare cells.
// Cells stay 192x288 on 16 columns: 272 used frames over 17 rows (3072x4896).
import {createCanvas} from '@napi-rs/canvas';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from '../public/games/run-400m/vendor/three.module.min.js';
import {createCharacter as create400} from '../public/games/run-400m/character3d.mjs';
import {createCharacter as create1500} from '../public/games/run-1500m/character3d.mjs';
import {sprintPose} from '../public/games/run-400m/pose3d.mjs';
import {runnerPose} from '../public/games/run-1500m/pose.mjs';
import {createSoftwareRenderer} from './runner-sprite-renderer.mjs';
import {RUNNER_SPRITE_LAYOUT,runnerSpriteFrame,drawRunnerSprite,runnerVisualMotion} from '../public/games/shared/runner-arm-pose.mjs';

export const ATLAS_LAYOUT=Object.freeze({width:192,height:288,columns:16,perCharacter:33,characters:4});
const TAU=Math.PI*2;
const colors={
 '400m':['#ed782e','#e15759','#299c91','#8a73bd'],
 '1500m':['#ed782e','#db5a5e','#258d7b','#9471bb']
};
const root=fileURLToPath(new URL('../',import.meta.url));
const factories={'400m':create400,'1500m':create1500};
function sampleState(game,id,{kind,index=0,count=8,fatigue=0,finish=0}){
 if(!factories[game])throw new Error('Unknown runner game: '+game);
 const speed=kind==='idle'?0:6,time=index/count*TAU/(game==='400m'?19:6+speed*1.45);
 let runner;
 if(game==='400m')runner={id:0,x:0,v:speed,held:[false,false,false,false],started:kind!=='idle',lean:finish+(kind!=='idle'?fatigue*.16:0),stamina:(1-fatigue)*100,imbalance:0,fall:0,finished:null,lastArm:time,runout:0};
 else runner={id:0,v:speed,energy:fatigue?30*(1-fatigue):100,lean:finish,wobble:0,started:kind!=='idle',finished:null};
 const phase=kind==='idle'?'ready':'race',prepared=false;
 return{kind,runner,time,phase,prepared,color:colors[game][id],spriteParameters:{fatigue,finish},pose:game==='400m'?sprintPose(runner,time,phase,prepared):runnerPose(runner,time)};
}
export function sampleRunnerFrame(game,id,frame){
 if(!Number.isInteger(frame)||frame<0||frame>=33)throw new RangeError('Runner frame must be 0..32');
 const kind=frame<16?'run':frame<24?'tired':frame<32?'lean':'idle',count=kind==='run'?16:8,index=kind==='run'?frame:kind==='tired'?frame-16:kind==='lean'?frame-24:0;
 return sampleState(game,id,{kind,count,index,fatigue:kind==='tired'?1:0,finish:kind==='lean'?1:0});
}
export function sampleAtlasFrame(game,frame){
 if(!Number.isInteger(frame)||frame<0||frame>=RUNNER_SPRITE_LAYOUT.totalFrames)throw new RangeError('Atlas frame must be 0..271');
 if(frame>=260)return sampleSettleFrame(game,Math.floor((frame-260)/3),(frame-260)%3);
 if(frame<132)return sampleRunnerFrame(game,Math.floor(frame/33),frame%33);
 const id=Math.floor((frame-132)/32),local=(frame-132)%32;
 if(local<8)return sampleState(game,id,{kind:'fatigue-middle',count:8,index:local,fatigue:.5});
 if(local<16)return sampleState(game,id,{kind:'lean-tired',count:8,index:local-8,fatigue:1,finish:1});
 const state=Math.floor((local-16)/8),fatigue=local%8>=4?1:0;
 return sampleState(game,id,{kind:'lean-middle',count:4,index:local%4,fatigue,finish:(state+1)/3});
}
export function sampleSettleFrame(game,id,stage){
 if(!Number.isInteger(stage)||stage<0||stage>2)throw new RangeError('Settle stage must be 0..2');
 const settle=(stage+1)/3;let lo=0,hi=1;
 for(let n=0;n<48;n++){const mid=(lo+hi)/2;if(mid*mid*(3-2*mid)<settle)lo=mid;else hi=mid;}
 const age=.9+1.2*(lo+hi)/2,frequency=game==='400m'?19:6,time=Math.ceil(40*frequency/TAU)*TAU/frequency;
 const runner=game==='400m'?{id:0,x:0,v:0,held:[false,false,false,false],started:true,lean:0,stamina:50,imbalance:0,fall:0,finished:time,lastArm:time,runout:age}:{id:0,v:0,energy:15,lean:0,wobble:0,started:true,finished:time-age,finishRaceTime:time-age};
 const phase='done',prepared=false;
 return{kind:'settle',runner,time,phase,prepared,color:colors[game][id],spriteParameters:{fatigue:.5,finish:0,settle},pose:game==='400m'?sprintPose(runner,time,phase,prepared):runnerPose(runner,time)};
}
export function sampleExtraFrame(id,frame){
 if(!Number.isInteger(frame)||frame<0||frame>3)throw new RangeError('Extra frame must be 0..3');
 const runner={id:0,x:0,v:frame?3:0,held:[false,false,true,true],started:frame>0,lean:0,stamina:100,imbalance:0,fall:frame?[1.1,.3,.12][frame-1]:0,finished:null,lastArm:0,runout:0};
 const phase=frame?'race':'set';
 return{kind:frame?'fall':'crouch',runner,time:0,phase,prepared:true,color:colors['400m'][id],pose:sprintPose(runner,0,phase,true)};
}
function cameraFor(view='atlas'){
 const camera=new THREE.OrthographicCamera(-.92,.92,1.38,-1.38,.1,40);
 const positions={atlas:[-6,2.8,-1.2],front:[6,2.2,0],side:[0,2.2,6],back:[-6,2.2,0],rearQuarter:[-6,2.8,-3]};
 camera.position.set(...positions[view]);camera.lookAt(0,1.18,0);camera.updateMatrixWorld();return camera;
}
function fitReviewCamera(camera,actor){
 const box=actor.bounds(),center=box.getCenter(new THREE.Vector3()),direction=camera.position.clone().sub(new THREE.Vector3(0,1.18,0)).normalize();
 camera.position.copy(center).addScaledVector(direction,6);camera.lookAt(center);camera.updateMatrixWorld();
 let halfX=0,halfY=0;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);halfX=Math.max(halfX,Math.abs(p.x));halfY=Math.max(halfY,Math.abs(p.y));
 }
 const height=Math.max(halfY,halfX*1.5)*1.12;camera.left=-height*2/3;camera.right=height*2/3;camera.top=height;camera.bottom=-height;camera.updateProjectionMatrix();
}
function renderCell(actor,sample,renderer,scene,camera,fit=false){
 actor.update(sample.pose.points,sample.pose.state);if(fit)fitReviewCamera(camera,actor);renderer.render(scene,camera);
}
export function renderGameAtlas(game){
 const {width:W,height:H,columns:COLS,perCharacter:PER,characters:CHARACTERS}=ATLAS_LAYOUT;
 const atlas=createCanvas(COLS*W,RUNNER_SPRITE_LAYOUT.rows*H),ctx=atlas.getContext('2d'),canvas=createCanvas(W,H),renderer=createSoftwareRenderer(canvas,true);renderer.setSize(W,H,false);
 const scene=new THREE.Scene(),camera=cameraFor();
 for(let id=0;id<CHARACTERS;id++){
  const c=factories[game](THREE,scene,{color:colors[game][id]});
  for(let frame=0;frame<PER;frame++){renderCell(c,sampleRunnerFrame(game,id,frame),renderer,scene,camera);const n=id*PER+frame;ctx.drawImage(canvas,n%COLS*W,Math.floor(n/COLS)*H);}
  for(let extra=0;extra<32;extra++){const n=132+id*32+extra;renderCell(c,sampleAtlasFrame(game,n),renderer,scene,camera);ctx.drawImage(canvas,n%COLS*W,Math.floor(n/COLS)*H);}
  for(let stage=0;stage<3;stage++){const n=260+id*3+stage;renderCell(c,sampleSettleFrame(game,id,stage),renderer,scene,camera);ctx.drawImage(canvas,n%COLS*W,Math.floor(n/COLS)*H);}
  scene.remove(c.group);
 }
 return atlas;
}
export function renderExtraAtlas(){
 const {width:W,height:H,columns:COLS}=ATLAS_LAYOUT,atlas=createCanvas(W*COLS,H),ctx=atlas.getContext('2d'),canvas=createCanvas(W,H),renderer=createSoftwareRenderer(canvas,true);renderer.setSize(W,H,false);const scene=new THREE.Scene(),camera=cameraFor();camera.top-=.18;camera.bottom-=.18;camera.updateProjectionMatrix();
 for(let id=0;id<4;id++){const c=create400(THREE,scene,{color:colors['400m'][id]});for(let frame=0;frame<4;frame++){renderCell(c,sampleExtraFrame(id,frame),renderer,scene,camera);ctx.drawImage(canvas,(id*4+frame)*W,0);}scene.remove(c.group);}
 return atlas;
}
export function renderReview(game){
 const {width:W,height:H}=ATLAS_LAYOUT,views=['front','side','back','rearQuarter'];
 const samples=[['normal',sampleRunnerFrame(game,0,4)],['tired',sampleRunnerFrame(game,0,18)],['finish lean',sampleRunnerFrame(game,0,26)],['idle',sampleRunnerFrame(game,0,32)]];
 if(game==='400m')samples.push(['crouch',sampleExtraFrame(0,0)],['fall early',sampleExtraFrame(0,3)],['fall middle',sampleExtraFrame(0,2)],['fall settled',sampleExtraFrame(0,1)]);
 const review=createCanvas(W*views.length,(H+28)*samples.length),ctx=review.getContext('2d'),canvas=createCanvas(W,H),renderer=createSoftwareRenderer(canvas,true);renderer.setSize(W,H,false);const scene=new THREE.Scene(),c=factories[game](THREE,scene,{color:colors[game][0]});
 ctx.fillStyle='#e2ebe3';ctx.fillRect(0,0,review.width,review.height);ctx.font='14px sans-serif';
 for(let row=0;row<samples.length;row++)for(let col=0;col<views.length;col++){
  const [name,sample]=samples[row],view=views[col];renderCell(c,sample,renderer,scene,cameraFor(view),true);ctx.drawImage(canvas,col*W,row*(H+28)+28);ctx.fillStyle='#243d54';ctx.fillText(`${game} ${name} / ${view}`,col*W+6,row*(H+28)+19);
 }
 return review;
}
export function renderCycleReview(game){
 const {width:W,height:H}=ATLAS_LAYOUT,review=createCanvas(W*8,(H+28)*2),ctx=review.getContext('2d'),canvas=createCanvas(W,H),renderer=createSoftwareRenderer(canvas,true);renderer.setSize(W,H,false);const scene=new THREE.Scene(),c=factories[game](THREE,scene,{color:colors[game][0]}),camera=cameraFor('side');ctx.fillStyle='#e2ebe3';ctx.fillRect(0,0,review.width,review.height);ctx.font='14px sans-serif';
 for(let frame=0;frame<16;frame++){renderCell(c,sampleRunnerFrame(game,0,frame),renderer,scene,camera);const x=frame%8*W,y=Math.floor(frame/8)*(H+28);ctx.drawImage(canvas,x,y+28);ctx.fillStyle='#243d54';ctx.fillText(`${game} cycle ${frame}/16`,x+6,y+19);}
 return review;
}
export function renderTransitionReview(game){
 const {width:W,height:H}=ATLAS_LAYOUT,values=[0,.25,.5,.75,1],views=['atlas','front'],review=createCanvas(W*5,(H+28)*6),ctx=review.getContext('2d'),cell=createCanvas(W,H),renderer=createSoftwareRenderer(cell,true);renderer.setSize(W,H,false);
 const scene=new THREE.Scene(),c=factories[game](THREE,scene,{color:colors[game][0]}),source=createCanvas(16*W,RUNNER_SPRITE_LAYOUT.rows*H),sc=source.getContext('2d');
 ctx.fillStyle='#e2ebe3';ctx.fillRect(0,0,review.width,review.height);ctx.font='14px sans-serif';
 for(let viewIndex=0;viewIndex<views.length;viewIndex++){
  sc.clearRect(0,0,source.width,source.height);const rendered=new Set();
  for(let kind=0;kind<3;kind++)for(let col=0;col<values.length;col++){
   const value=values[col],fatigue=kind===0?value:kind===2?1:0,finish=kind===0?0:value,row=viewIndex*3+kind,x=col*W,y=row*(H+28),frame=runnerSpriteFrame(Math.PI/2,{running:true,fatigue,finish});
   if(!rendered.has(frame)){renderCell(c,sampleAtlasFrame(game,frame),renderer,scene,cameraFor(views[viewIndex]));sc.drawImage(cell,frame%16*W,Math.floor(frame/16)*H);rendered.add(frame);}
   drawRunnerSprite(ctx,source,frame,x,y+28,W,H);ctx.fillStyle='#243d54';ctx.fillText(`${game} ${kind===0?'fatigue':kind===1?'lean':'tired lean'} ${value}`,x+5,y+19);
  }
 }
 return review;
}
export function renderStopReview(game){
 const {width:W,height:H}=ATLAS_LAYOUT,ages=[0,.5,.9,1.365,1.635,6],views=['front','rearQuarter'],review=createCanvas(W*4,(H+28)*ages.length),ctx=review.getContext('2d'),cell=createCanvas(W,H),renderer=createSoftwareRenderer(cell,true);renderer.setSize(W,H,false);
 const scene=new THREE.Scene(),c=factories[game](THREE,scene,{color:colors[game][0]}),source=createCanvas(W*16,H*RUNNER_SPRITE_LAYOUT.rows),sc=source.getContext('2d');ctx.fillStyle='#e2ebe3';ctx.fillRect(0,0,review.width,review.height);ctx.font='13px sans-serif';
 for(let row=0;row<ages.length;row++){
  const age=ages[row],time=game==='400m'?40:40+age,runner=game==='400m'?{id:0,x:0,v:0,held:[false,false,false,false],started:true,lean:1,stamina:50,imbalance:0,fall:0,finished:40,runout:age,lastArm:40}:{id:0,v:6*Math.exp(-1.2*age),energy:15,lean:1,wobble:0,started:true,finished:40,finishRaceTime:40};
  const local=game==='400m'?{...runner,lean:runner.lean+(1-runner.stamina/100)*.16}:runner,pose=game==='400m'?sprintPose(local,time,'done',false):runnerPose(local,time),motion=runnerVisualMotion(runner,time,game),phase=game==='400m'?time*19:time*(6+runner.v*1.45),frame=runnerSpriteFrame(phase,{running:runner.v>(game==='400m'?1:.35),fatigue:.5,...motion});
  for(let view=0;view<2;view++){
   renderCell(c,{pose},renderer,scene,cameraFor(views[view]));ctx.drawImage(cell,view*W,row*(H+28)+28);
   renderCell(c,sampleAtlasFrame(game,frame),renderer,scene,cameraFor(views[view]));sc.clearRect(0,0,source.width,source.height);sc.drawImage(cell,frame%16*W,Math.floor(frame/16)*H);drawRunnerSprite(ctx,source,frame,(view+2)*W,row*(H+28)+28,W,H);
   ctx.fillStyle='#243d54';ctx.fillText(`${game} live ${age}s / ${views[view]}`,view*W+3,row*(H+28)+19);ctx.fillText(`sprite ${frame} / ${views[view]}`,(view+2)*W+3,row*(H+28)+19);
  }
 }
 return review;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const writeAssets=process.argv.includes('--write-assets'),reviewIndex=process.argv.indexOf('--review-dir'),reviewDir=reviewIndex>=0?process.argv[reviewIndex+1]:null;
 if(!writeAssets&&!reviewDir)throw new Error('Specify --write-assets and/or --review-dir DIRECTORY');
 for(const game of ['400m','1500m']){
  if(writeAssets){const target=resolve(root,`public/games/run-${game}/runner-atlas.png`);writeFileSync(target,renderGameAtlas(game).toBuffer('image/png'));console.log('Wrote '+target);}
  if(reviewDir){mkdirSync(reviewDir,{recursive:true});for(const [name,canvas] of [['views',renderReview(game)],['cycle',renderCycleReview(game)],['transitions',renderTransitionReview(game)],['stops',renderStopReview(game)]]){const target=resolve(reviewDir,`${game}-${name}.png`);writeFileSync(target,canvas.toBuffer('image/png'));console.log('Wrote '+target);}}
 }
 if(writeAssets){const target=resolve(root,'public/games/run-400m/extra-poses.png');writeFileSync(target,renderExtraAtlas().toBuffer('image/png'));console.log('Wrote '+target);}
}
