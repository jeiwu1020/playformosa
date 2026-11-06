import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/run-400m/vendor/three.module.min.js';
import {createCharacter as create400} from '../../public/games/run-400m/character3d.mjs';
import {createCharacter as create1500} from '../../public/games/run-1500m/character3d.mjs';
import {sprintPose} from '../../public/games/run-400m/pose3d.mjs';
import {runnerPose} from '../../public/games/run-1500m/pose.mjs';

const factories=[['400 m',create400],['1500 m',create1500]];
const base400={id:0,x:0,v:7,held:[false,false,true,true],started:true,lean:0,imbalance:0,fall:0,finished:null,lastArm:0,runout:0};
const base1500={id:0,v:7,energy:100,lean:0,wobble:0};
const poseCases=[['400 m', (r,t)=>sprintPose({...base400,...r},t,'race',true)],['1500 m',(r,t)=>runnerPose({...base1500,...r},t)]];
const vec=p=>new THREE.Vector3(p.x,p.y,p.z||0);
const distance=(a,b)=>vec(a).distanceTo(vec(b));
const elbowAngle=(s,e,w)=>vec(s).sub(vec(e)).angleTo(vec(w).sub(vec(e)));
function actor(create){const scene=new THREE.Scene();return create(THREE,scene);}
function firstHit(group,origin,direction){group.updateMatrixWorld(true);return new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(group,true)[0]?.object;}

