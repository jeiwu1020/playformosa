import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeInventoryRepair as readFileSync} from '../helpers/courtesy-touch-inventory-repair.mjs';
let p;try{p=await import('../helpers/courtesy-touch-coverage-provenance.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
test('touch coverage admits exactly the reviewed change and reverses all six parent files',()=>{
 assert.ok(p,'touch coverage boundary must exist');
 const m=p.manifest();p.validate(m);
 for(const f of m.files){assert.equal(p.gitBlob(read(f.path)),f.gitBlob);assert.equal(p.gitBlob(p.reverseTapCoverage(f.path,read(f.path))),f.beforeGitBlob);assert.equal(p.gitBlob(p.readBeforeTapCoverage(new URL('../../'+f.path,import.meta.url))),f.beforeGitBlob);assert.throws(()=>p.reverseTapCoverage(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));}
});
test('touch coverage rejects invented parent bytes, missing rows and altered additions',()=>{
 assert.ok(p);const m=p.manifest();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.files.pop(),x=>x.files[0].beforeText+='tamper',x=>x.files[0].beforeGitBlob='0'.repeat(40),x=>x.addedPaths.pop(),x=>x.addedFiles.pop()]){const bad=structuredClone(m);change(bad);assert.throws(()=>p.validate(bad));}
 const current=[...m.files.map(f=>f.path),...m.addedPaths,'public/unrelated.mjs'];
 assert.deepEqual(p.inventoryBeforeTapCoverage(current),[...m.files.map(f=>f.path),'public/unrelated.mjs']);
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeTapCoverage(current.filter(x=>x!==path)));
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>p.inventoryBeforeTapCoverage(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>p.inventoryBeforeTapCoverage([...current,current[0]]));
 assert.deepEqual(p.inventoryBeforeTapCoverage(['public/unrelated.mjs']),['public/unrelated.mjs']);
});
