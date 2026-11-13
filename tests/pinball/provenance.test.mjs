import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>readFileSync(new URL(p,root));
let boundary;try{boundary=await import('../helpers/pinball-integration-provenance.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function inventory(){const out=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else out.push(p);}}walk();return out;}
test('pinball boundary reconstructs every immutable 8d5a131 parent byte and the complete tree',()=>{
 assert.ok(boundary,'an exact additive pinball boundary is required');
 assert.equal(boundary.baseline.baseCommit,'8d5a131bfa268c8e72fae6fa2a4735cd30a65d9e');
 assert.equal(boundary.baseline.baseTree,'0072e34de52c10f59d0c7f53cf96774e4c5ec407');
 boundary.verifyBase(boundary.baseline);
 assert.deepEqual(boundary.inventoryBeforePinball(inventory()).sort(),boundary.baseline.files.map(f=>f.path).sort());
 for(const f of boundary.baseline.files)assert.equal(boundary.gitBlob(boundary.readBeforePinball(new URL(f.path,root))),f.gitBlob,f.path);
});
test('pinball admission preserves every exact preimage and rejects live drift and repinned history',()=>{
 assert.ok(boundary);const m=boundary.manifest();boundary.validate(m);
 for(const f of m.files){
  const before=boundary.pinballParentBytes(f.path,read(f.path));assert.equal(boundary.gitBlob(before),f.beforeGitBlob);
  assert.deepEqual(boundary.pinballParentBytes(f.path,before),before);
  assert.throws(()=>boundary.pinballParentBytes(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));
  const bad=structuredClone(m),entry=bad.files.find(x=>x.path===f.path);entry.beforeText+='forged';entry.beforeSha256=boundary.sha256(Buffer.from(entry.beforeText));entry.beforeGitBlob=boundary.gitBlob(Buffer.from(entry.beforeText));assert.throws(()=>boundary.validate(bad));
 }
});
test('pinball inventory rejects missing, duplicate, unknown, and tampered additions without directory exemptions',()=>{
 assert.ok(boundary);const current=inventory(),m=boundary.manifest();
 for(const p of m.addedPaths)assert.throws(()=>boundary.inventoryBeforePinball(current.filter(x=>x!==p)),p);
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>boundary.inventoryBeforePinball(current,{read:p=>p===f.path?Buffer.from('drift'):read(p)}),f.path);
 assert.throws(()=>boundary.inventoryBeforePinball([...current,current[0]]));
 const unknown='public/games/overtime-pinball/unreviewed.js';assert.ok(boundary.inventoryBeforePinball([...current,unknown]).includes(unknown));
 assert.throws(()=>boundary.assertCompleteInventory([...current,unknown]));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>p!=='worker/leaderboard/0001.sql')));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>!m.addedPaths.includes(p))),'removing every addition must not masquerade as an old tree');
 assert.throws(()=>boundary.assertCompleteInventory(current,{read:p=>p==='worker/leaderboard/0001.sql'?Buffer.from('drift'):read(p)}));
 assert.deepEqual(boundary.inventoryBeforePinball(['public/unrelated.mjs']),['public/unrelated.mjs']);
});
test('pinball manifest cannot invent parents, scope, or omit duplicate admission records',()=>{
 assert.ok(boundary);const m=boundary.manifest();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.baseTree='0'.repeat(40),x=>x.files.pop(),x=>x.files.push({...x.files[0]}),x=>x.addedPaths.pop(),x=>x.addedPaths.push(x.addedPaths[0]),x=>x.addedFiles.pop(),x=>x.addedFiles.push({...x.addedFiles[0]}),x=>x.addedPaths.push('public/unknown.js')]){const bad=structuredClone(m);change(bad);assert.throws(()=>boundary.validate(bad));}
 const bad=structuredClone(boundary.baseline);bad.files[0].gitBlob='0'.repeat(40);assert.throws(()=>boundary.verifyBase(bad));
});
test('pinball historical reads preserve encoding while live tests continue seeing actual runtime',()=>{
 assert.ok(boundary);const url=new URL('src/catalog.mjs',root);
 assert.ok(Buffer.isBuffer(boundary.readBeforePinball(url)));
 assert.equal(boundary.readBeforePinball(url,'utf8'),boundary.readBeforePinball(url,{encoding:'utf8'}));
 assert.doesNotMatch(boundary.readBeforePinball(url,'utf8'),/id:'overtime-pinball'/);
 assert.match(readFileSync(url,'utf8'),/id:'overtime-pinball'/);
 const paths=inventory().filter(p=>/^(public|worker|src|config)\//.test(p));
 assert.deepEqual(boundary.inventoryBeforePinball(paths,{runtimeOnly:true}).sort(),boundary.baseline.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path).sort());
});
test('pinball manifest cache is deeply immutable and clones never bypass validation',()=>{
 const m=boundary.manifest();boundary.validate(m);
 assert.equal(Object.isFrozen(m),true);assert.equal(Object.isFrozen(m.files),true);assert.equal(Object.isFrozen(m.files[0]),true);
 assert.throws(()=>{m.files[0].beforeText+='drift';},TypeError);
 const copy=structuredClone(m);copy.files[0].beforeText+='drift';assert.throws(()=>boundary.validate(copy));
});

