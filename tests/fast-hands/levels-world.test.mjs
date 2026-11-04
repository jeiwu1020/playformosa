import {itemArtFrame} from '../../public/games/fast-hands/levels-rules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';

import * as worldModule from '../../public/games/fast-hands/levels-world.mjs';
import * as stageModule from '../../public/games/fast-hands/levels-stage.mjs';
const state = (mode, extra = {}) => ({mode,phase:'idle',startedAt:0,liveAt:1000,targetAt:1400,flightMs:400,aiMs:180,items:[{id:'slipper',name:'Slipper',artIndex:0}],results:[],...extra});
const distance = (a,b) => new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
const near = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function create(mode){assert.equal(typeof worldModule.createLevelWorld,'function','level world must be implemented');return worldModule.createLevelWorld(THREE,{mode});}
function anatomy(sample){
  for(const arm of sample.anatomy.king.arms){near(distance(arm.shoulder,arm.elbow),.35);near(distance(arm.elbow,arm.wrist),.34);assert.deepEqual(arm.upperScale,[1,1,1]);assert.deepEqual(arm.lowerScale,[1,1,1]);}
  for(const arm of sample.anatomy.athlete?.arms||[]){near(distance(arm.shoulder,arm.elbow),.34);near(distance(arm.elbow,arm.wrist),.32);}
}

test('duel puts the actual sports athlete left and original khaki king right with a shared tabletop target',()=>{
  const w=create('duel');
  const sample=w.update({state:state('duel'),now:0});
  assert.ok(w.actors.king.root.getObjectByName('hero-moustache--1'));
  assert.ok(w.actors.king.root.getObjectByName('hero-shirt'));
  assert.ok(w.actors.athlete.group.getObjectByName('singlet'));
  assert.ok(w.actors.athlete.group.getObjectByName('bib'));
  assert.ok(sample.contacts.athleteHead[0]<-.3);
  assert.ok(sample.contacts.kingHead[0]>.3);
  assert.ok(Math.abs(sample.contacts.item[0])<.1);
  assert.ok(sample.contacts.item[1]>w.diagnostics().tableTop);
  assert.ok(w.scene.children.some(object=>object.isLight));
  anatomy(sample);w.dispose();
});

test('duel reaches and visibly closes fingers at the item without stretching either original rig',()=>{
  const w=create('duel');
  const idle=w.update({state:state('duel'),now:900});
  const before=w.actors.athlete.group.getObjectByName('finger-1-0').rotation.x;
  const won=state('duel',{phase:'feedback',results:[{winner:'player',reason:'player-first',playerMs:110,round:1}]});
  const sample=w.update({state:won,now:1500});
  assert.ok(distance(idle.contacts.athletePalm,sample.contacts.athletePalm)>.25);
  assert.ok(w.actors.athlete.group.getObjectByName('finger-1-0').rotation.x<before-.4);
  assert.equal(sample.itemAttachedTo,'athlete');
  assert.ok(distance(sample.contacts.item,sample.contacts.athletePalm)<.025);
  anatomy(sample);
  const lost=w.update({state:state('duel',{phase:'feedback',results:[{winner:'ai',reason:'ai-first',playerMs:null,round:1}]}),now:1600});
  assert.equal(lost.itemAttachedTo,'king');
  assert.ok(distance(lost.contacts.item,lost.contacts.kingPalm)<.025);
  anatomy(lost);w.dispose();
});

test('catch uses the original king with an open receiving hand and closes around a real foam dart',()=>{
  const w=create('catch');
  const open=w.update({state:state('catch',{phase:'live'}),now:1250});
  assert.equal(w.actors.athlete,null);
  assert.equal(w.objects.targetRing.visible,false,'catch has only its hand target, not a second tabletop target');
  assert.equal(w.objects.catchRing.visible,false,'the receiving hand has no target ring');
  assert.equal(open.grip,0);
  const palmNormal=w.actors.king.hands[1].group.getWorldDirection(new THREE.Vector3());
  assert.ok(palmNormal.x<-.6&&palmNormal.z>.3,'open receiving palm must face the dart and remain visible to the camera');
  const openTip=w.actors.king.hands[1].fingers[2].tip.getWorldPosition(new THREE.Vector3());
  const openGap=openTip.distanceTo(new THREE.Vector3(...open.contacts.kingPalm));
  assert.ok(open.contacts.dartTip[0]<open.contacts.kingPalm[0]);
  const caught=state('catch',{phase:'feedback',results:[{winner:'player',reason:'caught',offsetMs:0,round:1}]});
  const sample=w.update({state:caught,now:1700});
  assert.equal(sample.grip,1);
  assert.equal(sample.dartAttached,true);
  const closedTip=w.actors.king.hands[1].fingers[2].tip.getWorldPosition(new THREE.Vector3());
  assert.ok(closedTip.distanceTo(new THREE.Vector3(...sample.contacts.kingPalm))<openGap*.5,'actual fingers must close around the dart');
  assert.ok(distance(sample.contacts.dartTip,sample.contacts.kingPalm)<.000001);
  anatomy(sample);
  const miss=w.update({state:state('catch',{phase:'done',results:[{winner:'none',reason:'miss',offsetMs:null,round:1}]}),now:1800});
  assert.equal(miss.dartAttached,false);
  assert.ok(miss.contacts.dartTip[0]>miss.contacts.kingPalm[0]);
  w.dispose();
});

