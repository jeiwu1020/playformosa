import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as p from '../helpers/high-jump-coordination-provenance.mjs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
test('coordination base is the complete independently reconstructed remote tree',()=>{
 assert.equal(p.verifyCoordinationBase(p.coordinationBaseline),true);
 for(const change of [m=>m.baseCommit='0'.repeat(40),m=>m.baseTree='0'.repeat(40),m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].gitBlob='0'.repeat(40),m=>m.files[0].mode='100755']){const m=structuredClone(p.coordinationBaseline);change(m);assert.throws(()=>p.verifyCoordinationBase(m));}
});
test('coordination revision restores exact remote bytes and rejects tampering',()=>{
 const m=p.coordinationManifest();
 for(const f of m.files){const current=read(f.path);assert.equal(p.gitBlob(p.reverseCoordination(f.path,current,m)),f.beforeGitBlob);
 assert.throws(()=>p.reverseCoordination(f.path,Buffer.concat([current,Buffer.from('drift')]),m));
 for(const key of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[key]+='drift';assert.throws(()=>p.reverseCoordination(f.path,current,bad));}
 const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged history';row.beforeSha256=p.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=p.gitBlob(Buffer.from(row.beforeText));assert.throws(()=>p.reverseCoordination(f.path,current,forged));
 }
});
test('coordination scope rejects missing, duplicate, extra and repinned history',()=>{
 for(const change of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].path='public/unknown.mjs',m=>m.addedPaths.pop(),m=>m.addedPaths.push(m.addedPaths[0]),m=>m.addedPaths.push('public/unknown.mjs'),m=>m.addedFiles.pop(),m=>m.baseCommit='unknown',m=>m.baseTree='unknown']){const m=structuredClone(p.coordinationManifest());change(m);assert.throws(()=>p.validateCoordinationManifest(m));}
 assert.deepEqual(p.COORDINATION_CHANGED.filter(x=>x.startsWith('public/')).sort(),['public/games/high-jump/game.mjs','public/games/high-jump/index.html','public/games/high-jump/physics.mjs']);
 assert.equal(p.COORDINATION_ADDED.some(x=>/^(public|worker|src|config)\//.test(x)),false);
});
test('coordination additions are validated before removal and unknown paths remain visible',()=>{
 const paths=[...p.COORDINATION_CHANGED,...p.COORDINATION_ADDED];assert.deepEqual(p.inventoryBeforeCoordination(paths),[...p.COORDINATION_CHANGED]);
 for(const path of p.COORDINATION_ADDED){assert.throws(()=>p.reverseCoordination(path,read(path)));assert.throws(()=>p.inventoryBeforeCoordination(paths.filter(x=>x!==path)));}
 for(const f of p.coordinationManifest().addedFiles)assert.throws(()=>p.inventoryBeforeCoordination(paths,{read:path=>path===f.path?Buffer.from('tampered'):read(path)}));
 assert.throws(()=>p.inventoryBeforeCoordination([...paths,paths[0]]));
 assert.ok(p.inventoryBeforeCoordination([...paths,'public/unknown.mjs']).includes('public/unknown.mjs'));
});
test('historical reader composes coordination with unchanged runner history',async()=>{
 const {readBeforeRunners}=await import('../helpers/runner-integration-provenance.mjs');
 for(const path of p.COORDINATION_CHANGED.filter(x=>x.startsWith('public/')))assert.equal(p.gitBlob(readBeforeRunners(new URL('../../'+path,import.meta.url))),p.coordinationBaseline.files.find(x=>x.path===path).gitBlob);
});
test('coordination reader preserves encodings and does not rewrite unrelated files',()=>{
 const path='public/games/high-jump/physics.mjs',url=new URL('../../'+path,import.meta.url),before=p.reverseCoordination(path,read(path));
 assert.deepEqual(p.readBeforeCoordination(url),before);
 assert.equal(p.readBeforeCoordination(url,'utf8'),before.toString());
 assert.equal(p.readBeforeCoordination(url,{encoding:'utf8'}),before.toString());
 const unrelated=new URL('../../package.json',import.meta.url);assert.deepEqual(p.readBeforeCoordination(unrelated),readFileSync(unrelated));
 const bytes=Buffer.from('untouched'),copy=p.reverseCoordination('public/unknown.mjs',bytes);assert.deepEqual(copy,bytes);assert.notEqual(copy,bytes);
});
test('direct runner reversal accepts only exact coordination bytes or pinned restored parent bytes',async()=>{
 const r=await import('../helpers/runner-integration-provenance.mjs');
 for(const path of p.COORDINATION_CHANGED){
  const current=read(path),parent=p.reverseCoordination(path,current),row=r.runnerManifest().files.find(f=>f.path===path);
  if(r.RUNNER_ADDED.includes(path)){assert.throws(()=>r.reverseRunners(path,current));assert.throws(()=>r.reverseRunners(path,parent));continue;}
  const expected=row?Buffer.from(row.beforeText):parent;
  assert.deepEqual(r.reverseRunners(path,current),expected,path+' current outer bytes');
  assert.deepEqual(r.reverseRunners(path,parent),expected,path+' pinned restored bytes');
  for(const bytes of [current,parent])assert.throws(()=>r.reverseRunners(path,Buffer.concat([bytes,Buffer.from('drift')])),path+' tampered boundary');
  const forgedParent=Buffer.from('fabricated parent'),outer=structuredClone(p.coordinationManifest()),outerRow=outer.files.find(f=>f.path===path);
  outerRow.beforeText=forgedParent.toString();outerRow.beforeSha256=p.sha256(forgedParent);outerRow.beforeGitBlob=p.gitBlob(forgedParent);
  assert.throws(()=>p.coordinationParentBytes(path,forgedParent,outer),path+' forged preimage rejected by independent base');
  if(row){const inner=structuredClone(r.runnerManifest()),innerRow=inner.files.find(f=>f.path===path);innerRow.sha256=p.sha256(forgedParent);innerRow.gitBlob=p.gitBlob(forgedParent);assert.throws(()=>r.reverseRunners(path,forgedParent,inner),path+' inner manifest cannot authorize arbitrary parent bytes');}

 }
});