test('pinball manifest disk changes invalidate cached validation',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'pinball-manifest-cache-'));
 try{
  await mkdir(join(dir,'tests/helpers'),{recursive:true});await mkdir(join(dir,'docs/pinball'),{recursive:true});await mkdir(join(dir,'docs/preview-sports-counts'),{recursive:true});await mkdir(join(dir,'docs/pinball-polish'),{recursive:true});await mkdir(join(dir,'docs/preview-fast-gate'),{recursive:true});await mkdir(join(dir,'docs/shadow-release'),{recursive:true});await mkdir(join(dir,'docs/pinball-flow'),{recursive:true});await mkdir(join(dir,'docs/pinball-lottery'),{recursive:true});await mkdir(join(dir,'docs/pinball-open-lanes'),{recursive:true});await mkdir(join(dir,'docs/pinball-gate-performance'),{recursive:true});await mkdir(join(dir,'docs/pinball-inner-rail'),{recursive:true});await mkdir(join(dir,'docs/pinball-presentation'),{recursive:true});await mkdir(join(dir,'docs/pinball-palette'),{recursive:true});
  for(const p of ['tests/helpers/pinball-integration-provenance.mjs','docs/pinball/BASELINE.json','docs/pinball/MANIFEST.json','tests/helpers/preview-sports-counts-provenance.mjs','docs/preview-sports-counts/BASELINE.json','docs/preview-sports-counts/MANIFEST.json','tests/helpers/pinball-polish-provenance.mjs','docs/pinball-polish/BASELINE.json','docs/pinball-polish/MANIFEST.json','tests/helpers/preview-fast-gate-provenance.mjs','docs/preview-fast-gate/BASELINE.json','docs/preview-fast-gate/MANIFEST.json','tests/helpers/shadow-release-provenance.mjs','docs/shadow-release/BASELINE.json','docs/shadow-release/MANIFEST.json','tests/helpers/pinball-flow-provenance.mjs','docs/pinball-flow/BASELINE.json','docs/pinball-flow/MANIFEST.json','tests/helpers/pinball-lottery-provenance.mjs','docs/pinball-lottery/BASELINE.json','docs/pinball-lottery/MANIFEST.json','tests/helpers/pinball-open-lanes-provenance.mjs','docs/pinball-open-lanes/BASELINE.json','docs/pinball-open-lanes/MANIFEST.json','tests/helpers/pinball-gate-performance-provenance.mjs','docs/pinball-gate-performance/BASELINE.json','docs/pinball-gate-performance/MANIFEST.json','tests/helpers/pinball-inner-rail-provenance.mjs','docs/pinball-inner-rail/BASELINE.json','docs/pinball-inner-rail/MANIFEST.json','tests/helpers/pinball-presentation-provenance.mjs','docs/pinball-presentation/BASELINE.json','docs/pinball-presentation/MANIFEST.json','tests/helpers/pinball-palette-provenance.mjs','docs/pinball-palette/BASELINE.json','docs/pinball-palette/MANIFEST.json','tests/helpers/provenance-session.mjs'])await writeFile(join(dir,p),read(p));
  const isolated=await import(pathToFileURL(join(dir,'tests/helpers/pinball-integration-provenance.mjs')));
  isolated.validate(isolated.manifest());
  const tampered=JSON.parse(read('docs/pinball/MANIFEST.json'));tampered.files[0].beforeText+='disk drift';
  await writeFile(join(dir,'docs/pinball/MANIFEST.json'),JSON.stringify(tampered));
  assert.throws(()=>isolated.validate(isolated.manifest()));
  await writeFile(join(dir,'docs/pinball/MANIFEST.json'),'{broken json');
  assert.throws(()=>isolated.manifest(),SyntaxError);assert.throws(()=>isolated.manifest(),SyntaxError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
