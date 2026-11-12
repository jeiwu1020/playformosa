// Exact additive boundary for the approved SportsCounts import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/preview-sports-counts/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'9f4339e9805dcbe1c08984b87adce312f4dc2f6bf677f75919311a830626f169','immutable SportsCounts parent and admitted paths');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const baseline=freeze(JSON.parse(baselineBytes));
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'10c28bca65c841fb2a5c6c021ad818d9f9263879');assert.equal(b.baseTree,'43b4c94d3c4ece621e9d36984d46d156db90a430');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/preview-sports-counts/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
export function manifest(){const text=actual(new URL('../../'+manifestPath,import.meta.url),'utf8');if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cached=parsed;}return cached;}
export function validate(m){
 if(m===cached&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){assert.equal(typeof f.beforeText,'string');const b=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(b),f.beforeGitBlob);assert.equal(sha256(b),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cached)validated.add(m);return m;
}
export function sportsCountsParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.files.find(f=>f.path===path);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' sportsCounts live drift');assert.equal(sha256(bytes),f.sha256,path+' sportsCounts live SHA256 drift');return before;
}
export function readBeforeSportsCounts(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?sportsCountsParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeSportsCounts(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate sportsCounts inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime);
 const additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' sportsCounts addition must appear once');
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' sportsCounts inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' sportsCounts inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}
export function assertCompleteInventory(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'complete sportsCounts inventory');
 assert.deepEqual(inventoryBeforeSportsCounts(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(sportsCountsParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}
