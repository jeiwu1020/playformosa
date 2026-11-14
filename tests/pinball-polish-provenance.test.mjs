import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
let boundary;try{boundary=await import('./helpers/pinball-polish-provenance.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function inventory(){const out=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else out.push(p);}}walk();return out;}
test('pinballPolish boundary reconstructs every immutable 0f6b437 parent byte and the complete tree',()=>{
 assert.ok(boundary,'an exact additive pinballPolish boundary is required');
 assert.equal(boundary.baseline.baseCommit,'0f6b4372164c54a275eb07b1e5146a3c9fd2d4b6');
 assert.equal(boundary.baseline.baseTree,'f50ca56d6677ef7370d3046ac71be340fdc3d0ed');
 boundary.verifyBase(boundary.baseline);
 assert.deepEqual(boundary.inventoryBeforePinballPolish(inventory()).sort(),boundary.baseline.files.map(f=>f.path).sort());
 for(const f of boundary.baseline.files)assert.equal(boundary.gitBlob(boundary.readBeforePinballPolish(new URL(f.path,root))),f.gitBlob,f.path);
});
test('pinballPolish admission preserves every exact preimage and rejects live drift and repinned history',()=>{
 assert.ok(boundary);const m=boundary.manifest();boundary.validate(m);
 for(const f of m.files){
  const before=boundary.pinballPolishParentBytes(f.path,read(f.path));assert.equal(boundary.gitBlob(before),f.beforeGitBlob);
  assert.deepEqual(boundary.pinballPolishParentBytes(f.path,before),before);
  assert.throws(()=>boundary.pinballPolishParentBytes(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));
  const bad=structuredClone(m),entry=bad.files.find(x=>x.path===f.path);entry.beforeText+='forged';entry.beforeSha256=boundary.sha256(Buffer.from(entry.beforeText));entry.beforeGitBlob=boundary.gitBlob(Buffer.from(entry.beforeText));assert.throws(()=>boundary.validate(bad));
 }
});
test('pinballPolish inventory rejects missing, duplicate, unknown, and tampered additions without directory exemptions',()=>{
 assert.ok(boundary);const current=inventory(),m=boundary.manifest();
 for(const p of m.addedPaths)assert.throws(()=>boundary.inventoryBeforePinballPolish(current.filter(x=>x!==p)),p);
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>boundary.inventoryBeforePinballPolish(current,{read:p=>p===f.path?Buffer.from('drift'):read(p)}),f.path);
 assert.throws(()=>boundary.inventoryBeforePinballPolish([...current,current[0]]));
 const unknown='public/games/overtime-pinballPolish/unreviewed.js';assert.ok(boundary.inventoryBeforePinballPolish([...current,unknown]).includes(unknown));
 assert.throws(()=>boundary.assertCompleteInventory([...current,unknown]));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>p!=='worker/leaderboard/0001.sql')));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>!m.addedPaths.includes(p))),'removing every addition must not masquerade as an old tree');
 assert.throws(()=>boundary.assertCompleteInventory(current,{read:p=>p==='worker/leaderboard/0001.sql'?Buffer.from('drift'):read(p)}));
 assert.deepEqual(boundary.inventoryBeforePinballPolish(['public/unrelated.mjs']),['public/unrelated.mjs']);
});
test('pinballPolish manifest cannot invent parents, scope, or omit duplicate admission records',()=>{
 assert.ok(boundary);const m=boundary.manifest();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.baseTree='0'.repeat(40),x=>x.files.pop(),x=>x.files.push({...x.files[0]}),x=>x.addedPaths.pop(),x=>x.addedPaths.push(x.addedPaths[0]),x=>x.addedFiles.pop(),x=>x.addedFiles.push({...x.addedFiles[0]}),x=>x.addedPaths.push('public/unknown.js')]){const bad=structuredClone(m);change(bad);assert.throws(()=>boundary.validate(bad));}
 const bad=structuredClone(boundary.baseline);bad.files[0].gitBlob='0'.repeat(40);assert.throws(()=>boundary.verifyBase(bad));
});
test('pinball polish reads preserve encoding while runtime still sees new keys',()=>{
 const url=new URL('public/games/overtime-pinball/platform-share.mjs',root);
 assert.ok(Buffer.isBuffer(boundary.readBeforePinballPolish(url)));
 assert.equal(boundary.readBeforePinballPolish(url,'utf8'),boundary.readBeforePinballPolish(url,{encoding:'utf8'}));
 assert.doesNotMatch(boundary.readBeforePinballPolish(url,'utf8'),/score-card\.mjs/);
 assert.match(readFileSync(url,'utf8'),/score-card\.mjs/);
 const paths=inventory().filter(p=>/^(public|worker|src|config)\//.test(p));
 assert.deepEqual(boundary.inventoryBeforePinballPolish(paths,{runtimeOnly:true}).sort(),boundary.baseline.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path).sort());
});
test('pinballPolish manifest cache is deeply immutable and clones never bypass validation',()=>{
 const m=boundary.manifest();boundary.validate(m);
 assert.equal(Object.isFrozen(m),true);assert.equal(Object.isFrozen(m.files),true);assert.equal(Object.isFrozen(m.files[0]),true);
 assert.throws(()=>{m.files[0].beforeText+='drift';},TypeError);
 const copy=structuredClone(m);copy.files[0].beforeText+='drift';assert.throws(()=>boundary.validate(copy));
});

test('cached validation cannot be invalidated by mutation of its baseline dependency',()=>{
 const m=boundary.manifest();boundary.validate(m);
 assert.equal(Object.isFrozen(boundary.baseline),true);
 assert.equal(Object.isFrozen(boundary.baseline.files),true);
 assert.equal(Object.isFrozen(boundary.baseline.files[0]),true);
 assert.throws(()=>{boundary.baseline.files[0].gitBlob='0'.repeat(40);},TypeError);
 assert.throws(()=>{boundary.baseline.modifiedPaths.pop();},TypeError);
 boundary.validate(m);
});

