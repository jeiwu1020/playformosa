import {withProvenanceSession,manifestText} from './provenance-session.mjs';
// Exact additive boundary for the approved PinballBeautifyArt import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/pinball-beautify-art/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'5120f13353ef5c2a339804f5d5af5eb98320bba909533c66803212b1b4232334','immutable PinballBeautifyArt parent and admitted paths');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const baseline=freeze(JSON.parse(baselineBytes));
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'9de51082a80144d2fe926805291c0cca7d2c7110');assert.equal(b.baseTree,'1b4f9c0cbba37293f44270fe141c09e02cd1684b');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/pinball-beautify-art/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
function uncached_manifest(){const url=new URL('../../'+manifestPath,import.meta.url),text=manifestText(url,()=>actual(url,'utf8'));if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cached=parsed;}return cached;}
function preimage(f){
 if(f.path==='public/assets/portal-taiwanpunchline.png'){
  assert.equal(f.beforeAsset,'docs/pinball-beautify-art/preimages/portal-taiwanpunchline.png','exact binary preimage path');
  assert.equal(Object.hasOwn(f,'beforeText'),false,'binary preimage cannot supply text');
  const bytes=actual(new URL('../../'+f.beforeAsset,import.meta.url));
  assert.equal(gitBlob(bytes),previous.get(f.path),'binary preimage immutable parent');
  assert.equal(sha256(bytes),f.beforeSha256,'binary preimage SHA');
  return bytes;
 }
 assert.equal(Object.hasOwn(f,'beforeAsset'),false,'only the exact PNG has a raw preimage');
 assert.equal(typeof f.beforeText,'string');return Buffer.from(f.beforeText);
}

export function validate(m){
 if(m===cached&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){const b=preimage(f);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(b),f.beforeGitBlob);assert.equal(sha256(b),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cached)validated.add(m);return m;
}
function uncached_pinballBeautifyArtParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.files.find(f=>f.path===path);if(!f)return bytes;
 const before=preimage(f);if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' pinballBeautifyArt live drift');assert.equal(sha256(bytes),f.sha256,path+' pinballBeautifyArt live SHA256 drift');return before;
}
function uncached_readBeforePinballBeautifyArt(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?pinballBeautifyArtParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
function uncached_inventoryBeforePinballBeautifyArt(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate pinballBeautifyArt inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime);
 const additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' pinballBeautifyArt addition must appear once');
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' pinballBeautifyArt inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' pinballBeautifyArt inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}
function uncached_assertCompleteInventory(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'complete pinballBeautifyArt inventory');
 assert.deepEqual(inventoryBeforePinballBeautifyArt(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(pinballBeautifyArtParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}

export const manifest=(...args)=>withProvenanceSession(()=>uncached_manifest(...args));
export const pinballBeautifyArtParentBytes=(...args)=>withProvenanceSession(()=>uncached_pinballBeautifyArtParentBytes(...args));
export const readBeforePinballBeautifyArt=(...args)=>withProvenanceSession(()=>uncached_readBeforePinballBeautifyArt(...args));
export const inventoryBeforePinballBeautifyArt=(...args)=>withProvenanceSession(()=>uncached_inventoryBeforePinballBeautifyArt(...args));
export const assertCompleteInventory=(...args)=>withProvenanceSession(()=>uncached_assertCompleteInventory(...args));
