import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../docs/minigames/SOURCE-MANIFEST.json',import.meta.url)));
const ui=JSON.parse(readFileSync(new URL('../docs/minigames/UI-STANDARD-MANIFEST.json',import.meta.url)));
for(const source of manifest.sources)test(`${source.game}: shipped original runtime and license files match the reviewed import`,()=>{
 for(const file of source.originalRuntimeFiles){
  const bytes=readFileSync(new URL(`../public/games/${source.game}/${file.path}`,import.meta.url));
  const update=ui.files.find(x=>x.game===source.game&&x.path===file.path);if(update)assert.equal(update.baselineSha256,file.importedSha256,'traceable original import '+file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),update?.sha256||file.importedSha256,file.path);
  if(file.unchanged)assert.equal(file.importedSha256,file.sourceSha256,file.path);
 }
 const adapted=source.originalRuntimeFiles.filter(x=>!x.unchanged).map(x=>x.path).sort();
 assert.deepEqual(adapted,source.game==='reaction-rod'?['game.mjs','index.html','share.mjs','style.css']:['index.html','style.css']);
});

test('UI standard adapts only named controller/markup files, preserving original art physics and assets',()=>{assert.deepEqual(ui.files.map(x=>x.game+'/'+x.path).sort(),['beer-slide/audio-ui.mjs','beer-slide/game.mjs','beer-slide/index.html','reaction-rod/game.mjs','reaction-rod/index.html','reaction-rod/share.mjs']);});
