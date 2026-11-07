// Exact reversible boundary for the approved courtesy platform and two runner-card upgrade.
import {readFileSync as actual,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COURTESY_UPGRADE_CHANGED=Object.freeze(["public/assets/run-1500m-card.png", "public/assets/run-400m-card.png", "public/games/courtesy-contest/index.html", "public/games/courtesy-contest/platform.css", "public/games/courtesy-contest/platform.mjs", "public/games/courtesy-contest/share.mjs", "public/games/shared/leaderboard-metrics.mjs", "public/games/shared/leaderboard.mjs", "tests/courtesy-contest/integration-provenance.test.mjs", "tests/courtesy-platform.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs", "tests/helpers/courtesy-integration-provenance.mjs", "tests/nine-game-metrics.test.mjs", "tests/runners/visual-provenance.test.mjs", "worker/leaderboard/index.mjs", "worker/leaderboard/repository.mjs"]);
export const COURTESY_UPGRADE_ADDED=Object.freeze(["docs/courtesy-platform-upgrade/BASELINE.json", "docs/courtesy-platform-upgrade/MANIFEST.json", "docs/courtesy-platform-upgrade/README.md", "docs/courtesy-platform-upgrade/THUMBNAILS.json", "docs/courtesy-platform-upgrade/baseline-assets/run-1500m-card.png", "docs/courtesy-platform-upgrade/baseline-assets/run-400m-card.png", "docs/courtesy-platform-upgrade/regenerate.py", "public/games/courtesy-contest/score-card.mjs", "tests/courtesy-contest/leaderboard.test.mjs", "tests/courtesy-upgrade-provenance.test.mjs", "tests/courtesy-upgrade.test.mjs", "tests/helpers/courtesy-upgrade-provenance.mjs", "worker/leaderboard/COURTESY-QA.md"]);
const baselineBytes=actual(new URL('../../docs/courtesy-platform-upgrade/BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'300dd4a3b143d824dfc18288fca6faed9a3c8c7e093c2e09dea6b1384e1b53c5','independently pinned complete upgrade parent');
export const courtesyUpgradeBaseline=JSON.parse(baselineBytes);
const previous=new Map(courtesyUpgradeBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCourtesyUpgradeBase(base){
 assert.equal(base.baseCommit,'256fb83c78d189640b252ee4333f45ec8146fe5f');assert.equal(base.baseTree,'299a50eb55730cf9b5493570a91de1282f40447a');assert.deepEqual(base,courtesyUpgradeBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),base.baseTree);return true;
}
verifyCourtesyUpgradeBase(courtesyUpgradeBaseline);
let cachedText,cachedManifest;const validated=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const courtesyUpgradeManifest=()=>{const text=actual(new URL('../../docs/courtesy-platform-upgrade/MANIFEST.json',import.meta.url),'utf8');if(text!==cachedText){cachedText=text;cachedManifest=freeze(JSON.parse(text));}return cachedManifest;};
const assetSignature=m=>m.files.filter(f=>f.beforeAsset).map(f=>{assert.ok(/^docs\/courtesy-platform-upgrade\/baseline-assets\/run-(?:400m|1500m)-card\.png$/.test(f.beforeAsset),'exact backed-up binary path');const s=statSync(new URL('../../'+f.beforeAsset,import.meta.url),{bigint:true});return[f.beforeAsset,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');}).join('|');
function beforeBytes(f){
 if(f.beforeAsset){assert.ok(/^docs\/courtesy-platform-upgrade\/baseline-assets\/run-(?:400m|1500m)-card\.png$/.test(f.beforeAsset),'exact backed-up binary path');return actual(new URL('../../'+f.beforeAsset,import.meta.url));}
 assert.equal(typeof f.beforeText,'string');return Buffer.from(f.beforeText);
}
export function validateCourtesyUpgradeManifest(m){
 const signature=m===cachedManifest?assetSignature(m):null;if(signature!==null&&validated.get(m)===signature)return m;
 assert.equal(m.baseCommit,courtesyUpgradeBaseline.baseCommit);assert.equal(m.baseTree,courtesyUpgradeBaseline.baseTree);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COURTESY_UPGRADE_CHANGED].sort());assert.deepEqual([...m.addedPaths].sort(),[...COURTESY_UPGRADE_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COURTESY_UPGRADE_ADDED.filter(p=>p!=='docs/courtesy-platform-upgrade/MANIFEST.json').sort());
 for(const f of m.files){const before=beforeBytes(f);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified remote preimage');assert.equal(gitBlob(before),f.beforeGitBlob);assert.equal(sha256(before),f.beforeSha256);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 if(signature!==null)validated.set(m,signature);return m;
}
export function reverseCourtesyUpgrade(path,bytes,m=courtesyUpgradeManifest()){
 validateCourtesyUpgradeManifest(m);assert.ok(!COURTESY_UPGRADE_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' current Git blob');return beforeBytes(f);
}
export function courtesyUpgradeParentBytes(path,bytes,m=courtesyUpgradeManifest()){
 validateCourtesyUpgradeManifest(m);assert.ok(!COURTESY_UPGRADE_ADDED.includes(path),path+' is new upgrade scope');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=beforeBytes(f);if(Buffer.from(bytes).equals(parent))return parent;return reverseCourtesyUpgrade(path,bytes,m);
}
export function readBeforeCourtesyUpgrade(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=COURTESY_UPGRADE_CHANGED.includes(path)?reverseCourtesyUpgrade(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCourtesyUpgrade(paths,{manifest=courtesyUpgradeManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate upgrade inventory');validateCourtesyUpgradeManifest(manifest);
 if(!paths.some(p=>COURTESY_UPGRADE_ADDED.includes(p)))return paths;
 const additions=COURTESY_UPGRADE_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' addition SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' addition Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
