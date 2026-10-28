import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../docs/minigames/SOURCE-MANIFEST.json',import.meta.url)));
for(const source of manifest.sources)test(`${source.game}: shipped original runtime and license files match the reviewed import`,()=>{
 for(const file of source.originalRuntimeFiles){
  const bytes=readFileSync(new URL(`../public/games/${source.game}/${file.path}`,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.importedSha256,file.path);
  if(file.unchanged)assert.equal(file.importedSha256,file.sourceSha256,file.path);
 }
 const adapted=source.originalRuntimeFiles.filter(x=>!x.unchanged).map(x=>x.path).sort();
 assert.deepEqual(adapted,source.game==='reaction-rod'?['game.mjs','index.html','share.mjs','style.css']:['index.html','style.css']);
});
