import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {readFileSync} from 'node:fs';
import * as p from './helpers/vault-air-coordination-provenance.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else result.push(path);}}walk();return result;}
test('air coordination delta reconstructs the complete latest preview tree and admits only one runtime file',()=>{
 const m=p.validate(p.manifest()),current=paths();assert.equal(p.verifyBase(p.baseline),true);
 assert.deepEqual(m.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path),['public/games/pole-vault/physics.mjs']);
 assert.ok(!m.addedPaths.some(path=>/^(public|worker|src|config)\//.test(path)));
 assert.deepEqual(p.inventoryBeforeCoordination(current).sort(),p.baseline.files.map(f=>f.path).sort());
 for(const f of p.baseline.files)assert.equal(p.gitBlob(p.readBeforeCoordination(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...m.files,...m.addedFiles])assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
});
test('air coordination restoration rejects drift, forged history, missing additions and duplicate inventory',()=>{
 const m=p.manifest(),current=paths();
 for(const f of m.files){assert.deepEqual(p.reverseCoordination(f.path,read(f.path)),Buffer.from(f.beforeText));assert.throws(()=>p.reverseCoordination(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));}
 for(const f of m.addedFiles)assert.throws(()=>p.inventoryBeforeCoordination(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeCoordination(current.filter(x=>x!==path)));
 assert.throws(()=>p.inventoryBeforeCoordination([...current,current[0]]));
 for(const mutate of [b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.baseTree='0'.repeat(40)]){const b=structuredClone(p.baseline);mutate(b);assert.throws(()=>p.verifyBase(b));}
 for(const mutate of [m=>m.files.pop(),m=>m.files[0].beforeText+='tamper',m=>m.addedPaths.pop(),m=>m.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validate(bad));}
});
