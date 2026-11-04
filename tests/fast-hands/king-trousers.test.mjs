import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';
import {createLevelWorld} from '../../public/games/fast-hands/levels-world.mjs';

// Captured before the trousers change. These protect the actual rendered upper
// body, shoes, hands, props and choreography, not a source-text approximation.
const BASELINE = {
  duck: {
    geometry:'5711ffede8bfd6c4fbffe942199a86bfb54c78068e2e4be23f726604cc8edbc8',
    poses:'e87ddf9398697d9146adbd4b08d71b183e60fa783ef66ad5c54e23574cf3184b',
    contacts:'8d887f7523aced46fe88c78dfb02662ccb8530c75b45004c2580307463188d8f',
  },
  catch: {
    kingGeometry:'21cf8eb42caf96312f1bb21d3112c838fbaab9b5991d736778b1e28f012726c2',
    kingPoses:'d0ff2a6c95443baed53f65d69847b843cdd59e2cd42e426bdac7a5248daa310d',
    contacts:'c2ff3e0f4fb4c1118242ab575624ca0bb7a22b5fc38697fb836772da69112a4b',
  },
  duel: {
    kingGeometry:'21cf8eb42caf96312f1bb21d3112c838fbaab9b5991d736778b1e28f012726c2',
    kingPoses:'2faa2256f8f076951187369fb7991814b6fc7fccd0edbc38df85aeeb01080a13',
    // These narrowed hashes are from the PRE-adaptation world, not regenerated
    // expected results from the new pose. The approved reference proportions
    // change athlete head/legs and limb radii, but never its hands or arm IK.
    contacts:'effa3741b60f54a6146fd18f13619cc85c529e6139d8a0ab4245a67721cbf948',
    athleteHandsGeometry:'ce2b6346e867f16c62b4f26071453dffe879ed354588b6a3634d6ebcfe24a40d',
    athleteHandsPoses:'17bc70ce267797d70f3bc929577dbf46e168dcf16d7a0ddd4f2d232ba0da6ceb',
  },
};
const garment = name => /^hero-(?:shorts(?:-|$)|waistband$|thigh-|shin-|knee-|sock(?:-|$)|trousers(?:-|$))/.test(name);
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
function stableObjects(root){const a=[];root.traverse(o=>{if(!garment(o.name))a.push(o)});return a.sort((a,b)=>a.name.localeCompare(b.name));}
const matrices=objects=>objects.map(o=>[o.name,Array.from(o.matrixWorld.elements)]);
const geometry=objects=>digest(objects.filter(o=>o.isMesh).map(o=>({name:o.name,attributes:Object.entries(o.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([k,a])=>[k,a.itemSize,a.normalized,Array.from(a.array)]),index:o.geometry.index?Array.from(o.geometry.index.array):null,material:[o.material.type,o.material.color?.getHex(),o.material.roughness,o.material.metalness,o.material.transparent,o.material.opacity,o.material.side,o.material.depthWrite,o.material.depthTest]})));

// Removing the garment mesh, shortening it to shorts, opening the knee seam,
// exposing sports socks or making the cuffs wider than the thighs must fail.
test('king has fitted, tapered cloth trousers covering both knees and shins down to the original shoes',()=>{
  const w=createDemoWorld(THREE);
  for(let i=0;i<2;i++){
    const pants=w.actor.root.getObjectByName('hero-trousers-leg-'+i);
    assert.ok(pants?.isMesh,'each leg needs an actual continuous cloth mesh');
    const leg=w.actor.legs[i];
    for(const original of [leg.upper,leg.lower,leg.knee,leg.shorts,leg.hem,leg.sock,leg.band])assert.equal(original.visible,false,original.name+' cannot show through the trousers');
    for(const time of [0,1.98,3.25,5.7,7,1.98]){
      const sample=w.update(time),anatomy=sample.anatomy.legs[i];
      const hip=new THREE.Vector3(...anatomy.hip),knee=new THREE.Vector3(...anatomy.knee),ankle=new THREE.Vector3(...anatomy.ankle);
      for(const t of [.08,.3,.6,.85,.98,1,1.02,1.2,1.5,1.8,1.95]){
        const center=t<=1?hip.clone().lerp(knee,t):knee.clone().lerp(ankle,t-1);
        for(let a=0;a<12;a++){
          const radial=new THREE.Vector3(Math.cos(a*Math.PI/6),0,Math.sin(a*Math.PI/6));
          const ray=new THREE.Raycaster(center.clone().addScaledVector(radial,.3),radial.clone().negate(),0,.3);
          const hit=ray.intersectObject(pants,false)[0];
          assert.ok(hit,`leg ${i} needs full 360-degree cloth coverage at ${t}, angle ${a}`);
          assert.ok(hit.point.distanceTo(center)>.072,'cloth must have volume beyond the original shin');
          if(t===.3&&(a===3||a===9))assert.ok(hit.point.distanceTo(center)>.16,'upper cloth blends into the pelvis instead of leaving a separate rounded shorts bulge');
        }
      }
      const bounds=new THREE.Box3().setFromObject(pants);
      assert.ok(bounds.max.y>=hip.y,'cloth connects into the existing waistband');
      assert.ok(bounds.min.y<ankle.y+.022&&bounds.min.y>ankle.y-.025,'full-length cuff must meet the shoe without dragging');
      const atHeight=(y)=>Array.from({length:pants.geometry.attributes.position.count},(_,j)=>new THREE.Vector3().fromBufferAttribute(pants.geometry.attributes.position,j)).filter(v=>Math.abs(v.y-y)<.035);
      const span=points=>Math.max(...points.map(v=>v.x))-Math.min(...points.map(v=>v.x));
      assert.ok(span(atHeight(hip.y-.12))>span(atHeight(ankle.y+.02))*1.15,'casual trouser legs taper toward the ankle');
    }
    const color=pants.material.color.clone().convertLinearToSRGB();
    assert.ok(color.r>color.b&&color.g>color.b&&Math.max(color.r,color.g,color.b)-Math.min(color.r,color.g,color.b)<.13,'cloth is neutral gray-brown, not navy or skin');
  }
  const belt=w.actor.root.getObjectByName('hero-trousers-belt');
  assert.ok(belt?.isMesh,'the reference black belt is present');
  assert.ok(Math.max(belt.material.color.r,belt.material.color.g,belt.material.color.b)<.04,'the belt is dark black-brown');
  w.dispose();
});

