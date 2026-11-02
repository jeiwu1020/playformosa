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
   assert.ok(asset.sourceUrl.startsWith(entry.href+'assets/'));
   const bytes=readFileSync(new URL('../public'+image,import.meta.url));assert.equal(bytes.length,asset.bytes);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  }
 });
}
