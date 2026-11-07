// Exact reversible boundary for the approved courtesy result and mobile-layout follow-up.
import {readBeforeCourtesyUiPolish as actual,courtesyUiPolishParentBytes,inventoryBeforeCourtesyUiPolish} from './courtesy-ui-polish-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COURTESY_RESULT_MOBILE_CHANGED=Object.freeze(["public/games/courtesy-contest/comic-events.js", "public/games/courtesy-contest/game.js", "public/games/courtesy-contest/index.html", "public/games/courtesy-contest/platform.css", "public/games/courtesy-contest/platform.mjs", "public/games/courtesy-contest/round-clock.js", "public/games/courtesy-contest/rules.js", "public/games/shared/leaderboard-metrics.mjs", "public/games/shared/leaderboard.mjs", "tests/courtesy-contest/background-timing.test.mjs", "tests/courtesy-contest/comic-events.test.mjs", "tests/courtesy-contest/gameplay-deadline.test.mjs", "tests/courtesy-contest/leaderboard.test.mjs", "tests/courtesy-contest/round-variation-scene.test.mjs", "tests/courtesy-contest/rules.test.mjs", "tests/courtesy-contest/seat-visual-consistency.test.mjs", "tests/courtesy-contest/v10-pressure.test.mjs", "tests/courtesy-contest/v11-pressure.test.mjs", "tests/courtesy-sharing.test.mjs", "tests/courtesy-upgrade-provenance.test.mjs", "tests/courtesy-upgrade.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs", "tests/helpers/courtesy-upgrade-provenance.mjs", "worker/leaderboard/COURTESY-QA.md", "worker/leaderboard/index.mjs"]);
export const COURTESY_RESULT_MOBILE_ADDED=Object.freeze(["docs/courtesy-result-mobile/BASELINE.json", "docs/courtesy-result-mobile/MANIFEST.json", "docs/courtesy-result-mobile/README.md", "docs/courtesy-result-mobile/regenerate.py", "tests/courtesy-contest/immediate-seating.test.mjs", "tests/courtesy-contest/result-mobile.test.mjs", "tests/courtesy-contest/standing-offers.test.mjs", "tests/courtesy-result-mobile-provenance.test.mjs", "tests/helpers/courtesy-result-mobile-provenance.mjs"]);
const baselineBytes=actual(new URL('../../docs/courtesy-result-mobile/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'4ce1357aa0542f9e0f0e1cb7b10d17afa117d429af637bffb30ff9bc87c33cca','independently pinned complete upgrade parent');
export const courtesyResultMobileBaseline=JSON.parse(baselineBytes);
const previous=new Map(courtesyResultMobileBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCourtesyResultMobileBase(base){
 assert.equal(base.baseCommit,'f702303ff984ec84dc90fc74a27dba7a696bcd04');assert.equal(base.baseTree,'fe3ff7d197035a922c993e29837f48e495dc385f');assert.deepEqual(base,courtesyResultMobileBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),base.baseTree);return true;
}
verifyCourtesyResultMobileBase(courtesyResultMobileBaseline);
let cachedText,cachedManifest;const validated=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const courtesyResultMobileManifest=()=>{const text=actual(new URL('../../docs/courtesy-result-mobile/MANIFEST.json',import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cachedManifest=freeze(JSON.parse(text));}return cachedManifest;};
function beforeBytes(f){assert.equal(typeof f.beforeText,'string');return Buffer.from(f.beforeText);}
export function validateCourtesyResultMobileManifest(m){
 const signature=m===cachedManifest?true:null;if(signature!==null&&validated.get(m)===signature)return m;
 assert.equal(m.baseCommit,courtesyResultMobileBaseline.baseCommit);assert.equal(m.baseTree,courtesyResultMobileBaseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COURTESY_RESULT_MOBILE_CHANGED].sort());assert.deepEqual([...m.addedPaths].sort(),[...COURTESY_RESULT_MOBILE_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COURTESY_RESULT_MOBILE_ADDED.filter(p=>p!=='docs/courtesy-result-mobile/MANIFEST.json').sort());
 for(const f of m.files){const before=beforeBytes(f);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified remote preimage');assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 if(signature!==null)validated.set(m,signature);return m;
}
export function reverseCourtesyResultMobile(path,bytes,m=courtesyResultMobileManifest()){
 validateCourtesyResultMobileManifest(m);bytes=courtesyUiPolishParentBytes(path,bytes);assert.ok(!COURTESY_RESULT_MOBILE_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return beforeBytes(f);
}
export function courtesyResultMobileParentBytes(path,bytes,m=courtesyResultMobileManifest()){
 validateCourtesyResultMobileManifest(m);assert.ok(!COURTESY_RESULT_MOBILE_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return courtesyUiPolishParentBytes(path,bytes);
 const parent=beforeBytes(f);if(Buffer.from(bytes).equals(parent))return parent;return reverseCourtesyResultMobile(path,bytes,m);
}
export function readBeforeCourtesyResultMobile(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=COURTESY_RESULT_MOBILE_CHANGED.includes(path)?reverseCourtesyResultMobile(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCourtesyResultMobile(paths,{manifest=courtesyResultMobileManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 paths=inventoryBeforeCourtesyUiPolish(paths,{read,runtimeOnly});
 assert.equal(new Set(paths).size,paths.length,'duplicate upgrade inventory');validateCourtesyResultMobileManifest(manifest);
 if(!paths.some(p=>COURTESY_RESULT_MOBILE_ADDED.includes(p)))return paths;
 const additions=COURTESY_RESULT_MOBILE_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=courtesyUiPolishParentBytes(f.path,read(f.path));assert.equal(sha256(bytes),f.sha256,f.path+' addition SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' addition Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
