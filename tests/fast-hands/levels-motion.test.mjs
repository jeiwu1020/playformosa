import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import * as level from '../../public/games/fast-hands/levels-world.mjs';
import * as motionModule from '../../public/games/fast-hands/levels-motion.mjs';
const base = {phase:'live',startedAt:100,liveAt:1000,targetAt:1400,flightMs:400,aiMs:180,items:[{artIndex:0}],results:[]};
const result = (winner,reason,extra={}) => ({winner,reason,round:1,...extra});
const feedback = (row,pressedAt,settledAt=pressedAt) => ({...base,phase:'feedback',results:[row],presentation:{pressedAt,settledAt}});
const gap = (a,b) => new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));

test('catch receiving arm rests below the tabletop until the player actually presses',()=>{
 const w=level.createLevelWorld(THREE,{mode:'catch'});
 for(const phase of ['idle','waiting','live','paused']){
  const sample=w.update({state:{...base,phase},now:1300});
  assert.ok(sample.contacts.kingPalm[1]<1,`${phase}: hand must remain naturally lowered`);
  assert.equal(sample.kingReach,0);
 }
 const s=feedback(result('player','caught',{offsetMs:0}),1400);
 const before=w.update({state:s,now:1400}),raised=w.update({state:s,now:1520});
 assert.ok(gap(before.contacts.kingPalm,raised.contacts.kingPalm)>.35);
 assert.ok(raised.contacts.kingPalm[1]>1.25);
 assert.equal(before.dartAttached,false,'success must not teleport the dart into a still-lowered hand');
 assert.equal(raised.dartAttached,true);
 w.dispose();
});

test('successful catch visibly raises, grasps, and carries the dart back toward the body',()=>{
 const w=level.createLevelWorld(THREE,{mode:'catch'}),s=feedback(result('player','caught',{offsetMs:0}),1400);
 const contact=w.update({state:s,now:1520}),returned=w.update({state:s,now:1900});
 assert.ok(returned.contacts.kingPalm[0]>.4,'return the held dart to the king, not leave it at the flight target');
 assert.ok(gap(contact.contacts.kingPalm,returned.contacts.kingPalm)>.35);
 assert.equal(returned.dartAttached,true);
 assert.ok(gap(returned.contacts.dartTip,returned.contacts.kingPalm)<1e-7);
 w.dispose();
});

test('early catch inputs raise the hand too, while untouched misses never raise it',()=>{
 const w=level.createLevelWorld(THREE,{mode:'catch'});
 const early={...feedback(result('none','early',{offsetMs:null}),900),liveAt:null,targetAt:null};
 assert.ok(w.update({state:early,now:900}).contacts.kingPalm[1]<1);
 assert.ok(w.update({state:early,now:1020}).contacts.kingPalm[1]>1.25);
 assert.equal(w.sample.dartAttached,false);
 assert.ok(w.update({state:early,now:1500}).contacts.kingPalm[1]<1,'empty hand relaxes to its side');
 const miss=feedback(result('none','miss',{offsetMs:null}),null,1480);
 assert.ok(w.update({state:miss,now:1500}).contacts.kingPalm[1]<1);
 w.dispose();
});

test('player duel reaches an unmoved prize before attachment, then retracts it to the chest',()=>{
 const w=level.createLevelWorld(THREE,{mode:'duel'}),s=feedback(result('player','player-first',{playerMs:110}),1110);
 const start=w.update({state:s,now:1110}),near=w.update({state:s,now:1240});
 assert.equal(start.itemAttachedTo,null);
 assert.equal(near.itemAttachedTo,null);
 assert.deepEqual(near.contacts.item,[0,1.14,.38]);
 const grabbed=w.update({state:s,now:1260});
 assert.equal(grabbed.itemAttachedTo,'athlete');
 assert.ok(gap(grabbed.contacts.item,[0,1.14,.38])<1e-7,'attachment starts at the tabletop contact');
 const returned=w.update({state:s,now:1700});
 assert.ok(returned.contacts.item[0]<-.42,'the prize must finish at the player body');
 assert.ok(returned.contacts.item[1]>1.22);
 assert.ok(gap(grabbed.contacts.item,returned.contacts.item)>.42);
 assert.ok(gap(returned.contacts.item,returned.contacts.athletePalm)<1e-7);
 assert.ok(gap(returned.contacts.kingPalm,[.49,1.20,.27])<1e-7,'losing arm relaxes back');
 w.dispose();
});

