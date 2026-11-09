import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import * as legacy from './helpers/main-courtesy-help-provenance.mjs';
let repair;try{repair=await import('./helpers/courtesy-touch-inventory-repair.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else result.push(path);}}walk();return result;}
test('older inventory chain removes the complete touch fix before comparing the pinned historical tree',()=>{
 assert.deepEqual(legacy.inventoryBeforeMainCourtesy(paths()).sort(),legacy.baseline.files.map(f=>f.path).sort());
});
test('inventory repair independently reconstructs every file of the published touch-fix commit',()=>{
 assert.ok(repair,'inventory repair boundary must exist');const current=paths();repair.validate(repair.manifest());
 assert.deepEqual(repair.inventoryBeforeInventoryRepair(current).sort(),repair.baseline.files.map(f=>f.path).sort());
 for(const f of repair.baseline.files)assert.equal(repair.gitBlob(repair.readBeforeInventoryRepair(new URL(f.path,root))),f.gitBlob,f.path);
});
test('inventory repair rejects forged historical bytes, missing additions, duplicates and tampered current files',()=>{
 assert.ok(repair);const m=repair.manifest(),current=paths();
 for(const change of [x=>x.baseCommit='0'.repeat(40),x=>x.baseTree='0'.repeat(40),x=>x.files.pop(),x=>x.files[0].beforeText+='drift',x=>x.files[0].beforeGitBlob='0'.repeat(40),x=>x.addedPaths.pop(),x=>x.addedFiles.pop()]){const bad=structuredClone(m);change(bad);assert.throws(()=>repair.validate(bad));}
 for(const path of m.addedPaths)assert.throws(()=>repair.inventoryBeforeInventoryRepair(current.filter(p=>p!==path)));
 for(const f of [...m.files,...m.addedFiles])assert.throws(()=>repair.inventoryBeforeInventoryRepair(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>repair.inventoryBeforeInventoryRepair([...current,current[0]]));
 assert.deepEqual(repair.inventoryBeforeInventoryRepair(['public/unrelated.mjs']),['public/unrelated.mjs']);
});
