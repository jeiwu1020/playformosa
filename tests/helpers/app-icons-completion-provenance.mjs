// Historical views reverse only this exact, independently pinned installation patch.
// Runtime and behavior tests continue to read live files directly.
import {readFileSync as actual,readdirSync as actualDirectory} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../docs/app-icons-completion/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'6c4bf0ac4a9e324c155ee166eb31ce01df74a89926f17895eb282a6fb551ac6a','immutable icon parent inventory');
export const baseline=JSON.parse(baselineBytes);
const previous=new Map(baseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyBase(b){
 assert.equal(b.baseCommit,'8c5e3aa0b231ae0058e9927df4ee25e7ebfecaa9');assert.equal(b.baseTree,'6217911c312bb9dec761c86581df1a871a1122c3');assert.deepEqual(b,baseline);
 const tree={};for(const f of b.files){let d=tree;const p=f.path.split('/');for(const n of p.slice(0,-1))d=d[n]??={};assert.ok(!d[p.at(-1)],'duplicate parent path');d[p.at(-1)]={file:f};}
 function digest(d){const entries=Object.entries(d).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const bytes=Buffer.concat(entries.map(([n,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${n}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${bytes.length}\0`).update(bytes).digest('hex');}
 assert.equal(digest(tree),b.baseTree);return true;
}
verifyBase(baseline);
const manifestPath='docs/app-icons-completion/MANIFEST.json';
export function manifest(){return JSON.parse(actual(new URL('../../'+manifestPath,import.meta.url),'utf8'));}
export function validate(m){
 assert.equal(m.baseCommit,baseline.baseCommit);assert.equal(m.baseTree,baseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!==manifestPath));
 assert.deepEqual(m.addedPublicPaths,baseline.addedPaths.filter(p=>p.startsWith('public/')).map(p=>p.slice(7)));
 for(const f of m.files){assert.equal(typeof f.beforeText,'string');const bytes=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path));assert.equal(gitBlob(bytes),f.beforeGitBlob);assert.equal(sha256(bytes),f.beforeSha256);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);
  if(f.path.startsWith('public/')){assert.equal(f.kind,'head-metadata');assert.equal(f.beforeText.split('</head>').length,2);assert.equal(sha256(Buffer.from(f.beforeText.split('</head>')[1])),f.bodySha256);assert.equal(typeof f.block,'string');assert.ok(f.block.startsWith('<!-- app-icons-completion:start -->\n'));assert.ok(f.block.endsWith('<!-- app-icons-completion:end -->\n'));assert.doesNotMatch(f.beforeText,/app-icons-completion:/);}
 }
 for(const f of m.addedFiles){assert.match(f.gitBlob,/^[a-f0-9]{40}$/);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
 return m;
}
export function iconsParentBytes(path,bytes,m=manifest()){
 validate(m);bytes=Buffer.from(bytes);const f=m.files.find(f=>f.path===path);if(!f)return bytes;
 // Accept an already reconstructed parent only when its bytes match the pin.
 const before=Buffer.from(f.beforeText);if(bytes.equals(before))return before;
 assert.equal(gitBlob(bytes),f.gitBlob,path+' icon live drift');assert.equal(sha256(bytes),f.sha256,path+' icon live SHA256 drift');
 if(f.kind==='head-metadata'){
  const text=bytes.toString();assert.equal(text.split(f.block).length,2,'exactly one icon block');assert.ok(text.includes(f.block+'</head>'),'icon block immediately before head close');
  const reversed=Buffer.from(text.replace(f.block,''));assert.ok(reversed.equals(before),path+' metadata-only boundary');return reversed;
 }
 return before;
}
export function readBeforeIcons(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=baseline.modifiedPaths.includes(path)?iconsParentBytes(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeIcons(paths,{read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate icon inventory');const m=validate(manifest());
 if(!paths.some(p=>m.addedPaths.includes(p)))return paths;
 // Older runtime inventory callers omit runtimeOnly at intervening boundaries.
 const runtime=p=>/^(public|worker|src|config)\//.test(p);
 const onlyRuntime=runtimeOnly||paths.every(runtime),additions=m.addedPaths.filter(p=>!onlyRuntime||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' icon addition must appear once');
 for(const f of [...m.files,...m.addedFiles].filter(f=>!onlyRuntime||runtime(f.path))){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' icon inventory live drift');assert.equal(sha256(bytes),f.sha256,f.path+' icon inventory SHA256 drift');}
 return paths.filter(p=>!additions.includes(p));
}

// Only old Fast Hands directory-inventory assertions use this narrow view.
// Unknown files remain visible; each excluded manifest must exist and match its pin.
export function entriesBeforeIcons(directory,entries,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 const absolute=directory instanceof URL?fileURLToPath(directory):resolve(String(directory));
 const path=relative(root,absolute).split(sep).join('/');
 if(path==='public/assets/app-icons'){
  const m=validate(manifest()),names=entries.map(e=>typeof e==='string'?e:Buffer.isBuffer(e)?e.toString():e.name);
  const addedDirectories=['courtesy-contest','fast-hands','fast-hands-catch','fast-hands-duel'];
  assert.equal(new Set(names).size,names.length,'duplicate icon directory');
  for(const dir of addedDirectories){
   assert.equal(names.filter(n=>n===dir).length,1,dir+' reviewed icon directory must exist');
   const prefix=path+'/'+dir+'/',files=m.addedFiles.filter(f=>f.path.startsWith(prefix));
   assert.equal(files.length,6);assert.ok(!baseline.files.some(f=>f.path.startsWith(prefix)),'only newly added directories may be excluded');
   assert.deepEqual(actualDirectory(new URL('../../'+prefix,import.meta.url)).sort(),files.map(f=>f.path.slice(prefix.length)).sort(),'exact reviewed icon directory contents');
   for(const f of files){const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' icon directory drift');assert.equal(sha256(bytes),f.sha256,f.path+' icon directory SHA256 drift');}
  }
  return entries.filter((e,i)=>!addedDirectories.includes(names[i]));
 }
 if(path!=='public/games/fast-hands')return entries;
 const m=validate(manifest()),additions=m.addedFiles.filter(f=>f.path.startsWith(path+'/')&&!f.path.slice(path.length+1).includes('/'));
 assert.deepEqual(additions.map(f=>f.path.slice(path.length+1)).sort(),['catch.webmanifest','duel.webmanifest','manifest.webmanifest']);
 const names=entries.map(e=>typeof e==='string'?e:Buffer.isBuffer(e)?e.toString():e.name);
 assert.equal(new Set(names).size,names.length,'duplicate historical directory entry');
 for(const f of additions){const name=f.path.slice(path.length+1);assert.equal(names.filter(n=>n===name).length,1,name+' manifest must exist before historical exclusion');const bytes=read(f.path);assert.equal(gitBlob(bytes),f.gitBlob,f.path+' manifest drift');assert.equal(sha256(bytes),f.sha256,f.path+' manifest SHA256 drift');}
 return entries.filter((e,i)=>!additions.some(f=>f.path===path+'/'+names[i]));
}
export function readdirBeforeIcons(directory,options){return entriesBeforeIcons(directory,actualDirectory(directory,options));}