test('AI duel carries the prize back to its own body and an early result cannot preattach it',()=>{
 const w=level.createLevelWorld(THREE,{mode:'duel'}),s=feedback(result('ai','ai-first',{playerMs:null}),null,1180);
 const grabbed=w.update({state:s,now:1180}),returned=w.update({state:s,now:1700});
 assert.equal(grabbed.itemAttachedTo,'king');
 assert.ok(gap(grabbed.contacts.item,[0,1.14,.38])<1e-7);
 assert.ok(returned.contacts.item[0]>.42);
 assert.ok(returned.contacts.item[1]>1.22);
 assert.ok(gap(returned.contacts.item,returned.contacts.kingPalm)<1e-7);
 const early={...feedback(result('ai','early',{playerMs:null}),900),liveAt:null,targetAt:null};
 assert.equal(w.update({state:early,now:900}).itemAttachedTo,null);
 assert.equal(w.update({state:early,now:1050}).itemAttachedTo,'king');
 w.dispose();
});

test('presentation sampling exposes interpolated same-model frames and resets on the next round',()=>{
 assert.equal(typeof motionModule.sampleLevelMotion,'function');
 const s=feedback(result('player','caught',{offsetMs:0}),1400);
 const motion=motionModule.sampleLevelMotion({mode:'catch',state:s,now:1460});
 assert.ok(motion.fallbackFrame.from&&motion.fallbackFrame.to);
 assert.ok(motion.fallbackFrame.mix>=0&&motion.fallbackFrame.mix<=1);
 assert.equal(motion.dartAttached,false);
 const reset=motionModule.sampleLevelMotion({mode:'catch',state:{...base,phase:'waiting',presentation:{pressedAt:1400,settledAt:1400},startedAt:2000},now:2100});
 assert.equal(reset.kingReach,0,'stale presentation data cannot move a new round');
 assert.equal(reset.fallbackFrame.from,'levels-catch-ready');
});

test('fallback overlays match the exact source-world camera and held contacts throughout both actions',()=>{
 const camera=new THREE.OrthographicCamera(-2.42*900/620/2,2.42*900/620/2,2.42/2,-2.42/2,.1,30);
 camera.position.set(0,2.35,6);camera.lookAt(0,1.15,.15);camera.updateMatrixWorld(true);
 for(const mode of ['catch','duel']){
  const w=level.createLevelWorld(THREE,{mode});
  const s=mode==='catch'?feedback(result('player','caught',{offsetMs:0}),1400):feedback(result('player','player-first',{playerMs:110}),1110);
  for(let t=0;t<=520;t+=20){
   const sample=w.update({state:s,now:s.presentation.pressedAt+t});
   for(const [name,point] of [['prize',sample.contacts.item],['receivingHand',sample.contacts.kingPalm],['playerHand',sample.contacts.athletePalm],['dartTip',mode==='catch'?sample.contacts.dartTip:null]]){
    if(!point)continue;const p=new THREE.Vector3(...point).project(camera),overlay=sample.overlay[name];
    assert.ok(Math.abs(overlay.x-(p.x+1)/2)<1e-7,name+' x');assert.ok(Math.abs(overlay.y-(1-p.y)/2)<1e-7,name+' y');
   }
  }
  w.dispose();
 }
});

test('fallback prize bounds project the full .56 source plane without shrinking it',()=>{
 const w=level.createLevelWorld(THREE,{mode:'duel'});
 const sample=w.update({state:feedback(result('player','player-first',{playerMs:110}),1110),now:1490});
 const half=w.objects.itemArt.geometry.parameters.width/2;
 for(const [i,[x,y]] of [[-half,half],[half,half],[half,-half],[-half,-half]].entries()){
  const actual=w.objects.itemArt.localToWorld(new THREE.Vector3(x,y,0)).toArray();
  const expected=motionModule.projectFallbackPoint(actual);
  assert.ok(Math.abs(sample.overlay.prizeArtCorners[i].x-expected.x)<1e-7);
  assert.ok(Math.abs(sample.overlay.prizeArtCorners[i].y-expected.y)<1e-7);
 }
 w.dispose();
});

test('fallback frame preload list covers every animation result and remains bounded',()=>{
 assert.ok(Array.isArray(motionModule.FALLBACK_FRAME_NAMES));
 assert.equal(motionModule.FALLBACK_FRAME_NAMES.length,15);
 assert.equal(new Set(motionModule.FALLBACK_FRAME_NAMES).size,15);
 for(const mode of ['catch','duel'])for(const winner of ['player','ai','none','draw'])for(let t=0;t<=550;t+=10){
  const s=feedback(result(winner,winner==='none'?'early':mode==='catch'?'caught':'player-first',{offsetMs:0,playerMs:110}),mode==='catch'?1400:1110);
  const m=motionModule.sampleLevelMotion({mode,state:s,now:s.presentation.pressedAt+t});
  for(const key of ['from','to'])assert.ok(motionModule.FALLBACK_FRAME_NAMES.includes(m.fallbackFrame[key]),m.fallbackFrame[key]);
 }
});
