import {readBeforeJourney,inventoryBeforeJourney,runtimeInventoryBeforeJourney} from '../helpers/vault-journey-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {humorManifest,HUMOR_CHANGED,HUMOR_ADDED,reverseHumor,inventoryBeforeHumor} from '../helpers/javelin-humor-provenance.mjs';
const root=new URL('../../',import.meta.url),read=p=>readBeforeJourney(new URL(p,root));
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('humor restoration changes only the valid-result paragraph, not controls or scoring',()=>{
 const path='public/games/javelin/app.mjs',current=read(path),before=reverseHumor(path,current).toString();
 assert.deepEqual(HUMOR_CHANGED.filter(p=>p.startsWith('public/')),[path]);
 const old="${state.foul?`<p>${state.reason}</p>`:''}",restored="<p>${state.foul?state.reason:'標槍先下班，你的腳還要記得煞車。'}</p>";
 assert.equal(before.split(old).length,2);assert.equal(current.toString(),before.replace(old,restored));
});
test('all javelin-humor deltas restore exact published preimages and reject drift or forged history',()=>{
 const m=humorManifest();
 for(const f of m.files){
  const bytes=read(f.path),copy=Buffer.from(bytes);assert.equal(blob(reverseHumor(f.path,bytes)),f.beforeGitBlob);assert.deepEqual(bytes,copy);
  assert.throws(()=>reverseHumor(f.path,Buffer.concat([bytes,Buffer.from('drift')])));
  for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='drift';assert.throws(()=>reverseHumor(f.path,bytes,bad),f.path+' '+field);}
 }
});
test('javelin-humor inventory admits exact new verification files and rejects missing, duplicate or mutated additions',()=>{
 const paths=[...HUMOR_CHANGED,...HUMOR_ADDED],m=humorManifest();
 assert.deepEqual(inventoryBeforeHumor(paths),[...HUMOR_CHANGED]);
 assert.throws(()=>inventoryBeforeHumor(paths.slice(0,-1)));assert.throws(()=>inventoryBeforeHumor([...paths,HUMOR_ADDED[0]]));
 const target=m.addedFiles[0].path;assert.throws(()=>inventoryBeforeHumor(paths,{read:p=>p===target?Buffer.from('tampered'):read(p)}));
 for(const p of HUMOR_ADDED)assert.throws(()=>reverseHumor(p,read(p)));
});
test('unrelated runtime bytes retain their identity through the javelin-humor history boundary',()=>{
 for(const path of ['public/games/fast-hands/index.html','public/games/fast-hands/catch.html','public/games/fast-hands/duel.html','public/games/fast-hands-test/index.html']){const b=read(path);assert.deepEqual(reverseHumor(path,b),b)}
});

const knownOmitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('the complete materialized branch preserves every parent blob beyond the exact javelin-humor delta',()=>{
 const baseline=JSON.parse(read('tests/fixtures/javelin-humor-baseline.json')),paths=[],missing=[];
 function walk(dir=''){for(const entry of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(entry.name))continue;const path=dir?dir+'/'+entry.name:entry.name;if(entry.isDirectory())walk(path);else{assert.ok(entry.isFile(),path+' must be a regular source file');paths.push(path)}}}walk();
 for(const file of baseline.files){if(!existsSync(new URL(file.path,root))){missing.push(file.path);continue}assert.equal(blob(reverseHumor(file.path,read(file.path))),file.gitBlob,file.path)}
 assert.ok(missing.every(path=>knownOmitted.includes(path)),'only the known remote large-PNG transfer limitation may be absent locally');
 assert.deepEqual(inventoryBeforeHumor(inventoryBeforeJourney(paths)).sort(),baseline.files.map(f=>f.path).filter(p=>!missing.includes(p)).sort());
});
