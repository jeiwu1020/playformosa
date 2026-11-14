import test from 'node:test';import assert from 'node:assert/strict';
import {paintPinballScoreCard} from '../../public/games/overtime-pinball/score-card.mjs';
test('fixed shared result card format contains both orientations without crop',()=>{
 for(const [w,h] of [[390,844],[1280,720]]){const texts=[],draws=[];const ctx={fillRect(){},strokeRect(){},fillText:(s)=>texts.push(s),drawImage:(...a)=>draws.push(a)};const card={getContext:()=>ctx};
 paintPinballScoreCard({width:w,height:h},{score:12345,limit:60},()=>card);
 assert.equal(card.width,1080);assert.equal(card.height,1180);assert.ok(texts.includes('PLAYFORMOSA STUDIO'));assert.ok(texts.includes('12,345'));assert.ok(texts.includes('1 分鐘模式'));
 assert.equal(draws.length,1);assert.equal(draws[0].length,5);assert.ok(Math.abs(draws[0][3]/draws[0][4]-w/h)<1e-6);
 }
});

test('long valid score shrinks rather than clipping',()=>{
 const fonts=[];const ctx={fillRect(){},drawImage(){},measureText:()=>({width:1600}),fillText(text){if(text==='9,007,199,254,740,991')fonts.push(this.font);}};
 paintPinballScoreCard({width:390,height:844},{score:Number.MAX_SAFE_INTEGER,limit:0},()=>({getContext:()=>ctx}));
 assert.equal(fonts[0],'900 78.12px sans-serif');
});
