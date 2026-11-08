import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from './helpers/mobile-gestures-preview-provenance.mjs';
let p;try{p=await import('./helpers/courtesy-ui-polish-provenance.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('UI polish reconstructs its complete remote parent and rejects invented history',()=>{
 assert.ok(p,'exact reversible outer polish helper is installed');
 assert.equal(p.verifyCourtesyUiPolishBase(p.courtesyUiPolishBaseline),true);
 assert.equal(p.courtesyUiPolishBaseline.files.length,1547);
 assert.equal(p.courtesyUiPolishBaseline.baseCommit,'bc8d0332c4df286f12b246895782ca733ce5e8ad');
 assert.equal(p.courtesyUiPolishBaseline.baseTree,'fe2bc3ff9450db95cd3814aba880f154f82c5b70');
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){const b=structuredClone(p.courtesyUiPolishBaseline);mutate(b);assert.throws(()=>p.verifyCourtesyUiPolishBase(b));}
});
test('every authorized changed byte restores its independently pinned preimage and rejects drift',()=>{
 const m=p.courtesyUiPolishManifest();
 for(const f of m.files){const live=read(f.path),before=p.reverseCourtesyUiPolish(f.path,live);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.courtesyUiPolishParentBytes(f.path,before),before);assert.throws(()=>p.reverseCourtesyUiPolish(f.path,Buffer.concat([live,Buffer.from('drift')])));
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeGitBlob='0'.repeat(40);assert.throws(()=>p.reverseCourtesyUiPolish(f.path,live,forged));
 }
 const forged=structuredClone(m);forged.files[0].beforeText='forged preimage';forged.files[0].beforeGitBlob=p.gitBlob(Buffer.from(forged.files[0].beforeText));forged.files[0].beforeSha256=p.sha256(Buffer.from(forged.files[0].beforeText));assert.throws(()=>p.validateCourtesyUiPolishManifest(forged));
});
test('additions are exact, hashed, nonhistorical and leave unknown paths visible',()=>{
 const before=p.courtesyUiPolishBaseline.files.map(f=>f.path),current=[...before,...p.COURTESY_UI_POLISH_ADDED];
 assert.deepEqual(p.inventoryBeforeCourtesyUiPolish(current),before);
 for(const path of p.COURTESY_UI_POLISH_ADDED){assert.throws(()=>p.inventoryBeforeCourtesyUiPolish(current.filter(x=>x!==path)));assert.throws(()=>p.reverseCourtesyUiPolish(path,read(path)));}
 for(const f of p.courtesyUiPolishManifest().addedFiles)assert.throws(()=>p.inventoryBeforeCourtesyUiPolish(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>p.inventoryBeforeCourtesyUiPolish([...current,current[0]]));
 for(const unknown of ['public/unknown.mjs','tests/unknown.test.mjs','docs/unknown.md','evidence/unknown.log'])assert.ok(p.inventoryBeforeCourtesyUiPolish([...current,unknown]).includes(unknown));
 for(const mutate of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.addedPaths.pop(),m=>m.addedPaths.push('docs/unapproved.md'),m=>m.addedFiles.push(m.addedFiles[0])]){const m=structuredClone(p.courtesyUiPolishManifest());mutate(m);assert.throws(()=>p.validateCourtesyUiPolishManifest(m));}
 assert.deepEqual(p.inventoryBeforeCourtesyUiPolish(['public/old-only.mjs']),['public/old-only.mjs']);
});
test('historical manifests, database schemas, gameplay and other materialized source retain parent bytes',()=>{
 const missing=[];
 for(const f of p.courtesyUiPolishBaseline.files){let live;try{live=read(f.path);}catch(e){if(e.code!=='ENOENT')throw e;missing.push(f.path);continue;}
  assert.equal(p.gitBlob(p.reverseCourtesyUiPolish(f.path,live)),f.gitBlob,f.path);
  if(!p.COURTESY_UI_POLISH_CHANGED.includes(f.path))assert.equal(p.gitBlob(live),f.gitBlob,f.path+' unchanged outside the exact follow-up scope');
 }
 // A complete checkout has no omissions; a sparse local snapshot may lack only this pinned legacy binary.
 if(missing.length)assert.deepEqual(missing,['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png']);
});

test('UI polish readers preserve encoding and reject changed current bytes before historical reversal',()=>{
 const m=p.courtesyUiPolishManifest();
 for(const f of m.files){
  const url=new URL('../'+f.path,import.meta.url),before=Buffer.from(f.beforeText);
  assert.deepEqual(p.readBeforeCourtesyUiPolish(url),before);
  for(const options of ['utf8',{encoding:'utf8'}])assert.equal(p.readBeforeCourtesyUiPolish(url,options),before.toString());
  assert.equal(p.readBeforeCourtesyUiPolish(url.pathname,'utf8'),before.toString());
 }
});
