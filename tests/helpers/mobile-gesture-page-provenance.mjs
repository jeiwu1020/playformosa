// Exact reversible boundary for the authorised game-page gesture/focus repair.
// Behaviour tests import live modules; only historical inventories use this view.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/mobile-gesture-page/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'7f88ac01fbd911616802dcdbe6221ef354498b08c0fc6e7cfedc7669e5519b79','immutable gesture repair parent');
export const baseline=JSON.parse(baselineBytes);
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'3e499fc21c4e71e655cebe669dcd4204ab6720c9');assert.equal(b.baseTree,'1c6125d9694de06267b095fb3411a2dab32ef127');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){let d=tree;const p=f.path.split('/');for(const n of p.slice(0,-1))d=d[n]??={};assert.ok(!d[p.at(-1)]);d[p.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/mobile-gesture-page/MANIFEST.json';
export function manifest(){return JSON.parse(actual(new URL('../../'+manifestPath,import.meta.url),'utf8'));}
export function validate(m){
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 return m;
}
export function pageParentBytes(path,bytes){
 const m=validate(manifest()),f=m.files.find(f=>f.path===path);bytes=Buffer.from(bytes);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(bytes.equals(before))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' page policy live drift');assert.equal(sha256(bytes),f.sha256,path+' page policy SHA256 drift');return before;
}
export function readBeforePage(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),before=pageParentBytes(path,bytes);return encoding?before.toString(encoding):before;
}
export function inventoryBeforePage(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate gesture repair inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 for(const p of m.addedPaths)assert.equal(paths.filter(x=>x===p).length,1,p+' missing repair evidence');
 for(const f of [...m.files,...m.addedFiles]){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' page inventory drift');assert.equal(sha256(bytes),f.sha256,f.path+' page inventory SHA256 drift');}
 return paths.filter(p=>!m.addedPaths.includes(p));
}
