import {inventoryBeforeJavelin} from './helpers/javelin-results-provenance.mjs';
import {inventoryBeforeFall} from './helpers/sprint-fall-provenance.mjs';
import {readBeforeSky,inventoryBeforeSky} from './helpers/vault-sky-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {polishManifest,reversePolish,readBeforePolish} from './helpers/upload-toolbar-polish-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforeSky(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fixtureBytes=read('tests/fixtures/upload-toolbar-polish-baseline.json');
assert.equal(hash(fixtureBytes),'d5b9ac91e134a4360fd48051c09f1eab89308435f491d2c4cdc80f2c71b35b8d','preview base inventory is independently pinned to remote 0378023');
const baseline=JSON.parse(fixtureBytes);
test('preview polish declares only exact reviewed paths and one new public helper',()=>{
 const m=polishManifest();assert.equal(m.baseCommit,'037802320dc9317bc0ee02ea70fe790e999cd7b7');assert.equal(m.baseTree,'993db78e2486fac40d77690cc85451556ffe3e92');
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);assert.deepEqual(m.addedPublicPaths,['games/shared/upload-cooldown.mjs']);
 const actual=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;if(e.isDirectory())walk(p);else{assert.ok(e.isFile(),p+' must be regular');actual.push(p);}}}walk();
 assert.deepEqual(inventoryBeforeSky(inventoryBeforeFall(inventoryBeforeJavelin(actual))).sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'all preview-only content retained; no extra tracked source');
});
test('all 1253 preview files preserve their exact remote Git blobs after only this repair is reversed',()=>{
 assert.equal(baseline.files.length,1253);for(const f of baseline.files)assert.equal(blob(readBeforePolish(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of polishManifest().files){assert.equal(f.beforeGitBlob,baseline.files.find(x=>x.path===f.path)?.gitBlob,f.path);assert.equal(hash(Buffer.from(f.beforeText)),f.beforeSha256,f.path);}
});
test('preview repair rejects tampered current bytes, invented preimages and new files masquerading as history',()=>{
 const m=polishManifest();for(const f of m.files){const bytes=read(f.path);assert.equal(blob(reversePolish(f.path,bytes,m)),f.beforeGitBlob);
 assert.throws(()=>reversePolish(f.path,Buffer.concat([bytes,Buffer.from('tamper')]),m));
 for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='tamper';assert.throws(()=>reversePolish(f.path,bytes,bad),f.path+' '+field);}}
 for(const f of m.addedFiles){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256);assert.equal(blob(bytes),f.gitBlob);assert.throws(()=>reversePolish(f.path,bytes,m));}
});
test('QA binding, database schemas, board registries, secondary metrics, test console and old ledgers are preserved',()=>{
 const m=polishManifest();for(const p of ['wrangler.jsonc','config/catalog-channel.json','worker/leaderboard/0001.sql','worker/leaderboard/003.sql','worker/play-counts/002.sql','public/games/shared/leaderboard-metrics.mjs']){assert.ok(!baseline.modifiedPaths.includes(p),p);assert.equal(blob(read(p)),baseline.files.find(f=>f.path===p)?.gitBlob,p);}
 const protectedFiles=baseline.files.filter(f=>f.path.startsWith('docs/')||f.path.startsWith('public/games/fast-hands-test/'));
 for(const f of protectedFiles){assert.ok(!baseline.modifiedPaths.includes(f.path),f.path);assert.equal(blob(read(f.path)),f.gitBlob,f.path);}
 const p='worker/leaderboard/index.mjs',before=readBeforePolish(new URL(p,root)).toString(),current=read(p).toString();assert.equal(current.slice(0,current.indexOf('  const result=await repo.submit')),before.slice(0,before.indexOf('  const result=await repo.submit')),'12 boards, QA guard and validation remain exact');
});
