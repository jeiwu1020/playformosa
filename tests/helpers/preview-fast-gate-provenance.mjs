import {withProvenanceSession,manifestText} from './provenance-session.mjs';
import {readFileSync as currentRead} from 'node:fs';
// Exact additive boundary for the approved PreviewFastGate import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readBeforeShadowRelease as actual,shadowReleaseParentBytes,inventoryBeforeShadowRelease} from './shadow-release-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/preview-fast-gate/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'dba8697154851aca8e9be4b8bfb3aaa12da7638208cb3fafeb8299ba254b8a88','immutable PreviewFastGate parent and admitted paths');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const baseline=freeze(JSON.parse(baselineBytes));
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
const currentSyncParents=new Map([
 ['public/games/overtime-pinball/arcade-polish.css',{gitBlob:'cf10941b479f586e070ae7c9c52d0cdc2f66741c',sha256:'857d2b5b7d84510da67972b9f77e6b8fefc547a198273e4cc738ab59ff9fed0c'}],
 ['public/games/overtime-pinball/physics.js',{gitBlob:'0a4c832ee0665bfcff25b18fe418b15483040d02',sha256:'e1c45fbf19f1ff77194c00495f26ad3cb8172cc309ca9526d72838f75e9d57ad'}],
 ['public/games/overtime-pinball/main.js',{gitBlob:'0487f5497112261760ab379bf1f1ea97804a8a84',sha256:'192bd90f0001a2017a129295a47458b6a25570afc896b238051361ef3b027515'}],
 ['public/games/overtime-pinball/mobile-ui.css',{gitBlob:'9aa809cb08b28f3b7763ae317d779c9bf5d05fe3',sha256:'6182d45ecec8f77831b78078f74a3cb6ceea0ba102c0e6c927b177d8d4aeedb1'}],
 ['public/games/overtime-pinball/mobile-ui.js',{gitBlob:'a18a3306d10d4b28b6276ed4eccc297478cb460c',sha256:'0289b5f0a76d0316eb59961e63e061609737fa7e2956bea35df4dd911b5828a2'}],
 ['public/games/overtime-pinball/touch-policy.js',{gitBlob:'8f81e3ecda2d05b1d26113b193129b77c230d4c0',sha256:'8a4234caa052beb3087dd3873201d87d225b47e15ce6d0bf8a48ec47a7f55324'}],
 ['public/games/overtime-pinball/viewport-shell.js',{gitBlob:'1305daa5032db077c1d25854ed94289078e97434',sha256:'156524d790d012597bf6dfb30618567bb340be23474073edc175d76e3ab576af'}],
 ['tests/pinball/proportions.test.mjs',{gitBlob:'cb636494775c2b446a36e2bc60c073f466ff72cf',sha256:'cdbed05da4b0aef6906638530a0793dfc82414ab968e1f3582553418dc0e458c'}]
]);
export function verifyBase(b){
 assert.equal(b.baseCommit,'a5ee5ccc8eb7e8db7a866e461dec969272802f8a');assert.equal(b.baseTree,'39f3e0cdf95d11e8dbf0e39763ed607b6b086f44');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/preview-fast-gate/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
function uncached_manifest(){const url=new URL('../../'+manifestPath,import.meta.url),text=manifestText(url,()=>actual(url,'utf8'));if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cached=parsed;}return cached;}
export function validate(m){
 if(m===cached&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 assert.deepEqual(m.releaseFiles.map(f=>f.path).sort(),[...currentSyncParents.keys()].sort());
 assert.deepEqual(m.releaseAddedFiles.map(f=>f.path),['public/games/overtime-pinball/tablet-cue-projection.js']);
 for(const f of m.releaseFiles){const before=Buffer.from(f.beforeText),parent=currentSyncParents.get(f.path);assert.equal(f.beforeGitBlob,parent.gitBlob,f.path+' immediate preview sync parent blob');assert.equal(f.beforeSha256,parent.sha256,f.path+' immediate preview sync parent SHA256');assert.equal(gitBlob(before),f.beforeGitBlob,f.path+' immediate preview sync parent bytes');assert.equal(sha256(before),f.beforeSha256,f.path+' immediate preview sync parent bytes SHA256');assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.releaseAddedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.files){assert.equal(typeof f.beforeText,'string');const b=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(b),f.beforeGitBlob);assert.equal(sha256(b),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cached)validated.add(m);return m;
}
function uncached_previewFastGateReleaseParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.releaseFiles.find(f=>f.path===path);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(before.equals(bytes)||gitBlob(bytes)===previous.get(path))return bytes;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' current preview sync live drift');assert.equal(sha256(bytes),f.sha256,path+' current preview sync live SHA256 drift');return before;
}
function uncached_previewFastGateParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=uncached_previewFastGateReleaseParentBytes(path,bytes,m);const f=m.files.find(f=>f.path===path),before=f?Buffer.from(f.beforeText):null;
 if(before?.equals(bytes))return before;
 bytes=shadowReleaseParentBytes(path,bytes);if(!f)return bytes;
 if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' previewFastGate live drift');assert.equal(sha256(bytes),f.sha256,path+' previewFastGate live SHA256 drift');return before;
}
function uncached_readBeforePreviewFastGate(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)||manifest().releaseFiles.some(f=>f.path===path)?previewFastGateParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
function uncached_inventoryBeforePreviewFastGate(paths,{read=p=>currentRead(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate previewFastGate inventory');const m=validate(manifest());
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime),liveRead=read,releaseAdded=new Set(m.releaseAddedFiles.map(f=>f.path));
 for(const f of m.releaseFiles.filter(f=>!onlyRuntime||runtime(f.path))){const bytes=liveRead(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' current preview sync inventory drift');assert.equal(sha256(bytes),f.sha256,f.path+' current preview sync inventory SHA256 drift');}
 for(const f of m.releaseAddedFiles.filter(f=>!onlyRuntime||runtime(f.path))){const bytes=liveRead(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' current preview sync addition drift');assert.equal(sha256(bytes),f.sha256,f.path+' current preview sync addition SHA256 drift');}
 const additions=[...m.addedPaths,...m.releaseAddedFiles.map(f=>f.path)].filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' previewFastGate addition must appear once');
 const syncedRead=p=>uncached_previewFastGateReleaseParentBytes(p,liveRead(p),m);
 paths=inventoryBeforeShadowRelease(paths.filter(p=>!releaseAdded.has(p)),{read:syncedRead,runtimeOnly});
 const restoredRead=p=>shadowReleaseParentBytes(p,syncedRead(p));
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=restoredRead(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' previewFastGate inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' previewFastGate inventory SHA256 drift');}
 return paths.filter(p=>!m.addedPaths.includes(p));
}
function uncached_assertCompleteInventory(paths,{read=p=>currentRead(new URL('../../'+p,import.meta.url))}={}){
 const m=validate(manifest()),currentAdditions=m.releaseAddedFiles.map(f=>f.path);
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths,...currentAdditions].sort(),'complete current previewFastGate inventory');
 assert.deepEqual(inventoryBeforePreviewFastGate(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(previewFastGateParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}

export const manifest=(...args)=>withProvenanceSession(()=>uncached_manifest(...args));
export const previewFastGateReleaseParentBytes=(...args)=>withProvenanceSession(()=>uncached_previewFastGateReleaseParentBytes(...args));
export const previewFastGateParentBytes=(...args)=>withProvenanceSession(()=>uncached_previewFastGateParentBytes(...args));
export const readBeforePreviewFastGate=(...args)=>withProvenanceSession(()=>uncached_readBeforePreviewFastGate(...args));
export const inventoryBeforePreviewFastGate=(...args)=>withProvenanceSession(()=>uncached_inventoryBeforePreviewFastGate(...args));
export const assertCompleteInventory=(...args)=>withProvenanceSession(()=>uncached_assertCompleteInventory(...args));
