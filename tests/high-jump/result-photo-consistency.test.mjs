import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSharing} from '../../public/games/high-jump/share.mjs';
import {paintScoreCard} from '../../public/games/high-jump/score-card.mjs';
const require=createRequire(import.meta.url),{createCanvas}=require('@napi-rs/canvas');
const round={success:true,height:3.9,target:3.9},rating='橫桿看著你過去，連請假理由都省了。';
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
function scene(w,h){const c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle='#b2cc99';x.fillRect(0,0,w,h);x.fillStyle='#ff6c22';x.fillRect(w*.48,h*.2,w*.04,h*.6);x.fillStyle='#24789b';x.fillRect(0,h*.5,w,3);return c;}
function setup(){
 const nodes=new Map(),cards=[],blobs=[];
 function node(id){if(!nodes.has(id)){const n=id==='resultPhoto'?createCanvas(1,1):{};Object.assign(n,{hidden:false,disabled:false,textContent:'',value:'',open:false,addEventListener(){},removeAttribute(name){delete this[name]},showModal(){this.open=true},close(){this.open=false},focus(){},select(){}});nodes.set(id,n);}return nodes.get(id);}
 const document={activeElement:null,createElement(tag){if(tag==='a')return{click(){}};const c=createCanvas(1,1);cards.push(c);return c;}};
 const sharing=createSharing({byId:node,canonical:'https://example.test/games/high-jump/',document,navigator:{},URL:{createObjectURL(blob){blobs.push(blob);return'blob:fixture';},revokeObjectURL(){}}});
 return{sharing,node,cards,blobs};
}
const finish=async()=>{for(let n=0;n<20;n++)await new Promise(r=>setImmediate(r));};
test('preview reuses the exact download photo at every original viewport aspect',async()=>{
 for(const [w,h]of [[684,47],[684,316],[330,500],[700,240]]){
  const f=setup(),raw=scene(w,h);let photo,renderCalls=0;
  f.sharing.capture(raw,round,rating,(pw,ph)=>{renderCalls++;return photo=scene(pw,ph);});
  const preview=f.node('resultPhoto');
  assert.equal(renderCalls,1);
  assert.equal(photo.width,992);
  assert.ok(photo.height>0&&photo.height<=588);
  assert.equal(preview.width,photo.width,'preview must not inherit the transient container width');
  assert.equal(preview.height,photo.height,'preview must not inherit the transient container height');
  assert.deepEqual(pixels(preview),pixels(photo));
  assert.equal(preview.hidden,false);
  await finish();
 }
});
test('changing the preview preserves the complete existing download card pixels',async()=>{
 const raw=scene(684,47),baseline=paintScoreCard(raw,{...round,title:rating},()=>createCanvas(1,1),scene),f=setup();
 f.sharing.capture(raw,round,rating,scene);
 const generated=f.cards.find(c=>c.width===1080&&c.height===1180);
 assert.ok(generated);
 assert.deepEqual(pixels(generated),pixels(baseline));
 await finish();
});
test('a sharing caller without a render callback keeps its frozen source',async()=>{
 const f=setup(),raw=scene(200,300);f.sharing.capture(raw,round,rating);
 assert.equal(f.node('resultPhoto').width,200);assert.equal(f.node('resultPhoto').height,300);
 assert.deepEqual(pixels(f.node('resultPhoto')),pixels(raw));await finish();
});
test('result capture uses the settled renderer, not an unstable result dialog rectangle',()=>{
 const game=readFileSync(new URL('../../public/games/high-jump/game.mjs',import.meta.url),'utf8');
 const line=game.split('\n').find(x=>x.startsWith('function captureResult()'));
 const source={width:1180,height:600},calls=[],state={resultVerdict:rating},world={canvas:source,capture(s,w,h){calls.push({s,w,h});return scene(w,h);}};
 let received;
 vm.runInNewContext(line+';captureResult();',{world,s:state,sharing:{capture(...args){received=args;}},$(){return{parentElement:{getBoundingClientRect(){return{width:684,height:47};}}};},Math});
 assert.equal(received[0],source);assert.equal(received[1],state);assert.equal(received[2],rating);assert.equal(calls.length,0);
 received[3](992,588);assert.deepEqual(calls,[{s:state,w:992,h:588}]);
});