for(const [name,create] of factories){
 test(name+' has hair over the middle/lower rear scalp and rear sides',()=>{
  const head=actor(create).group.getObjectByName('head');
  for(const y of [.08,-.03,-.14])for(const x of [-.18,0,.18]){
   const hit=firstHit(head,[x,y,-1],[0,0,1]);
   assert.ok(hit?.parent.name==='hair',`rear scalp (${x},${y}): ${hit?.name}`);
  }
  for(const side of [-1,1]){
   const hit=firstHit(head,[side,-.075,-.10],[-side,0,0]);
   assert.equal(hit?.parent.name,'hair','rear side scalp');
  }
 });
 test(name+' preserves the uncovered face and original facial features',()=>{
  const head=actor(create).group.getObjectByName('head');
  for(const [x,y] of [[0,.045],[0,-.029],[0,-.145],[-.091,.045],[.091,.045]]){
   const hit=firstHit(head,[x,y,1],[0,0,-1]);assert.ok(hit&&hit.parent.name!=='hair',`face (${x},${y}): ${hit?.name}`);
  }
  assert.equal(head.getObjectByName('face').material.color.getHex(),0xf1bd83);
  assert.equal(head.getObjectByName('pupil-left').material.color.getHex(),0x211e1b);
  assert.equal(head.getObjectByName('nose').position.z,.281);
  assert.equal(head.getObjectByName('mouth').position.y,-.145);
 });
}
for(const [name,pose] of poseCases){
 test(name+' keeps both arm segments fixed over a running/fatigue/lean cycle',()=>{
  for(const lean of [0,.1999,.2001,.5,1])for(const energy of [0,18,100])for(let n=0;n<32;n++){
   const p=pose({lean,energy,stamina:energy},n*.03125).points;
   for(let i=0;i<2;i++){
    assert.ok(Math.abs(distance(p.shoulder,p['elbow'+i])-.34)<1e-6,`upper arm length at lean=${lean}, energy=${energy}, frame=${n}`);
    assert.ok(Math.abs(distance(p['elbow'+i],p['hand'+i])-.32)<1e-6,'forearm length');
   }
  }
 });
 test(name+' keeps wrists away from shoulders with readable, finite elbows',()=>{
  for(const lean of [0,.2,.21,.6,1])for(const energy of [0,100])for(let n=0;n<64;n++){
   const p=pose({lean,energy},n*.019).points;
   for(let i=0;i<2;i++){
    const angle=elbowAngle(p.shoulder,p['elbow'+i],p['hand'+i]);
    assert.ok(Number.isFinite(angle)&&angle>=Math.PI/4&&angle<=Math.PI*5/6,`elbow ${(angle*180/Math.PI).toFixed(1)} degrees`);
    assert.ok(distance(p.shoulder,p['hand'+i])>.24,'wrist must not fold into shoulder');
   }
  }
 });
 test(name+' blends continuously through the old raw lean .2 switch',()=>{
  for(const time of [0,.13,.4,.8]){
   const a=pose({lean:.2-1e-6},time).points,b=pose({lean:.2+1e-6},time).points;
   for(const joint of ['shoulder','elbow0','elbow1','hand0','hand1'])assert.ok(distance(a[joint],b[joint])<1e-4,`${joint} jumps at time ${time}`);
  }
 });
 test(name+' never changes the race runner passed to the pose adapter',()=>{
  const r=name==='400 m'?structuredClone(base400):structuredClone(base1500),before=structuredClone(r);
  if(name==='400 m')sprintPose(r,.4,'race',true);else runnerPose(r,.4);
  assert.deepEqual(r,before);
 });
}
for(const [name,create] of factories){
 test(name+' aligns fingers along each 3D forearm and mirrors the hands',()=>{
  const c=actor(create),p={hip:{x:0,y:1},shoulder:{x:0,y:1.65},head:{x:0,y:1.98}};
  for(let i=0;i<2;i++){const side=i===0?1:-1;p['elbow'+i]={x:.15,y:1.36,z:side*.09};p['hand'+i]={x:.35,y:1.57,z:side*.17};p['knee'+i]={x:0,y:.6};p['foot'+i]={x:0,y:.1};}
  c.update(p,{lean:0,phase:'run'});
  for(let i=0;i<2;i++){
   const hand=c.group.getObjectByName('hand-'+i),forearm=vec(p['hand'+i]).sub(vec(p['elbow'+i])).normalize();
   const fingers=new THREE.Vector3(0,-1,0).applyQuaternion(hand.quaternion);
   assert.ok(fingers.dot(forearm)>1-1e-6,'fingers follow the full 3D forearm, including lateral fatigue');
   assert.equal(hand.scale.x,i===0?1:-1,'mirrored thumb geometry');
  }
 });
 test(name+' uses the same forward-facing yaw for body and head',()=>{
  const c=actor(create),{points,state}=runnerPose({...base1500},0);c.update(points,state);
  for(const part of ['body','head'])assert.equal(c.group.getObjectByName(part).rotation.y,Math.PI/2,part);
 });
}
test('400 m crouch/fall/runout maintain connected fixed-length arms',()=>{
 for(const state of [{started:false},{fall:.12},{fall:.3},{fall:1.1},{runout:1.21,finished:0},{runout:2.2,finished:0}]){
  const {points:p}=sprintPose({...base400,...state},.3,'race',true);
  for(let i=0;i<2;i++){
   assert.ok(Math.abs(distance(p.shoulder,p['elbow'+i])-.34)<1e-6,`upper arm ${JSON.stringify(state)}`);
   assert.ok(Math.abs(distance(p['elbow'+i],p['hand'+i])-.32)<1e-6,`forearm ${JSON.stringify(state)}`);
  }
 }
});

test('offline atlas sampling uses each game’s actual adapter and preserves frame layout',async()=>{
 const {existsSync}=await import('node:fs');
 const script=new URL('../../tools/render-runner-rig.mjs',import.meta.url);
 assert.ok(existsSync(script),'reproducible mesh atlas generator must exist');
 const {ATLAS_LAYOUT,sampleRunnerFrame}=await import(script.href);
 assert.deepEqual(ATLAS_LAYOUT,{width:192,height:288,columns:16,perCharacter:33,characters:4});
 for(const game of ['400m','1500m'])for(const frame of [0,8,16,20,24,28,32]){
  const s=sampleRunnerFrame(game,2,frame),expected=game==='400m'?sprintPose(s.runner,s.time,s.phase,s.prepared):runnerPose(s.runner,s.time);
  assert.deepEqual(s.pose,expected,`${game} frame ${frame} uses live pose`);
  assert.equal(s.runner.id,0,'atlas sequence has no per-runner phase offset baked in');
 }
 const {pose:a}=sampleRunnerFrame('400m',0,8),{pose:b}=sampleRunnerFrame('1500m',0,8);
 assert.notDeepEqual(a.points,b.points,'400m must not borrow the 1500m atlas pose');
});

