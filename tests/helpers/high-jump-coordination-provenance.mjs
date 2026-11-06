// Outermost reversible boundary. Live gameplay tests continue to read live code.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COORDINATION_BASE_COMMIT='6c7cb39d7bf7beadf41818efa155627b7c777df7';
export const COORDINATION_BASE_TREE='1e35734a077d941b0bce0e903c412fb4d3c06884';
export const COORDINATION_CHANGED=Object.freeze(['public/games/high-jump/physics.mjs','public/games/high-jump/game.mjs','public/games/high-jump/index.html','tests/helpers/runner-integration-provenance.mjs','tests/high-jump/short-replay.test.mjs','tests/fast-hands/art-polish-provenance.test.mjs','tests/fast-hands/result-upload-provenance.test.mjs','tests/fast-hands/split-entries-provenance.test.mjs']);
export const COORDINATION_ADDED=Object.freeze(['docs/high-jump/COORDINATION-VERIFICATION.md','tests/high-jump/coordination-geometry.test.mjs','docs/high-jump/COORDINATION-BASELINE.json','docs/high-jump/COORDINATION-MANIFEST.json','tests/helpers/high-jump-coordination-provenance.mjs','tests/high-jump/provenance.test.mjs','tests/high-jump/coordination.test.mjs','tests/high-jump/coordination-input.test.mjs','tests/high-jump/helpers/coordination-trace.mjs','docs/superpowers/plans/2026-11-07-high-jump-coordination.md','docs/superpowers/specs/2026-11-07-high-jump-coordination.md']);
const baselineBytes=actual(new URL('../../docs/high-jump/COORDINATION-BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'f0b65da25ae85c031b6a5b4f21f6ca7ea2ce5bada69d3e20378dde00e62fc72b','independently pinned complete coordination parent');
export const coordinationBaseline=JSON.parse(baselineBytes);
const previous=new Map(coordinationBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCoordinationBase(base){
 assert.equal(base.baseCommit,COORDINATION_BASE_COMMIT);assert.equal(base.baseTree,COORDINATION_BASE_TREE);assert.deepEqual(base,coordinationBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),COORDINATION_BASE_TREE,'reconstructed remote Git tree');return true;
}
verifyCoordinationBase(coordinationBaseline);
export const coordinationManifest=()=>JSON.parse(actual(new URL('../../docs/high-jump/COORDINATION-MANIFEST.json',import.meta.url),'utf8'));
export function validateCoordinationManifest(m){
 assert.equal(m.baseCommit,COORDINATION_BASE_COMMIT);assert.equal(m.baseTree,COORDINATION_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COORDINATION_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...COORDINATION_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COORDINATION_ADDED.filter(p=>p!=='docs/high-jump/COORDINATION-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseCoordination(path,bytes,m=coordinationManifest()){
 validateCoordinationManifest(m);assert.ok(!COORDINATION_ADDED.includes(path),path+' is new coordination scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' coordination current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' coordination current Git blob');return Buffer.from(f.beforeText);
}
// Direct inner-layer APIs may receive either current bytes or bytes already restored
// by the outer reader. The latter must match the independently pinned preimage
// byte-for-byte; no caller-provided inner hash can authorize this branch.
export function coordinationParentBytes(path,bytes,m=coordinationManifest()){
 validateCoordinationManifest(m);
 assert.ok(!COORDINATION_ADDED.includes(path),path+' is new coordination scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=Buffer.from(f.beforeText);
 if(Buffer.from(bytes).equals(parent))return parent;
 return reverseCoordination(path,bytes,m);
}
export function readBeforeCoordination(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 // Readers may load current helper metadata; only exact changed sources are reversed.
 const before=COORDINATION_CHANGED.includes(path)?reverseCoordination(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCoordination(paths,{manifest=coordinationManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate coordination inventory');validateCoordinationManifest(manifest);
 const additions=COORDINATION_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Older partial inventories intentionally lack this outer revision altogether.
 if(!runtimeOnly&&!paths.some(p=>COORDINATION_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
