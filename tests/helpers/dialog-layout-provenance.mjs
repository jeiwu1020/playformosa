// Reversible desktop-dialog and shared-scrollbar boundary. Gameplay assertions still inspect live files.
import {readBeforeDialogRepair as actual,dialogRepairParentBytes,inventoryBeforeDialogRepair,DIALOG_REPAIR_ADDED} from './dialog-layout-repair-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const DIALOG_LAYOUT_BASE_COMMIT='4e796aa66a91d1f76a56a3e112ead158ff110405';
export const DIALOG_LAYOUT_BASE_TREE='277095693ee9394fa18d209800421e21725e2ce8';
export const DIALOG_LAYOUT_CHANGED=Object.freeze(["public/games/high-jump/style.css","public/games/shared/game-ui.css","public/games/fast-hands/style.css","public/games/fast-hands/levels.css","tests/helpers/high-jump-result-preview-provenance.mjs","tests/fast-hands/art-polish-provenance.test.mjs","tests/fast-hands/result-upload-provenance.test.mjs","tests/fast-hands/split-entries-provenance.test.mjs"]);
export const DIALOG_LAYOUT_ADDED=Object.freeze(["public/games/shared/scrollbars.css","tests/game-scrollbars.test.mjs","tests/high-jump/desktop-dialog-layout.test.mjs","tests/dialog-layout-provenance.test.mjs","tests/helpers/dialog-layout-provenance.mjs","docs/dialog-layout/BASELINE.json","docs/dialog-layout/MANIFEST.json"]);
const baselineBytes=actual(new URL('../../docs/dialog-layout/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'0e1a68fa1d1a93b020b5cdb8007e3b8915f06ca483732e81ac4bb889fe9d3809','independently pinned complete dialog-layout parent');
export const dialogLayoutBaseline=JSON.parse(baselineBytes);
const previous=new Map(dialogLayoutBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyDialogLayoutBase(base){
 assert.equal(base.baseCommit,DIALOG_LAYOUT_BASE_COMMIT);assert.equal(base.baseTree,DIALOG_LAYOUT_BASE_TREE);assert.deepEqual(base,dialogLayoutBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),DIALOG_LAYOUT_BASE_TREE,'reconstructed complete remote Git tree');return true;
}
verifyDialogLayoutBase(dialogLayoutBaseline);
export const dialogLayoutManifest=()=>JSON.parse(actual(new URL('../../docs/dialog-layout/MANIFEST.json',import.meta.url),'utf8'));
export function validateDialogLayoutManifest(m){
 assert.equal(m.baseCommit,DIALOG_LAYOUT_BASE_COMMIT);assert.equal(m.baseTree,DIALOG_LAYOUT_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...DIALOG_LAYOUT_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...DIALOG_LAYOUT_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),DIALOG_LAYOUT_ADDED.filter(p=>p!=='docs/dialog-layout/MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseDialogLayout(path,bytes,m=dialogLayoutManifest()){
 validateDialogLayoutManifest(m);bytes=dialogRepairParentBytes(path,bytes);assert.ok(!DIALOG_LAYOUT_ADDED.includes(path),path+' is new dialog-layout scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' dialog-layout current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' dialog-layout current Git blob');return Buffer.from(f.beforeText);
}
// A direct inner API may receive live bytes or this independently pinned parent.
export function dialogLayoutParentBytes(path,bytes,m=dialogLayoutManifest()){
 validateDialogLayoutManifest(m);assert.ok(!DIALOG_LAYOUT_ADDED.includes(path),path+' is new dialog-layout scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return dialogRepairParentBytes(path,bytes);
 const parent=Buffer.from(f.beforeText);if(Buffer.from(bytes).equals(parent))return parent;
 return reverseDialogLayout(path,bytes,m);
}
export function readBeforeDialogLayout(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=DIALOG_LAYOUT_CHANGED.includes(path)?reverseDialogLayout(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeDialogLayout(paths,{manifest=dialogLayoutManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 // Always forward: metadata-only intermediate layers may wrap newer runtime additions.
 paths=inventoryBeforeDialogRepair(paths,{read,runtimeOnly});
 assert.equal(new Set(paths).size,paths.length,'duplicate dialog-layout inventory');validateDialogLayoutManifest(manifest);
 const additions=DIALOG_LAYOUT_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Preserve the existing API for intentionally older, partial inventories.
 if(!runtimeOnly&&!paths.some(p=>DIALOG_LAYOUT_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=dialogRepairParentBytes(f.path,read(f.path));assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
