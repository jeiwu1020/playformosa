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
