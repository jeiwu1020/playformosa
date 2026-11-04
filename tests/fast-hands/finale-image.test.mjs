import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {captureFinaleImage} from '../../public/games/fast-hands/finale-image.mjs';
import {itemArtFrame} from '../../public/games/fast-hands/levels-rules.mjs';
const canvases=[];
const document={createElement(tag){assert.equal(tag,'canvas');const c=createCanvas(1,1);c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));canvases.push(c);return c;}};
function solid(color,w=900,h=620){const c=createCanvas(w,h);c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,w,h);return c;}
async function img(color){return loadImage(solid(color).toBuffer('image/png'));}
function pixel(c,x,y){return [...c.getContext('2d').getImageData(x,y,1,1).data];}
const motion=()=>({fallbackFrame:{mix:.5},overlay:{prizeArtCenter:{x:.5,y:.5},prizeArtCorners:[{x:.4,y:.4},{x:.6,y:.4},{x:.6,y:.6},{x:.4,y:.6}],dartTip:{x:.5,y:.5}}});
test('copies freshly rendered live canvas synchronously before microtasks without modifying it',async()=>{
 const live=solid('red',300,100),before=[live.width,live.height];
 const pending=captureFinaleImage({document,canvas:live,renderFrame(){live.getContext('2d').fillStyle='blue';live.getContext('2d').fillRect(0,0,300,100);queueMicrotask(()=>live.getContext('2d').clearRect(0,0,300,100));}});
 assert.deepEqual(pixel(canvases.at(-1),450,310),[0,0,255,255]);assert.deepEqual([live.width,live.height],before);
 const r=await pending;assert.equal(r.blob.type,'image/png');assert.equal(r.width,900);assert.equal(r.height,620);assert.notDeepEqual(pixel(canvases.at(-1),450,10),[0,0,255,255]);
});
test('rejects failed render, empty canvas and unavailable encoder rather than making a generic hero',async()=>{
 await assert.rejects(captureFinaleImage({document,canvas:solid('red'),renderFrame:()=>false}));
 await assert.rejects(captureFinaleImage({document,canvas:{width:0,height:0}}));
 await assert.rejects(captureFinaleImage({document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}})})},canvas:solid('red')}));
});
test('fallback blends actual frames and crops only selected atlas cell at current projected position',async()=>{
 const from=await img('red'),to=await img('blue'),atlas=solid('lime',1254,1254),f=itemArtFrame(6),a=atlas.getContext('2d');a.fillStyle='yellow';a.fillRect(f.left*1254,f.top*1254,f.width*1254,f.height*1254);
 const m=motion(),before=JSON.stringify(m);await captureFinaleImage({document,fallback:{mode:'duel',motion:m,from,to,atlas,item:{artIndex:6}}});
 const output=canvases.at(-1);assert.deepEqual(pixel(output,450,310),[255,255,0,255]);assert.deepEqual(pixel(output,370,260),[255,255,0,255]);const outer=pixel(output,20,20);assert.ok(Math.abs(outer[0]-127)<=1&&Math.abs(outer[2]-128)<=1);assert.equal(JSON.stringify(m),before);
});
test('freezes fallback motion and item before source decode yields',async()=>{
 const real=await img('white');let resolve;const delayed={complete:false,naturalWidth:0,naturalHeight:0,decode:()=>new Promise(r=>resolve=()=>{delayed.complete=true;delayed.naturalWidth=900;delayed.naturalHeight=620;r();})};
 const calls=[],ctx={fillRect(){},drawImage(...args){calls.push(args);},save(){},restore(){}};
 const doc={createElement:()=>({getContext:()=>ctx,toBlob:cb=>cb(new Blob(['png'],{type:'image/png'}))})};
 const m=motion(),item={artIndex:6},fallback={mode:'duel',motion:m,from:delayed,to:real,atlas:real,item};const pending=captureFinaleImage({document:doc,fallback});m.overlay.prizeArtCenter.x=.9;item.artIndex=0;resolve();await pending;
 const crop=calls.find(a=>a.length===9);assert.equal(crop[1],itemArtFrame(6).left*900);assert.equal(crop[5],360);
});
test('missing or failed source images rejects without a static substitute',async()=>{
 await assert.rejects(captureFinaleImage({document,fallback:{mode:'catch',motion:motion(),from:null,to:null}}));
 await assert.rejects(captureFinaleImage({document,fallback:{mode:'catch',motion:motion(),from:{decode:()=>Promise.reject(new Error('broken'))},to:await img('white')}}));
});
test('catch prop follows frozen dart tip and explicit visibility',async()=>{
 const from=await img('white'),to=from,m=motion();await captureFinaleImage({document,fallback:{mode:'catch',motion:m,from,to,showDart:true}});assert.notDeepEqual(pixel(canvases.at(-1),450,310),[255,255,255,255]);
 m.dartVisible=false;await captureFinaleImage({document,fallback:{mode:'catch',motion:m,from,to,showDart:true}});assert.deepEqual(pixel(canvases.at(-1),450,310),[255,255,255,255]);
});
test('PNG encoder null, thrown security errors and stalled callbacks reject',async t=>{
 const ctx={fillRect(){},drawImage(){}};
 for(const toBlob of [cb=>cb(null),()=>{throw new Error('SecurityError');}])await assert.rejects(captureFinaleImage({document:{createElement:()=>({getContext:()=>ctx,toBlob})},canvas:solid('red')}));
 t.mock.timers.enable({apis:['setTimeout']});
 const pending=captureFinaleImage({document:{createElement:()=>({getContext:()=>ctx,toBlob(){}})},canvas:solid('red')});
 const rejected=assert.rejects(pending);t.mock.timers.tick(8001);await rejected;
});
test('unloaded fallback images are bounded, and event listeners removed on timeout',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const listeners=new Set();const image={naturalWidth:0,naturalHeight:0,complete:false,addEventListener:event=>listeners.add(event),removeEventListener:event=>listeners.delete(event)};
 const pending=captureFinaleImage({document,fallback:{mode:'catch',motion:motion(),from:image,to:image}});const rejected=assert.rejects(pending);t.mock.timers.tick(8001);await rejected;assert.equal(listeners.size,0);
});
test('data URL encoder fallback remains a PNG without owning object URLs',async()=>{
 const doc={createElement:()=>createCanvas(1,1)};const result=await captureFinaleImage({document:doc,canvas:solid('blue')});assert.equal(result.blob.type,'image/png');assert.ok(result.blob.size>0);const bytes=new Uint8Array(await result.blob.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
});
test('asynchronous render is rejected to prevent stale WebGL captures',async()=>{
 await assert.rejects(captureFinaleImage({document,canvas:solid('red'),renderFrame:async()=>true}));
});
