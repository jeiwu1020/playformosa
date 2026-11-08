// Exact reversible boundary for the approved courtesy pointer, help, mobile layout and score-card polish.
import {readBeforeGestures as actual,inventoryBeforeGestures} from './mobile-gestures-preview-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COURTESY_UI_POLISH_CHANGED=Object.freeze(["public/games/courtesy-contest/index.html", "public/games/courtesy-contest/platform.css", "public/games/courtesy-contest/platform.mjs", "public/games/courtesy-contest/score-card.mjs", "tests/courtesy-result-mobile-provenance.test.mjs", "tests/courtesy-upgrade.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs", "tests/helpers/courtesy-result-mobile-provenance.mjs"]);
export const COURTESY_UI_POLISH_ADDED=Object.freeze(["docs/courtesy-ui-polish/BASELINE.json", "docs/courtesy-ui-polish/MANIFEST.json", "docs/courtesy-ui-polish/README.md", "docs/courtesy-ui-polish/regenerate.py", "tests/courtesy-contest/polish-ui.test.mjs", "tests/courtesy-contest/score-card-polish.test.mjs", "tests/courtesy-ui-polish-provenance.test.mjs", "tests/helpers/courtesy-ui-polish-provenance.mjs"]);
const baselineBytes=actual(new URL('../../docs/courtesy-ui-polish/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'956b2274aadea42e88085a68d27a23221b8e4134b697a76915a66731cbeabfd1','independently pinned complete upgrade parent');
export const courtesyUiPolishBaseline=JSON.parse(baselineBytes);
const previous=new Map(courtesyUiPolishBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCourtesyUiPolishBase(base){
 assert.equal(base.baseCommit,'bc8d0332c4df286f12b246895782ca733ce5e8ad');assert.equal(base.baseTree,'fe2bc3ff9450db95cd3814aba880f154f82c5b70');assert.deepEqual(base,courtesyUiPolishBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),base.baseTree);return true;
}
verifyCourtesyUiPolishBase(courtesyUiPolishBaseline);
let cachedText,cachedManifest;const validated=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const courtesyUiPolishManifest=()=>{const text=actual(new URL('../../docs/courtesy-ui-polish/MANIFEST.json',import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cachedManifest=freeze(JSON.parse(text));}return cachedManifest;};
function beforeBytes(f){assert.equal(typeof f.beforeText,'string');return Buffer.from(f.beforeText);}
export function validateCourtesyUiPolishManifest(m){
 const signature=m===cachedManifest?true:null;if(signature!==null&&validated.get(m)===signature)return m;
 assert.equal(m.baseCommit,courtesyUiPolishBaseline.baseCommit);assert.equal(m.baseTree,courtesyUiPolishBaseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COURTESY_UI_POLISH_CHANGED].sort());assert.deepEqual([...m.addedPaths].sort(),[...COURTESY_UI_POLISH_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COURTESY_UI_POLISH_ADDED.filter(p=>p!=='docs/courtesy-ui-polish/MANIFEST.json').sort());
 for(const f of m.files){const before=beforeBytes(f);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified remote preimage');assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 if(signature!==null)validated.set(m,signature);return m;
}
export function reverseCourtesyUiPolish(path,bytes,m=courtesyUiPolishManifest()){
 validateCourtesyUiPolishManifest(m);assert.ok(!COURTESY_UI_POLISH_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return beforeBytes(f);
}
export function courtesyUiPolishParentBytes(path,bytes,m=courtesyUiPolishManifest()){
 validateCourtesyUiPolishManifest(m);assert.ok(!COURTESY_UI_POLISH_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=beforeBytes(f);if(Buffer.from(bytes).equals(parent))return parent;return reverseCourtesyUiPolish(path,bytes,m);
}
export function readBeforeCourtesyUiPolish(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=COURTESY_UI_POLISH_CHANGED.includes(path)?reverseCourtesyUiPolish(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCourtesyUiPolish(paths,{manifest=courtesyUiPolishManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 paths=inventoryBeforeGestures(paths,{runtimeOnly});
 assert.equal(new Set(paths).size,paths.length,'duplicate upgrade inventory');validateCourtesyUiPolishManifest(manifest);
 if(!paths.some(p=>COURTESY_UI_POLISH_ADDED.includes(p)))return paths;
 const additions=COURTESY_UI_POLISH_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' addition SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' addition Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
