import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
let api;try{api=await import('./helpers/upload-toolbar-polish-provenance.mjs')}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error}
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const path='public/games/fast-hands/app.mjs',before=Buffer.from('prior\n'),current=Buffer.from('current\n');
const sample=()=>({files:[{path,beforeText:before.toString(),beforeSha256:sha(before),beforeGitBlob:blob(before),sha256:sha(current),gitBlob:blob(current)}],addedPaths:['public/games/shared/upload-cooldown.mjs'],addedPublicPaths:['games/shared/upload-cooldown.mjs'],addedFiles:[{path:'public/games/shared/upload-cooldown.mjs',sha256:sha(current),gitBlob:blob(current)}]});
test('polish read boundary restores only double-pinned current and parent bytes without mutating inputs',()=>{
 assert.ok(api,'independent preview polish reversal layer exists');const copy=Buffer.from(current);assert.deepEqual(api.reversePolish(path,current,sample()),before);assert.deepEqual(copy,current);
 for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=sample();bad.files[0][field]+='drift';assert.throws(()=>api.reversePolish(path,current,bad));}
 assert.throws(()=>api.reversePolish(path,before,sample()),'stale bytes do not bypass current verification');
 const duplicate=sample();duplicate.files.push({...duplicate.files[0]});assert.throws(()=>api.reversePolish(path,current,duplicate));
 assert.throws(()=>api.reversePolish('public/games/shared/upload-cooldown.mjs',current,sample()),'new runtime cannot impersonate historical source');
});
test('polish inventory removes only its one exact verified new public file and retains unknown additions',()=>{
 assert.ok(api);const paths=['public/index.html','public/games/shared/upload-cooldown.mjs','public/unreviewed.js'];
 assert.deepEqual(api.inventoryBeforePolish(paths,{manifest:sample(),read:()=>current}),['public/index.html','public/unreviewed.js']);
 assert.throws(()=>api.inventoryBeforePolish(paths,{manifest:sample(),read:()=>before}));
 assert.throws(()=>api.inventoryBeforePolish(paths.filter(p=>!p.endsWith('upload-cooldown.mjs')),{manifest:sample(),read:()=>current}));
 const expanded=sample();expanded.addedPublicPaths.push('unreviewed.js');assert.throws(()=>api.inventoryBeforePolish(paths,{manifest:expanded,read:()=>current}));
});
