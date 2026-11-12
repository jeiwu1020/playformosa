// Exact reversible boundary for the authorised AI tiers and player-copy change.
// Behaviour tests import live modules; only historical inventories use this view.
import {readBeforeSprintTiers as actual,sprintTierParentBytes,inventoryBeforeSprintTiers} from './sprint-rival-tiers-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/run1500-tiers/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'95bbfda5d32b945db1910e48a10922caf31d138db425c396385507b327b90246','immutable 1500m tiers parent');
export const baseline=JSON.parse(baselineBytes);
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'182b24ad497ebf23dd8bcb9e2a8418c0137effe1');assert.equal(b.baseTree,'01557fef547cf00a15151bafb271a648fa1b6438');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){let d=tree;const p=f.path.split('/');for(const n of p.slice(0,-1))d=d[n]??={};assert.ok(!d[p.at(-1)]);d[p.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/run1500-tiers/MANIFEST.json';
let cachedText,cachedManifest;const validated=new WeakSet();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function manifest(){const text=actual(new URL('../../'+manifestPath,import.meta.url),'utf8');if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cachedManifest=parsed;}return cachedManifest;}
export function validate(m){
 if(m===cachedManifest&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cachedManifest)validated.add(m);return m;
}
export function tierParentBytes(path,bytes){
 const m=validate(manifest()),f=m.files.find(f=>f.path===path);bytes=Buffer.from(bytes);
 const before=f&&Buffer.from(f.beforeText);if(before&&bytes.equals(before))return before;
 bytes=sprintTierParentBytes(path,bytes);if(!f)return bytes;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' page policy live drift');assert.equal(sha256(bytes),f.sha256,path+' page policy SHA256 drift');return before;
}
export function readBeforeTiers(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),before=tierParentBytes(path,bytes);return encoding?before.toString(encoding):before;
}
export function inventoryBeforeTiers(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 paths=inventoryBeforeSprintTiers(paths);const priorRead=read;read=p=>sprintTierParentBytes(p,priorRead(p));
 assert.equal(new Set(paths).size,paths.length,'duplicate 1500m tiers inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 for(const p of m.addedPaths)assert.equal(paths.filter(x=>x===p).length,1,p+' missing repair evidence');
 for(const f of [...m.files,...m.addedFiles]){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' page inventory drift');assert.equal(sha256(bytes),f.sha256,f.path+' page inventory SHA256 drift');}
 return paths.filter(p=>!m.addedPaths.includes(p));
}
