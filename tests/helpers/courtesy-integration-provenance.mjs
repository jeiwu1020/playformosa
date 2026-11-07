// Reversible courtesy integration boundary. Gameplay assertions still inspect live files.
import {readFileSync as actual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const COURTESY_INTEGRATION_BASE_COMMIT='883498a7eb27c9670b87ed49764b57d87b9fd118';
export const COURTESY_INTEGRATION_BASE_TREE='e844add2dbd272efc4a174b6118ec470602712a0';
export const COURTESY_INTEGRATION_CHANGED=Object.freeze(["package.json", "public/games/shared/play-counts.mjs", "public/index.html", "src/catalog.mjs", "src/render.mjs", "tests/dialog-layout-provenance.test.mjs", "tests/fast-hands/art-polish-provenance.test.mjs", "tests/fast-hands/result-upload-provenance.test.mjs", "tests/fast-hands/split-entries-provenance.test.mjs", "tests/game-scrollbars.test.mjs", "tests/helpers/dialog-layout-provenance.mjs", "tests/helpers/dialog-layout-repair-provenance.mjs", "tests/helpers/high-jump-compact-entry-provenance.mjs", "tests/high-jump/compact-entry-provenance.test.mjs", "tests/high-jump/provenance.test.mjs", "tests/high-jump/result-preview-provenance.test.mjs", "tests/nine-play-counts.test.mjs", "tests/play-counts-home.test.mjs", "tests/play-counts-repository.test.mjs", "worker/play-counts/index.mjs", "worker/play-counts/repository.mjs"]);
export const COURTESY_INTEGRATION_ADDED=Object.freeze(["docs/courtesy-contest/INTEGRATION-BASELINE.json", "docs/courtesy-contest/INTEGRATION-MANIFEST.json", "docs/courtesy-contest/INTEGRATION.md", "docs/courtesy-contest/SOURCE-MANIFEST.json", "public/assets/courtesy-contest-card.jpg", "public/games/courtesy-contest/assets/aunt-v4-frames.json", "public/games/courtesy-contest/assets/aunt-v4.png", "public/games/courtesy-contest/assets/commuters.png", "public/games/courtesy-contest/assets/frames.json", "public/games/courtesy-contest/assets/hero-v3-frames.json", "public/games/courtesy-contest/assets/hero-v3.png", "public/games/courtesy-contest/assets/intruders-v4.png", "public/games/courtesy-contest/assets/metro.png", "public/games/courtesy-contest/assets/music/attribution.md", "public/games/courtesy-contest/assets/music/monkeys-spinning-monkeys-game.mp3", "public/games/courtesy-contest/assets/music/monkeys-spinning-monkeys.mp3", "public/games/courtesy-contest/assets/office-v7.png", "public/games/courtesy-contest/assets/passengers-v3.png", "public/games/courtesy-contest/assets/seated-gesture-v7.png", "public/games/courtesy-contest/assets/seated-v7.png", "public/games/courtesy-contest/assets/sfx/credits.txt", "public/games/courtesy-contest/assets/stubborn-v7.png", "public/games/courtesy-contest/assets/variation-v7.json", "public/games/courtesy-contest/bench-layout.js", "public/games/courtesy-contest/comic-events.js", "public/games/courtesy-contest/game.js", "public/games/courtesy-contest/index.html", "public/games/courtesy-contest/music.js", "public/games/courtesy-contest/platform.css", "public/games/courtesy-contest/platform.mjs", "public/games/courtesy-contest/round-clock.js", "public/games/courtesy-contest/round-variation.js", "public/games/courtesy-contest/rules.js", "public/games/courtesy-contest/sfx.js", "public/games/courtesy-contest/share.mjs", "public/games/courtesy-contest/style.css", "public/games/courtesy-contest/threat-plan.js", "public/games/courtesy-contest/touch-controls.js", "public/games/courtesy-contest/vendor/PHASER-LICENSE.txt", "public/games/courtesy-contest/vendor/phaser-3.90.0.min.js", "scripts/generate-courtesy-provenance.py", "tests/browser/courtesy-platform.html", "tests/courtesy-contest/background-timing.test.mjs", "tests/courtesy-contest/bench-layout.test.mjs", "tests/courtesy-contest/comic-events.test.mjs", "tests/courtesy-contest/gameplay-deadline.test.mjs", "tests/courtesy-contest/helpers/private-replay-reference.mjs", "tests/courtesy-contest/helpers/scene-harness.mjs", "tests/courtesy-contest/integration-provenance.test.mjs", "tests/courtesy-contest/intruder-visual-scale.test.mjs", "tests/courtesy-contest/music-playback.test.mjs", "tests/courtesy-contest/music.test.mjs", "tests/courtesy-contest/round-variation-scene.test.mjs", "tests/courtesy-contest/round-variation.test.mjs", "tests/courtesy-contest/rules.test.mjs", "tests/courtesy-contest/runtime-inventory-provenance.test.mjs", "tests/courtesy-contest/seat-visual-consistency.test.mjs", "tests/courtesy-contest/sfx-context.test.mjs", "tests/courtesy-contest/surface-tap-v15.test.mjs", "tests/courtesy-contest/tap-guard-v13.test.mjs", "tests/courtesy-contest/touch-interaction.test.mjs", "tests/courtesy-contest/v10-pressure.test.mjs", "tests/courtesy-contest/v11-pressure.test.mjs", "tests/courtesy-lifecycle.test.mjs", "tests/courtesy-platform.test.mjs", "tests/courtesy-sharing.test.mjs", "tests/helpers/courtesy-integration-provenance.mjs"]);
const baselineBytes=actual(new URL('../../docs/courtesy-contest/INTEGRATION-BASELINE.json',import.meta.url));
assert.equal(sha256(baselineBytes),'3de68b839fe38855a2310cdd81bf173bf5414a1888a96f229ebe3f1443e94401','independently pinned complete courtesy-integration parent');
export const courtesyIntegrationBaseline=JSON.parse(baselineBytes);
const previous=new Map(courtesyIntegrationBaseline.files.map(f=>[f.path,f.gitBlob]));
export function verifyCourtesyIntegrationBase(base){
 assert.equal(base.baseCommit,COURTESY_INTEGRATION_BASE_COMMIT);assert.equal(base.baseTree,COURTESY_INTEGRATION_BASE_TREE);assert.deepEqual(base,courtesyIntegrationBaseline);
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),COURTESY_INTEGRATION_BASE_TREE,'reconstructed complete remote Git tree');return true;
}
verifyCourtesyIntegrationBase(courtesyIntegrationBaseline);
export const courtesyIntegrationManifest=()=>JSON.parse(actual(new URL('../../docs/courtesy-contest/INTEGRATION-MANIFEST.json',import.meta.url),'utf8'));
export function validateCourtesyIntegrationManifest(m){
 assert.equal(m.baseCommit,COURTESY_INTEGRATION_BASE_COMMIT);assert.equal(m.baseTree,COURTESY_INTEGRATION_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...COURTESY_INTEGRATION_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...COURTESY_INTEGRATION_ADDED].sort(),'exact additions');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),COURTESY_INTEGRATION_ADDED.filter(p=>p!=='docs/courtesy-contest/INTEGRATION-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){const before=Buffer.from(f.beforeText);assert.equal(f.beforeGitBlob,previous.get(f.path),f.path+' independently verified parent blob');assert.equal(sha256(before),f.beforeSha256);assert.equal(gitBlob(before),f.beforeGitBlob);assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);}
 return m;
}
export function reverseCourtesyIntegration(path,bytes,m=courtesyIntegrationManifest()){
 validateCourtesyIntegrationManifest(m);assert.ok(!COURTESY_INTEGRATION_ADDED.includes(path),path+' is new courtesy-integration scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(sha256(bytes),f.sha256,path+' courtesy-integration current SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' courtesy-integration current Git blob');return Buffer.from(f.beforeText);
}
// A direct inner API may receive live bytes or this independently pinned parent.
export function courtesyIntegrationParentBytes(path,bytes,m=courtesyIntegrationManifest()){
 validateCourtesyIntegrationManifest(m);assert.ok(!COURTESY_INTEGRATION_ADDED.includes(path),path+' is new courtesy-integration scope, not historical source');
 const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 const parent=Buffer.from(f.beforeText);if(Buffer.from(bytes).equals(parent))return parent;
 return reverseCourtesyIntegration(path,bytes,m);
}
export function readBeforeCourtesyIntegration(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return actual(file,options);
 const encoding=typeof options==='string'?options:options?.encoding,bytes=actual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const before=COURTESY_INTEGRATION_CHANGED.includes(path)?reverseCourtesyIntegration(path,bytes):bytes;return encoding?before.toString(encoding):before;
}
export function inventoryBeforeCourtesyIntegration(paths,{manifest=courtesyIntegrationManifest(),read=p=>actual(new URL('../../'+p,import.meta.url)),runtimeOnly=false}={}){
 assert.equal(new Set(paths).size,paths.length,'duplicate courtesy-integration inventory');validateCourtesyIntegrationManifest(manifest);
 const additions=COURTESY_INTEGRATION_ADDED.filter(p=>!runtimeOnly||/^(public|worker|src|config)\//.test(p));
 // Preserve the existing API for intentionally older, partial inventories.
 if(!runtimeOnly&&!paths.some(p=>COURTESY_INTEGRATION_ADDED.includes(p)))return paths;
 for(const path of additions)assert.equal(paths.filter(p=>p===path).length,1,path+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(sha256(bytes),f.sha256,f.path+' added SHA256');assert.equal(gitBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
