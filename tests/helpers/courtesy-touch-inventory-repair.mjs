// Restore the published touch fix before older inventory/reader boundaries.
// No gameplay source or previously published ledger is changed by this repair.
import {readBeforeIcons as actual,iconsParentBytes,inventoryBeforeIcons} from './app-icons-completion-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const parent={"commit": "0eca7bd82dc9fb4c83a14ea56fc0c2ebee0bfdaf", "tree": "728daeaaf3c1183d3805f3204998402d45718e93"},previous={"tests/helpers/vault-coordination-merge-provenance.mjs": "44a1aa8dc0d060e759bf59ee2ab2dc9d99d28ceb", "tests/helpers/courtesy-touch-coverage-provenance.mjs": "b6bab6b6988d00cf4c3425f1905f4b5c532953b2", "tests/courtesy-contest/tap-provenance.test.mjs": "ff26acb05b23058b3063319668a572f1a9e6edfe"},added=["docs/courtesy-touch-inventory-repair/BASELINE.json", "docs/courtesy-touch-inventory-repair/MANIFEST.json", "tests/helpers/courtesy-touch-inventory-repair.mjs", "tests/courtesy-touch-inventory-chain.test.mjs"];
const manifestPath="docs/courtesy-touch-inventory-repair/MANIFEST.json";
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=actual(new URL('../../'+"docs/courtesy-touch-inventory-repair/BASELINE.json",import.meta.url));
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),"84a2cd561a1d63fce4a7550fcb369e6920e379f673da44700b6a0470e3b70b90");
export const baseline=JSON.parse(baselineBytes);
export function manifest(){return JSON.parse(actual(new URL('../../'+manifestPath,import.meta.url),'utf8'));}
export function validate(m){
 assert.equal(m.baseCommit,parent.commit);assert.equal(m.baseTree,parent.tree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),Object.keys(previous).sort());
 assert.deepEqual([...m.addedPaths].sort(),[...added].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),added.filter(p=>p!==manifestPath).sort());
 for(const f of m.files){assert.equal(f.beforeGitBlob,previous[f.path]);assert.equal(typeof f.beforeText,'string');assert.equal(gitBlob(Buffer.from(f.beforeText)),f.beforeGitBlob);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 for(const f of m.addedFiles)assert.match(f.gitBlob,/^[a-f0-9]{40}$/);
 return m;
}
export function readBeforeInventoryRepair(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!Object.hasOwn(previous,path)||!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const m=validate(manifest()),f=m.files.find(f=>f.path===path),bytes=actual(file);
 assert.equal(gitBlob(bytes),f.gitBlob,path+' inventory repair live drift');
 const encoding=typeof options==='string'?options:options?.encoding,before=Buffer.from(f.beforeText);return encoding?before.toString(encoding):before;
}
export function inventoryBeforeInventoryRepair(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 paths=inventoryBeforeIcons(paths);
 assert.equal(new Set(paths).size,paths.length,'duplicate inventory repair path');const m=validate(manifest());
 if(!paths.some(p=>added.includes(p)))return paths;
 for(const path of added)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear once');
 for(const f of [...m.files,...m.addedFiles])assert.equal(gitBlob(iconsParentBytes(f.path,read(f.path))),f.gitBlob,f.path+' inventory repair live drift');
 return paths.filter(p=>!added.includes(p));
}
