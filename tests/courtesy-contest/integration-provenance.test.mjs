import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
let p;try{p=await import('../helpers/courtesy-integration-provenance.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
test('courtesy integration pins the complete published preview parent',()=>{
 assert.ok(p,'reversible courtesy boundary must exist');assert.equal(p.verifyCourtesyIntegrationBase(p.courtesyIntegrationBaseline),true);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){const b=structuredClone(p.courtesyIntegrationBaseline);mutate(b);assert.throws(()=>p.verifyCourtesyIntegrationBase(b));}
});
test('courtesy reverses exact preimages and rejects live drift or repinned preimages',()=>{
 assert.ok(p);const m=p.courtesyIntegrationManifest();for(const f of m.files){const live=read(f.path),before=p.reverseCourtesyIntegration(f.path,live);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.courtesyIntegrationParentBytes(f.path,before),before);assert.throws(()=>p.reverseCourtesyIntegration(f.path,Buffer.concat([live,Buffer.from('drift')])));const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged';row.beforeSha256=p.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=p.gitBlob(Buffer.from(row.beforeText));assert.throws(()=>p.reverseCourtesyIntegration(f.path,live,forged));}
});
test('courtesy additions have exact inventories and byte hashes',()=>{
 assert.ok(p);const before=p.courtesyIntegrationBaseline.files.map(f=>f.path),current=[...before,...p.COURTESY_INTEGRATION_ADDED];assert.deepEqual(p.inventoryBeforeCourtesyIntegration(current),before);
 for(const path of p.COURTESY_INTEGRATION_ADDED)assert.throws(()=>p.inventoryBeforeCourtesyIntegration(current.filter(x=>x!==path)));
 for(const f of p.courtesyIntegrationManifest().addedFiles)assert.throws(()=>p.inventoryBeforeCourtesyIntegration(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.ok(p.inventoryBeforeCourtesyIntegration([...current,'public/unknown.mjs']).includes('public/unknown.mjs'));
});
test('courtesy preserves every previous manifest and baseline byte for byte',()=>{
 assert.ok(p);for(const f of p.courtesyIntegrationBaseline.files.filter(f=>/^(docs|tests\/fixtures)\//.test(f.path)&&/(MANIFEST|BASELINE|baseline)\.json$/.test(f.path)))assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('every materialized parent byte reverses exactly; one unavailable historical binary stays pinned remotely',()=>{
 assert.ok(p);const missing=[];
 for(const f of p.courtesyIntegrationBaseline.files){let bytes;try{bytes=read(f.path)}catch(e){if(e.code!=='ENOENT')throw e;missing.push(f.path);continue;}
  assert.equal(p.gitBlob(p.reverseCourtesyIntegration(f.path,bytes)),f.gitBlob,f.path);
 }
 if(missing.length)assert.deepEqual(missing.sort(),['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png'].sort());
});
