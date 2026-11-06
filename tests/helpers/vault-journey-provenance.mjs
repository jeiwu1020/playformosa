import {readBeforePace as readFileSync,inventoryBeforePace,runtimeInventoryBeforePace,PACE_ADDED} from './vault-pace-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const JOURNEY_CHANGED=Object.freeze(["public/games/pole-vault/render.mjs", "public/games/pole-vault/sky-journey.mjs", "public/games/pole-vault/sky-models.mjs", "tests/pole-vault/helpers/scene-harness.mjs", "tests/pole-vault/sky-render.test.mjs", "tests/helpers/javelin-humor-provenance.mjs", "tests/javelin/humor-provenance.test.mjs", "tests/platform-home-label-provenance.test.mjs", "tests/javelin/results-provenance.test.mjs", "tests/sprint-100m/fall-provenance.test.mjs", "tests/pole-vault/sky-provenance.test.mjs", "tests/upload-toolbar-polish-provenance.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs", "tests/reaction-rod/polish-provenance.test.mjs", "tests/reaction-rod/replay-provenance.test.mjs"]);
export const JOURNEY_ADDED=Object.freeze(["docs/pole-vault/JOURNEY-MANIFEST.json", "docs/pole-vault/JOURNEY-VERIFICATION.md", "docs/superpowers/plans/2026-11-05-vault-journey-stages.md", "docs/superpowers/specs/2026-11-05-vault-journey-stages-design.md", "public/games/pole-vault/journey-hud.mjs", "tests/fixtures/vault-journey-baseline.json", "tests/helpers/vault-journey-provenance.mjs", "tests/pole-vault/journey-stages.test.mjs", "tests/pole-vault/journey-hud.test.mjs", "tests/pole-vault/journey-models.test.mjs", "tests/pole-vault/journey-provenance.test.mjs"]);
const baselineBytes=readFileSync(new URL('../../tests/fixtures/vault-journey-baseline.json',import.meta.url));
assert.equal(hash(baselineBytes),'8222eb95099782910e39a6b011d3a72dd27ad8904ea5016f88983d25eb132461','independently pinned vault-journey parent inventory');
const historical=new Map(JSON.parse(baselineBytes).files.map(f=>[f.path,f.gitBlob]));
let cached;
export const journeyManifest=()=>cached??=JSON.parse(readFileSync(new URL('../../docs/pole-vault/JOURNEY-MANIFEST.json',import.meta.url),'utf8'));
function validate(m){
 assert.equal(m.baseCommit,'79b8c1cbe3377f387855199d3b178550b6448009');assert.equal(m.baseTree,'6928753315f32252665cd75d06ccda7fbec8ff5e');
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...JOURNEY_CHANGED].sort());
 assert.deepEqual([...m.addedPaths].sort(),[...JOURNEY_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),JOURNEY_ADDED.filter(p=>p!=='docs/pole-vault/JOURNEY-MANIFEST.json').sort());
 for(const f of m.files)assert.equal(f.beforeGitBlob,historical.get(f.path),f.path+' must restore the verified remote blob');
}
export function reverseJourney(path,bytes,m=journeyManifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new vault-journey scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' vault-journey current SHA256');assert.equal(blob(bytes),f.gitBlob,path+' vault-journey current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' vault-journey preimage SHA256');assert.equal(blob(before),f.beforeGitBlob,path+' vault-journey preimage Git blob');return before;
}
// This reader is used only at the outer historical boundary, never by live UI tests.
export function readBeforeJourney(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return readFileSync(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=reverseJourney(path,readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));
 return encoding?bytes.toString(encoding):bytes;
}
export function inventoryBeforeJourney(paths,{manifest=journeyManifest(),read=p=>readFileSync(new URL('../../'+p,import.meta.url))}={}){
 if(paths.some(p=>PACE_ADDED.includes(p)))paths=inventoryBeforePace(paths);
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate current paths');
 for(const path of JOURNEY_ADDED)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path+' added SHA256');assert.equal(blob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!JOURNEY_ADDED.includes(p));
}

// Validate the one added runtime independently of unrelated binary reads.
export function runtimeInventoryBeforeJourney(paths,{manifest=journeyManifest(),read=p=>readFileSync(new URL('../../'+p,import.meta.url))}={}){
 paths=runtimeInventoryBeforePace(paths);
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate runtime paths');
 const additions=JOURNEY_ADDED.filter(path=>path.startsWith('public/'));
 for(const path of additions){assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');const row=manifest.addedFiles.find(f=>f.path===path),bytes=read(path);assert.equal(hash(bytes),row.sha256,path+' added runtime SHA256');assert.equal(blob(bytes),row.gitBlob,path+' added runtime Git blob');}
 return paths.filter(path=>!additions.includes(path));
}