test('pinballPolish disk changes invalidate the manifest cache and malformed JSON never reuses a green cache',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'pinball-polish-cache-'));
 try{
  await mkdir(join(dir,'tests/helpers'),{recursive:true});await mkdir(join(dir,'docs/pinball-desktop-axis'),{recursive:true});await mkdir(join(dir,'docs/pinball-centering-opacity'),{recursive:true});await mkdir(join(dir,'docs/pinball-mobile-landscape2'),{recursive:true});await mkdir(join(dir,'docs/pinball-hud-rotation'),{recursive:true});await mkdir(join(dir,'docs/pinball-entry'),{recursive:true});await mkdir(join(dir,'docs/pinball-keyboard-copy'),{recursive:true});await mkdir(join(dir,'docs/pinball-polish'),{recursive:true});await mkdir(join(dir,'docs/preview-fast-gate'),{recursive:true});await mkdir(join(dir,'docs/shadow-release'),{recursive:true});await mkdir(join(dir,'docs/pinball-flow'),{recursive:true});await mkdir(join(dir,'docs/pinball-lottery'),{recursive:true});await mkdir(join(dir,'docs/pinball-open-lanes'),{recursive:true});await mkdir(join(dir,'docs/pinball-gate-performance'),{recursive:true});await mkdir(join(dir,'docs/pinball-inner-rail'),{recursive:true});await mkdir(join(dir,'docs/pinball-presentation'),{recursive:true});await mkdir(join(dir,'docs/pinball-palette'),{recursive:true});await mkdir(join(dir,'docs/punchline-portal'),{recursive:true});await mkdir(join(dir,'docs/pinball-beautify-art/preimages'),{recursive:true});
  for(const p of ['tests/helpers/pinball-polish-provenance.mjs','docs/pinball-polish/BASELINE.json','docs/pinball-polish/MANIFEST.json','tests/helpers/preview-fast-gate-provenance.mjs','docs/preview-fast-gate/BASELINE.json','docs/preview-fast-gate/MANIFEST.json','tests/helpers/shadow-release-provenance.mjs','docs/shadow-release/BASELINE.json','docs/shadow-release/MANIFEST.json','tests/helpers/pinball-flow-provenance.mjs','docs/pinball-flow/BASELINE.json','docs/pinball-flow/MANIFEST.json','tests/helpers/pinball-lottery-provenance.mjs','docs/pinball-lottery/BASELINE.json','docs/pinball-lottery/MANIFEST.json','tests/helpers/pinball-open-lanes-provenance.mjs','docs/pinball-open-lanes/BASELINE.json','docs/pinball-open-lanes/MANIFEST.json','tests/helpers/pinball-gate-performance-provenance.mjs','docs/pinball-gate-performance/BASELINE.json','docs/pinball-gate-performance/MANIFEST.json','tests/helpers/pinball-inner-rail-provenance.mjs','docs/pinball-inner-rail/BASELINE.json','docs/pinball-inner-rail/MANIFEST.json','tests/helpers/pinball-presentation-provenance.mjs','docs/pinball-presentation/BASELINE.json','docs/pinball-presentation/MANIFEST.json','tests/helpers/pinball-palette-provenance.mjs','docs/pinball-palette/BASELINE.json','docs/pinball-palette/MANIFEST.json','tests/helpers/punchline-portal-provenance.mjs','docs/punchline-portal/BASELINE.json','docs/punchline-portal/MANIFEST.json','tests/helpers/pinball-beautify-art-provenance.mjs','docs/pinball-beautify-art/BASELINE.json','docs/pinball-beautify-art/MANIFEST.json','docs/pinball-beautify-art/preimages/portal-taiwanpunchline.png','tests/helpers/pinball-keyboard-copy-provenance.mjs','docs/pinball-keyboard-copy/BASELINE.json','docs/pinball-keyboard-copy/MANIFEST.json','tests/helpers/pinball-entry-provenance.mjs','docs/pinball-entry/BASELINE.json','docs/pinball-entry/MANIFEST.json','tests/helpers/pinball-hud-rotation-provenance.mjs','docs/pinball-hud-rotation/BASELINE.json','docs/pinball-hud-rotation/MANIFEST.json','tests/helpers/pinball-mobile-landscape2-provenance.mjs','docs/pinball-mobile-landscape2/BASELINE.json','docs/pinball-mobile-landscape2/MANIFEST.json','tests/helpers/pinball-centering-opacity-provenance.mjs','docs/pinball-centering-opacity/BASELINE.json','docs/pinball-centering-opacity/MANIFEST.json','tests/helpers/pinball-desktop-axis-provenance.mjs','docs/pinball-desktop-axis/BASELINE.json','docs/pinball-desktop-axis/MANIFEST.json','tests/helpers/provenance-session.mjs'])await writeFile(join(dir,p),read(p));
  const isolated=await import(pathToFileURL(join(dir,'tests/helpers/pinball-polish-provenance.mjs')));
  isolated.validate(isolated.manifest());
  const tampered=JSON.parse(read('docs/pinball-polish/MANIFEST.json'));tampered.files[0].beforeText+='disk drift';
  await writeFile(join(dir,'docs/pinball-polish/MANIFEST.json'),JSON.stringify(tampered));
  assert.throws(()=>isolated.validate(isolated.manifest()));
  await writeFile(join(dir,'docs/pinball-polish/MANIFEST.json'),'{broken json');
  assert.throws(()=>isolated.manifest(),SyntaxError);assert.throws(()=>isolated.manifest(),SyntaxError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
