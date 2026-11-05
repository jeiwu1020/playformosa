import {readBeforeJourney,inventoryBeforeJourney,runtimeInventoryBeforeJourney} from '../helpers/vault-journey-provenance.mjs';
import {readBeforeHumor,inventoryBeforeHumor} from '../helpers/javelin-humor-provenance.mjs';
import {readBeforeHomeLabel,inventoryBeforeHomeLabel} from '../helpers/home-label-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
const p=await import('../helpers/javelin-results-provenance.mjs').catch(()=>({}));
const root=new URL('../../',import.meta.url),read=f=>readBeforeHomeLabel(new URL(f,root)),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('javelin result presentation patch reverses exactly to the independently verified preview renderer',()=>{
 assert.equal(typeof p.reverseJavelin,'function');const current=read('public/games/javelin/app.mjs');const before=p.reverseJavelin('public/games/javelin/app.mjs',current);
 assert.equal(blob(before),'918e27b98a37c46d87dcf2c4e489ef2f691fb669');assert.throws(()=>p.reverseJavelin('public/games/javelin/app.mjs',Buffer.concat([current,Buffer.from('tamper')])));
});
test('javelin result audit rejects invented preimages and validates every new runtime before removing its inventory path',()=>{
 assert.equal(typeof p.javelinManifest,'function');const m=p.javelinManifest(),bad=structuredClone(m);bad.files[0].beforeText+='tamper';assert.throws(()=>p.reverseJavelin(m.files[0].path,read(m.files[0].path),bad));
 for(const f of m.addedFiles){assert.throws(()=>p.reverseJavelin(f.path,read(f.path)));assert.throws(()=>p.inventoryBeforeJavelin(m.addedPaths,{read:path=>path===f.path?Buffer.from('tamper'):read(path)}));}
 assert.deepEqual(p.inventoryBeforeJavelin(['unrelated.txt',...m.addedPaths]),['unrelated.txt']);
});

const omitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('every materialized preview path reverses to its pinned Git blob without broad source exemptions',()=>{
 const baseline=JSON.parse(read('tests/fixtures/javelin-results-baseline.json')),paths=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else{assert.ok(e.isFile());paths.push(path);}}}walk();
 const missing=[];for(const f of baseline.files){if(!existsSync(new URL(f.path,root))){missing.push(f.path);continue;}assert.equal(blob(p.reverseJavelin(f.path,read(f.path))),f.gitBlob,f.path);}
 // Connector omits only these known >1MB remote PNGs; full Git/CI has none.
 assert.ok(missing.every(path=>omitted.includes(path)),'no new missing files');assert.deepEqual(p.inventoryBeforeJavelin(inventoryBeforeHomeLabel(inventoryBeforeHumor(inventoryBeforeJourney(paths)))).sort(),baseline.files.map(f=>f.path).filter(path=>!missing.includes(path)).sort());
 const m=structuredClone(p.javelinManifest());m.files[0].beforeText='forged';m.files[0].beforeGitBlob=blob(Buffer.from('forged'));m.files[0].beforeSha256=createHash('sha256').update('forged').digest('hex');assert.throws(()=>p.reverseJavelin(m.files[0].path,read(m.files[0].path),m));
 assert.throws(()=>p.inventoryBeforeJavelin([...paths,paths[0]]));assert.throws(()=>p.inventoryBeforeJavelin(paths.filter(x=>x!=='tests/javelin/result-dom.test.mjs')));
});

