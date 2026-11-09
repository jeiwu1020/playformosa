import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {readBeforeTapCoverage as readFileSync,inventoryBeforeTapCoverage} from './helpers/courtesy-touch-coverage-provenance.mjs';
import * as p from './helpers/vault-coordination-merge-provenance.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else result.push(path);}}walk();return inventoryBeforeTapCoverage(result);}
for(const key of ['remote','candidate'])test(`${key} merge parent reconstructs its complete independently pinned Git tree`,()=>{
 const m=p.manifest(),v=p.validate(m,key),b=p.baselines[key],current=paths();assert.equal(p.verifyBase(b,key),true);
 const runtime=v.files.filter(f=>/^(public|worker|src|config)\//.test(f.path)).map(f=>f.path);
 assert.deepEqual(runtime,key==='remote'?['public/games/pole-vault/physics.mjs']:['public/games/beer-slide/index.html','public/games/fast-hands/app.mjs','public/games/fast-hands/catch.html','public/games/fast-hands/duel.html','public/games/fast-hands/index.html','public/games/fast-hands/levels-app.mjs','public/games/reaction-rod/index.html','public/games/tower-climb/index.html']);
 assert.ok(!v.addedPaths.some(path=>/^(public|worker|src|config)\//.test(path)));
 assert.ok(v.files.every(f=>!/(?:MANIFEST|BASELINE)\.json$/.test(f.path)),'old ledgers remain byte-exact');
 assert.deepEqual(p.inventory(current,key).sort(),b.files.map(f=>f.path).sort());
 const view=key==='remote'?p.readBeforeIntegration:p.readCandidateView;
 for(const f of b.files)assert.equal(p.gitBlob(view(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...v.files,...v.addedFiles])assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
 for(const f of v.files){assert.deepEqual(p.reverse(f.path,read(f.path),key),Buffer.from(f.beforeText));assert.throws(()=>p.reverse(f.path,Buffer.concat([read(f.path),Buffer.from('drift')]),key));}
 for(const f of v.addedFiles)assert.throws(()=>p.inventory(current,key,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 for(const path of v.addedPaths)assert.throws(()=>p.inventory(current.filter(x=>x!==path),key));
 assert.throws(()=>p.inventory([...current,current[0]],key));
 for(const mutate of [x=>x.files.pop(),x=>x.files[0].beforeText+='tamper',x=>x.addedPaths.pop(),x=>x.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad[key]);assert.throws(()=>p.validate(bad,key));}
});
