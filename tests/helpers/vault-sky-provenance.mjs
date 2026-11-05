import {readBeforeFall} from './sprint-fall-provenance.mjs';
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{relative,resolve,isAbsolute,sep}from'node:path';import assert from'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const SKY_CHANGED=Object.freeze(['public/games/pole-vault/render.mjs','tests/helpers/upload-toolbar-polish-provenance.mjs','tests/upload-toolbar-polish-provenance.test.mjs','tests/fast-hands/art-polish-provenance.test.mjs','tests/fast-hands/result-upload-provenance.test.mjs','tests/fast-hands/split-entries-provenance.test.mjs','tests/reaction-rod/polish-provenance.test.mjs','tests/reaction-rod/replay-provenance.test.mjs']);
export const SKY_ADDED=Object.freeze(['docs/pole-vault/SKY-MANIFEST.json','docs/pole-vault/SKY-VERIFICATION.md','docs/superpowers/plans/2026-11-05-vault-sky.md','docs/superpowers/specs/2026-11-05-vault-sky-design.md','public/games/pole-vault/sky-journey.mjs','public/games/pole-vault/sky-models.mjs','tests/fixtures/vault-sky-baseline.json','tests/helpers/vault-sky-provenance.mjs','tests/pole-vault/sky-journey.test.mjs','tests/pole-vault/sky-provenance.test.mjs','tests/pole-vault/sky-render.test.mjs']);
const baselineBytes=readFileSync(new URL('../../tests/fixtures/vault-sky-baseline.json',import.meta.url));assert.equal(hash(baselineBytes),'91fc1cf7bd566206a1f3a51eccc2e55c2b791ee377dd12eece99caf5ea501284','independently pinned preview inventory');const historical=new Map(JSON.parse(baselineBytes).files.map(f=>[f.path,f.gitBlob]));
let cached;export const skyManifest=()=>cached??=JSON.parse(readFileSync(new URL('../../docs/pole-vault/SKY-MANIFEST.json',import.meta.url),'utf8'));
function validate(m){for(const f of m.files)assert.equal(f.beforeGitBlob,historical.get(f.path),f.path+' must restore the verified remote blob');assert.equal(m.baseCommit,'f0ff36a3c0afe1bdf3bfa5b34086a4626e810a1d');assert.equal(m.baseTree,'fe9763f7427e8b9b5104b43d7ef6c1806750da3b');assert.deepEqual(m.files.map(f=>f.path).sort(),[...SKY_CHANGED].sort());assert.deepEqual([...m.addedPaths].sort(),[...SKY_ADDED].sort());assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),SKY_ADDED.filter(p=>p!=='docs/pole-vault/SKY-MANIFEST.json').sort());}
export function reverseSky(path,bytes,m=skyManifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new sky scope, not historical source');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' sky current SHA256');assert.equal(blob(bytes),f.gitBlob,path+' sky current Git blob');const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' sky preimage SHA256');assert.equal(blob(before),f.beforeGitBlob,path+' sky preimage Git blob');return before;
}
export function readBeforeSky(file,options){const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return readBeforeFall(file,options);const encoding=typeof options==='string'?options:options?.encoding;const bytes=reverseSky(path,readBeforeFall(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));return encoding?bytes.toString(encoding):bytes;}
export function inventoryBeforeSky(paths,{manifest=skyManifest(),read=p=>readBeforeFall(new URL('../../'+p,import.meta.url))}={}){
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate current paths');for(const path of SKY_ADDED)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');for(const f of manifest.addedFiles){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path+' added SHA256');assert.equal(blob(bytes),f.gitBlob,f.path+' added Git blob');}return paths.filter(p=>!SKY_ADDED.includes(p));
}

// Runtime-only historical inventories do not include docs/tests. Verify every
// admitted sky runtime before removing precisely those two paths, independently
// of unrelated binary assets that a sparse source checkout may not contain.
export function runtimeInventoryBeforeSky(paths,{manifest=skyManifest(),read=p=>readBeforeFall(new URL('../../'+p,import.meta.url))}={}){
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate runtime paths');
 const additions=SKY_ADDED.filter(path=>path.startsWith('public/'));
 for(const path of additions){assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');const row=manifest.addedFiles.find(f=>f.path===path),bytes=read(path);assert.equal(hash(bytes),row.sha256,path+' added runtime SHA256');assert.equal(blob(bytes),row.gitBlob,path+' added runtime Git blob');}
 return paths.filter(path=>!additions.includes(path));
}
