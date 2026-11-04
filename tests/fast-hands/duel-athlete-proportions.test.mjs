import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {createLevelWorld} from '../../public/games/fast-hands/levels-world.mjs';
import {createCharacter} from '../../public/games/javelin/character3d.mjs';

const near=(a,b,message,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,message+`: ${a} != ${b}`);
const v=a=>new THREE.Vector3(...a);
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const base={mode:'duel',phase:'waiting',items:[{artIndex:0}],results:[],liveAt:1000,targetAt:1400,flightMs:400,aiMs:180};

test('duel athlete reuses the reaction-rod body proportions and connected, near-upright fixed-length legs',()=>{
 const w=createLevelWorld(THREE,{mode:'duel'}),g=w.actors.athlete.group,s=w.update({state:base,now:500});
 const body=g.getObjectByName('body'),head=g.getObjectByName('head'),singlet=g.getObjectByName('singlet');
 near(head.scale.x,.76,'reaction-rod head scale');near(head.position.y-body.position.y,.70,'reaction-rod head offset');
 near(singlet.geometry.parameters.height+2*singlet.geometry.parameters.radius,.64,'original singlet geometry stays intact');
 near((singlet.geometry.parameters.height+2*singlet.geometry.parameters.radius)*singlet.scale.y,.50,'reference singlet height');
 near(singlet.geometry.parameters.radius*singlet.scale.x,.17,'reference singlet radius');
 for(let i=0;i<2;i++){
  const {hip,knee,ankle}=s.anatomy.athlete.legs[i];
  near(v(hip).distanceTo(v(knee)),.445,'reference thigh length');near(v(knee).distanceTo(v(ankle)),.445,'reference calf length');
  const hipInBody=body.worldToLocal(g.localToWorld(v(hip))),ankleInBody=body.worldToLocal(g.localToWorld(v(ankle)));
  near(Math.abs(hipInBody.x),.105,'hip is inset inside the shorts');near(hipInBody.y,-.03,'hip sits within pelvis');
  assert.ok(Math.abs(ankleInBody.x)>.14&&Math.abs(ankleInBody.x)<.17,'feet form the reference grounded stance');
  const midpoint=v(hip).lerp(v(ankle),.5);assert.ok(v(knee).distanceTo(midpoint)<.08,'knees cannot fold forward to compensate for excessively long bones');
  const thigh=g.getObjectByName('thigh-'+i),shin=g.getObjectByName('shin-'+i);
  near(thigh.scale.y*.55,.445,'actual rendered thigh length');near(shin.scale.y*.55,.445,'actual rendered calf length');
  const shorts=g.getObjectByName('shorts'),shortsLocal=shorts.worldToLocal(g.localToWorld(v(hip)));
  assert.ok(shortsLocal.length()<1,'both thigh roots are inside the pelvis mesh');
  const shoe=g.getObjectByName('shoe-'+i),up=new THREE.Vector3(0,1,0).applyQuaternion(shoe.getWorldQuaternion(new THREE.Quaternion()));
  near(up.y,1,'soles stay flat instead of following calf pitch');
 }
 w.dispose();
});

test('local proportion adaptation never edits or replaces the shared sports mesh geometry',()=>{
 const w=createLevelWorld(THREE,{mode:'duel'}),original=createCharacter(THREE,new THREE.Scene());
 original.group.traverse(o=>{if(!o.isMesh)return;const actual=w.actors.athlete.group.getObjectByName(o.name);assert.ok(actual?.isMesh,o.name);assert.deepEqual(actual.geometry.attributes.position.array,o.geometry.attributes.position.array,o.name);assert.deepEqual(actual.geometry.index?.array,o.geometry.index?.array,o.name);assert.equal(actual.material.color.getHex(),o.material.color.getHex(),o.name);});
 w.dispose();
});

test('234 poses retain exact existing arm/hand joint poses, king anatomy and all prop contacts',()=>{
 const w=createLevelWorld(THREE,{mode:'duel'}),objects=[],matrices=[],contacts=[],anatomy=[];
 w.actors.athlete.group.traverse(o=>{if(/^(upper-arm|forearm|elbow|hand|palm|fingers|finger|thumb)-/.test(o.name)||o.name==='athlete-grip-contact')objects.push(o)});objects.sort((a,b)=>a.name.localeCompare(b.name));
 for(const phase of ['idle','waiting','live','feedback','done','paused'])for(const winner of ['player','ai','none'])for(const now of [500,1000,1090,1180,1260,1400,1480,1520,1705,1900,2350,3000,1200]){
  const result={winner,reason:winner==='player'?'player-first':'ai-first',playerMs:110,offsetMs:0,round:1};
  const state={...base,phase,results:['feedback','done'].includes(phase)?[result]:[],presentation:{pressedAt:1110,settledAt:winner==='ai'?1180:1110}};
  const s=w.update({state,now});matrices.push(objects.map(o=>[o.name,[...o.position.toArray(),...o.quaternion.toArray()]]));
  const {athleteHead,...fixedContacts}=s.contacts;contacts.push(fixedContacts);anatomy.push({king:s.anatomy.king,arms:s.anatomy.athlete.arms});
 }
 assert.equal(digest(matrices),'74ed821d099f017bfb4042549783fb6742f73c102ec353ab7e1c491a1b219771');
 assert.equal(digest(contacts),'109354449f973f40d87724e878b85b9ec57032373bb79abce3c9424c24754270');
 assert.equal(digest(anatomy),'fd4dd28ee853e139a600eaa1ad2883cc6763b784c6131e2759caba455dcf53ed');
 w.dispose();
});