for(const [name,pose] of poseCases)test(name+' gives the confirmed reference a high, forward forearm silhouette',()=>{
 let high=0;
 for(let n=0;n<64;n++){
  const p=pose({lean:0,energy:100,stamina:100,lastArm:n*.019},n*.019).points;
  for(let i=0;i<2;i++){
   const e=p['elbow'+i],w=p['hand'+i],angle=elbowAngle(p.shoulder,e,w)*180/Math.PI;
   assert.ok(w.y>e.y+.12,'running forearms rise in front of the body');
   assert.ok(w.x>p.shoulder.x+.20,'hands have visible forward clearance');
   assert.ok(angle>=60&&angle<=85,'readable bent elbows, chosen for this character rather than claimed robot measurements');
   if(w.y>p.shoulder.y)high++;
  }
 }
 assert.ok(high>0,'part of the cycle brings hands beside the upper chest/face space');
});

for(const [name,pose] of poseCases)test(name+' keeps the high hands outside the head silhouette from directly behind',()=>{
 for(let n=0;n<64;n++){
  const p=pose({lean:0,lastArm:n*.019},n*.019).points;
  for(let i=0;i<2;i++)assert.ok(Math.abs(p['hand'+i].z+(i===0?.205:-.205))>.33,'wrists stay outside the .305m rear hair radius');
 }
});

test('400 m arm activity settles continuously after the last steering input',()=>{
 const a=sprintPose({...base400,lastArm:0},.7-1e-6,'race',true).points,b=sprintPose({...base400,lastArm:0},.7+1e-6,'race',true).points;
 for(const name of ['elbow0','elbow1','hand0','hand1'])assert.ok(distance(a[name],b[name])<1e-4,name+' must not pop when arm activity expires');
});
for(const [name,create] of factories)test(name+' meshes retain unscaled arm lengths and attached wrists in non-running states too',()=>{
 const c=actor(create),cases=name==='400 m'?[{}, {started:false}, {fall:.12}, {fall:.3}, {fall:1.1}, {runout:2.2,finished:0}, {v:0}]:[{}, {energy:0}, {lean:1}, {v:0}];
 for(const extra of cases){
  const pose=name==='400 m'?sprintPose({...base400,...extra},.3,'race',true):runnerPose({...base1500,...extra},.3);c.update(pose.points,pose.state);
  for(let i=0;i<2;i++){
   for(const part of ['upper-arm-','forearm-'])assert.ok(Math.abs(c.group.getObjectByName(part+i).scale.y-1)<1e-6,'arm mesh remains anatomical length');
   const wrist=c.group.getObjectByName('hand-'+i).position,p=pose.points['hand'+i];assert.ok(wrist.distanceTo(new THREE.Vector3(p.x,p.y,(p.z||0)+(i===0?.205:-.205)))<1e-6);
  }
 }
});


