import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
function manifest(){assert.ok(existsSync(new URL('docs/long-jump-main/SOURCE-MANIFEST.json',root)),'new promotion needs its own ledger');return JSON.parse(read('docs/long-jump-main/SOURCE-MANIFEST.json'));}
test('Long Jump promotion has a precise independent source ledger and no extra public admission',()=>{
 const m=manifest();assert.equal(m.baseMain,'90e6690ca248752917955839d8c1ee2903a903d2');assert.equal(m.previewSource,'b732a20962613de3fb286fb2a8dc798d615d408d');assert.deepEqual(m.scope,['long-jump']);assert.deepEqual(m.addedPublicPaths,['games/long-jump/replay.mjs']);assert.equal(new Set(m.files.map(f=>f.path)).size,m.files.length);
 const publicChanges=m.files.filter(f=>f.path.startsWith('public/')).map(f=>f.path).sort();assert.deepEqual(publicChanges,['capture.mjs','game.mjs','index.html','layout.mjs','presentation.mjs','replay.mjs','share.mjs','style.css'].map(f=>'public/games/long-jump/'+f).sort());
 for(const f of m.files){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path);assert.equal(blob(bytes),f.gitBlob,f.path);if(f.beforeText!==undefined){const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,f.path);assert.equal(blob(before),f.beforeGitBlob,f.path);}}
});
test('Long Jump promotion keeps production services, scoring and all unrelated baseline files intact',()=>{
 const m=manifest();for(const f of m.protectedFiles)assert.equal(blob(read(f.path)),f.gitBlob,f.path);
 for(const path of ['wrangler.jsonc','public/games/shared/leaderboard.mjs','public/games/shared/production-jump-leaderboard.mjs','public/games/shared/play-counts.mjs','public/games/long-jump/physics.mjs','public/games/long-jump/controls.mjs','public/games/long-jump/world.mjs','worker/leaderboard/repository.mjs'])assert.ok(m.protectedFiles.some(f=>f.path===path),path);
 assert.deepEqual(readdirSync(new URL('public/games/',root)).sort(),['hurdles','long-jump','reaction-rod','shared']);
});
test('current and previous Jump bytes are verified before yielding historical source',async()=>{
 const m=manifest(),{reverseLongJump,readBeforeLongJump}=await import('./helpers/long-jump-main-provenance.mjs');
 for(const f of m.files.filter(f=>f.beforeText!==undefined)){const bytes=read(f.path),old=reverseLongJump(f.path,bytes);assert.equal(blob(old),f.beforeGitBlob);assert.deepEqual(readBeforeLongJump(new URL(f.path,root)),old);assert.throws(()=>reverseLongJump(f.path,Buffer.concat([bytes,Buffer.from('tampered')])));const damaged=structuredClone(m);damaged.files.find(x=>x.path===f.path).beforeText+='tampered';assert.throws(()=>reverseLongJump(f.path,bytes,damaged));}
});
test('complete preview physics and artwork remain identical while replay has exact preview source',()=>{
 const m=manifest();assert.equal(m.unchangedJumpFiles.length,37);for(const f of m.unchangedJumpFiles)assert.equal(blob(read(f.path)),f.previewGitBlob,f.path);for(const name of ['capture.mjs','presentation.mjs','replay.mjs','share.mjs']){const f=m.files.find(f=>f.path==='public/games/long-jump/'+name);assert.equal(f.gitBlob,f.previewGitBlob,name);}
});
