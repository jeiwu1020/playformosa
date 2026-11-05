import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
const p=await import('../helpers/sprint-fall-provenance.mjs').catch(()=>({}));
const root=new URL('../../',import.meta.url),read=f=>readFileSync(new URL(f,root)),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('fall presentation patch reverses exactly to the independently verified preview renderer',()=>{
 assert.equal(typeof p.reverseFall,'function');const current=read('public/games/sprint-100m/pose3d.mjs');const before=p.reverseFall('public/games/sprint-100m/pose3d.mjs',current);
 assert.equal(blob(before),'320da3b98c57cb3b2bf29d96c196d29c570a9441');assert.throws(()=>p.reverseFall('public/games/sprint-100m/pose3d.mjs',Buffer.concat([current,Buffer.from('tamper')])));
});
test('fall audit rejects invented preimages and validates every new runtime before removing its inventory path',()=>{
 assert.equal(typeof p.fallManifest,'function');const m=p.fallManifest(),bad=structuredClone(m);bad.files[0].beforeText+='tamper';assert.throws(()=>p.reverseFall(m.files[0].path,read(m.files[0].path),bad));
 for(const f of m.addedFiles){assert.throws(()=>p.reverseFall(f.path,read(f.path)));assert.throws(()=>p.inventoryBeforeFall(m.addedPaths,{read:path=>path===f.path?Buffer.from('tamper'):read(path)}));}
 assert.deepEqual(p.inventoryBeforeFall(['unrelated.txt',...m.addedPaths]),['unrelated.txt']);
});

const omitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('every materialized preview path reverses to its pinned Git blob without broad source exemptions',()=>{
 const baseline=JSON.parse(read('tests/fixtures/sprint-fall-baseline.json')),paths=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else{assert.ok(e.isFile());paths.push(path);}}}walk();
 const missing=[];for(const f of baseline.files){if(!existsSync(new URL(f.path,root))){missing.push(f.path);continue;}assert.equal(blob(p.reverseFall(f.path,read(f.path))),f.gitBlob,f.path);}
 // Connector omits only these known >1MB remote PNGs; full Git/CI has none.
 assert.ok(missing.every(path=>omitted.includes(path)),'no new missing files');assert.deepEqual(p.inventoryBeforeFall(paths).sort(),baseline.files.map(f=>f.path).filter(path=>!missing.includes(path)).sort());
 const m=structuredClone(p.fallManifest());m.files[0].beforeText='forged';m.files[0].beforeGitBlob=blob(Buffer.from('forged'));m.files[0].beforeSha256=createHash('sha256').update('forged').digest('hex');assert.throws(()=>p.reverseFall(m.files[0].path,read(m.files[0].path),m));
 assert.throws(()=>p.inventoryBeforeFall([...paths,paths[0]]));assert.throws(()=>p.inventoryBeforeFall(paths.filter(x=>x!=='tests/sprint-100m/fall-rig.test.mjs')));
});

