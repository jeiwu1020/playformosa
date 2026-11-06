import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../../',import.meta.url),manifestUrl=new URL('docs/runners/VISUAL-REVISION-MANIFEST.json',root);

test('approved visual revision has a separate, exact-base provenance record',async()=>{
 assert.ok(existsSync(manifestUrl),'visual revision must be recorded separately from original imported source');
 const p=await import('../helpers/runner-visual-provenance.mjs');
 const m=p.visualManifest();p.validateVisualManifest(m);
 assert.equal(m.baseCommit,'8e502b76005f9b74219394e0c35336ff09eafd88');
 assert.equal(m.baseTree,'6d17b5b19ad6cbc6572f15f9084d1f079a8bd31d');
 for(const path of p.VISUAL_ALLOWED){const url=new URL(path,root),before=p.visualBaseline.files.find(f=>f.path===path);if(existsSync(url)&&p.gitBlob(readFileSync(url))!==before?.gitBlob)assert.ok(m.files.some(f=>f.path===path),path+' changed without explicit revision');}
 for(const f of m.files){const bytes=readFileSync(new URL(f.path,root));p.verifyVisualBytes(f.path,bytes,m);assert.throws(()=>p.verifyVisualBytes(f.path,Buffer.concat([bytes,Buffer.from('tamper')]),m));}
});

test('visual revision rejects unknown paths, missing required variants and forged original hashes',async()=>{
 assert.ok(existsSync(manifestUrl),'visual revision manifest required');
 const p=await import('../helpers/runner-visual-provenance.mjs'),m=p.visualManifest();
 for(const mutate of [x=>x.files.splice(x.files.findIndex(f=>f.path===p.VISUAL_REQUIRED[0]),1),x=>x.files.push(x.files[0]),x=>x.files[0].path='public/games/sprint-100m/character3d.mjs',x=>x.files[0].beforeGitBlob='0'.repeat(40),x=>x.files[0].beforeSha256='0'.repeat(64),x=>x.baseCommit='0'.repeat(40)]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validateVisualManifest(bad));}
});

test('original source manifest stays historical and protected game mechanics stay exact',async()=>{
 assert.ok(existsSync(manifestUrl),'visual revision manifest required');
 const p=await import('../helpers/runner-visual-provenance.mjs');
 p.verifyHistoricalSourceManifest();
 const base=p.visualBaseline;
 for(const f of base.files.filter(f=>f.path.startsWith('public/games/sprint-100m/')||/^public\/games\/run-(400m|1500m)\/(race\.mjs|clock\.mjs|records\.mjs|audio.*|vendor\/.*)$/.test(f.path)||f.path==='worker/leaderboard/index.mjs')){
  assert.equal(p.gitBlob(readFileSync(new URL(f.path,root))),f.gitBlob,f.path+' is protected from visual-only changes');
 }
});
