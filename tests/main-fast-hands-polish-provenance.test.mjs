import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {polishManifest,reversePolish,readBeforePolish} from './helpers/fast-hands-polish-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fixtureBytes=read('tests/fixtures/fast-hands-polish-baseline.json');
assert.equal(hash(fixtureBytes),'80987b826f9ceeeeaf7e50653f14af5626c6f773bd167befe3d92ea6f0200cd4','polish base is independently pinned to main 2857cf6');
const baseline=JSON.parse(fixtureBytes);
test('polish declares only the approved six-game upload and three-game toolbar scope',()=>{
 const m=polishManifest();assert.equal(m.baseCommit,'2857cf68e6cf45f0cbb0e7a3e63520dba60e2c41');assert.equal(m.baseTree,'8b2d255b710933b2370c950706c8299ce8d7dacf');
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedPublicPaths,['games/shared/upload-cooldown.mjs']);
 const actual=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){const p=dir?dir+'/'+e.name:e.name;if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;if(e.isDirectory())walk(p);else {assert.ok(e.isFile(),p+' must be a regular file');actual.push(p);}}}walk();
 assert.deepEqual(actual.sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'no unreviewed additions or deletions');
});
test('all 544 original tracked files match remote base after the exact approved delta is reversed',()=>{
 const m=polishManifest();assert.equal(baseline.files.length,544);
 for(const f of baseline.files){const before=readBeforePolish(new URL(f.path,root));assert.equal(hash(before),f.sha256,f.path);assert.equal(blob(before),f.gitBlob,f.path);}
 for(const f of m.files){const original=baseline.files.find(b=>b.path===f.path);assert.ok(original,f.path);assert.equal(f.beforeSha256,original.sha256);assert.equal(f.beforeGitBlob,original.gitBlob);}
});
test('current bytes and saved prior bytes must both validate, and additions cannot impersonate history',()=>{
 const m=polishManifest();for(const f of m.files){const bytes=read(f.path);assert.equal(blob(reversePolish(f.path,bytes,m)),f.beforeGitBlob);
  assert.throws(()=>reversePolish(f.path,Buffer.concat([bytes,Buffer.from('tamper')]),m));
  for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='tamper';assert.throws(()=>reversePolish(f.path,bytes,bad),f.path+' '+field);}
  const bad=structuredClone(m);bad.files.push({...f});assert.throws(()=>reversePolish(f.path,bytes,bad));
 }
 for(const p of m.addedPaths)assert.throws(()=>reversePolish(p,read(p),m));
});
test('schema, bindings, old ledgers, original game engines and score rules stay byte-identical',()=>{
 const protectedPaths=baseline.files.filter(f=>f.path==='wrangler.jsonc'||f.path.startsWith('docs/')||f.path.endsWith('.sql')||/^public\/games\/(hurdles|long-jump|reaction-rod|javelin)\//.test(f.path)&&f.path!=='public/games/reaction-rod/leaderboard.mjs'||/^public\/games\/fast-hands\/(core|duck|levels|catch|duel)\//.test(f.path));
 assert.ok(protectedPaths.length>100);
 for(const f of protectedPaths){assert.ok(!baseline.modifiedPaths.includes(f.path),f.path);assert.equal(blob(read(f.path)),f.gitBlob,f.path);}
 for(const name of ['0001.sql','003-reaction-rod-production.sql'])assert.ok(protectedPaths.some(f=>f.path==='worker/leaderboard/'+name));
});
