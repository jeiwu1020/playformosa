import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {readBeforeFighter as readFileSync} from './helpers/fighter-entry-provenance.mjs';
import {createHash} from 'node:crypto';
import {highJumpManifest,validateHighJumpManifest,readBeforeHighJump,inventoryBeforeHighJump} from './helpers/high-jump-main-provenance.mjs';
const root=new URL('../',import.meta.url),blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
test('high-jump exact scope and every original main byte are independently pinned',()=>{
 const m=highJumpManifest();validateHighJumpManifest(m);
 const actual=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else actual.push(p);}}walk();
 assert.deepEqual(inventoryBeforeHighJump(actual).sort(),m.baseFiles.map(f=>f.path).sort());
 for(const f of m.baseFiles)assert.equal(blob(readBeforeHighJump(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of m.files)assert.equal(blob(readFileSync(new URL(f.path,root))),f.gitBlob,f.path);
});
test('scope validator rejects forged source identities, changed prior blobs and extra or missing paths',()=>{
 const original=highJumpManifest();
 for(const mutate of [m=>m.baseMain='0'.repeat(40),m=>m.previewSource='0'.repeat(40),m=>m.baseFiles[0].gitBlob='0'.repeat(40),m=>m.files.pop(),m=>m.files.push({...m.files[0]}),m=>m.files[0].beforeGitBlob='0'.repeat(40),m=>m.addedPaths.push('public/games/other/index.html'),m=>m.addedPaths.pop(),m=>m.addedPublicPaths.push('secret.html'),m=>m.deletedPaths.push('wrangler.jsonc')]){const m=structuredClone(original);mutate(m);assert.throws(()=>validateHighJumpManifest(m));}
});