test('extended sprite atlas selects one solid full pose with bounded, legacy-compatible indices',async()=>{
 const shared=await import('../../public/games/shared/runner-arm-pose.mjs');
 assert.equal(typeof shared.runnerSpriteFrame,'function','whole-pose selector must replace crossfade');
 const {RUNNER_SPRITE_LAYOUT:layout,runnerSpriteFrame:choose}=shared;
 assert.equal(layout.totalFrames,272);assert.equal(layout.rows,17);
 for(let id=0;id<4;id++){
  assert.equal(choose(0,{id,running:false}),id*33+32);
  assert.equal(choose(0,{id,running:true,fatigue:0,finish:0}),id*33);
  assert.equal(choose(0,{id,running:true,fatigue:1,finish:0}),id*33+16);
  assert.equal(choose(0,{id,running:true,fatigue:0,finish:1}),id*33+24);
  for(const fatigue of [0,.25,.5,.75,1])for(const finish of [0,.125,.25,.5,.75,.875,1])for(const phase of [-1,0,1,6.3]){
   const n=choose(phase,{id,running:true,fatigue,finish});assert.ok(Number.isInteger(n)&&n>=0&&n<layout.totalFrames);
  }
 }
});
test('tired plus leaning sprites retain exhaustion rather than switching back to fresh arms',async()=>{
 const {runnerSpriteFrame:choose}=await import('../../public/games/shared/runner-arm-pose.mjs');
 assert.equal(typeof choose,'function','whole-pose selector must exist');
 const {sampleAtlasFrame}=await import('../../tools/render-runner-rig.mjs');
 for(const game of ['400m','1500m'])for(const finish of [0,1/3,2/3,1]){
  const n=choose(Math.PI/2,{id:2,running:true,fatigue:1,finish}),sample=sampleAtlasFrame(game,n);
  assert.equal(sample.spriteParameters.fatigue,1,`${game} lean ${finish} keeps tired posture`);
  assert.equal(sample.spriteParameters.finish,finish);
  const expected=game==='400m'?sprintPose(sample.runner,sample.time,sample.phase,sample.prepared):runnerPose(sample.runner,sample.time);
  assert.deepEqual(sample.pose,expected,'every appended cell is an actual game pose');
 }
});

test('generated atlases include every legacy/appended cell with transparent margins',async()=>{
 const {createCanvas,loadImage}=await import('@napi-rs/canvas');
 for(const game of ['run-400m','run-1500m']){
  const image=await loadImage(new URL(`../../public/games/${game}/runner-atlas.png`,import.meta.url).pathname);
  assert.equal(image.width,3072);assert.equal(image.height,4896,'17 rows must include all appended poses');
  const canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
  for(let frame=0;frame<272;frame++){
   const ox=frame%16*192,oy=Math.floor(frame/16)*288;let count=0,minX=192,maxX=-1,minY=288,maxY=-1;
   for(let y=0;y<288;y++)for(let x=0;x<192;x++)if(pixels[((oy+y)*image.width+ox+x)*4+3]>0){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   assert.ok(count>1000,`${game} frame ${frame} has an actual rendered character`);
   assert.ok(minX>1&&maxX<190&&minY>1&&maxY<286,`${game} frame ${frame} must not be clipped (${minX},${minY})..(${maxX},${maxY})`);
  }
 }
});
test('400m extra atlas has 16 complete uncropped crouch/fall cells',async()=>{
 const {createCanvas,loadImage}=await import('@napi-rs/canvas'),image=await loadImage(new URL('../../public/games/run-400m/extra-poses.png',import.meta.url).pathname);
 assert.equal(image.width,3072);assert.equal(image.height,288);
 const canvas=createCanvas(192,288),ctx=canvas.getContext('2d');
 for(let frame=0;frame<16;frame++){
  ctx.clearRect(0,0,192,288);ctx.drawImage(image,frame*192,0,192,288,0,0,192,288);const pixels=ctx.getImageData(0,0,192,288).data;let count=0;
  for(let y=0;y<288;y++)for(let x=0;x<192;x++)if(pixels[(y*192+x)*4+3]){count++;assert.ok(x>1&&x<190&&y>1&&y<286,`extra frame ${frame} clipped at ${x},${y}`);}
  assert.ok(count>500);
 }
});

test('long-running fatigue and full-lean retain eight phases; only intermediate lean uses four',async()=>{
 const {runnerSpriteFrame:choose}=await import('../../public/games/shared/runner-arm-pose.mjs');
 const phases=32,unique=options=>new Set(Array.from({length:phases},(_,i)=>choose(i/phases*Math.PI*2,{running:true,...options}))).size;
 assert.equal(unique({fatigue:0,finish:0}),16);
 assert.equal(unique({fatigue:.5,finish:0}),8);assert.equal(unique({fatigue:1,finish:0}),8);
 assert.equal(unique({fatigue:0,finish:1}),8);assert.equal(unique({fatigue:1,finish:1}),8);
 for(const finish of [1/3,2/3])for(const fatigue of [0,1])assert.equal(unique({finish,fatigue}),4);
});
test('sprite rendering draws a single fully opaque cell without blending whole people',async()=>{
 const {drawRunnerSprite}=await import('../../public/games/shared/runner-arm-pose.mjs'),{createCanvas}=await import('@napi-rs/canvas');
 const atlas=createCanvas(3072,288),source=atlas.getContext('2d'),canvas=createCanvas(192,288),ctx=canvas.getContext('2d');
 source.fillStyle='red';source.fillRect(0,0,192,288);source.fillStyle='blue';source.fillRect(192,0,192,288);
 drawRunnerSprite(ctx,atlas,1,0,0,192,288);assert.deepEqual([...ctx.getImageData(96,144,1,1).data],[0,0,255,255]);assert.equal(ctx.globalAlpha,1);assert.equal(ctx.globalCompositeOperation,'source-over');
});

test('offline renderer matches Three front-face culling for mirrored hand geometry',async()=>{
 const {createCanvas}=await import('@napi-rs/canvas'),{createSoftwareRenderer}=await import('../../tools/runner-sprite-renderer.mjs');
 const canvas=createCanvas(64,64),renderer=createSoftwareRenderer(canvas,true);renderer.setSize(64,64,false);
 const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.SphereGeometry(.9,24,16),new THREE.MeshStandardMaterial({color:'#ffffff'}));scene.add(mesh);
 const camera=new THREE.OrthographicCamera(-1.1,1.1,1.1,-1.1,.1,10);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 renderer.render(scene,camera);const normal=canvas.getContext('2d').getImageData(32,32,1,1).data;
 mesh.scale.x=-1;renderer.render(scene,camera);const mirrored=canvas.getContext('2d').getImageData(32,32,1,1).data;
 assert.ok(Math.abs(normal[0]-mirrored[0])<5,`mirrored surface must use outward-facing triangles: ${normal[0]} vs ${mirrored[0]}`);
 assert.equal(mirrored[3],255);
});

