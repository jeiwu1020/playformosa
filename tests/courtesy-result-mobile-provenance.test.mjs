import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as p from './helpers/courtesy-result-mobile-provenance.mjs';
import {courtesyUiPolishParentBytes} from './helpers/courtesy-ui-polish-provenance.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('result/mobile reconstructs its complete remote parent and rejects invented history',()=>{
 assert.equal(p.verifyCourtesyResultMobileBase(p.courtesyResultMobileBaseline),true);
 assert.equal(p.courtesyResultMobileBaseline.files.length,1538);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){const b=structuredClone(p.courtesyResultMobileBaseline);mutate(b);assert.throws(()=>p.verifyCourtesyResultMobileBase(b));}
});
test('every authorized changed byte restores its independently pinned preimage and rejects drift',()=>{
 const m=p.courtesyResultMobileManifest();
 for(const f of m.files){const live=read(f.path),before=p.reverseCourtesyResultMobile(f.path,live);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.courtesyResultMobileParentBytes(f.path,before),before);assert.throws(()=>p.reverseCourtesyResultMobile(f.path,Buffer.concat([live,Buffer.from('drift')])));
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeGitBlob='0'.repeat(40);assert.throws(()=>p.reverseCourtesyResultMobile(f.path,live,forged));
 }
 const forged=structuredClone(m);forged.files[0].beforeText='forged preimage';forged.files[0].beforeGitBlob=p.gitBlob(Buffer.from(forged.files[0].beforeText));forged.files[0].beforeSha256=p.sha256(Buffer.from(forged.files[0].beforeText));assert.throws(()=>p.validateCourtesyResultMobileManifest(forged));
});
test('additions are exact, hashed, nonhistorical and leave unknown paths visible',()=>{
 const before=p.courtesyResultMobileBaseline.files.map(f=>f.path),current=[...before,...p.COURTESY_RESULT_MOBILE_ADDED];
 assert.deepEqual(p.inventoryBeforeCourtesyResultMobile(current),before);
 for(const path of p.COURTESY_RESULT_MOBILE_ADDED){assert.throws(()=>p.inventoryBeforeCourtesyResultMobile(current.filter(x=>x!==path)));assert.throws(()=>p.reverseCourtesyResultMobile(path,read(path)));}
 for(const f of p.courtesyResultMobileManifest().addedFiles)assert.throws(()=>p.inventoryBeforeCourtesyResultMobile(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>p.inventoryBeforeCourtesyResultMobile([...current,current[0]]));
 assert.ok(p.inventoryBeforeCourtesyResultMobile([...current,'public/unknown.mjs']).includes('public/unknown.mjs'));
 assert.deepEqual(p.inventoryBeforeCourtesyResultMobile(['public/old-only.mjs']),['public/old-only.mjs']);
});
test('historical manifests, database schemas, gameplay and other materialized source retain parent bytes',()=>{
 const missing=[];
 for(const f of p.courtesyResultMobileBaseline.files){let live;try{live=read(f.path);}catch(e){if(e.code!=='ENOENT')throw e;missing.push(f.path);continue;}
  assert.equal(p.gitBlob(p.reverseCourtesyResultMobile(f.path,live)),f.gitBlob,f.path);
  if(!p.COURTESY_RESULT_MOBILE_CHANGED.includes(f.path))assert.equal(p.gitBlob(courtesyUiPolishParentBytes(f.path,live)),f.gitBlob,f.path+' unchanged outside the exact follow-up scope after polish reversal');
 }
 // A complete checkout has no omissions; a sparse local snapshot may lack only this pinned legacy binary.
 if(missing.length)assert.deepEqual(missing,['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png']);
});
