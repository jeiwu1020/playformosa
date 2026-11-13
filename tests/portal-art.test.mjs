import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalog} from '../src/catalog.mjs';
for(const entry of [...catalog.externalGames,...catalog.platforms]){
 test(`${entry.id}: original source evidence and local image bytes are preserved`,()=>{
  const record=JSON.parse(readFileSync(new URL(`../docs/portal/sources/${entry.id}.json`,import.meta.url),'utf8'));
  assert.equal(record.sourceHomepage,entry.href);
  for(const image of [entry.image,entry.logo].filter(Boolean)){
   const asset=record.assets.find(item=>item.path==='public'+image);assert.ok(asset,image);
   if(entry.id==='taiwanpunchline'){
    assert.equal(record.generator,'OpenAI native image generation');
    assert.equal(asset.sourceKind,'generated');
    assert.equal(asset.sourceUrl,undefined,'do not invent a hosted source URL for generated art');
    assert.equal(asset.sourcePath,'public/assets/portal-taiwanpunchline.png');
    assert.equal(asset.sha256,'39cde08925e1042dbfe8c5e301f4aa98cca6c63963e6e0f8008cc6f78a5ab1fa');
    const original=readFileSync(new URL('../'+asset.sourcePath,import.meta.url));
    assert.deepEqual(readFileSync(new URL('../public'+image,import.meta.url)),original);
    assert.equal(asset.width,1672);assert.equal(asset.height,941);
   }else if(entry.id==='soul10power')assert.equal(asset.sourceUrl,'https://soul10power.vercel.app/bg-desktop.webp');
   else assert.ok(asset.sourceUrl.startsWith(entry.href+'assets/'));
   const bytes=readFileSync(new URL('../public'+image,import.meta.url));assert.equal(bytes.length,asset.bytes);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  }
 });
}