test('all phases and reverse seeks retain fixed bone lengths and finite visible geometry',()=>{
  for(const mode of ['catch','duel']){
    const w=create(mode);
    for(const phase of ['idle','waiting','live','feedback','done','paused'])for(const now of [1000,1080,1120,1180,1200,1400,1600,3000,1200]){
      const sample=w.update({state:state(mode,{phase,results:['feedback','done'].includes(phase)?[{winner:'player',reason:mode==='catch'?'caught':'player-first',offsetMs:0,playerMs:120,round:1}]:[]}),now});
      anatomy(sample);w.scene.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),o.name));
    }
    assert.ok(w.diagnostics().triangles<200000,'keep mobile triangle count bounded');
    w.dispose();assert.equal(w.scene.children.length,0);
  }
});

test('generated atlas indices select all sixteen cells without bleeding into neighboring art',()=>{
  const w=create('duel'),texture=new THREE.Texture();w.setItemTexture(texture);
  for(let index=0;index<16;index++){
    w.update({state:state('duel',{items:[{id:'item',artIndex:index}]}),now:0});
    const map=w.objects.itemArt.material.map;
    const rect=itemArtFrame(index);near(map.repeat.x,rect.width);near(map.repeat.y,rect.height);
    assert.ok(map.offset.x>=index%4*.25&&map.offset.x+map.repeat.x<=(index%4+1)*.25+.00001);
    near(map.offset.y,1-rect.top-rect.height);
  }
  w.dispose();
});

function canvasStub(){const events=new Map();return{getBoundingClientRect:()=>({width:360,height:320}),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),events};}
function rendererStub(){return{shadowMap:{},info:{render:{calls:0,triangles:0}},setPixelRatio(){},setSize(){},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);},dispose(){}};}

test('stage frames faces and reaching hands on a narrow screen and disposes safely',()=>{
  assert.equal(typeof stageModule.createLevelStage,'function','level stage must be implemented');
  const canvas=canvasStub(),stage=stageModule.createLevelStage(canvas,{mode:'duel',rendererFactory:rendererStub,loadTextures:false});
  assert.equal(stage.render(state('duel'),1000),true);
  for(const name of ['hero-head','head','hero-left-hand','hand-1']){
    const o=stage.world.scene.getObjectByName(name),p=o.getWorldPosition(new THREE.Vector3()).project(stage.camera);
    assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,`${name} must fit at mobile width: ${p.toArray()}`);
  }
  stage.dispose();stage.dispose();assert.equal(stage.render(state('duel'),1200),false);assert.equal(canvas.events.size,0);
});

test('stage creation failure and context loss report unavailable once without throwing',()=>{
  assert.equal(typeof stageModule.createLevelStage,'function','level stage must be implemented');
  const failures=[],canvas=canvasStub();
  const broken=stageModule.createLevelStage(canvas,{mode:'catch',onUnavailable:reason=>failures.push(reason),rendererFactory:()=>{throw new Error('WebGL disabled');},loadTextures:false});
  assert.equal(broken.render(state('catch'),1000),false);assert.equal(failures.length,1);
  const good=stageModule.createLevelStage(canvas,{mode:'catch',onUnavailable:reason=>failures.push(reason),rendererFactory:rendererStub,loadTextures:false});
  canvas.events.get('webglcontextlost')({preventDefault(){}});
  assert.equal(good.render(state('catch'),1200),false);assert.equal(failures.length,2);good.dispose();
});

test('collectible art is readable on mobile and false-start animation stays finite before a cue',()=>{
 const w=create('duel');assert.ok(w.objects.itemArt.geometry.parameters.width>=.55);
 const sample=w.update({state:state('duel',{phase:'feedback',startedAt:250,liveAt:null,targetAt:null,results:[{winner:'ai',reason:'early',playerMs:null,round:1}]}),now:600});
 anatomy(sample);w.scene.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),o.name));w.dispose();
});
test('failed atlas load reports unavailable instead of silently using a generic prize',()=>{
 const previous=globalThis.document;globalThis.document={};let errors=[];
 try{const stage=stageModule.createLevelStage(canvasStub(),{mode:'duel',rendererFactory:rendererStub,textureLoader:{load(url,success,progress,failure){failure(new Error('atlas 404'));}},onUnavailable:message=>errors.push(message)});assert.equal(stage.available,false);assert.equal(errors.length,1);assert.match(errors[0],/atlas|art|圖像/);stage.dispose();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
