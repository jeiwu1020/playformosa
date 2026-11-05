import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import {JSDOM} from 'jsdom';
const root=new URL('../../public/games/fast-hands/',import.meta.url),covers=['assets/intro-catch-generated.webp','assets/intro-duel-generated.webp'];
for(const file of ['index.html','catch.html','duel.html'])test(`${file} introduction uses its matching cover only`,()=>{
 const dom=new JSDOM(readFileSync(new URL(file,root),'utf8'));try{const d=dom.window.document,images=[...d.querySelectorAll('#entryDialog .club-card img')];assert.equal(images.length,1);const image=images[0],duck=file==='index.html',catching=file==='catch.html';assert.equal(image.getAttribute('src'),duck?'/assets/fast-hands-card-v2.webp':covers[catching?0:1]);assert.equal(image.width,duck?768:1536);assert.equal(image.height,duck?512:1024);assert.ok(image.alt.length>8);if(!duck){assert.match(image.alt,catching?/快手王.*玩具.*藍色/:/快手王.*運動/);assert.equal(d.getElementById('fallbackScene').getAttribute('src'),`assets/levels-${catching?'catch':'duel'}-ready.png`)}}finally{dom.window.close()}
});
test('production covers are valid 3:2 landscape WebP images, distinct and bounded',async()=>{
 const hashes=[];for(const path of covers){const url=new URL(path,root);assert.ok(existsSync(url),path+' exists');const bytes=readFileSync(url);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<500000,'thumbnail asset should not require multi-megabyte original');const img=await loadImage(bytes);assert.equal(img.width,1536);assert.equal(img.height,1024);hashes.push(createHash('sha256').update(bytes).digest('hex'))}assert.notEqual(...hashes);
});
