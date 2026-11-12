// Exact additive boundary for the approved Homepage import. Live behavior tests
// continue reading node:fs and runtime modules, never this historical view.
import {readFileSync as actual,readdirSync as actualDirectory} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/homepage/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'1149e3c7501dfc9b9bc97fbe706498ca1722ed8c6f7f45008d89433723a821e0','immutable Homepage parent and admitted paths');
export const baseline=JSON.parse(baselineBytes);
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'31a85a3a930e16b796b4b67f0177b7c094d20387');assert.equal(b.baseTree,'e797dcf6d583528c6b5c8f5267967545e9b98633');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){const parts=f.path.split('/');let d=tree;for(const name of parts.slice(0,-1))d=d[name]??={};assert.ok(!d[parts.at(-1)],'duplicate parent path');d[parts.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/homepage/MANIFEST.json';
let cachedText,cached;const validated=new WeakSet();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
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
export function homepageParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.files.find(f=>f.path===path);if(!f)return bytes;
 const before=Buffer.from(f.beforeText);if(before.equals(bytes))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' homepage live drift');assert.equal(sha256(bytes),f.sha256,path+' homepage live SHA256 drift');return before;
}
export function readBeforeHomepage(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?homepageParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeHomepage(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate homepage inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 const runtime=p=>/^(public|worker|src|config)\//.test(p),onlyRuntime=runtimeOnly||paths.every(runtime);
 const additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' homepage addition must appear once');
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' homepage inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' homepage inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}
export function assertCompleteInventory(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.deepEqual([...paths].sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'complete homepage inventory');
 assert.deepEqual(inventoryBeforeHomepage(paths,{read}).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(gitBlob(homepageParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' exact immutable parent');
 return true;
}

// Directory-only historical callers must prove every omitted runtime byte.
// Existing directories stay visible; unknown descendants are never filtered out.
export function entriesBeforeHomepage(directory,entries,{read=p=>actual(new URL('../../'+p,import.meta.url)),list=p=>actualDirectory(new URL('../../'+p+'/',import.meta.url),{withFileTypes:true})}={}){
 const absolute=directory instanceof URL?fileURLToPath(directory):resolve(String(directory)),path=relative(root,absolute).split(sep).join('/');
 if(path!=='public'&&!path.startsWith('public/'))return entries;
 const m=validate(manifest()),prefix=path+'/',name=e=>typeof e==='string'?e:Buffer.isBuffer(e)?e.toString():e.name,names=entries.map(name);
 assert.equal(new Set(names).size,names.length,'duplicate homepage directory entry');
 const additions=m.addedFiles.filter(f=>f.path.startsWith(prefix)),omit=new Set();
 function verify(f){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' homepage directory drift');assert.equal(sha256(bytes),f.sha256,f.path+' homepage directory SHA256 drift');}
 for(const child of new Set(additions.map(f=>f.path.slice(prefix.length).split('/')[0]))){
  const target=prefix+child,existing=baseline.files.some(f=>f.path===target||f.path.startsWith(target+'/'));
  if(existing)continue;
  assert.equal(names.filter(n=>n===child).length,1,target+' homepage directory addition must exist');
  const files=additions.filter(f=>f.path===target||f.path.startsWith(target+'/'));
  if(files.some(f=>f.path===target)){assert.equal(files.length,1);verify(files[0]);}
  else{const found=[];function walk(p){for(const e of list(p)){const q=p+'/'+e.name;if(e.isDirectory())walk(q);else{assert.ok(e.isFile(),q+' regular homepage file');found.push(q);}}}walk(target);assert.deepEqual(found.sort(),files.map(f=>f.path).sort(),target+' exact homepage subtree');files.forEach(verify);}
  omit.add(child);
 }
 return entries.filter(e=>!omit.has(name(e)));
}
export function readdirBeforeHomepage(directory,options){return entriesBeforeHomepage(directory,actualDirectory(directory,options));}
