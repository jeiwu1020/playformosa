import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as p from './helpers/dialog-layout-provenance.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('dialog-layout parent is the complete independently reconstructed remote tree',()=>{
 assert.equal(p.verifyDialogLayoutBase(p.dialogLayoutBaseline),true);
 for(const change of [m=>m.baseCommit='0'.repeat(40),m=>m.baseTree='0'.repeat(40),m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].gitBlob='0'.repeat(40),m=>m.files[0].mode='100755']){const m=structuredClone(p.dialogLayoutBaseline);change(m);assert.throws(()=>p.verifyDialogLayoutBase(m));}
});
test('dialog-layout revision restores exact remote bytes and rejects forged history',()=>{
 const m=p.dialogLayoutManifest();
 for(const f of m.files){const current=read(f.path),before=p.reverseDialogLayout(f.path,current,m);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.dialogLayoutParentBytes(f.path,before),before);
  assert.throws(()=>p.reverseDialogLayout(f.path,Buffer.concat([current,Buffer.from('drift')]),m));
  assert.throws(()=>p.dialogLayoutParentBytes(f.path,Buffer.concat([before,Buffer.from('drift')]),m));
  for(const key of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[key]+='drift';assert.throws(()=>p.reverseDialogLayout(f.path,current,bad));}
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged history';row.beforeSha256=p.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=p.gitBlob(Buffer.from(row.beforeText));assert.throws(()=>p.reverseDialogLayout(f.path,current,forged));
 }
});
test('dialog-layout changes only approved CSS surfaces and no gameplay modules',()=>{
 assert.deepEqual(p.DIALOG_LAYOUT_CHANGED.filter(x=>x.startsWith('public/')).sort(),['public/games/fast-hands/levels.css','public/games/fast-hands/style.css','public/games/high-jump/style.css','public/games/shared/game-ui.css']);
 assert.deepEqual(p.DIALOG_LAYOUT_ADDED.filter(x=>/^(public|worker|src|config)\//.test(x)),['public/games/shared/scrollbars.css']);
 for(const change of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].path='public/unknown.mjs',m=>m.addedPaths.pop(),m=>m.addedPaths.push(m.addedPaths[0]),m=>m.addedPaths.push('public/unknown.mjs'),m=>m.addedFiles.pop(),m=>m.baseCommit='unknown',m=>m.baseTree='unknown']){const m=p.dialogLayoutManifest();change(m);assert.throws(()=>p.validateDialogLayoutManifest(m));}
});
test('dialog-layout additions are checked before removal and unknown inventory stays visible',()=>{
 const paths=[...p.DIALOG_LAYOUT_CHANGED,...p.DIALOG_LAYOUT_ADDED];assert.deepEqual(p.inventoryBeforeDialogLayout(paths),[...p.DIALOG_LAYOUT_CHANGED]);
 for(const path of p.DIALOG_LAYOUT_ADDED){assert.throws(()=>p.reverseDialogLayout(path,read(path)));assert.throws(()=>p.inventoryBeforeDialogLayout(paths.filter(x=>x!==path)));}
 for(const f of p.dialogLayoutManifest().addedFiles)assert.throws(()=>p.inventoryBeforeDialogLayout(paths,{read:path=>path===f.path?Buffer.from('tampered'):read(path)}));
 assert.throws(()=>p.inventoryBeforeDialogLayout([...paths,paths[0]]));assert.ok(p.inventoryBeforeDialogLayout([...paths,'public/unknown.mjs']).includes('public/unknown.mjs'));
 const complete=[...p.dialogLayoutBaseline.files.map(f=>f.path),...p.DIALOG_LAYOUT_ADDED];assert.deepEqual(p.inventoryBeforeDialogLayout(complete).sort(),p.dialogLayoutBaseline.files.map(f=>f.path).sort());
});
test('dialog-layout reader preserves encodings and leaves live functional tests unchanged',()=>{
 for(const path of p.DIALOG_LAYOUT_CHANGED){const url=new URL('../'+path,import.meta.url),before=p.reverseDialogLayout(path,read(path));assert.deepEqual(p.readBeforeDialogLayout(url),before);assert.equal(p.readBeforeDialogLayout(url,'utf8'),before.toString());assert.equal(p.readBeforeDialogLayout(url,{encoding:'utf8'}),before.toString());}
 const unrelated=new URL('../package.json',import.meta.url);assert.deepEqual(p.readBeforeDialogLayout(unrelated),readFileSync(unrelated));
 for(const path of ['tests/high-jump/approach-instructions.test.mjs','tests/high-jump/result-photo-consistency.test.mjs'])assert.doesNotMatch(read(path).toString(),/readBefore(?:Coordination|DialogLayout|Runners)/);
});
test('dialog-layout composes with result-preview and direct runner APIs without accepting tampered bytes',async()=>{
 const inner=await import('./helpers/high-jump-result-preview-provenance.mjs'),r=await import('./helpers/runner-integration-provenance.mjs');
 for(const path of p.DIALOG_LAYOUT_CHANGED.filter(p=>p.startsWith('public/'))){
  const live=read(path),parent=p.reverseDialogLayout(path,live);
  assert.deepEqual(inner.reverseResultPreview(path,live),inner.reverseResultPreview(path,parent));
  assert.deepEqual(r.reverseRunners(path,live),r.reverseRunners(path,parent));
  for(const bytes of [live,parent])assert.throws(()=>r.reverseRunners(path,Buffer.concat([bytes,Buffer.from('drift')])));
 }
});
test('existing historical manifests and baselines retain exact parent Git blobs',()=>{
 for(const f of p.dialogLayoutBaseline.files.filter(f=>/^(docs|tests\/fixtures)\//.test(f.path)&&/(MANIFEST|BASELINE|baseline)\.json$/.test(f.path)))assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('nested inventory forwards injected readers to the dialog-layout boundary',async()=>{
 const inner=await import('./helpers/high-jump-result-preview-provenance.mjs');
 const paths=[...new Set([...p.DIALOG_LAYOUT_ADDED,...inner.RESULT_PREVIEW_ADDED])];let calls=0;
 const altered=path=>{calls++;return path==='public/games/shared/scrollbars.css'?Buffer.from('tampered'):read(path);};
 assert.throws(()=>inner.inventoryBeforeResultPreview(paths,{read:altered}));assert.ok(calls>0,'caller-supplied reader must reach the outer revision');
});
test('historical runtime-only API preserves its exact old inventory while the new boundary requires its scrollbar',async()=>{
 const inner=await import('./helpers/high-jump-result-preview-provenance.mjs');
 const old=p.dialogLayoutBaseline.files.map(f=>f.path).filter(p=>/^(public|worker|src|config)\//.test(p));
 assert.deepEqual(inner.inventoryBeforeResultPreview(old,{runtimeOnly:true,read:()=>assert.fail('old revision has no added runtime')}),old);
 assert.throws(()=>p.inventoryBeforeDialogLayout(old,{runtimeOnly:true}));
 const current=[...old,'public/games/shared/scrollbars.css'];
 assert.deepEqual(p.inventoryBeforeDialogLayout(current,{runtimeOnly:true}),old);
});
