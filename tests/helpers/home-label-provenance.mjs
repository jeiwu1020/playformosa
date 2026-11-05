import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const HOME_LABEL_CHANGED=Object.freeze(["public/games/beer-slide/index.html", "public/games/discus/index.html", "public/games/high-jump/index.html", "public/games/hurdles/index.html", "public/games/javelin/index.html", "public/games/long-jump/index.html", "public/games/pole-vault/index.html", "public/games/reaction-rod/index.html", "public/games/shot-put/index.html", "public/games/sprint-100m/index.html", "public/games/tower-climb/index.html", "tests/batch2-integration.test.mjs", "tests/platform-game-ui.test.mjs", "tests/javelin/platform.test.mjs", "tests/sprint-100m/platform-flow.test.mjs", "tests/jump-batch1.test.mjs", "scripts/browser-platform-ui.mjs", "public/games/shared/game-ui.css", "README.md", "docs/GAME-UI-STANDARD.md", "tests/helpers/javelin-results-provenance.mjs", "tests/javelin/results-provenance.test.mjs", "tests/sprint-100m/fall-provenance.test.mjs", "tests/pole-vault/sky-provenance.test.mjs", "tests/upload-toolbar-polish-provenance.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs"]);
export const HOME_LABEL_ADDED=Object.freeze(["docs/home-label/SOURCE-MANIFEST.json", "docs/home-label/VERIFICATION.md", "tests/fixtures/home-label-baseline.json", "tests/helpers/home-label-provenance.mjs", "tests/platform-home-label.test.mjs", "tests/platform-home-label-provenance.test.mjs"]);
const baselineBytes=readFileSync(new URL('../../tests/fixtures/home-label-baseline.json',import.meta.url));
assert.equal(hash(baselineBytes),'682f9795733bd951d790c68dee16ed97d64b65eed93069a46dd016dcd8e3d7a7','independently pinned home-label parent inventory');
const historical=new Map(JSON.parse(baselineBytes).files.map(f=>[f.path,f.gitBlob]));
let cached;
export const homeLabelManifest=()=>cached??=JSON.parse(readFileSync(new URL('../../docs/home-label/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
function validate(m){
 assert.equal(m.baseCommit,'9306407cbaa89e0e05e58886af6d96f7c6cf4b83');assert.equal(m.baseTree,'285873cee0e51bf85df555bde09af0c8bf53a396');
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...HOME_LABEL_CHANGED].sort());
 assert.deepEqual([...m.addedPaths].sort(),[...HOME_LABEL_ADDED].sort());
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),HOME_LABEL_ADDED.filter(p=>p!=='docs/home-label/SOURCE-MANIFEST.json').sort());
 for(const f of m.files)assert.equal(f.beforeGitBlob,historical.get(f.path),f.path+' must restore the verified remote blob');
}
export function reverseHomeLabel(path,bytes,m=homeLabelManifest()){
 validate(m);assert.ok(!m.addedPaths.includes(path),path+' is new home-label scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' home-label current SHA256');assert.equal(blob(bytes),f.gitBlob,path+' home-label current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' home-label preimage SHA256');assert.equal(blob(before),f.beforeGitBlob,path+' home-label preimage Git blob');return before;
}
// This reader is used only at the outer historical boundary, never by live UI tests.
export function readBeforeHomeLabel(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return readFileSync(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=reverseHomeLabel(path,readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));
 return encoding?bytes.toString(encoding):bytes;
}
export function inventoryBeforeHomeLabel(paths,{manifest=homeLabelManifest(),read=p=>readFileSync(new URL('../../'+p,import.meta.url))}={}){
 validate(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate current paths');
 for(const path of HOME_LABEL_ADDED)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles){const bytes=read(f.path);assert.equal(hash(bytes),f.sha256,f.path+' added SHA256');assert.equal(blob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!HOME_LABEL_ADDED.includes(p));
}
