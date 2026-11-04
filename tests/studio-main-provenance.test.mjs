import {readBeforeLongJump} from './helpers/long-jump-main-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {studioManifest,reverseStudio,readBeforeStudio} from './helpers/studio-main-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforeLongJump(new URL(p,root));
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
test('studio scope adds only approved attribution CSS and preserves existing published games',()=>{
 const m=studioManifest();assert.equal(m.mainBase,'90e6690ca248752917955839d8c1ee2903a903d2');assert.equal(m.previewSource,'1b79d1f22f84638f44b69bd7274bc84670af4876');
 assert.deepEqual(m.addedPublicPaths,['games/shared/studio-brand.css']);assert.deepEqual(m.addedFiles.map(f=>f.path),['public/games/shared/studio-brand.css']);
 assert.deepEqual(m.files.map(f=>f.path).sort(),['public/games/hurdles/index.html','public/games/reaction-rod/index.html','public/games/shared/entry-shell.mjs','scripts/build.mjs','scripts/verify.mjs','tests/helpers/loading-main-provenance.mjs','tests/main-loading-provenance.test.mjs'].sort());
 for(const f of m.addedFiles)assert.equal(blob(read(f.path)),f.gitBlob,f.path);
 assert.deepEqual(readdirSync(new URL('public/games/',root)).sort(),['hurdles','long-jump','reaction-rod','shared']);
});
test('studio reversal verifies every changed byte and rejects forged historical baselines',()=>{
 const m=studioManifest();for(const f of m.files){const bytes=read(f.path),before=reverseStudio(f.path,bytes);assert.equal(blob(before),f.beforeGitBlob);assert.deepEqual(readBeforeStudio(new URL(f.path,root)),before);assert.throws(()=>reverseStudio(f.path,Buffer.concat([bytes,Buffer.from('unexpected')])));const bad=structuredClone(m);bad.files.find(x=>x.path===f.path).beforeText+='unexpected';assert.throws(()=>reverseStudio(f.path,bytes,bad));}
});
test('attribution surgery preserves the exact prior game documents and entry behavior source',()=>{
 for(const game of ['hurdles','reaction-rod']){const p='public/games/'+game+'/index.html',b=read(p),restored=b.toString().replace('<link rel="stylesheet" href="../shared/studio-brand.css">','').replace(/<div class="pf-studio-heading">(<h1>[^<]*<\/h1>)<span class="pf-studio-live">島遊無界工作室 \| PLAYFORMOSA STUDIO<\/span><\/div>/,'$1').replace('<p class="pf-studio-result">島遊無界工作室 | PLAYFORMOSA STUDIO</p>','');assert.equal(restored,reverseStudio(p,b).toString(),game);}
 const p='public/games/shared/entry-shell.mjs',b=read(p);assert.equal(b.toString().replace("brand.textContent='島遊無界工作室 | PLAYFORMOSA STUDIO'","brand.textContent='PLAYFORMOSA'"),reverseStudio(p,b).toString());
});
test('studio overlay preserves all other loading-candidate files and every historical source ledger',()=>{
 for(const f of studioManifest().protectedFiles)assert.equal(blob(read(f.path)),f.gitBlob,f.path);
 for(const p of ['docs/loading-main/SOURCE-MANIFEST.json','docs/hurdles-main/SOURCE-MANIFEST.json','docs/reaction-rod-main/SOURCE-MANIFEST.json','public/games/long-jump/game.mjs','public/games/hurdles/share.mjs','public/games/reaction-rod/share.mjs','wrangler.jsonc'])assert.ok(studioManifest().protectedFiles.some(f=>f.path===p),p);
});
