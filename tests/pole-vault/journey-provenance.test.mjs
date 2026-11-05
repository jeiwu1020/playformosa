import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {journeyManifest,JOURNEY_CHANGED,JOURNEY_ADDED,reverseJourney,inventoryBeforeJourney,runtimeInventoryBeforeJourney} from '../helpers/vault-journey-provenance.mjs';
const root=new URL('../../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('named journey changes only presentation modules, keeping physics, control and landmarks byte-exact',()=>{
 assert.deepEqual(JOURNEY_CHANGED.filter(p=>p.startsWith('public/')).sort(),['public/games/pole-vault/render.mjs','public/games/pole-vault/sky-journey.mjs','public/games/pole-vault/sky-models.mjs']);
 assert.deepEqual(JOURNEY_ADDED.filter(p=>p.startsWith('public/')),['public/games/pole-vault/journey-hud.mjs']);
 const base=JSON.parse(read('tests/fixtures/vault-journey-baseline.json'));
 for(const p of ['physics.mjs','game.mjs','milestones.mjs','scenery.mjs','character.mjs','index.html','platform.css']){const path='public/games/pole-vault/'+p;assert.equal(blob(read(path)),base.files.find(f=>f.path===path).gitBlob,path);}
});
test('all vault-journey deltas restore exact published preimages and reject drift or forged history',()=>{
 const m=journeyManifest();
 for(const f of m.files){
  const bytes=read(f.path),copy=Buffer.from(bytes);assert.equal(blob(reverseJourney(f.path,bytes)),f.beforeGitBlob);assert.deepEqual(bytes,copy);
  assert.throws(()=>reverseJourney(f.path,Buffer.concat([bytes,Buffer.from('drift')])));
  for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='drift';assert.throws(()=>reverseJourney(f.path,bytes,bad),f.path+' '+field);}
 }
});
test('vault-journey inventory admits exact new verification files and rejects missing, duplicate or mutated additions',()=>{
 const paths=[...JOURNEY_CHANGED,...JOURNEY_ADDED],m=journeyManifest();
 assert.deepEqual(inventoryBeforeJourney(paths),[...JOURNEY_CHANGED]);
 assert.throws(()=>inventoryBeforeJourney(paths.slice(0,-1)));assert.throws(()=>inventoryBeforeJourney([...paths,JOURNEY_ADDED[0]]));
 const target=m.addedFiles[0].path;assert.throws(()=>inventoryBeforeJourney(paths,{read:p=>p===target?Buffer.from('tampered'):read(p)}));
 for(const p of JOURNEY_ADDED)assert.throws(()=>reverseJourney(p,read(p)));
});
test('unrelated runtime bytes retain their identity through the vault-journey history boundary',()=>{
 for(const path of ['public/games/fast-hands/index.html','public/games/fast-hands/catch.html','public/games/fast-hands/duel.html','public/games/fast-hands-test/index.html']){const b=read(path);assert.deepEqual(reverseJourney(path,b),b)}
});

const knownOmitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('the complete materialized branch preserves every parent blob beyond the exact vault-journey delta',()=>{
 const baseline=JSON.parse(read('tests/fixtures/vault-journey-baseline.json')),paths=[],missing=[];
 function walk(dir=''){for(const entry of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(entry.name))continue;const path=dir?dir+'/'+entry.name:entry.name;if(entry.isDirectory())walk(path);else{assert.ok(entry.isFile(),path+' must be a regular source file');paths.push(path)}}}walk();
 for(const file of baseline.files){if(!existsSync(new URL(file.path,root))){missing.push(file.path);continue}assert.equal(blob(reverseJourney(file.path,read(file.path))),file.gitBlob,file.path)}
 assert.ok(missing.every(path=>knownOmitted.includes(path)),'only the known remote large-PNG transfer limitation may be absent locally');
 assert.deepEqual(inventoryBeforeJourney(paths).sort(),baseline.files.map(f=>f.path).filter(p=>!missing.includes(p)).sort());
});

test('full remote runtime inventory is exact without opening omitted binary files',async()=>{
 const {runtimeInventoryBeforeSky}=await import('../helpers/vault-sky-provenance.mjs');
 const base=JSON.parse(read('tests/fixtures/vault-journey-baseline.json')).files.map(f=>f.path).filter(p=>['public/','worker/','src/','config/'].some(prefix=>p.startsWith(prefix)));
 const added=JOURNEY_ADDED.filter(p=>p.startsWith('public/')),current=[...base,...added];
 assert.deepEqual(runtimeInventoryBeforeJourney(current).sort(),[...base].sort());
 assert.deepEqual(runtimeInventoryBeforeSky(runtimeInventoryBeforeJourney(current)).sort(),base.filter(p=>!['public/games/pole-vault/sky-journey.mjs','public/games/pole-vault/sky-models.mjs'].includes(p)).sort());
 for(const p of added){assert.throws(()=>runtimeInventoryBeforeJourney(current.filter(f=>f!==p)));assert.throws(()=>runtimeInventoryBeforeJourney(current,{read:f=>f===p?Buffer.from('tampered'):read(f)}));}
 assert.throws(()=>runtimeInventoryBeforeJourney([...current,current[0]]));
 assert.ok(runtimeInventoryBeforeJourney([...current,'public/unknown.mjs']).includes('public/unknown.mjs'));
});
