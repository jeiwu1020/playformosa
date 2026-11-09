// The only live->historical boundary for this touch/layout fix. Runtime tests
// import actual files directly. Never repin any older baseline or manifest.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const parent={"commit": "d787d4ca09d88a28e8a67e640b68acdcb566a975", "tree": "25d7bb403ab957bfd2a0a79cd20bf4c17d208ea3"};
const previous={
 "public/games/courtesy-contest/game.js": "174fb4477808b7494031e3fb8b503a5685257826",
 "public/games/courtesy-contest/platform.css": "9cd869fd0045532a039aaab8c3f2924ebeb7c667",
 "public/games/courtesy-contest/touch-controls.js": "c636c100dcd05f3380d4156ff3562b30c256a529",
 "tests/courtesy-contest/polish-ui.test.mjs": "4b529e809f17f3f35a031a20876e3ba2ac0dd6e2",
 "tests/helpers/vault-coordination-merge-provenance.mjs": "ca5562847031d87a4e834cbe924a643a9d0849f6",
 "tests/vault-coordination-merge-provenance.test.mjs": "4c3cb2767f3883b32f97385674554e0bde76293b"
};
const added=[
 "docs/courtesy-touch-coverage/MANIFEST.json",
 "tests/helpers/courtesy-touch-coverage-provenance.mjs",
 "tests/courtesy-contest/page-tap-coverage.test.mjs",
 "tests/courtesy-contest/tap-provenance.test.mjs",
 "tests/courtesy-contest/departure-layout.test.mjs"
];
const manifestPath='docs/courtesy-touch-coverage/MANIFEST.json';
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
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
export function reverseTapCoverage(path,bytes,m=manifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new touch coverage scope');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(gitBlob(bytes),f.gitBlob,path+' live drift');return Buffer.from(f.beforeText);
}
export function readBeforeTapCoverage(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!Object.hasOwn(previous,path)||!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=reverseTapCoverage(path,bytes);return encoding?before.toString(encoding):before;
}
export function inventoryBeforeTapCoverage(paths,{read=p=>actual(new URL('../../'+p,import.meta.url))}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate touch coverage inventory');const m=validate(manifest());
 if(!paths.some(p=>added.includes(p)))return paths;
 for(const path of added)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear once');
 for(const f of [...m.files,...m.addedFiles])assert.equal(gitBlob(read(f.path)),f.gitBlob,f.path+' live drift');
 return paths.filter(p=>!added.includes(p));
}
