// Reversible result-photo/help boundary. Gameplay assertions still inspect live files.
import {readBeforeDialogLayout as actual,dialogLayoutParentBytes,inventoryBeforeDialogLayout,DIALOG_LAYOUT_ADDED} from './dialog-layout-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const RESULT_PREVIEW_BASE_COMMIT='3162d74a6b53b160954a62e0fffca6d24597250a';
export const RESULT_PREVIEW_BASE_TREE='4680e8a94f415cfbae68bc9e494263ecd4e7f9aa';
export const RESULT_PREVIEW_CHANGED=Object.freeze(['public/games/high-jump/game.mjs','public/games/high-jump/share.mjs','public/games/high-jump/style.css','tests/helpers/high-jump-coordination-provenance.mjs','tests/helpers/runner-integration-provenance.mjs','tests/fast-hands/art-polish-provenance.test.mjs','tests/fast-hands/result-upload-provenance.test.mjs','tests/fast-hands/split-entries-provenance.test.mjs']);
export const RESULT_PREVIEW_ADDED=Object.freeze(['docs/high-jump/RESULT-PREVIEW-BASELINE.json','docs/high-jump/RESULT-PREVIEW-MANIFEST.json','tests/helpers/high-jump-result-preview-provenance.mjs','tests/high-jump/result-preview-provenance.test.mjs','tests/high-jump/approach-instructions.test.mjs','tests/high-jump/result-photo-consistency.test.mjs']);
const baselineBytes=actual(new URL('../../docs/high-jump/RESULT-PREVIEW-BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'b394f3b175fb217963bc57dfba8530f0547b2b7effb3bfa649f9b8e866f79a9c','independently pinned complete result-preview parent');
export const resultPreviewBaseline=JSON.parse(baselineBytes);
const previous=new Map(resultPreviewBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyResultPreviewBase(base){
 assert.equal(base.baseCommit,RESULT_PREVIEW_BASE_COMMIT);assert.equal(base.baseTree,RESULT_PREVIEW_BASE_TREE);assert.deepEqual(base,resultPreviewBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),RESULT_PREVIEW_BASE_TREE,'reconstructed complete remote Git tree');return true;
}
verifyResultPreviewBase(resultPreviewBaseline);
export const resultPreviewManifest=()=>JSON.parse(actual(new URL('../../docs/high-jump/RESULT-PREVIEW-MANIFEST.json',import.meta.url),'utf8'));
export function validateResultPreviewManifest(m){
 assert.equal(m.baseCommit,RESULT_PREVIEW_BASE_COMMIT);assert.equal(m.baseTree,RESULT_PREVIEW_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...RESULT_PREVIEW_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...RESULT_PREVIEW_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),RESULT_PREVIEW_ADDED.filter(p=>p!=='docs/high-jump/RESULT-PREVIEW-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseResultPreview(path,bytes,m=resultPreviewManifest()){
 validateResultPreviewManifest(m);bytes=dialogLayoutParentBytes(path,bytes);assert.ok(!RESULT_PREVIEW_ADDED.includes(path),path+' is new result-preview scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' result-preview current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' result-preview current Git blob');return Buffer.from(f.beforeText);
}
// A direct inner API may receive live bytes or this independently pinned parent.
export function resultPreviewParentBytes(path,bytes,m=resultPreviewManifest()){
 validateResultPreviewManifest(m);assert.ok(!RESULT_PREVIEW_ADDED.includes(path),path+' is new result-preview scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return dialogLayoutParentBytes(path,bytes);
 const parent=Buffer.from(f.beforeText);if(Buffer.from(bytes).equals(parent))return parent;
 return reverseResultPreview(path,bytes,m);
}
export function readBeforeResultPreview(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=RESULT_PREVIEW_CHANGED.includes(path)?reverseResultPreview(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeResultPreview(paths,{manifest=resultPreviewManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 // Older runtime-only inventories intentionally predate the new scrollbar.
 // The direct outer boundary remains strict; current full inventories include its additions.
 if(paths.some(path=>DIALOG_LAYOUT_ADDED.includes(path)))paths=inventoryBeforeDialogLayout(paths,{read,runtimeOnly});
 assert.equal(new Set(paths).size,paths.length,'duplicate result-preview inventory');validateResultPreviewManifest(manifest);
 const additions=RESULT_PREVIEW_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Preserve the existing API for intentionally older, partial inventories.
 if(!runtimeOnly&&!paths.some(p=>RESULT_PREVIEW_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=dialogLayoutParentBytes(f.path,read(f.path));assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
