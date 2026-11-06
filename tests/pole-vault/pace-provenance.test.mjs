import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import * as p from '../helpers/vault-pace-provenance.mjs';
const root=new URL('../../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['.git','node_modules','dist'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else{assert.ok(e.isFile(),path+' regular file');result.push(path);}}}walk();return result;}
test('pacing base reconstructs the exact independently pinned remote Git tree',()=>{
 assert.equal(p.verifyPaceRemoteBase(p.paceBaseline),true);
 for(const mutate of [b=>b.baseCommit='0'.repeat(40),b=>b.baseTree='0'.repeat(40),b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.files[0].mode='100755',b=>b.files[0].path='unknown']){const bad=structuredClone(p.paceBaseline);mutate(bad);assert.throws(()=>p.verifyPaceRemoteBase(bad));}
});
test('pacing scope contains only five approved runtime edits and no added runtime, assets, SQL or configuration',()=>{
 assert.deepEqual(p.PACE_CHANGED.filter(path=>/^(public|worker|src|config)\//.test(path)).sort(),['public/games/pole-vault/flight-profile.mjs','public/games/pole-vault/physics.mjs','public/games/shared/leaderboard-metrics.mjs','public/games/shared/leaderboard.mjs','worker/leaderboard/index.mjs'].sort());
 assert.deepEqual(p.PACE_ADDED.filter(path=>/^(public|worker|src|config)\//.test(path)),[]);
 assert.ok(p.PACE_CHANGED.every(path=>!path.endsWith('.sql')&&!path.includes('/assets/')&&!path.includes('MANIFEST')&&!path.includes('/fixtures/')));
});
test('every pacing change restores exact remote bytes and rejects current, preimage and ledger drift',()=>{
 const m=p.paceManifest();for(const row of m.files){const bytes=read(row.path),copy=Buffer.from(bytes),restored=p.reversePace(row.path,bytes,m);assert.equal(p.paceBlob(restored),p.paceBaseline.files.find(f=>f.path===row.path).gitBlob);assert.deepEqual(bytes,copy);assert.throws(()=>p.reversePace(row.path,Buffer.concat([bytes,Buffer.from('drift')]),m));
 for(const key of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(f=>f.path===row.path)[key]+='drift';assert.throws(()=>p.reversePace(row.path,bytes,bad),row.path+' '+key);}
 const forged=structuredClone(m),f=forged.files.find(f=>f.path===row.path);f.beforeText='forged history';f.beforeSha256=p.paceHash(Buffer.from(f.beforeText));f.beforeGitBlob=p.paceBlob(Buffer.from(f.beforeText));assert.throws(()=>p.reversePace(row.path,bytes,forged));}
});
test('pacing manifest rejects unknown, missing and duplicate changed and added paths',()=>{
 const m=p.paceManifest();for(const mutate of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.files[0].path='public/unknown.mjs',m=>m.addedPaths.pop(),m=>m.addedPaths.push(m.addedPaths[0]),m=>m.addedPaths.push('public/unknown.mjs'),m=>m.addedFiles.pop(),m=>m.addedFiles.push(m.addedFiles[0]),m=>m.baseCommit='unknown',m=>m.baseTree='unknown']){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validatePaceManifest(bad));}
});
test('pacing additions are hashed before removal and never treated as historical source',()=>{
 const m=p.paceManifest(),current=[...p.PACE_CHANGED,...p.PACE_ADDED];assert.deepEqual(p.inventoryBeforePace(current),[...p.PACE_CHANGED]);
 for(const path of p.PACE_ADDED){assert.throws(()=>p.reversePace(path,read(path)));assert.throws(()=>p.inventoryBeforePace(current.filter(x=>x!==path)));}
 for(const f of m.addedFiles)assert.throws(()=>p.inventoryBeforePace(current,{read:path=>path===f.path?Buffer.from('tampered'):read(path)}));
 assert.throws(()=>p.inventoryBeforePace([...current,current[0]]));
});
test('full pacing source audit rejects unknown, missing, duplicate, tampered and unauthorized omitted source',()=>{
 const current=paths(),omitted=p.paceBaseline.files.filter(f=>!existsSync(new URL(f.path,root))).map(f=>f.path),options={omitted};
 assert.equal(p.verifyPaceInventory(current,options),true);
 assert.throws(()=>p.verifyPaceInventory([...current,'public/unknown.mjs'],options));assert.throws(()=>p.verifyPaceInventory([...current,current[0]],options));
 const unchanged='public/games/pole-vault/render.mjs';assert.throws(()=>p.verifyPaceInventory(current.filter(path=>path!==unchanged),options));
 assert.throws(()=>p.verifyPaceInventory(current,{...options,read:path=>path===unchanged?Buffer.from('tampered'):read(path)}));
 assert.throws(()=>p.verifyPaceInventory(current,{omitted:[...omitted,unchanged]}));assert.throws(()=>p.verifyPaceInventory(current,{omitted:[...omitted,'unknown']}));
});
test('complete remote runtime inventory remains exact without reading unavailable binary assets',()=>{
 const runtime=path=>/^(public|worker|src|config)\//.test(path),base=p.paceBaseline.files.map(f=>f.path).filter(runtime);
 assert.deepEqual(p.runtimeInventoryBeforePace(base,{read:()=>assert.fail('zero new runtime files means no asset reads')}),base);
 assert.throws(()=>p.runtimeInventoryBeforePace([...base,base[0]]));
 // Boundaries preserve unknown input for the strict outer/full inventory to reject, never silently filter it.
 assert.ok(p.runtimeInventoryBeforePace([...base,'public/unknown.mjs']).includes('public/unknown.mjs'));
});
