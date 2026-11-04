import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import {createScoreImage} from '../../public/games/fast-hands/score-image.mjs';
import {describeResult} from '../../public/games/fast-hands/result-copy.mjs';

GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans TC');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Noto Sans TC');
const success=describeResult({phase:'success',elapsedMs:532},{best:500,previousBest:500,mode:'mouse'});

function drawingDocument(){
 const texts=[],images=[];let canvas;
 return{get canvas(){return canvas;},texts,images,document:{createElement(tag){
  assert.equal(tag,'canvas');canvas=createCanvas(1,1);const ctx=canvas.getContext('2d');
  const fillText=ctx.fillText.bind(ctx),drawImage=ctx.drawImage.bind(ctx);
  ctx.fillText=(text,x,y,maxWidth)=>{const metrics=ctx.measureText(text);texts.push({text,x,y,font:ctx.font,width:Math.min(metrics.width,maxWidth??Infinity),height:Number(ctx.font.match(/([\d.]+)px/)[1]),metrics});return maxWidth?fillText(text,x,y,maxWidth):fillText(text,x,y);};
  ctx.drawImage=(...args)=>{images.push(args);return drawImage(...args);};
  // Skia's bundled CSS parser reads non-hundred weights such as 750 as a font
  // size. Browsers support them; choose the nearest static face only in this
  // test adapter so measured glyphs have the same requested size as the browser.
  const context=new Proxy(ctx,{get(target,key){const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;},set(target,key,value){if(key==='font')value=value.replace(/^(\d+) /,(_,weight)=>`${Math.round(Number(weight)/100)*100} `);Reflect.set(target,key,value);return true;}});
  canvas.getContext=()=>context;
  canvas.toBlob=fn=>fn(new Blob([canvas.toBuffer('image/png')],{type:'image/png'}));return canvas;
 }}};
}
async function sourceImage(width,height){
 const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
 for(const [color,x,y] of [['#f28e2b',0,0],['#2b8cf2',width/2,0],['#218941',0,height/2],['#f0cf28',width/2,height/2]]){ctx.fillStyle=color;ctx.fillRect(x,y,width/2,height/2);}
 ctx.fillStyle='#102040';ctx.fillRect(0,0,width,8);ctx.fillRect(0,height-8,width,8);ctx.fillRect(0,0,8,height);ctx.fillRect(width-8,0,8,height);
 return{canvas,image:await loadImage(canvas.toBuffer('image/png'))};
}

// Shrinking the scene to a thumbnail, cropping its edges or stretching its aspect
// ratio must fail on decoded pixels, not merely on recorded drawImage arguments.
test('duck PNG retains all 900 × 620 captured scene pixels at full size',async()=>{
 const source=await sourceImage(900,620),draw=drawingDocument();
 const out=await createScoreImage({result:success,portrait:source.image,document:draw.document});
 const decoded=await loadImage(Buffer.from(await out.blob.arrayBuffer()));
 assert.equal(decoded.width,1080);assert.equal(decoded.height,1350);
 const target=createCanvas(1080,1350),ctx=target.getContext('2d');ctx.drawImage(decoded,0,0);
 assert.ok(Buffer.from(ctx.getImageData(90,190,900,620).data).equals(Buffer.from(source.canvas.getContext('2d').getImageData(0,0,900,620).data)),'the complete capture must appear at full 900 × 620 resolution');
 assert.equal(draw.images.length,1);assert.equal(draw.images[0][0],source.image);
});

test('wide and tall captures remain complete and undistorted inside the large scene area',async()=>{
 for(const [width,height,expected] of [[1200,400,[90,350,900,300]],[400,800,[385,190,310,620]]]){
  const source=await sourceImage(width,height),draw=drawingDocument();
  const out=await createScoreImage({result:success,portrait:source.image,document:draw.document});
  assert.deepEqual(draw.images[0].slice(1),expected);
  const decoded=await loadImage(Buffer.from(await out.blob.arrayBuffer())),target=createCanvas(1080,1350),ctx=target.getContext('2d');ctx.drawImage(decoded,0,0);
  const [x,y,w,h]=expected;
  for(const [px,py] of [[x+1,y+1],[x+w-2,y+1],[x+1,y+h-2],[x+w-2,y+h-2]])assert.deepEqual([...ctx.getImageData(px,py,1,1).data],[16,32,64,255],'all four original edges remain visible');
 }
});

test('real text metrics keep result details, game name and studio credit legible outside the scene',async()=>{
 const source=await sourceImage(900,620);
 const samples=[success,describeResult({phase:'success',elapsedMs:241},{best:241,previousBest:500,mode:'touch'}),describeResult({phase:'failed',elapsedMs:1300,pickupAt:400},{best:500,mode:'touch'}),{...success,title:'這是一個很長的標題'.repeat(20),comment:'這是很長的中文說明'.repeat(30),deltaText:'這是很長的紀錄比較'.repeat(30),bestText:'很長的最佳紀錄'.repeat(20)}];
 for(const result of samples){
  const draw=drawingDocument();await createScoreImage({result,portrait:source.image,document:draw.document});
  const all=draw.texts.map(t=>t.text).join('\n');assert.match(all,/鴨沒漏補/);assert.match(all,/島遊無界工作室 \| PLAYFORMOSA STUDIO/);assert.match(all,/本機最佳/);assert.ok(all.includes(result.modeText));
  for(const t of draw.texts){
   assert.ok(t.x>=60&&t.x+t.width<=1020,`${t.text}: horizontal bounds`);
   assert.ok(t.y>=50&&t.y+t.height<=1322,`${t.text}: vertical bounds`);
   assert.ok(t.y+t.metrics.actualBoundingBoxDescent<=1316,`${t.text}: glyphs touch the bottom card border`);
   assert.ok(t.y+t.height<=190||t.y>=810,`${t.text}: overlaps scene`);
   assert.ok(t.height>=17,`${t.text}: unreadable type`);
  }
  for(let i=0;i<draw.texts.length;i++)for(let j=i+1;j<draw.texts.length;j++){
   const a=draw.texts[i],b=draw.texts[j];
   assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${a.text} overlaps ${b.text}`);
  }
 }
});

test('offscreen duck fallback export fills canonical width without inheriting portrait viewport letterboxing',async()=>{
 const {renderScene,demoSample}=await import('../../public/games/fast-hands/scene.mjs');
 const canvas=createCanvas(1,1);canvas.getBoundingClientRect=()=>({width:320,height:600});
 const sample=demoSample(5700);renderScene(canvas,{...sample,demo:false},null,{width:900,height:500});
 assert.equal(canvas.width,900);assert.equal(canvas.height,500);
 const ctx=canvas.getContext('2d'),alpha=ctx.getImageData(0,250,900,1).data;
 const opaque=[];for(let x=0;x<900;x++)if(alpha[x*4+3]>0)opaque.push(x);
 assert.ok(opaque[0]<20&&opaque.at(-1)>880,'complete authored scene spans the card instead of a tiny tall-canvas inset');
});
