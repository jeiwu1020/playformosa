import {readBeforePolish} from './helpers/fast-hands-polish-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readdirBeforeIcons as readdirSync} from './helpers/app-icons-completion-provenance.mjs';
import {createHash} from 'node:crypto';
import {fastHandsManifest,reverseFastHands,readBeforeFastHands,readGamesBeforeFastHands} from './helpers/fast-hands-main-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforePolish(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const baselineBytes=read('tests/fixtures/fast-hands-main-baseline.json');
assert.equal(hash(baselineBytes),'f93d6283593fe66d471f887c142b35b4d6b70ebea236ad0135e2c907eaec6078','baseline inventory is pinned to reviewed main, not the new ledger');
const baseline=JSON.parse(baselineBytes);
test('Fast Hands promotion declares exact source commits and exact public additions',()=>{
 const m=fastHandsManifest();assert.equal(m.baseCommit,'b09b4f841258bef41999bcc3b3684829b59a62c0');assert.equal(m.sourceCommit,'037802320dc9317bc0ee02ea70fe790e999cd7b7');
 assert.equal(m.addedPublicPaths.length,85);assert.deepEqual([...m.addedPublicPaths].sort(),baseline.addedPublicPaths);
 assert.equal(new Set(m.files.map(f=>f.path)).size,m.files.length);
 for(const f of m.files){assert.equal(typeof f.beforeText,'string',f.path);assert.ok(!m.addedPublicPaths.includes(f.path.replace(/^public\//,'')),'additions cannot pretend to have historical bytes');}
 assert.deepEqual(readGamesBeforeFastHands(),['hurdles','long-jump','reaction-rod','shared']);
});
test('every changed existing byte reverses only after both current and prior SHA256 and Git blob validation',()=>{
 const m=fastHandsManifest();assert.ok(m.files.length>0);
 for(const f of m.files){const bytes=read(f.path),before=reverseFastHands(f.path,bytes,m);assert.equal(blob(before),f.beforeGitBlob);assert.equal(hash(before),f.beforeSha256);assert.deepEqual(readBeforeFastHands(new URL(f.path,root)),before);
 assert.throws(()=>reverseFastHands(f.path,Buffer.concat([bytes,Buffer.from('tampered')]),m));
 for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='tampered';assert.throws(()=>reverseFastHands(f.path,bytes,bad),f.path+' '+field);}
 const duplicate=structuredClone(m);duplicate.files.push({...f});assert.throws(()=>reverseFastHands(f.path,bytes,duplicate));
 }
 assert.throws(()=>reverseFastHands('public/'+m.addedPublicPaths[0],read('public/'+m.addedPublicPaths[0]),m),'new scope has no historical authorization');
});
test('all existing games, shared runtime, production binding and SQL schemas retain their exact base blobs',()=>{
 for(const f of baseline.protectedFiles){assert.equal(blob(read(f.path)),f.gitBlob,f.path);assert.equal(hash(read(f.path)),f.sha256,f.path);}
 for(const p of ['wrangler.jsonc','worker/leaderboard/0001.sql','worker/play-counts/002.sql'])assert.ok(baseline.protectedFiles.some(f=>f.path===p));
});
test('all 85 new public files including every runtime module match the approved preview source bytes',()=>{
 const m=fastHandsManifest();assert.equal(new Set(m.sourceFiles.map(f=>f.path)).size,m.sourceFiles.length);
 assert.deepEqual(m.sourceFiles.map(f=>f.path).sort(),baseline.addedPublicPaths.map(p=>'public/'+p));
 assert.deepEqual([...m.sourceFiles].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),baseline.sourceFiles,'source hashes must match fixed approved preview evidence');
 for(const f of m.sourceFiles){assert.equal(hash(read(f.path)),f.sha256,f.path);assert.equal(blob(read(f.path)),f.gitBlob,f.path);}
 const actual=[];function walk(dir){for(const e of readdirSync(new URL(dir+'/',root),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else actual.push(p);}}
 for(const dir of ['public/games/fast-hands','public/games/javelin'])walk(dir);
 assert.deepEqual(actual.sort(),m.sourceFiles.filter(f=>/^public\/games\/(fast-hands|javelin)\//.test(f.path)).map(f=>f.path).sort());
});