async function realRunner(game){
 const race=game==='400m'?(await import('../../public/games/run-400m/race.mjs')).createRace(42):(await import('../../public/games/run-1500m/race.mjs')).createRace();
 race.phase='race';race.time=game==='400m'?.13:2;const p=race.runners[0];p.started=true;p.lean=1;return{race,p};
}
const live400=(p,time,phase='race')=>sprintPose({...p,x:0,lean:p.lean+(p.started&&p.fall===0?(1-p.stamina/100)*.16:0)},time,phase,true);
const armRelative=(pose,i)=>vec(pose.points['hand'+i]).sub(vec(pose.points.shoulder));
test('real 400m crossing keeps the arms near the pre-finish pose when race speed becomes zero',async()=>{
 const {race,p}=await realRunner('400m'),{step}=await import('../../public/games/run-400m/race.mjs');
 Object.assign(p,{distance:399.45,v:6,lastStep:race.time,bank:0});p.held[0]=p.held[1]=true;
 step(race,.02);assert.ok(Number.isFinite(p.finished),'real race crossing must finish');assert.equal(p.v,0);assert.equal(p.runout,0);assert.ok(!('runoutAge' in p));
 const snapshot=structuredClone(p),before=live400({...p,finished:null,v:6},race.time),after=live400(p,race.time);
 for(let i=0;i<2;i++)assert.ok(distance(before.points['hand'+i],after.points['hand'+i])<.04,'crossing must not teleport wrists into resting pose');
 assert.deepEqual(p,snapshot);
});
test('real 400m runout field progressively settles arms without changing score or lean input',async()=>{
 const {race,p}=await realRunner('400m'),{step}=await import('../../public/games/run-400m/race.mjs');
 race.phase='done';race.time=40;Object.assign(p,{finished:40,v:0,runout:0});const initial=live400(p,race.time),score=p.finished,lean=p.lean;let previous=initial;
 for(let n=0;n<360;n++){
  step(race,1/120);const next=live400(p,race.time,'done');
  for(let i=0;i<2;i++){
   assert.ok(armRelative(previous,i).distanceTo(armRelative(next,i))<.015,'runout changes joints in small steps');
   assert.ok(Math.abs(distance(next.points.shoulder,next.points['elbow'+i])-.34)<1e-6);assert.ok(Math.abs(distance(next.points['elbow'+i],next.points['hand'+i])-.32)<1e-6);
  }
  previous=next;
 }
 assert.ok(armRelative(initial,0).distanceTo(armRelative(previous,0))>.2,'actual runout must affect arms');
 assert.ok(Math.abs(elbowAngle(previous.points.shoulder,previous.points.elbow0,previous.points.hand0)*180/Math.PI-148)<1e-6);
 assert.equal(p.finished,score);assert.equal(p.lean,lean);
});
for(const game of ['400m','1500m'])test(game+' speed thresholds do not switch the arms directly into idle',async()=>{
 const {race,p}=await realRunner(game),threshold=game==='400m'?1:.35,snapshot=structuredClone(p);
 for(const lean of [0,.4,1]){
  const pose=(v)=>game==='400m'?live400({...p,v,lean},race.time):runnerPose({...p,v,lean},race.time);
  const a=pose(threshold+1e-6),b=pose(threshold-1e-6);
  for(let i=0;i<2;i++){
   assert.ok(armRelative(a,i).distanceTo(armRelative(b,i))<1e-4,'arm articulation must be continuous across the gait threshold');
   assert.ok(distance(a.points['hand'+i],b.points['hand'+i])<.04,'only preserved small lower-body bob difference is allowed');
  }
 }
 assert.deepEqual(p,snapshot);
});
test('real finished/stopping sprite states use complete settle poses instead of teleporting into static idle',async()=>{
 const shared=await import('../../public/games/shared/runner-arm-pose.mjs');
 assert.equal(typeof shared.runnerVisualMotion,'function','shared actual-runner visual activity must exist');
 const {runnerVisualMotion:motion,runnerSpriteFrame:choose}=shared;
 for(const game of ['400m','1500m']){
  const {race,p}=await realRunner(game);Object.assign(p,{v:0,finished:race.time,runout:0,finishRaceTime:race.time});
  const early=motion(p,race.time,game),first=choose(.4,{id:p.id,running:false,started:p.started,fatigue:0,...early});
  assert.notEqual(first,p.id*33+32,'a real finish must not select static idle');
  p.runout=3;const late=motion(p,game==='400m'?race.time:race.time+3,game),last=choose(.4,{id:p.id,running:false,started:p.started,fatigue:0,...late});
  assert.ok(last>=260&&last<272,'completed settle uses one of the 12 reserved complete-pose cells');
  assert.equal(late.activity,0);assert.equal(late.finish,0);
 }
});