test('701 duck frames retain every original upper-body, face, hand and shoe mesh and every IK/contact transform',()=>{
  const w=createDemoWorld(THREE),objects=stableObjects(w.scene),poses=[],contacts=[];
  assert.equal(geometry(objects),BASELINE.duck.geometry);
  for(let i=0;i<=700;i++){const s=w.update(i/100);poses.push(matrices(objects));contacts.push({anatomy:s.anatomy,contacts:s.contacts});}
  assert.equal(digest(poses),BASELINE.duck.poses);
  assert.equal(digest(contacts),BASELINE.duck.contacts);
  for(const i of [700,570,325,198,90,0]){w.update(i/100);assert.deepEqual(matrices(objects),poses[i],'reverse seeking preserves choreography');}
  w.dispose();
});

for(const mode of ['catch','duel'])test(`${mode} keeps king upper body, fixed arm IK, hand meshes/transforms and prop contacts unchanged`,()=>{
  const w=createLevelWorld(THREE,{mode}),king=stableObjects(w.actors.king.root),athlete=w.actors.athlete?stableObjects(w.actors.athlete.group).filter(o=>/^(hand|palm|fingers|finger|thumb)-/.test(o.name)||o.name==='athlete-grip-contact'):[],poses=[],athletePoses=[],contacts=[];
  assert.equal(geometry(king),BASELINE[mode].kingGeometry);
  if(athlete.length)assert.equal(geometry(athlete),BASELINE.duel.athleteHandsGeometry);
  for(const phase of ['idle','waiting','live','feedback','done','paused'])for(const winner of ['player','ai','none'])for(const now of [500,1000,1090,1180,1260,1400,1480,1520,1705,1900,2350,3000,1200]){
    const result={winner,reason:mode==='catch'?'caught':winner==='player'?'player-first':'ai-first',playerMs:110,offsetMs:0,round:1};
    const state={mode,phase,items:[{artIndex:0}],results:['feedback','done'].includes(phase)?[result]:[],liveAt:1000,targetAt:1400,flightMs:400,aiMs:180,presentation:{pressedAt:mode==='catch'?1400:1110,settledAt:mode==='catch'?1400:winner==='ai'?1180:1110}};
    const sample=w.update({state,now});poses.push(matrices(king));athletePoses.push(matrices(athlete));
    if(mode==='duel'){
      const {athleteHead,...fixedContacts}=sample.contacts;
      contacts.push({anatomy:{king:sample.anatomy.king,athlete:{arms:sample.anatomy.athlete.arms}},contacts:fixedContacts});
    }else contacts.push({anatomy:sample.anatomy,contacts:sample.contacts});
  }
  assert.equal(digest(poses),BASELINE[mode].kingPoses);
  assert.equal(digest(contacts),BASELINE[mode].contacts);
  if(athlete.length)assert.equal(digest(athletePoses),BASELINE.duel.athleteHandsPoses);
  for(let i=0;i<2;i++)assert.ok(w.actors.king.root.getObjectByName('hero-trousers-leg-'+i));
  w.dispose();
});
