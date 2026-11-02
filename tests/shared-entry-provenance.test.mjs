import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
test('shared entry/control ledger covers only approved presentation runtime paths and matches shipped bytes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/minigames/UI-STANDARD-MANIFEST.json',import.meta.url)));const ledger=manifest.sharedEntryControlsPhase1;assert.ok(ledger,'explicit phase1 before/after ledger');
 const games=['long-jump','hurdles','high-jump','pole-vault','shot-put','discus','tower-climb','reaction-rod','beer-slide'];const expected=games.flatMap(game=>[`${game}/game.mjs`,`${game}/index.html`]).concat(['shared/entry-shell.mjs','shared/entry-shell.css','shared/entry-content.mjs','shared/controls-shell.mjs','shared/controls-shell.css','long-jump/layout.mjs']);
 assert.deepEqual(ledger.files.map(f=>f.path).sort(),expected.sort());assert.equal(ledger.baselineCommit,'b482956d416457f85019d338477075af6781aae2');
 for(const f of ledger.files){assert.equal(createHash('sha256').update(readFileSync(new URL('../public/games/'+f.path,import.meta.url))).digest('hex'),f.sha256,f.path);if(f.path.startsWith('shared/'))assert.equal(f.previousIntegratedSha256,null,'new shared file has no invented source bytes');else assert.match(f.previousIntegratedSha256,/^[0-9a-f]{64}$/);}
});