test('unfinished held lean stays leaned with bent arms at low speed rather than recovering early',async()=>{
 for(const game of ['400m','1500m']){
  const {race,p}=await realRunner(game);p.v=0;const before=structuredClone(p),pose=game==='400m'?live400(p,race.time):runnerPose(p,race.time);
  assert.ok(pose.state.lean>.6,'unfinished input lean stays visible');
  for(let i=0;i<2;i++)assert.ok(elbowAngle(pose.points.shoulder,pose.points['elbow'+i],pose.points['hand'+i])*180/Math.PI<110,'held leaning pose retains bent high forearms');
  assert.deepEqual(p,before);
 }
});
test('the twelve reserved settle cells are actual standing, fixed-length game poses',async()=>{
 const {sampleAtlasFrame}=await import('../../tools/render-runner-rig.mjs');
 for(const game of ['400m','1500m'])for(let frame=260;frame<272;frame++){
  const s=sampleAtlasFrame(game,frame);assert.equal(s.kind,'settle');assert.equal(s.runner.started,true);assert.ok(Number.isFinite(s.runner.finished));
  assert.ok(s.pose.state.lean<.2,'settle must use a true standing body, not a bent finish frame');
  for(let i=0;i<2;i++){
   assert.ok(Math.abs(distance(s.pose.points.shoulder,s.pose.points['elbow'+i])-.34)<1e-6);assert.ok(Math.abs(distance(s.pose.points['elbow'+i],s.pose.points['hand'+i])-.32)<1e-6);
  }
 }
});


