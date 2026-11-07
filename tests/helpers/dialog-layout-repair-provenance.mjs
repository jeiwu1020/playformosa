// Reversible historical-reader repair boundary. Gameplay assertions still inspect live files.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const DIALOG_REPAIR_BASE_COMMIT='685b56eb89bb53a7bc595d73b9c183f63a599acf';
export const DIALOG_REPAIR_BASE_TREE='48741c22f988c346f4b07fe1b7e3401f827bbc61';
export const DIALOG_REPAIR_CHANGED=Object.freeze(["tests/fast-hands/layout-dart-provenance.test.mjs","tests/helpers/dialog-layout-provenance.mjs","tests/fast-hands/art-polish-provenance.test.mjs","tests/fast-hands/result-upload-provenance.test.mjs","tests/fast-hands/split-entries-provenance.test.mjs"]);
export const DIALOG_REPAIR_ADDED=Object.freeze(["docs/dialog-layout/REPAIR-BASELINE.json","docs/dialog-layout/REPAIR-MANIFEST.json","tests/helpers/dialog-layout-repair-provenance.mjs","tests/dialog-layout-repair-provenance.test.mjs"]);
const baselineBytes=actual(new URL('../../docs/dialog-layout/REPAIR-BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'2fc868a48ec62eeebad0834e67b765912e3766c4afac7b06a95f5fd2378130e0','independently pinned complete dialog-layout-repair parent');
export const dialogRepairBaseline=JSON.parse(baselineBytes);
const previous=new Map(dialogRepairBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyDialogRepairBase(base){
 assert.equal(base.baseCommit,DIALOG_REPAIR_BASE_COMMIT);assert.equal(base.baseTree,DIALOG_REPAIR_BASE_TREE);assert.deepEqual(base,dialogRepairBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),DIALOG_REPAIR_BASE_TREE,'reconstructed complete remote Git tree');return true;
}
verifyDialogRepairBase(dialogRepairBaseline);
export const dialogRepairManifest=()=>JSON.parse(actual(new URL('../../docs/dialog-layout/REPAIR-MANIFEST.json',import.meta.url),'utf8'));
export function validateDialogRepairManifest(m){
 assert.equal(m.baseCommit,DIALOG_REPAIR_BASE_COMMIT);assert.equal(m.baseTree,DIALOG_REPAIR_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...DIALOG_REPAIR_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...DIALOG_REPAIR_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),DIALOG_REPAIR_ADDED.filter(p=>p!=='docs/dialog-layout/REPAIR-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseDialogRepair(path,bytes,m=dialogRepairManifest()){
 validateDialogRepairManifest(m);assert.ok(!DIALOG_REPAIR_ADDED.includes(path),path+' is new dialog-layout-repair scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' dialog-layout-repair current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' dialog-layout-repair current Git blob');return Buffer.from(f.beforeText);
}
// A direct inner API may receive live bytes or this independently pinned parent.
export function dialogRepairParentBytes(path,bytes,m=dialogRepairManifest()){
 validateDialogRepairManifest(m);assert.ok(!DIALOG_REPAIR_ADDED.includes(path),path+' is new dialog-layout-repair scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=Buffer.from(f.beforeText);if(Buffer.from(bytes).equals(parent))return parent;
 return reverseDialogRepair(path,bytes,m);
}
export function readBeforeDialogRepair(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=DIALOG_REPAIR_CHANGED.includes(path)?reverseDialogRepair(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeDialogRepair(paths,{manifest=dialogRepairManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate dialog-layout-repair inventory');validateDialogRepairManifest(manifest);
 const additions=DIALOG_REPAIR_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Preserve the existing API for intentionally older, partial inventories.
 if(!runtimeOnly&&!paths.some(p=>DIALOG_REPAIR_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
