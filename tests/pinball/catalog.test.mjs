import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Inspect the additive catalog entry without executing unrelated external catalogs.
test('platform catalog admits the pinball game once with three-mode copy and local art',async()=>{
 const source=await readFile(new URL('../../src/catalog.mjs',import.meta.url),'utf8');
 const matches=source.match(/\{id:'overtime-pinball'[^\n]+/g)||[];
 assert.equal(matches.length,1);
 assert.match(matches[0],/href:'\/games\/overtime-pinball\/'/);
 assert.match(matches[0],/image:'\/assets\/overtime-pinball-card-v2\.png'/);
 assert.match(matches[0],/1 分鐘、3 分鐘或不限時/);
 const art=await readFile(new URL('../../public/assets/overtime-pinball-card-v2.png',import.meta.url));
 assert.equal(art.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});
