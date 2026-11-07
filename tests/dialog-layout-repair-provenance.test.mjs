import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as repair from './helpers/dialog-layout-repair-provenance.mjs';
import * as layout from './helpers/dialog-layout-provenance.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('dialog repair independently pins its complete published parent',()=>{
 assert.equal(repair.verifyDialogRepairBase(repair.dialogRepairBaseline),true);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){
  const b=structuredClone(repair.dialogRepairBaseline);mutate(b);assert.throws(()=>repair.verifyDialogRepairBase(b));
 }
});
test('dialog repair reverses exactly its five test adaptations and rejects forged history',()=>{
 const m=repair.dialogRepairManifest();
 assert.deepEqual(repair.DIALOG_REPAIR_CHANGED,["tests/fast-hands/layout-dart-provenance.test.mjs","tests/helpers/dialog-layout-provenance.mjs","tests/fast-hands/art-polish-provenance.test.mjs","tests/fast-hands/result-upload-provenance.test.mjs","tests/fast-hands/split-entries-provenance.test.mjs"]);
 assert.equal([...repair.DIALOG_REPAIR_CHANGED,...repair.DIALOG_REPAIR_ADDED].some(p=>/^(public|worker|src|config)\//.test(p)),false);
 for(const f of m.files){
  const live=read(f.path),before=repair.reverseDialogRepair(f.path,live);
  assert.equal(repair.gitBlob(before),f.beforeGitBlob);assert.deepEqual(repair.dialogRepairParentBytes(f.path,before),before);
  assert.throws(()=>repair.reverseDialogRepair(f.path,Buffer.concat([live,Buffer.from('drift')])));
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged';row.beforeSha256=repair.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=repair.gitBlob(Buffer.from(row.beforeText));
  assert.throws(()=>repair.reverseDialogRepair(f.path,live,forged));
 }
});
test('dialog repair preserves every published manifest and baseline including the first dialog revision',()=>{
 for(const f of repair.dialogRepairBaseline.files.filter(f=>/^(docs|tests\/fixtures)\//.test(f.path)&&/(MANIFEST|BASELINE|baseline)\.json$/.test(f.path)))assert.equal(repair.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('repair inventory composes with dialog inventory without hiding unknown paths or tampered additions',()=>{
 const before=repair.dialogRepairBaseline.files.map(f=>f.path),current=[...before,...repair.DIALOG_REPAIR_ADDED];
 assert.deepEqual(repair.inventoryBeforeDialogRepair(current),before);
 assert.deepEqual(layout.inventoryBeforeDialogLayout(current).sort(),layout.dialogLayoutBaseline.files.map(f=>f.path).sort());
 assert.ok(repair.inventoryBeforeDialogRepair([...current,'public/unexpected.mjs']).includes('public/unexpected.mjs'));
 for(const p of repair.DIALOG_REPAIR_ADDED)assert.throws(()=>repair.inventoryBeforeDialogRepair(current.filter(x=>x!==p)));
 for(const f of repair.dialogRepairManifest().addedFiles)assert.throws(()=>layout.inventoryBeforeDialogLayout(current,{read:p=>p===f.path?Buffer.from('drift'):read(p)}));
 assert.throws(()=>layout.inventoryBeforeDialogLayout(current,{read:p=>p==='tests/helpers/dialog-layout-provenance.mjs'?Buffer.from('drift'):read(p)}));
});
test('repair reader restores the historical adaptations without changing live CSS',()=>{
 for(const f of repair.dialogRepairManifest().files){
  const url=new URL('../'+f.path,import.meta.url),before=repair.reverseDialogRepair(f.path,read(f.path));
  assert.deepEqual(repair.readBeforeDialogRepair(url),before);assert.equal(repair.readBeforeDialogRepair(url,'utf8'),before.toString());
 }
 for(const path of ['public/games/fast-hands/style.css','public/games/fast-hands/levels.css','public/games/high-jump/style.css','public/games/shared/game-ui.css','public/games/shared/scrollbars.css'])assert.deepEqual(repair.readBeforeDialogRepair(new URL('../'+path,import.meta.url)),read(path));
});
test('complete materialized parent checks run beyond known unavailable binary fixtures',()=>{
 const allowedMissing=new Set(['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/run-1500m-card.png','public/assets/run-400m-card.png','public/games/fast-hands/assets/duel-items-atlas.png','public/games/fast-hands/assets/king-torso-v3.png','public/games/run-1500m/runner-atlas.png','public/games/run-400m/runner-atlas.png']);
 const failures=[];
 for(const f of repair.dialogRepairBaseline.files){
  try{assert.equal(repair.gitBlob(repair.readBeforeDialogRepair(new URL('../'+f.path,import.meta.url))),f.gitBlob,f.path);}catch(e){if(e.code==='ENOENT'&&allowedMissing.has(f.path))continue;failures.push(e);}
 }
 assert.equal(failures.length,0,failures.map(e=>e.message).join('\n'));
});
