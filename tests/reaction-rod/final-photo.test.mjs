import test from 'node:test';import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as Snapshot from '../../public/games/reaction-rod/snapshot.mjs';
import * as P from '../../public/games/reaction-rod/physics.mjs';
import {readFinalMoment} from '../../public/games/reaction-rod/final-moment.mjs';
function moment(){const w=P.makeWorld(42);P.start(w);w.index=9;w.hands[1].x=w.hands[1].tx=.3;w.rod={x:.3,y:1.9,vy:-1,age:.2,lane:3,gravity:9.81};P.advance(w,P.CONFIG.fixedStep);return readFinalMoment(w);}
const canvas=()=>createCanvas(1,1);
test('final photo renders recorded rod and pose, copies pixels before releasing GPU, and card uses those same pixels',()=>{
 assert.equal(typeof Snapshot.captureResultPhoto,'function');const m=moment(),before=JSON.stringify(m),calls=[];let source;
 class Renderer{constructor({canvas}){source=this.canvas=canvas;}setPixelRatio(v){assert.equal(v,1);}setSize(w,h){this.canvas.width=w;this.canvas.height=h;}render(scene,camera){scene.updateMatrixWorld(true);assert.ok(scene.children.some(g=>g.type==='Group'&&g.visible&&g.position.x===m.rod.x&&g.position.y===m.rod.y));const ctx=this.canvas.getContext('2d');ctx.fillStyle='#2468ac';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);calls.push('render');}dispose(){calls.push('dispose');}forceContextLoss(){this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);calls.push('release');}}
 const photo=Snapshot.captureResultPhoto({moment:m,createCanvas:canvas,Renderer});assert.notEqual(photo,source);assert.equal(photo.width,900);assert.equal(photo.height,1120);assert.deepEqual([...photo.getContext('2d').getImageData(100,100,1,1).data],[36,104,172,255]);assert.deepEqual(calls,['render','dispose','release']);assert.equal(JSON.stringify(m),before);
 const card=Snapshot.captureResultCard({photo,record:{caught:10,total:10,rating:9,falls:0,title:'test',comment:'test'},createCanvas:canvas});assert.equal(card.width,1600);assert.equal(card.height,1200);assert.deepEqual([...card.getContext('2d').getImageData(140,140,1,1).data],[36,104,172,255]);
});
test('photo render failure releases the renderer and GPU context; missing moment is not fabricated',()=>{assert.equal(typeof Snapshot.captureResultPhoto,'function');let disposed=0,released=0;class Renderer{setPixelRatio(){}setSize(){}render(){throw Error('GPU failed');}dispose(){disposed++;}forceContextLoss(){released++;}}assert.throws(()=>Snapshot.captureResultPhoto({moment:moment(),createCanvas:canvas,Renderer}),/GPU failed/);assert.equal(disposed,1);assert.equal(released,1);assert.throws(()=>Snapshot.captureResultPhoto({moment:null,createCanvas:canvas,Renderer}),/moment/i);assert.equal(disposed,1);});
test('result-card creation rejects missing photo instead of substituting the later live scene',()=>{assert.throws(()=>Snapshot.captureResultCard({photo:null,record:{},createCanvas:canvas}),/photo/i);});
