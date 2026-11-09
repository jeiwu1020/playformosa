import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {paintCourtesyScoreCard} from '../../public/games/courtesy-contest/score-card.mjs';

const result={grade:'S',title:'客氣冠軍',count:12,bonus:3,status:'安全入座',remaining:'按下謝謝時剩 0.58 秒'};
function render(width=954,height=360,info=result){
 const source=createCanvas(width,height),scene=source.getContext('2d');
 scene.fillStyle='#cf4040';scene.fillRect(0,0,width/2,height/2);
 scene.fillStyle='#405acf';scene.fillRect(width/2,0,width/2,height/2);
 scene.fillStyle='#d8a638';scene.fillRect(0,height/2,width/2,height/2);
 scene.fillStyle='#8235bf';scene.fillRect(width/2,height/2,width/2,height/2);
 const canvas=createCanvas(1,1),ctx=canvas.getContext('2d'),text=[],images=[],fills=[],strokes=[];
 const draw=ctx.drawImage.bind(ctx),fill=ctx.fillRect.bind(ctx),stroke=ctx.strokeRect.bind(ctx),write=ctx.fillText.bind(ctx);
 ctx.drawImage=(...args)=>{images.push(args);draw(...args);};
 ctx.fillRect=(...args)=>{fills.push({color:ctx.fillStyle,args});fill(...args);};
 ctx.strokeRect=(...args)=>{strokes.push(args);stroke(...args);};
 ctx.fillText=(value,x,y)=>{const m=ctx.measureText(value);text.push({value,x,y,width:m.width,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});write(value,x,y);};
 const output=paintCourtesyScoreCard(source,info,()=>canvas);
 return{output,ctx,text,images,fills,strokes,source};
}
function pixel(ctx,x,y){return [...ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data];}

test('downloaded photo has no added green mat or border',()=>{
 const {ctx,images,fills,strokes}=render();
 assert.equal(strokes.length,0,'the full game photo must not receive an extra border');
 assert.equal(fills.length,1,'paint only the neutral card background, not a photo mat');
 const [,x,y,w,h]=images[0],background=pixel(ctx,0,0);
 assert.deepEqual(pixel(ctx,x+w/2,y-2),background);
 assert.deepEqual(pixel(ctx,x+w/2,y+h+2),background);
});

test('landscape PNG closes immediately after branding instead of keeping a fixed empty tail',()=>{
 const {output,text,images}=render();
 assert.equal(output.width,1080);
 assert.ok(output.height<1000,`wide game frame should produce a compact card, got ${output.height}px`);
 const last=text.at(-1);
 assert.ok(output.height-last.bottom>=24&&output.height-last.bottom<=40,'keep a balanced 24–40px bottom margin');
 const [,x,y,w,h]=images[0],footer=text.find(item=>item.value==='島遊無界 · PLAYFORMOSA');
 assert.ok(footer.top-y-h>=12&&footer.top-y-h<=24,'footer follows the real photo edge');
});

for(const [label,width,height] of [['landscape',954,360],['portrait',320,568]]){
 test(`${label} download contains the complete frozen game frame without crop or distortion`,()=>{
  const {output,ctx,images,source,text}=render(width,height);
  assert.equal(images.length,1);
  const image=images[0];
  assert.equal(image[0],source);
  assert.equal(image.length,5,'draw the complete source, not a cropped source rectangle');
  const [,x,y,w,h]=image;
  assert.ok(Math.abs(w/h-width/height)<1e-9);
  assert.ok(x>=0&&x+w<=output.width&&y>=0&&y+h<=output.height);
  for(const [fx,fy,color] of [[.02,.02,[207,64,64,255]],[.98,.02,[64,90,207,255]],[.02,.98,[216,166,56,255]],[.98,.98,[130,53,191,255]]])assert.deepEqual(pixel(ctx,x+w*fx,y+h*fy),color);
  assert.ok(text.every(item=>item.top>=0&&item.bottom<output.height));
 });
}

test('long result captions wrap fully and expand the PNG without clipping the footer',()=>{
 const title='客氣冠軍與每一位乘客分享座位的傳奇故事'.repeat(6);
 const status='安全入座，今天大家都很客氣。'.repeat(10);
 const remaining='按下謝謝時剩 0.58 秒，入座時間已記錄。'.repeat(10);
 const {output,text}=render(954,360,{...result,title,status,remaining});
 const titleStart=text.findIndex(item=>item.value.startsWith('S · '));
 const footer=text.findIndex(item=>item.value==='島遊無界 · PLAYFORMOSA');
 assert.equal(text.slice(titleStart,footer).map(item=>item.value).join(''),'S · '+title+status+' · 連鎖 +3'+remaining);
 assert.ok(text.every(item=>item.width<=992&&item.x+item.width<=1036),'all captions remain within the card margins');
 for(let i=1;i<text.length;i++)assert.ok(text[i].top>=text[i-1].bottom,'measured text blocks must not overlap');
 assert.ok(output.height-text.at(-1).bottom>=24&&output.height-text.at(-1).bottom<=40);
});

test('zero mutual offers are retained with the original score and branding information',()=>{
 const {text}=render(954,360,{...result,count:0,bonus:0});
 assert.ok(text.some(item=>item.value==='0 次互讓'));
 assert.ok(text.some(item=>item.value==='S · 客氣冠軍'));
 assert.ok(text.some(item=>item.value==='安全入座'));
 assert.ok(text.some(item=>item.value==='按下謝謝時剩 0.58 秒'));
 assert.equal(text[0].value,'PLAYFORMOSA STUDIO');
 assert.equal(text.at(-2).value,'島遊無界 · PLAYFORMOSA');
 assert.equal(text.at(-1).value,'客氣大賽');
});

test('unready game frames and unavailable output contexts keep their explicit failures',()=>{
 assert.throws(()=>paintCourtesyScoreCard({width:0,height:360},result,()=>createCanvas(1,1)),/Game screenshot is not ready/);
 assert.throws(()=>paintCourtesyScoreCard({width:954,height:360},result,()=>({getContext:()=>null})),/Image canvas unavailable/);
});
