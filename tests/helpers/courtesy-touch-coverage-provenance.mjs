// The only live->historical boundary for this touch/layout fix. Runtime tests
// import actual files directly. Never repin any older baseline or manifest.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const parent={"commit": "5a9aa4b93f6690c984a00ec8f4f831746d29fae5", "tree": "8b6add423406587449cccc659aea4a8ef6134cf5"};
const previous={
 "public/games/courtesy-contest/game.js": "174fb4477808b7494031e3fb8b503a5685257826",
 "public/games/courtesy-contest/platform.css": "d6f446b31412efabf71a616efc190e760803ee6f",
 "public/games/courtesy-contest/touch-controls.js": "c636c100dcd05f3380d4156ff3562b30c256a529",
 "tests/courtesy-contest/polish-ui.test.mjs": "6a694e78e8a6a23e53dfe44dd7fdd374e98f3e6e",
 "tests/helpers/main-courtesy-help-provenance.mjs": "7cc9d954163a2d7713ed4cb2a8afb86a55b22097",
 "tests/main-courtesy-help-provenance.test.mjs": "6ae5e22c8596db4f2aa2e436a2cad1eab12cdfe2"
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
