import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
let boundary;try{boundary=await import('./helpers/preview-sports-counts-provenance.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
function inventory(){const out=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else out.push(p);}}walk();return out;}
test('sportsCounts boundary reconstructs every immutable 10c28bc parent byte and the complete tree',()=>{
 assert.ok(boundary,'an exact additive sportsCounts boundary is required');
 assert.equal(boundary.baseline.baseCommit,'10c28bca65c841fb2a5c6c021ad818d9f9263879');
 assert.equal(boundary.baseline.baseTree,'43b4c94d3c4ece621e9d36984d46d156db90a430');
 boundary.verifyBase(boundary.baseline);
 assert.deepEqual(boundary.inventoryBeforeSportsCounts(inventory()).sort(),boundary.baseline.files.map(f=>f.path).sort());
 for(const f of boundary.baseline.files)assert.equal(boundary.gitBlob(boundary.readBeforeSportsCounts(new URL(f.path,root))),f.gitBlob,f.path);
});
test('sportsCounts admission preserves every exact preimage and rejects live drift and repinned history',()=>{
 assert.ok(boundary);const m=boundary.manifest();boundary.validate(m);
 for(const f of m.files){
  const before=boundary.sportsCountsParentBytes(f.path,read(f.path));assert.equal(boundary.gitBlob(before),f.beforeGitBlob);
  assert.deepEqual(boundary.sportsCountsParentBytes(f.path,before),before);
  assert.throws(()=>boundary.sportsCountsParentBytes(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));
  const bad=structuredClone(m),entry=bad.files.find(x=>x.path===f.path);entry.beforeText+='forged';entry.beforeSha256=boundary.sha256(Buffer.from(entry.beforeText));entry.beforeGitBlob=boundary.gitBlob(Buffer.from(entry.beforeText));assert.throws(()=>boundary.validate(bad));
 }
});
test('sportsCounts inventory rejects missing, duplicate, unknown, and tampered additions without directory exemptions',()=>{
 assert.ok(boundary);const current=inventory(),m=boundary.manifest();
 for(const p of m.addedPaths)assert.throws(()=>boundary.inventoryBeforeSportsCounts(current.filter(x=>x!==p)),p);
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>boundary.inventoryBeforeSportsCounts(current,{read:p=>p===f.path?Buffer.from('drift'):read(p)}),f.path);
 assert.throws(()=>boundary.inventoryBeforeSportsCounts([...current,current[0]]));
 const unknown='public/games/overtime-sportsCounts/unreviewed.js';assert.ok(boundary.inventoryBeforeSportsCounts([...current,unknown]).includes(unknown));
 assert.throws(()=>boundary.assertCompleteInventory([...current,unknown]));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>p!=='worker/leaderboard/0001.sql')));
 assert.throws(()=>boundary.assertCompleteInventory(current.filter(p=>!m.addedPaths.includes(p))),'removing every addition must not masquerade as an old tree');
 assert.throws(()=>boundary.assertCompleteInventory(current,{read:p=>p==='worker/leaderboard/0001.sql'?Buffer.from('drift'):read(p)}));
 assert.deepEqual(boundary.inventoryBeforeSportsCounts(['public/unrelated.mjs']),['public/unrelated.mjs']);
});
test('sportsCounts manifest cannot invent parents, scope, or omit duplicate admission records',()=>{
 assert.ok(boundary);const m=boundary.manifest();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.baseTree='0'.repeat(40),x=>x.files.pop(),x=>x.files.push({...x.files[0]}),x=>x.addedPaths.pop(),x=>x.addedPaths.push(x.addedPaths[0]),x=>x.addedFiles.pop(),x=>x.addedFiles.push({...x.addedFiles[0]}),x=>x.addedPaths.push('public/unknown.js')]){const bad=structuredClone(m);change(bad);assert.throws(()=>boundary.validate(bad));}
 const bad=structuredClone(boundary.baseline);bad.files[0].gitBlob='0'.repeat(40);assert.throws(()=>boundary.verifyBase(bad));
});
test('sports counts reads preserve encoding while runtime still sees new keys',()=>{
 const url=new URL('public/games/shared/play-counts.mjs',root);
 assert.ok(Buffer.isBuffer(boundary.readBeforeSportsCounts(url)));
 assert.equal(boundary.readBeforeSportsCounts(url,'utf8'),boundary.readBeforeSportsCounts(url,{encoding:'utf8'}));
 assert.doesNotMatch(boundary.readBeforeSportsCounts(url,'utf8'),/run-1500m/);
 assert.match(readFileSync(url,'utf8'),/run-1500m/);
 const paths=inventory().filter(p=>/^(public|worker|src|config)\//.test(p));
 assert.deepEqual(boundary.inventoryBeforeSportsCounts(paths,{runtimeOnly:true}).sort(),boundary.baseline.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path).sort());
});
test('sportsCounts manifest cache is deeply immutable and clones never bypass validation',()=>{
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
