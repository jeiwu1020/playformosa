import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import * as p from './helpers/sports-help-provenance.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else result.push(path);}}walk();return result;}
test('sports help reconstructs the complete latest tree, preserving every physics, asset, source credit and old ledger',()=>{
 const m=p.validate(p.manifest()),current=paths();assert.equal(p.verifyBase(p.baseline),true);
 assert.deepEqual(m.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path),['public/games/shared/entry-shell.mjs','public/games/shared/runner-platform.mjs']);
 assert.ok(m.files.every(f=>!/(?:physics|engine|audio|vendor|rules|MANIFEST|BASELINE)/.test(f.path)));
 assert.deepEqual(p.inventoryBeforeSports(current).sort(),p.baseline.files.map(f=>f.path).sort());
 for(const f of p.baseline.files)assert.equal(p.gitBlob(p.readBeforeSports(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...m.files,...m.addedFiles])assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('sports help restoration rejects changed source, forged preimages and missing or tampered additions',()=>{
 const m=p.manifest(),current=paths();
 for(const f of m.files){assert.deepEqual(p.reverseSports(f.path,read(f.path)),Buffer.from(f.beforeText));assert.throws(()=>p.reverseSports(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));}
 for(const f of m.addedFiles)assert.throws(()=>p.inventoryBeforeSports(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeSports(current.filter(x=>x!==path)));
 assert.throws(()=>p.inventoryBeforeSports([...current,current[0]]));
 for(const mutate of [b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.baseTree='0'.repeat(40)]){const b=structuredClone(p.baseline);mutate(b);assert.throws(()=>p.verifyBase(b));}
 for(const mutate of [m=>m.files.pop(),m=>m.files[0].beforeText+='tamper',m=>m.addedPaths.pop(),m=>m.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validate(bad));}
});
