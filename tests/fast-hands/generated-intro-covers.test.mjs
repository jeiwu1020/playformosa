import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import {JSDOM} from 'jsdom';
const root=new URL('../../public/games/fast-hands/',import.meta.url),covers=['assets/intro-catch-generated.webp','assets/intro-duel-generated.webp'];
for(const file of ['index.html','catch.html','duel.html'])test(`${file} introduction uses the two distinct generated covers only`,()=>{
 const dom=new JSDOM(readFileSync(new URL(file,root),'utf8'));try{const d=dom.window.document,images=[...d.querySelectorAll('#entryDialog .club-card img')];assert.equal(images.length,3);assert.equal(images[0].getAttribute('src'),'/assets/fast-hands-card-v2.webp');for(let i=1;i<3;i++){assert.equal(images[i].getAttribute('src'),covers[i-1]);assert.equal(images[i].width,1536);assert.equal(images[i].height,1024);assert.ok(images[i].alt.length>8)}assert.match(images[1].alt,/快手王.*玩具.*藍色/);assert.match(images[2].alt,/快手王.*運動/);if(file!=='index.html')assert.equal(d.getElementById('fallbackScene').getAttribute('src'),`assets/levels-${file==='catch.html'?'catch':'duel'}-ready.png`)}finally{dom.window.close()}
});
test('production covers are valid 3:2 landscape WebP images, distinct and bounded',async()=>{
 const hashes=[];for(const path of covers){const url=new URL(path,root);assert.ok(existsSync(url),path+' exists');const bytes=readFileSync(url);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<500000,'thumbnail asset should not require multi-megabyte original');const img=await loadImage(bytes);assert.equal(img.width,1536);assert.equal(img.height,1024);hashes.push(createHash('sha256').update(bytes).digest('hex'))}assert.notEqual(...hashes);
});
