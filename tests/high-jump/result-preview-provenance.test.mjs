import {readBeforeCourtesyIntegration} from '../helpers/courtesy-integration-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as p from '../helpers/high-jump-result-preview-provenance.mjs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url));
test('result-preview parent is the complete independently reconstructed remote tree',()=>{
 assert.equal(p.verifyResultPreviewBase(p.resultPreviewBaseline),true);
 for(const change of [m=>m.baseCommit='0'.repeat(40),m=>m.baseTree='0'.repeat(40),m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].gitBlob='0'.repeat(40),m=>m.files[0].mode='100755']){const m=structuredClone(p.resultPreviewBaseline);change(m);assert.throws(()=>p.verifyResultPreviewBase(m));}
});
test('result-preview revision restores exact remote bytes and rejects forged history',()=>{
 const m=p.resultPreviewManifest();
 for(const f of m.files){const current=read(f.path),before=p.reverseResultPreview(f.path,current,m);assert.equal(p.gitBlob(before),f.beforeGitBlob);assert.deepEqual(p.resultPreviewParentBytes(f.path,before),before);
  assert.throws(()=>p.reverseResultPreview(f.path,Buffer.concat([current,Buffer.from('drift')]),m));
  assert.throws(()=>p.resultPreviewParentBytes(f.path,Buffer.concat([before,Buffer.from('drift')]),m));
  for(const key of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[key]+='drift';assert.throws(()=>p.reverseResultPreview(f.path,current,bad));}
  const forged=structuredClone(m),row=forged.files.find(x=>x.path===f.path);row.beforeText='forged history';row.beforeSha256=p.sha256(Buffer.from(row.beforeText));row.beforeGitBlob=p.gitBlob(Buffer.from(row.beforeText));assert.throws(()=>p.reverseResultPreview(f.path,current,forged));
 }
});
test('result-preview scope excludes unrelated runtime changes and rejects repins',()=>{
 assert.deepEqual(p.RESULT_PREVIEW_CHANGED.filter(x=>x.startsWith('public/')).sort(),['public/games/high-jump/game.mjs','public/games/high-jump/share.mjs','public/games/high-jump/style.css']);
 assert.equal(p.RESULT_PREVIEW_ADDED.some(x=>/^(public|worker|src|config)\//.test(x)),false);
 for(const change of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].path='public/unknown.mjs',m=>m.addedPaths.pop(),m=>m.addedPaths.push(m.addedPaths[0]),m=>m.addedPaths.push('public/unknown.mjs'),m=>m.addedFiles.pop(),m=>m.baseCommit='unknown',m=>m.baseTree='unknown']){const m=p.resultPreviewManifest();change(m);assert.throws(()=>p.validateResultPreviewManifest(m));}
});
test('result-preview additions are checked before removal and unknown inventory stays visible',()=>{
 const paths=[...p.RESULT_PREVIEW_CHANGED,...p.RESULT_PREVIEW_ADDED];assert.deepEqual(p.inventoryBeforeResultPreview(paths),[...p.RESULT_PREVIEW_CHANGED]);
 for(const path of p.RESULT_PREVIEW_ADDED){assert.throws(()=>p.reverseResultPreview(path,read(path)));assert.throws(()=>p.inventoryBeforeResultPreview(paths.filter(x=>x!==path)));}
 for(const f of p.resultPreviewManifest().addedFiles)assert.throws(()=>p.inventoryBeforeResultPreview(paths,{read:path=>path===f.path?Buffer.from('tampered'):read(path)}));
 assert.throws(()=>p.inventoryBeforeResultPreview([...paths,paths[0]]));assert.ok(p.inventoryBeforeResultPreview([...paths,'public/unknown.mjs']).includes('public/unknown.mjs'));
 const complete=[...p.resultPreviewBaseline.files.map(f=>f.path),...p.RESULT_PREVIEW_ADDED];assert.deepEqual(p.inventoryBeforeResultPreview(complete).sort(),p.resultPreviewBaseline.files.map(f=>f.path).sort());
});
test('result-preview reader preserves encodings and leaves live functional tests unchanged',()=>{
 for(const path of p.RESULT_PREVIEW_CHANGED){const url=new URL('../../'+path,import.meta.url),before=p.reverseResultPreview(path,read(path));assert.deepEqual(p.readBeforeResultPreview(url),before);assert.equal(p.readBeforeResultPreview(url,'utf8'),before.toString());assert.equal(p.readBeforeResultPreview(url,{encoding:'utf8'}),before.toString());}
 const unrelated=new URL('../../package.json',import.meta.url);assert.deepEqual(p.readBeforeResultPreview(unrelated),readBeforeCourtesyIntegration(unrelated));
 for(const path of ['tests/high-jump/approach-instructions.test.mjs','tests/high-jump/result-photo-consistency.test.mjs'])assert.doesNotMatch(read(path).toString(),/readBefore(?:Coordination|ResultPreview|Runners)/);
});
test('result-preview composes with coordination and direct runner APIs at exact boundaries',async()=>{
 const c=await import('../helpers/high-jump-coordination-provenance.mjs'),r=await import('../helpers/runner-integration-provenance.mjs');
 for(const path of ['public/games/high-jump/game.mjs','public/games/high-jump/share.mjs','public/games/high-jump/style.css']){
  const live=read(path),parent=p.reverseResultPreview(path,live),old=c.reverseCoordination(path,live);
  assert.deepEqual(c.reverseCoordination(path,parent),old);assert.deepEqual(c.coordinationParentBytes(path,old),old);assert.deepEqual(c.readBeforeCoordination(new URL('../../'+path,import.meta.url)),old);
  assert.deepEqual(r.reverseRunners(path,live),r.reverseRunners(path,old));
  for(const bytes of [live,parent,old])assert.throws(()=>r.reverseRunners(path,Buffer.concat([bytes,Buffer.from('drift')])));
 }
});
test('existing historical manifests and baselines retain exact parent Git blobs',()=>{
 for(const f of p.resultPreviewBaseline.files.filter(f=>/^(docs|tests\/fixtures)\//.test(f.path)&&/(MANIFEST|BASELINE|baseline)\.json$/.test(f.path)))assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('runner inventory forwards injected readers to the result-preview boundary',async()=>{
 const c=await import('../helpers/high-jump-coordination-provenance.mjs'),r=await import('../helpers/runner-integration-provenance.mjs');
 const paths=[...new Set([...p.RESULT_PREVIEW_ADDED,...c.COORDINATION_ADDED])];let calls=0;
 const altered=path=>{calls++;return path==='tests/high-jump/approach-instructions.test.mjs'?Buffer.from('tampered'):read(path);};
 assert.throws(()=>r.inventoryBeforeRunners(paths,{read:altered}));assert.ok(calls>0,'caller-supplied reader must reach the outer revision');
});
