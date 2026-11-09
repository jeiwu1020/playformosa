// Reconstruct the exact published parent before historical provenance checks.
// Live behavior tests read node:fs directly, never this historical view.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/main-courtesy-help/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'30fde790eb5624cd8b47422e2a1314239a681a4e3cee76f60f4f993389123136');
export const baseline=JSON.parse(baselineBytes);
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'4be21f0991bf8ae3b6cbf325dc7a7c5b536e18ad');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/main-courtesy-help/MANIFEST.json';
let cachedText,cached;
export function manifest(){const text=actual(new URL('../../'+manifestPath,import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cached=JSON.parse(text);}return cached;}
export function validate(m){
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){assert.equal(typeof f.beforeText,'string');const bytes=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(bytes),f.beforeGitBlob);assert.equal(sha256(bytes),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseMainCourtesy(path,bytes,m=manifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new main-courtesy-help scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return Buffer.from(f.beforeText);
}
export function mainCourtesyParentBytes(path,bytes,m=manifest()){
 validate(m);const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const before=Buffer.from(f.beforeText);return before.equals(Buffer.from(bytes))?before:reverseMainCourtesy(path,bytes,m);
}
export function readBeforeMainCourtesy(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?reverseMainCourtesy(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeMainCourtesy(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate main-courtesy-help inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const additions=m.addedPaths.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear once');
 for(const f of m.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
