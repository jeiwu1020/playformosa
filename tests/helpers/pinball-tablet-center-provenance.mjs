import {readFileSync as currentRead} from 'node:fs';
import {withProvenanceSession,manifestText} from './provenance-session.mjs';
// Exact additive boundary for the approved PinballTabletCenter import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readBeforePunchlineMainPortal as actual,punchlineMainPortalParentBytes,inventoryBeforePunchlineMainPortal,readdirBeforePunchlineMainPortal as actualDirectory} from './punchline-main-portal-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/pinball-tablet-center/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'4fd01a6e6f55d279819e4c92178a4e805d88980bb70257497457657b13414509','immutable PinballTabletCenter parent and admitted paths');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const baseline=freeze(JSON.parse(baselineBytes));
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'b844506164e8fd6cb3d31b7154b57a7e72e2612f');assert.equal(b.baseTree,'1cae7c1817fdf9d05ed4ae4b3b97ee1b5cba4a61');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/pinball-tablet-center/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
function uncached_manifest(){const url=new URL('../../'+manifestPath,import.meta.url),text=manifestText(url,()=>actual(url,'utf8'));if(text!==cachedText){const parsed=freeze(JSON.parse(text));cachedText=text;cached=parsed;}return cached;}

export function validate(m){
 if(m===cached&&validated.has(m))return m;
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 for(const f of m.files){const b=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(b),f.beforeGitBlob);assert.equal(sha256(b),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 if(m===cached)validated.add(m);return m;
}
function uncached_pinballTabletCenterParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.files.find(f=>f.path===path),before=f?Buffer.from(f.beforeText):null;
 if(before?.equals(bytes))return before;
 bytes=punchlineMainPortalParentBytes(path,bytes);if(!f)return bytes;
 if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' pinballTabletCenter live drift');assert.equal(sha256(bytes),f.sha256,path+' pinballTabletCenter live SHA256 drift');return before;
}
function uncached_readBeforePinballTabletCenter(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?pinballTabletCenterParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
function uncached_inventoryBeforePinballTabletCenter(paths,{read=p=>currentRead(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 paths=inventoryBeforePunchlineMainPortal(paths,{read,runtimeOnly});
 const liveRead=read;read=p=>punchlineMainPortalParentBytes(p,liveRead(p));
 assert.equal(new Set(paths).size,paths.length,'duplicate pinballTabletCenter inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime);
 const additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' pinballTabletCenter addition must appear once');
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' pinballTabletCenter inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' pinballTabletCenter inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}
function uncached_assertCompleteInventory(paths,{read=p=>currentRead(new URL('../../'+p,import.meta.url))}={}){
 paths=inventoryBeforePunchlineMainPortal(paths,{read});
 const liveRead=read;read=p=>punchlineMainPortalParentBytes(p,liveRead(p));
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'complete pinballTabletCenter inventory');
 assert.deepEqual(inventoryBeforePinballTabletCenter(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(pinballTabletCenterParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}

export const manifest=(...args)=>withProvenanceSession(()=>uncached_manifest(...args));
export const pinballTabletCenterParentBytes=(...args)=>withProvenanceSession(()=>uncached_pinballTabletCenterParentBytes(...args));
export const readBeforePinballTabletCenter=(...args)=>withProvenanceSession(()=>uncached_readBeforePinballTabletCenter(...args));
export const inventoryBeforePinballTabletCenter=(...args)=>withProvenanceSession(()=>uncached_inventoryBeforePinballTabletCenter(...args));
export const assertCompleteInventory=(...args)=>withProvenanceSession(()=>uncached_assertCompleteInventory(...args));

// Existing directories stay visible; unknown descendants are never filtered out.
export function entriesBeforePinballTabletCenter(directory,entries,{read=p=>currentRead(new URL('../../'+p,import.meta.url)),list=p=>actualDirectory(new URL('../../'+p+'/',import.meta.url),{withFileTypes:true})}={}){
 const absolute=directory instanceof URL?fileURLToPath(directory):resolve(String(directory)),path=relative(root,absolute).split(sep).join('/');
 if(path!=='public'&&!path.startsWith('public/'))return entries;
 const m=validate(manifest()),prefix=path+'/',name=e=>typeof e==='string'?e:Buffer.isBuffer(e)?e.toString():e.name,names=entries.map(name);
 assert.equal(new Set(names).size,names.length,'duplicate pinballTabletCenter directory entry');
 const additions=m.addedFiles.filter(f=>f.path.startsWith(prefix)),omit=new Set();
 function verify(f){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' pinballTabletCenter directory drift');assert.equal(sha256(bytes),f.sha256,f.path+' pinballTabletCenter directory SHA256 drift');}
 for(const child of new Set(additions.map(f=>f.path.slice(prefix.length).split('/')[0]))){
  const target=prefix+child,existing=baseline.files.some(f=>f.path===target||f.path.startsWith(target+'/'));
  if(existing)continue;
  assert.equal(names.filter(n=>n===child).length,1,target+' pinballTabletCenter directory addition must exist');
  const files=additions.filter(f=>f.path===target||f.path.startsWith(target+'/'));
  if(files.some(f=>f.path===target)){assert.equal(files.length,1);verify(files[0]);}
  else{const found=[];function walk(p){for(const e of list(p)){const q=p+'/'+e.name;if(e.isDirectory())walk(q);else{assert.ok(e.isFile(),q+' regular pinballTabletCenter file');found.push(q);}}}walk(target);assert.deepEqual(found.sort(),files.map(f=>f.path).sort(),target+' exact pinballTabletCenter subtree');files.forEach(verify);}
  omit.add(child);
 }
 return entries.filter(e=>!omit.has(name(e)));
}
export function readdirBeforePinballTabletCenter(directory,options){return entriesBeforePinballTabletCenter(directory,actualDirectory(directory,options));}
