import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../../public/games/overtime-pinball/vendor/three.module.min.js';
import * as machine from '../../public/games/overtime-pinball/raffle-machine.js';
test('raffle machine reads exact collider dimensions, retains slot/drum/outlet and no floating label',()=>{
 for(const shape of [{hx:1,hz:1},{hx:.8,hz:1.2}]){const parent=new T.Group(),m=machine.createRaffleMachine(T,{parent,shape});assert.ok(m.root.getObjectByName('raffle-ticket-slot'));assert.ok(m.root.getObjectByName('raffle-ball-drum'));assert.ok(m.root.getObjectByName('raffle-prize-outlet'));m.shell.geometry.computeBoundingBox();const b=m.shell.geometry.boundingBox;assert.ok(b.min.x>=-shape.hx&&b.max.x<=shape.hx);assert.ok(b.min.z>=-shape.hz&&b.max.z<=shape.hz);assert.ok(b.max.y<=2.6);let sprites=0;m.root.traverse(o=>{if(o.isSprite)sprites++;});assert.equal(sprites,0);m.dispose();assert.equal(parent.children.length,0);}
});
test('draw animation stays local and does not hide real ball, with finite mesh/pass budget',()=>{
 const parent=new T.Group(),m=machine.createRaffleMachine(T,{parent,shape:{hx:1,hz:1}});m.update({phase:'drawing',prize:'gate',drawUntil:.8},.4);assert.ok(m.drum.rotation.z!==0);assert.equal(m.sparks.visible,true);m.update({phase:'active',prize:'upgrade',until:12.8,drawUntil:.8},1);assert.equal(m.prizeBall.visible,true);assert.equal(m.prizeBall.material.color.getHex(),0x67ddff);m.update({phase:'charging',charged:['a']},20);assert.equal(m.sparks.visible,false);assert.equal(m.prizeBall.visible,false);let meshes=0,passes=0,casters=0;parent.traverse(o=>{if(o.isMesh){meshes++;passes+=o.material.transparent&&o.material.side===T.DoubleSide&&!o.material.forceSinglePass?2:1;}if(o.castShadow)casters++;});assert.ok(meshes<=9,`machine mesh budget ${meshes}`);assert.equal(passes,meshes);assert.equal(casters,0);m.dispose();
});
import {createLotteryVisuals} from '../../public/games/overtime-pinball/lottery-visual.js';
test('parent visual retains three prizes, resets old chain on restart and removes inherited floating labels',()=>{
 const scene=new T.Group(),v=createLotteryVisuals(T,{scene,shape:{x:3,z:5,hx:1,hz:1},stations:[{id:'a',x:1,z:1},{id:'b',x:4,z:2}],mapX:x=>-x});assert.equal(v.box.position.x,-3);assert.equal(v.label,null);assert.equal(v.root.getObjectByName('lottery-label-leader'),undefined);
 for(const prize of ['gate','upgrade','busy']){v.update({phase:'active',prize,drawUntil:0,until:9},1);assert.equal(v.effects[prize].visible,true);assert.equal(v.machine.prizeBall.visible,true);}
 v.consume({type:'lotteryChain',stationId:'a',targets:['b']},10);v.update({phase:'active',prize:'busy',until:12,drawUntil:0},10.1);assert.equal(v.chain.visible,true);v.update({phase:'ready'},0);assert.equal(v.chain.visible,false);v.dispose();assert.equal(scene.children.length,0);
});
