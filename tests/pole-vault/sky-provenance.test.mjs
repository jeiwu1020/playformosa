import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
const p=await import('../helpers/vault-sky-provenance.mjs').catch(()=>({}));
const root=new URL('../../',import.meta.url),read=f=>readFileSync(new URL(f,root)),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('sky presentation patch reverses exactly to the independently verified preview renderer',()=>{
 assert.equal(typeof p.reverseSky,'function');const current=read('public/games/pole-vault/render.mjs');const before=p.reverseSky('public/games/pole-vault/render.mjs',current);
 assert.equal(blob(before),'c326bba689427337c5abf767030fb0eb209a2b6a');assert.throws(()=>p.reverseSky('public/games/pole-vault/render.mjs',Buffer.concat([current,Buffer.from('tamper')])));
});
test('sky audit rejects invented preimages and validates every new runtime before removing its inventory path',()=>{
 assert.equal(typeof p.skyManifest,'function');const m=p.skyManifest(),bad=structuredClone(m);bad.files[0].beforeText+='tamper';assert.throws(()=>p.reverseSky(m.files[0].path,read(m.files[0].path),bad));
 for(const f of m.addedFiles){assert.throws(()=>p.reverseSky(f.path,read(f.path)));assert.throws(()=>p.inventoryBeforeSky(m.addedPaths,{read:path=>path===f.path?Buffer.from('tamper'):read(path)}));}
 assert.deepEqual(p.inventoryBeforeSky(['unrelated.txt',...m.addedPaths]),['unrelated.txt']);
});

const omitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('every materialized preview path reverses to its pinned Git blob without broad source exemptions',()=>{
 const baseline=JSON.parse(read('tests/fixtures/vault-sky-baseline.json')),paths=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else{assert.ok(e.isFile());paths.push(path);}}}walk();
 const missing=[];for(const f of baseline.files){if(!existsSync(new URL(f.path,root))){missing.push(f.path);continue;}assert.equal(blob(p.reverseSky(f.path,read(f.path))),f.gitBlob,f.path);}
 // Connector omits only these known >1MB remote PNGs; full Git/CI has none.
 assert.ok(missing.every(path=>omitted.includes(path)),'no new missing files');assert.deepEqual(p.inventoryBeforeSky(paths).sort(),baseline.files.map(f=>f.path).filter(path=>!missing.includes(path)).sort());
 const m=structuredClone(p.skyManifest());m.files[0].beforeText='forged';m.files[0].beforeGitBlob=blob(Buffer.from('forged'));m.files[0].beforeSha256=createHash('sha256').update('forged').digest('hex');assert.throws(()=>p.reverseSky(m.files[0].path,read(m.files[0].path),m));
 assert.throws(()=>p.inventoryBeforeSky([...paths,paths[0]]));assert.throws(()=>p.inventoryBeforeSky(paths.filter(x=>x!=='public/games/pole-vault/sky-models.mjs')));
});

test('runtime-only sky inventory validates additions without reading unrelated missing binary assets',()=>{
 assert.equal(typeof p.runtimeInventoryBeforeSky,'function');
 const dirs=['public','worker','src','config'],paths=[];const walk=dir=>{for(const e of readdirSync(new URL(dir+'/',root),{withFileTypes:true})){const path=dir+'/'+e.name;if(e.isDirectory())walk(path);else paths.push(path);}};dirs.forEach(walk);
 const expected=JSON.parse(read('tests/fixtures/vault-sky-baseline.json')).files.map(f=>f.path).filter(path=>dirs.some(dir=>path.startsWith(dir+'/'))&&existsSync(new URL(path,root))).sort();
 assert.deepEqual(p.runtimeInventoryBeforeSky(paths).sort(),expected);
 for(const name of ['sky-journey.mjs','sky-models.mjs']){const path='public/games/pole-vault/'+name;assert.throws(()=>p.runtimeInventoryBeforeSky(paths.filter(f=>f!==path)));assert.throws(()=>p.runtimeInventoryBeforeSky(paths,{read:f=>f===path?Buffer.from('tampered sky source'):read(f)}));}
 assert.throws(()=>p.runtimeInventoryBeforeSky([...paths,paths[0]]));
 assert.ok(p.runtimeInventoryBeforeSky([...paths,'public/unreviewed.mjs']).includes('public/unreviewed.mjs'),'unknown runtime must never be silently ignored');
});

test('complete remote runtime inventory reproduces the CI mismatch without reading unrelated binaries',async()=>{
 const {inventoryBeforePolish}=await import('../helpers/upload-toolbar-polish-provenance.mjs');
 const base=JSON.parse(read('tests/fixtures/vault-sky-baseline.json')).files.map(f=>f.path).filter(path=>['public/','worker/','src/','config/'].some(prefix=>path.startsWith(prefix)));
 const current=[...base,...p.SKY_ADDED.filter(path=>path.startsWith('public/'))],expected=base.filter(path=>path!=='public/games/shared/upload-cooldown.mjs').sort();
 assert.throws(()=>assert.deepEqual(inventoryBeforePolish(current).sort(),expected),'old boundary alone reproduces the exact two-path CI mismatch');
 assert.deepEqual(inventoryBeforePolish(p.runtimeInventoryBeforeSky(current)).sort(),expected,'both historical runtime boundaries now receive the original full inventory');
});