test('real 1500m post-finish engine deceleration carries continuous poses and complete settle sprites',async()=>{
 const {race,p}=await realRunner('1500m'),{step}=await import('../../public/games/run-1500m/race.mjs');
 const {runnerVisualMotion,runnerSpriteFrame}=await import('../../public/games/shared/runner-arm-pose.mjs');
 Object.assign(p,{v:6,finished:race.time,finishRaceTime:race.time});const score=p.finished,finishTime=p.finishRaceTime,lean=p.lean;
 let previous=runnerPose(p,race.time),crossed=false,settleSeen=false;
 for(let n=0;n<720;n++){
  const beforeV=p.v;step(race,1/120);const snapshot=structuredClone(p),next=runnerPose(p,race.time),motion=runnerVisualMotion(p,race.time,'1500m');
  if(beforeV>.35&&p.v<=.35){crossed=true;for(let i=0;i<2;i++)assert.ok(armRelative(previous,i).distanceTo(armRelative(next,i))<.025,'real slow-stop threshold must not pop wrists');}
  for(let i=0;i<2;i++){
   assert.ok(Math.abs(distance(next.points.shoulder,next.points['elbow'+i])-.34)<1e-6);assert.ok(Math.abs(distance(next.points['elbow'+i],next.points['hand'+i])-.32)<1e-6);
  }
  const frame=runnerSpriteFrame(race.time*(6+p.v*1.45)+p.id*1.3,{id:p.id,running:p.v>.35,fatigue:0,...motion});
  assert.notEqual(frame,p.id*33+32,'finished racer never teleports to pre-race idle');if(frame>=260)settleSeen=true;
  assert.deepEqual(p,snapshot,'view sampling does not mutate race data');previous=next;
 }
 assert.ok(crossed&&settleSeen);assert.ok(elbowAngle(previous.points.shoulder,previous.points.elbow0,previous.points.hand0)*180/Math.PI>147);
 assert.equal(p.finished,score);assert.equal(p.finishRaceTime,finishTime);assert.equal(p.lean,lean);
});

