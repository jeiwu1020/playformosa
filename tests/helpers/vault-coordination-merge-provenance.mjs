// Two independently pinned historical views of the merge. Live physics tests
// keep importing the working runtime directly; only provenance uses these views.
import {readBeforeTapCoverage as actual,inventoryBeforeTapCoverage} from './courtesy-touch-coverage-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/vault-coordination-merge/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'6dff233c0ea855dc60af197858fdf901850a4b384a3fb835afa9ef12afe09a3d');
export const baselines=JSON.parse(baselineBytes);
const expected={remote:'ce143627a8fe7d84de09b68dff4598d4f5cbf61d',candidate:'c53cefda7a46465f520ad111f1fac760887e4d93'};
export function verifyBase(b,key){
 assert.equal(b.baseCommit,expected[key]);assert.deepEqual(b,baselines[key]);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate parent path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
for(const key of Object.keys(expected))verifyBase(baselines[key],key);
const manifestPath='docs/vault-coordination-merge/MANIFEST.json';
let cachedText,cached;
export function manifest(){const text=actual(new URL('../../'+manifestPath,import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cached=JSON.parse(text);}return cached;}
export function validate(m,key){
 const b=baselines[key],v=m[key],previous=new Map(b.files.map(f=>[f.path,f.gitBlob]));
 assert.equal(v.baseCommit,b.baseCommit);assert.equal(v.baseTree,b.baseTree);
 assert.deepEqual(v.files.map(f=>f.path).sort(),b.modifiedPaths);assert.deepEqual([...v.addedPaths].sort(),b.addedPaths);
 assert.deepEqual(v.addedFiles.map(f=>f.path).sort(),b.addedPaths.filter(p=>p!==manifestPath));
 for(const f of v.files){assert.equal(typeof f.beforeText,'string');const bytes=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(bytes),f.beforeGitBlob);assert.equal(sha256(bytes),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return v;
}
export function reverse(path,bytes,key,m=manifest()){
 const v=validate(m,key);assert.ok(!v.addedPaths.includes(path),path+' did not exist in '+key);const f=v.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return Buffer.from(f.beforeText);
}
function parentBytes(path,bytes,key){const v=validate(manifest(),key),f=v.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);const before=Buffer.from(f.beforeText);return before.equals(Buffer.from(bytes))?before:reverse(path,bytes,key);}
function readView(file,options,key){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baselines[key].modifiedPaths.includes(path)?reverse(path,bytes,key):bytes;return encoding?before.toString(encoding):before;
}
export function inventory(paths,key,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 paths=inventoryBeforeTapCoverage(paths);
 assert.equal(new Set(paths).size,paths.length,'duplicate merged inventory');const v=validate(manifest(),key);
 if(!paths.some(p=>v.addedPaths.includes(p)))return paths;
 const additions=v.addedPaths.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear once');
 for(const f of v.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
export const readBeforeIntegration=(file,options)=>readView(file,options,'remote');
export const integrationParentBytes=(path,bytes)=>parentBytes(path,bytes,'remote');
export const inventoryBeforeIntegration=(paths,options)=>inventory(paths,'remote',options);
export const readCandidateView=(file,options)=>readView(file,options,'candidate');
export const candidateViewParentBytes=(path,bytes)=>parentBytes(path,bytes,'candidate');
export const inventoryCandidateView=(paths,options)=>inventory(paths,'candidate',options);
