import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/games/fast-hands/three3d/vendor/three.module.min.js';
import {sampleLevelMotion,dartPoint} from '../../public/games/fast-hands/levels-motion.mjs';
import {createLevelWorld} from '../../public/games/fast-hands/levels-world.mjs';
const base={phase:'done',liveAt:1000,targetAt:1400,flightMs:400,aiMs:180,presentation:{pressedAt:1400,settledAt:1400}};
const row=winner=>({winner,playerMs:110,offsetMs:0});
const gap=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('toy dart remains exactly on its straight flight line before and after target',()=>{for(const p of [0,.2,.5,1,1.5,2.5]){assert.equal(dartPoint(p)[1],1.33);assert.equal(dartPoint(p)[2],.35);}});
test('successful catch completes only after both lowered finger guns and preserves caught dart',()=>{
 const w=createLevelWorld(THREE,{mode:'catch'}),state={...base,phase:'feedback',results:[row('player')]};
 assert.equal(w.update({state,now:1920}).complete,false);
 const s=w.update({state,now:2500});assert.equal(s.complete,true);assert.equal(s.kingGun,1);assert.ok(s.kingPalm[1]<1.2);assert.ok(s.contacts.kingOuterPalm[1]<1.2);assert.equal(s.dartAttached,false);assert.equal(s.dartPlaced,true);assert.deepEqual(s.contacts.dartTip,[.5,1.05,.28]);assert.equal(w.objects.dart.rotation.z,0);w.dispose();
});
test('last duel outcome is replayed honestly before celebrating a different total winner; ties neutral',()=>{
 for(const [winners,total] of [[['player','player','ai'],'player'],[['ai','ai','player'],'ai'],[['ai','player'],'draw']]){
 const state={...base,results:winners.map(row)};
 const early=sampleLevelMotion({mode:'duel',state,now:1800});assert.equal(early.winner,winners.at(-1));assert.equal(early.celebrationWinner,null);assert.equal(early.complete,false);
 const late=sampleLevelMotion({mode:'duel',state,now:3000});assert.equal(late.overallWinner,total);assert.equal(late.celebrationWinner,total==='draw'?null:total);assert.equal(late.kingGun,total==='ai'?1:0);assert.equal(late.athleteGun,total==='player'?1:0);assert.equal(late.complete,true);
 const replay={...state,presentation:{...state.presentation,suppressCelebration:true}};const r=sampleLevelMotion({mode:'duel',state:replay,now:3000});assert.equal(r.celebrationWinner,null);assert.equal(r.kingGun,0);assert.equal(r.athleteGun,0);assert.equal(r.durationMs,520);
 }
});
test('finale world keeps rigid bone lengths and prop contacts across seeks',()=>{
 for(const winners of [['player','player','ai'],['ai','ai','player'],['ai','player']]){
 const w=createLevelWorld(THREE,{mode:'duel'}),state={...base,results:winners.map(row)};
 for(const now of [1400,1600,1950,2300,2500,3000,1500,3000]){const s=w.update({state,now});for(const [rig,l1,l2] of [[s.anatomy.king,.35,.34],[s.anatomy.athlete,.34,.32]])for(const a of rig.arms){assert.ok(Math.abs(gap(a.shoulder,a.elbow)-l1)<1e-7);assert.ok(Math.abs(gap(a.elbow,a.wrist)-l2)<1e-7);}if(s.itemAttachedTo)assert.ok(gap(s.item,s.contacts[s.itemAttachedTo==='king'?'kingPalm':'athletePalm'])<1e-7);}
 const first=w.update({state,now:3000});w.update({state,now:1500});assert.deepEqual(w.update({state,now:3000}),first);w.dispose();
 }
});

test('every finale millisecond range fits the original rig including table deposit',()=>{for(const mode of ['catch','duel'])for(const winner of ['player','ai','draw']){const w=createLevelWorld(THREE,{mode}),state={...base,results:[row(winner)]};for(let t=0;t<=1600;t+=10)assert.doesNotThrow(()=>w.update({state,now:1400+t}),mode+' '+winner+' '+t);w.dispose();}});
