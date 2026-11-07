import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as p from './helpers/courtesy-upgrade-provenance.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('upgrade reconstructs its complete remote parent and rejects invented history',()=>{
 assert.equal(p.verifyCourtesyUpgradeBase(p.courtesyUpgradeBaseline),true);
 assert.equal(p.courtesyUpgradeBaseline.files.length,1525);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40)]){const b=structuredClone(p.courtesyUpgradeBaseline);mutate(b);assert.throws(()=>p.verifyCourtesyUpgradeBase(b));}
});
test('every authorized changed byte restores its independently pinned preimage and rejects drift',()=>{
 const m=p.courtesyUpgradeManifest();
 for(const f of m.files){const live=read(f.path),before=p.reverseCourtesyUpgrade(f.path,live);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.courtesyUpgradeParentBytes(f.path,before),before);assert.throws(()=>p.reverseCourtesyUpgrade(f.path,Buffer.concat([live,Buffer.from('drift')])));
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeGitBlob='0'.repeat(40);assert.throws(()=>p.reverseCourtesyUpgrade(f.path,live,forged));
 }
 assert.equal(m.files.filter(f=>f.beforeAsset).length,2);
 const forged=structuredClone(m);forged.files.find(f=>f.beforeAsset).beforeAsset='../../not-approved.png';assert.throws(()=>p.validateCourtesyUpgradeManifest(forged));
});
test('additions are exact, hashed, nonhistorical and leave unknown paths visible',()=>{
 const before=p.courtesyUpgradeBaseline.files.map(f=>f.path),current=[...before,...p.COURTESY_UPGRADE_ADDED];
 assert.deepEqual(p.inventoryBeforeCourtesyUpgrade(current),before);
 for(const path of p.COURTESY_UPGRADE_ADDED){assert.throws(()=>p.inventoryBeforeCourtesyUpgrade(current.filter(x=>x!==path)));assert.throws(()=>p.reverseCourtesyUpgrade(path,read(path)));}
 for(const f of p.courtesyUpgradeManifest().addedFiles)assert.throws(()=>p.inventoryBeforeCourtesyUpgrade(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>p.inventoryBeforeCourtesyUpgrade([...current,current[0]]));
 assert.ok(p.inventoryBeforeCourtesyUpgrade([...current,'public/unknown.mjs']).includes('public/unknown.mjs'));
 assert.deepEqual(p.inventoryBeforeCourtesyUpgrade(['public/old-only.mjs']),['public/old-only.mjs']);
});
test('historical manifests, database schemas, gameplay and other materialized source retain parent bytes',()=>{
 const missing=[];
 for(const f of p.courtesyUpgradeBaseline.files){let live;try{live=read(f.path);}catch(e){if(e.code!=='ENOENT')throw e;missing.push(f.path);continue;}
  assert.equal(p.gitBlob(p.reverseCourtesyUpgrade(f.path,live)),f.gitBlob,f.path);
  if(/^(docs|tests\/fixtures)\//.test(f.path)||/^worker\/.*\.sql$/.test(f.path)||f.path==='public/games/courtesy-contest/game.js')assert.equal(p.gitBlob(live),f.gitBlob,f.path+' immutable original');
 }
 // A complete checkout has no omissions; a sparse local snapshot may lack only this pinned legacy binary.
 if(missing.length)assert.deepEqual(missing,['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png']);
});
