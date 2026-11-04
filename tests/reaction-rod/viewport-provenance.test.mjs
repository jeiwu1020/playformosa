import {reverseRodResult} from '../helpers/rod-result-provenance.mjs';
import {readStudioBaseline} from '../helpers/studio-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {viewportLedger,hashViewport,reverseRodViewport} from '../helpers/rod-viewport-provenance.mjs';
const read=p=>readStudioBaseline(new URL('../../public/games/'+p,import.meta.url));

test('viewport repair has only two exact runtime files and restores the pinned original HTML',()=>{
 const ledger=viewportLedger();
 assert.equal(ledger.baseCommit,'1862880407edecb4270d1778641cf6770ba4b548');
 assert.deepEqual(ledger.files.map(f=>f.path),['reaction-rod/index.html','reaction-rod/viewport.css']);
 for(const file of ledger.files)assert.equal(hashViewport(reverseRodResult(file.path,read(file.path))),file.sha256,file.path);
 assert.equal(hashViewport(reverseRodViewport('reaction-rod/index.html',read('reaction-rod/index.html'))),'4ec5b229adc2fa13b464100e0686be3db2960cec0efaeae672086055ccab2998');
});

test('viewport repair preserves original camera, input, score, art and shared runtime bytes',()=>{
 const ledger=viewportLedger();assert.deepEqual(ledger.preserved.map(f=>f.path),['reaction-rod/game.mjs','reaction-rod/style.css','reaction-rod/physics.mjs','reaction-rod/framing.mjs','reaction-rod/scene.mjs','reaction-rod/snapshot.mjs','reaction-rod/share.mjs','long-jump/layout.mjs','long-jump/dialogs.mjs','shared/entry-shell.mjs','shared/entry-shell.css','shared/game-ui.mjs','shared/game-ui.css']);
 for(const file of ledger.preserved)assert.equal(hashViewport(reverseRodResult(file.path,read(file.path))),file.sha256,file.path);
});

test('historical provenance adapter rejects extra HTML/icon changes, missing or duplicate viewport imports',()=>{
 const original=read('reaction-rod/index.html').toString();
 for(const changed of [original+'<!-- hidden drift -->',original.replace('<link rel="stylesheet" href="./viewport.css">','<link rel="stylesheet" href="./viewport.css"><link rel="stylesheet" href="./viewport.css">'),original.replace('apple-touch-icon.png','wrong.png'),original.replace('<link rel="stylesheet" href="./viewport.css">',''),original.replace('<script type="module" src="../long-jump/layout.mjs"></script>','')]){
  assert.throws(()=>reverseRodViewport('reaction-rod/index.html',Buffer.from(changed)),/current bytes/);
 }
});
