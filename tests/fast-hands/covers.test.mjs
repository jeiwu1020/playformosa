import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {catalog} from '../../src/catalog.mjs';
const root=new URL('../../',import.meta.url);
test('two generated covers use compact 3:2 WebP artwork and preserve archived source cards',()=>{
 for(const id of ['fast-hands','beer-slide']){
  const game=catalog.minigames.find(game=>game.id===id);assert.equal(game.image,`/assets/${id}-card-v2.webp`);assert.equal(game.imageStyle,'illustration');
  const data=readFileSync(new URL('public'+game.image,root));assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');assert.ok(data.length<100000,'homepage cover stays under 100 KB');
 }
 assert.ok(existsSync(new URL('public/assets/beer-slide-card.svg',root)));assert.ok(existsSync(new URL('public/assets/fast-hands-card.png',root)));
});
