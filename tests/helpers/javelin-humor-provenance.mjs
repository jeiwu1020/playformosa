import {readBeforeJourney} from './vault-journey-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const HUMOR_CHANGED=Object.freeze(["public/games/javelin/app.mjs", "tests/javelin/result-dom.test.mjs", "tests/helpers/home-label-provenance.mjs", "tests/platform-home-label-provenance.test.mjs", "tests/javelin/results-provenance.test.mjs", "tests/sprint-100m/fall-provenance.test.mjs", "tests/pole-vault/sky-provenance.test.mjs", "tests/upload-toolbar-polish-provenance.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs"]);
export const HUMOR_ADDED=Object.freeze(["docs/javelin/HUMOR-MANIFEST.json", "docs/javelin/HUMOR-VERIFICATION.md", "tests/fixtures/javelin-humor-baseline.json", "tests/helpers/javelin-humor-provenance.mjs", "tests/javelin/result-humor.test.mjs", "tests/javelin/humor-provenance.test.mjs"]);
const baselineBytes=readFileSync(new URL('../../tests/fixtures/javelin-humor-baseline.json',import.meta.url));
assert.equal(hash(baselineBytes),'e42b3da3bf1b844692fa5dfefca5db0248df9e9e4b7b0d42a9f821b7d33652a6','independently pinned javelin-humor parent inventory');
const historical=new Map(JSON.parse(baselineBytes).files.map(f=>[f.path,f.gitBlob]));
let cached;
export const humorManifest=()=>cached??=JSON.parse(readFileSync(new URL('../../docs/javelin/HUMOR-MANIFEST.json',import.meta.url),'utf8'));
function validate(m){
 assert.equal(m.baseCommit,'a8cc0e0b58345e1d30fbf5823de3d038f75d6765');assert.equal(m.baseTree,'c905edadba0dae9e5ba1d3edf8d120a72ea17c4f');
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...HUMOR_CHANGED].sort());
 assert.deepEqual([...m.addedPaths].sort(),[...HUMOR_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),HUMOR_ADDED.filter(p=>p!=='docs/javelin/HUMOR-MANIFEST.json').sort());
 for(const f of m.files)assert.equal(f.beforeGitBlob,historical.get(f.path),f.path+' must restore the verified remote blob');
}
export function reverseHumor(path,bytes,m=humorManifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new javelin-humor scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' javelin-humor current SHA256');assert.equal(blob(bytes),f.gitBlob,path+' javelin-humor current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' javelin-humor preimage SHA256');assert.equal(blob(before),f.beforeGitBlob,path+' javelin-humor preimage Git blob');return before;
}
// This reader is used only at the outer historical boundary, never by live UI tests.
export function readBeforeHumor(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return readBeforeJourney(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=reverseHumor(path,readBeforeJourney(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));
 return encoding?bytes.toString(encoding):bytes;
}
export function inventoryBeforeHumor(paths,{manifest=humorManifest(),read=p=>readBeforeJourney(new URL('../../'+p,import.meta.url))}={}){
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate current paths');
 for(const path of HUMOR_ADDED)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path+' added SHA256');assert.equal(blob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!HUMOR_ADDED.includes(p));
}