// This follows the actual held-input release, fixed-step race update, live
// adapters and atlas selector. A zero-speed unfinished racer is not a finisher.
async function releasedLeanTrace(game,fatigue=0){
 const {race,p}=await realRunner(game),engine=await import(`../../public/games/run-${game}/race.mjs`),{runnerVisualMotion,runnerSpriteFrame}=await import('../../public/games/shared/runner-arm-pose.mjs'),{sampleAtlasFrame}=await import('../../tools/render-runner-rig.mjs');
 race.time=40;Object.assign(p,{v:0,lastStep:-9,stamina:(1-fatigue)*100,energy:fatigue?30*(1-fatigue):100});
 if(game==='400m'){
  p.distance=395;p.held[0]=p.held[1]=true;engine.input(race,0,0,false);engine.input(race,0,1,false);
 }else{
  p.s=1480;p.held.j=p.held.k=true;p.handChord=p.tucking=true;engine.input(race,'j',false);engine.input(race,'k',false);
 }
 const samples=[];
 for(let n=0;n<=240;n++){
  const snapshot=structuredClone(p),motion=runnerVisualMotion(p,race.time,game),phase=game==='400m'?race.time*19+p.id*1.4:race.time*(6+p.v*1.45)+p.id*1.3;
  const frame=runnerSpriteFrame(phase,{id:p.id,running:p.v>(game==='400m'?1:.35),fatigue:game==='400m'?1-p.stamina/100:Math.max(0,1-p.energy/30),...motion});
  const live=game==='400m'?live400(p,race.time,race.phase):runnerPose(p,race.time),baked=sampleAtlasFrame(game,frame).pose;
  assert.deepEqual(p,snapshot,'live and atlas sampling leave the actual engine runner unchanged');
  assert.equal(p.finished,null,'release is before the real finish');assert.equal(p.started,true);assert.ok(p.v<1e-6);
  samples.push({time:race.time,lean:p.lean,motion,frame,live,baked});engine.step(race,1/120);
 }
 assert.ok(samples[0].lean>.99&&samples.at(-1).lean<1e-10,'complete release trace from held lean to upright');
 return samples;
}
for(const game of ['400m','1500m']){
 test(game+' real unfinished stopped lean release keeps high forearms instead of entering finish settle cells',async()=>{
  for(const fatigue of [0,.5,1])for(const s of await releasedLeanTrace(game,fatigue)){
   assert.ok(s.frame<260,`unfinished release must not select finish-settle frame ${s.frame} at ${s.time}`);
   assert.equal(s.motion.activity,1,'started, unfinished rest retains the high-forearm posture');
   for(let i=0;i<2;i++){
    const p=s.live.points;
    assert.ok(elbowAngle(p.shoulder,p['elbow'+i],p['hand'+i])*180/Math.PI<130,'resting in-race elbows stay bent as the torso recovers');
    assert.ok(Math.abs(distance(p.shoulder,p['elbow'+i])-.34)<1e-6);assert.ok(Math.abs(distance(p['elbow'+i],p['hand'+i])-.32)<1e-6);
   }
  }
 });
 test(game+' actual selected sprite geometry has no terminal hand drop during the full unfinished release trace',async t=>{
  for(const fatigue of [0,.5,1]){
   const samples=await releasedLeanTrace(game,fatigue),peaks={liveWrist:0,bakedWrist:0,bakedHead:0};
   for(let n=1;n<samples.length;n++){
    const a=samples[n-1],b=samples[n];
    for(let i=0;i<2;i++){
     const live=distance(a.live.points['hand'+i],b.live.points['hand'+i]),baked=distance(a.baked.points['hand'+i],b.baked.points['hand'+i]);
     peaks.liveWrist=Math.max(peaks.liveWrist,live);peaks.bakedWrist=Math.max(peaks.bakedWrist,baked);
     assert.ok(live<.09,`live wrist ${i} at ${b.time}`);
     // Existing four-phase lean cells are staged full poses. One .34 m arm
     // length plus 1 cm permits that grid, but rejects the .5-.7 m rest snap.
     assert.ok(baked<.35,`baked wrist ${i}: ${a.frame}->${b.frame} at ${b.time}`);
    }
    // Three existing torso lean bands differ by at most one .98 m torso
    // radius through .67/3 rad, plus the preserved small gait bob.
    const head=distance(a.baked.points.head,b.baked.points.head);peaks.bakedHead=Math.max(peaks.bakedHead,head);
    assert.ok(head<.23,`baked head ${a.frame}->${b.frame}`);
   }
   t.diagnostic(`${game} full 240-step release, initial fatigue=${fatigue}: maximum adjacent-joint movement (metres) ${JSON.stringify(peaks)}`);
  }
 });
}

test('standing settle cells are exclusive to an actual finish, in three ordered stages',async()=>{
 const {runnerSpriteFrame,runnerVisualMotion}=await import('../../public/games/shared/runner-arm-pose.mjs');
 for(let id=0;id<4;id++)for(const activity of [0,1/3,2/3]){
  assert.ok(runnerSpriteFrame(0,{id,started:true,finished:false,activity,finish:0})<260,'unfinished resting posture must not borrow finish-only settle cells');
 }
 for(const game of ['400m','1500m'])for(let id=0;id<4;id++){
  const stages=[];
  for(let n=0;n<=240;n++){
   const age=n/120,p={id,started:true,finished:40,finishRaceTime:40,runout:age,v:0,lean:0},frame=runnerSpriteFrame(0,{id,...runnerVisualMotion(p,40+age,game)});
   if(frame>=260&&stages.at(-1)!==frame)stages.push(frame);
  }
  assert.deepEqual(stages,[260+id*3,261+id*3,262+id*3],'true finish still advances through every reserved stage');
 }
});
