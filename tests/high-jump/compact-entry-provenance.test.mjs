import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeCourtesyIntegration as readFileSync} from '../helpers/courtesy-integration-provenance.mjs';
import * as p from '../helpers/high-jump-compact-entry-provenance.mjs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
test('compact entry independently pins the complete published parent tree',()=>{
 assert.equal(p.verifyCompactEntryBase(p.compactEntryBaseline),true);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){const b=structuredClone(p.compactEntryBaseline);mutate(b);assert.throws(()=>p.verifyCompactEntryBase(b));}
});
test('compact entry permits only the two existing high-jump runtime files',()=>{
 assert.deepEqual(p.COMPACT_ENTRY_CHANGED.filter(x=>/^(public|worker|src|config)\//.test(x)),['public/games/high-jump/game.mjs','public/games/high-jump/style.css']);
 assert.equal(p.COMPACT_ENTRY_ADDED.some(x=>/^(public|worker|src|config)\//.test(x)),false);
 const m=p.compactEntryManifest();for(const f of m.files){const live=read(f.path),before=p.reverseCompactEntry(f.path,live);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.compactEntryParentBytes(f.path,before),before);assert.throws(()=>p.reverseCompactEntry(f.path,Buffer.concat([live,Buffer.from('drift')])));const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged';row.beforeSha256=p.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=p.gitBlob(Buffer.from(row.beforeText));assert.throws(()=>p.reverseCompactEntry(f.path,live,forged));}
});
test('compact entry preserves all earlier manifests and baselines byte for byte',()=>{
 for(const f of p.compactEntryBaseline.files.filter(f=>/^(docs|tests\/fixtures)\//.test(f.path)&&/(MANIFEST|BASELINE|baseline)\.json$/.test(f.path)))assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('compact entry preserves the result rules and all existing non-desktop CSS',()=>{
 const path='public/games/high-jump/style.css',current=read(path).toString(),before=p.reverseCompactEntry(path,read(path)).toString();
 const result=' .pf-game.pf-high-jump #result{width:min(1080px';assert.equal(current.slice(current.indexOf(result)),before.slice(before.indexOf(result)));
 assert.equal(current.slice(0,current.indexOf('/* Keep the complete mobile copy;')),before.slice(0,before.indexOf('/* Desktop tickets use the available width;')));
 const game='public/games/high-jump/game.mjs',old=p.reverseCompactEntry(game,read(game)).toString();
 assert.equal(read(game).toString().split('\n').filter(l=>!l.startsWith('function mountDesktopEntry(')&&l!=='mountDesktopEntry(entry.dialog);').join('\n'),old);
});
test('compact entry additions remain strict through older inventory and reader boundaries',async()=>{
 const repair=await import('../helpers/dialog-layout-repair-provenance.mjs'),before=p.compactEntryBaseline.files.map(f=>f.path),current=[...before,...p.COMPACT_ENTRY_ADDED];
 assert.deepEqual(p.inventoryBeforeCompactEntry(current),before);
 assert.deepEqual(repair.inventoryBeforeDialogRepair(current).sort(),repair.dialogRepairBaseline.files.map(f=>f.path).sort());
 assert.ok(p.inventoryBeforeCompactEntry([...current,'public/unknown.mjs']).includes('public/unknown.mjs'));
 for(const path of p.COMPACT_ENTRY_ADDED)assert.throws(()=>p.inventoryBeforeCompactEntry(current.filter(x=>x!==path)));
 for(const f of p.compactEntryManifest().addedFiles)assert.throws(()=>repair.inventoryBeforeDialogRepair(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>repair.inventoryBeforeDialogRepair(current,{read:path=>path==='tests/helpers/dialog-layout-repair-provenance.mjs'?Buffer.from('drift'):read(path)}));
});
test('compact entry reaches direct older high-jump reversal APIs with exact input bytes',async()=>{
 const previous=await import('../helpers/high-jump-result-preview-provenance.mjs');
 for(const path of ['public/games/high-jump/game.mjs','public/games/high-jump/style.css']){const live=read(path),before=p.reverseCompactEntry(path,live);assert.deepEqual(previous.reverseResultPreview(path,live),previous.reverseResultPreview(path,before));assert.throws(()=>previous.reverseResultPreview(path,Buffer.concat([live,Buffer.from('drift')])));}
});
