// Reversible compact desktop-entry boundary. Gameplay assertions still inspect live files.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COMPACT_ENTRY_BASE_COMMIT='c1aa66f53b246172f1a715b4c58231850ce4c032';
export const COMPACT_ENTRY_BASE_TREE='f4a648d79aabd0f3a8f95c7a1407fa4f4eb85823';
export const COMPACT_ENTRY_CHANGED=Object.freeze(["public/games/high-jump/game.mjs","public/games/high-jump/style.css","tests/high-jump/desktop-dialog-layout.test.mjs","tests/helpers/dialog-layout-repair-provenance.mjs","tests/fast-hands/art-polish-provenance.test.mjs","tests/fast-hands/result-upload-provenance.test.mjs","tests/fast-hands/split-entries-provenance.test.mjs","tests/dialog-layout-repair-provenance.test.mjs"]);
export const COMPACT_ENTRY_ADDED=Object.freeze(["docs/high-jump/COMPACT-ENTRY-BASELINE.json","docs/high-jump/COMPACT-ENTRY-MANIFEST.json","tests/helpers/high-jump-compact-entry-provenance.mjs","tests/high-jump/compact-entry-provenance.test.mjs","docs/superpowers/specs/2026-11-07-high-jump-compact-entry-design.md","docs/superpowers/plans/2026-11-07-high-jump-compact-entry.md"]);
const baselineBytes=actual(new URL('../../docs/high-jump/COMPACT-ENTRY-BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'7991cbcec5aa4545a125a520d5ecbb257c3f22f0f3c0652ff53d81484299c258','independently pinned complete compact-entry parent');
export const compactEntryBaseline=JSON.parse(baselineBytes);
const previous=new Map(compactEntryBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCompactEntryBase(base){
 assert.equal(base.baseCommit,COMPACT_ENTRY_BASE_COMMIT);assert.equal(base.baseTree,COMPACT_ENTRY_BASE_TREE);assert.deepEqual(base,compactEntryBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),COMPACT_ENTRY_BASE_TREE,'reconstructed complete remote Git tree');return true;
}
verifyCompactEntryBase(compactEntryBaseline);
export const compactEntryManifest=()=>JSON.parse(actual(new URL('../../docs/high-jump/COMPACT-ENTRY-MANIFEST.json',import.meta.url),'utf8'));
export function validateCompactEntryManifest(m){
 assert.equal(m.baseCommit,COMPACT_ENTRY_BASE_COMMIT);assert.equal(m.baseTree,COMPACT_ENTRY_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COMPACT_ENTRY_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...COMPACT_ENTRY_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COMPACT_ENTRY_ADDED.filter(p=>p!=='docs/high-jump/COMPACT-ENTRY-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseCompactEntry(path,bytes,m=compactEntryManifest()){
 validateCompactEntryManifest(m);assert.ok(!COMPACT_ENTRY_ADDED.includes(path),path+' is new compact-entry scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' compact-entry current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' compact-entry current Git blob');return Buffer.from(f.beforeText);
}
// A direct inner API may receive live bytes or this independently pinned parent.
export function compactEntryParentBytes(path,bytes,m=compactEntryManifest()){
 validateCompactEntryManifest(m);assert.ok(!COMPACT_ENTRY_ADDED.includes(path),path+' is new compact-entry scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=Buffer.from(f.beforeText);if(Buffer.from(bytes).equals(parent))return parent;
 return reverseCompactEntry(path,bytes,m);
}
export function readBeforeCompactEntry(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=COMPACT_ENTRY_CHANGED.includes(path)?reverseCompactEntry(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCompactEntry(paths,{manifest=compactEntryManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate compact-entry inventory');validateCompactEntryManifest(manifest);
 const additions=COMPACT_ENTRY_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Preserve the existing API for intentionally older, partial inventories.
 if(!runtimeOnly&&!paths.some(p=>COMPACT_ENTRY_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
