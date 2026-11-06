import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,resolve,isAbsolute,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const paceHash=b=>createHash('sha256').update(b).digest('hex');
export const paceBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const PACE_BASE_COMMIT='9914e5f1f03235fd3decf9675e1e1a0767440418';
export const PACE_BASE_TREE='4cfc5cda2c7b437aac59a47daa001d9dbd98abb8';
export const PACE_RUNTIME_CHANGED=Object.freeze(['public/games/pole-vault/flight-profile.mjs','public/games/pole-vault/physics.mjs','public/games/shared/leaderboard-metrics.mjs','public/games/shared/leaderboard.mjs','worker/leaderboard/index.mjs']);
export const PACE_CHANGED=Object.freeze([...PACE_RUNTIME_CHANGED,'tests/preview-upload-isolation.test.mjs','tests/leaderboard-scroll.test.mjs','tests/v2-nine-board-view.test.mjs','tests/nine-game-metrics.test.mjs','tests/pole-vault/physics.test.mjs','tests/helpers/vault-journey-provenance.mjs','tests/pole-vault/journey-provenance.test.mjs','tests/fast-hands/art-polish-provenance.test.mjs','tests/fast-hands/result-upload-provenance.test.mjs','tests/fast-hands/split-entries-provenance.test.mjs']);
export const PACE_ADDED=Object.freeze(['docs/pole-vault/PACE-MANIFEST.json','tests/fixtures/vault-pace-baseline.json','tests/helpers/vault-pace-provenance.mjs','tests/pole-vault/pace-provenance.test.mjs','scripts/pin-vault-pace.mjs','tests/pole-vault/fixtures/paced-journey.html','tests/pole-vault/helpers/pace-strategy.mjs','tests/pole-vault/imperfect-pace.test.mjs','tools/vault-pace-report.mjs','docs/pole-vault/PACE-SIMULATION.json','tests/pole-vault-rules-isolation.test.mjs','tests/pole-vault/paced-ascent.test.mjs','docs/superpowers/plans/2026-11-06-vault-paced-ascent.md','docs/superpowers/specs/2026-11-06-vault-paced-ascent-design.md']);
const bytes=readFileSync(new URL('../fixtures/vault-pace-baseline.json',import.meta.url));
assert.equal(paceHash(bytes),'ea1778b417fe51ff432ecf6dc11662699716f5613a0ac4dec927bd90b7021995','independently pinned exact remote pacing base');
export const paceBaseline=JSON.parse(bytes);
const historical=new Map(paceBaseline.files.map(f=>[f.path,f.gitBlob]));
const runtime=p=>['public/','worker/','src/','config/'].some(prefix=>p.startsWith(prefix));
export function verifyPaceRemoteBase(base){
 assert.equal(base.baseCommit,PACE_BASE_COMMIT);assert.equal(base.baseTree,PACE_BASE_TREE);
 assert.deepEqual(base,paceBaseline,'complete exact remote base inventory');
 // Reconstruct Git trees from every path, mode and blob, independently of the transport response's SHA field.
 const tree={};for(const f of base.files){const parts=f.path.split('/');let dir=tree;for(const name of parts.slice(0,-1))dir=dir[name]??={};assert.ok(!dir[parts.at(-1)],'duplicate remote path');dir[parts.at(-1)]={file:f};}
 function digest(dir){const entries=Object.entries(dir).sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x.file?'':'/')),Buffer.from(b+(y.file?'':'/'))));const body=Buffer.concat(entries.map(([name,x])=>Buffer.concat([Buffer.from(`${x.file?x.file.mode:'40000'} ${name}\0`),Buffer.from(x.file?x.file.gitBlob:digest(x),'hex')])));return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');}
 assert.equal(digest(tree),PACE_BASE_TREE,'independent reconstructed remote Git tree');return true;
}
verifyPaceRemoteBase(paceBaseline);
export const paceManifest=()=>JSON.parse(readFileSync(new URL('../../docs/pole-vault/PACE-MANIFEST.json',import.meta.url),'utf8'));
export function validatePaceManifest(m){
 assert.equal(m.baseCommit,PACE_BASE_COMMIT);assert.equal(m.baseTree,PACE_BASE_TREE);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...PACE_CHANGED].sort(),'exact changed scope');
 assert.deepEqual([...m.addedPaths].sort(),[...PACE_ADDED].sort(),'exact added scope');
 assert.deepEqual(m.addedFiles.map(f=>f.path).sort(),PACE_ADDED.filter(p=>p!=='docs/pole-vault/PACE-MANIFEST.json').sort(),'exact hashed additions');
 for(const f of m.files){assert.equal(f.beforeGitBlob,historical.get(f.path),f.path+' verified remote preimage');const before=Buffer.from(f.beforeText);assert.equal(paceHash(before),f.beforeSha256);assert.equal(paceBlob(before),f.beforeGitBlob);}
 return m;
}
export function reversePace(path,bytes,m=paceManifest()){
 validatePaceManifest(m);assert.ok(!PACE_ADDED.includes(path),path+' is new pacing scope, not historical source');const f=m.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(paceHash(bytes),f.sha256,path+' pacing current SHA256');assert.equal(paceBlob(bytes),f.gitBlob,path+' pacing current Git blob');return Buffer.from(f.beforeText);
}
export function readBeforePace(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 if(!path||path==='..'||path.startsWith('../')||isAbsolute(path))return readFileSync(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=reversePace(path,readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));return encoding?bytes.toString(encoding):bytes;
}
const raw=p=>readFileSync(new URL('../../'+p,import.meta.url));
export function inventoryBeforePace(paths,{manifest=paceManifest(),read=raw,runtimeOnly=false}={}){
 validatePaceManifest(manifest);assert.equal(new Set(paths).size,paths.length,'duplicate pacing inventory');const additions=PACE_ADDED.filter(p=>!runtimeOnly||runtime(p));
 for(const p of additions)assert.equal(paths.filter(x=>x===p).length,1,p+' must appear exactly once');
 for(const f of manifest.addedFiles.filter(f=>additions.includes(f.path))){const bytes=read(f.path);assert.equal(paceHash(bytes),f.sha256,f.path+' added SHA256');assert.equal(paceBlob(bytes),f.gitBlob,f.path+' added Git blob');}
 return paths.filter(p=>!additions.includes(p));
}
export const runtimeInventoryBeforePace=(paths,options={})=>inventoryBeforePace(paths,{...options,runtimeOnly:true});
export function verifyPaceInventory(paths,{manifest=paceManifest(),read=raw,omitted=[]}={}){
 assert.equal(new Set(omitted).size,omitted.length,'duplicate omissions');
 // Only explicit, separately attested original binary paths may be omitted. A complete checkout passes omitted=[].
 const known=KNOWN_TRANSFER_OMISSIONS;
 for(const p of omitted){assert.ok(known.includes(p),p+' unauthorized omission');assert.ok(!paths.includes(p),p+' is present, cannot omit');}
 const restored=inventoryBeforePace(paths,{manifest,read});assert.deepEqual([...restored].sort(),paceBaseline.files.map(f=>f.path).filter(p=>!omitted.includes(p)).sort(),'no unknown or missing source');
 for(const p of restored)assert.equal(paceBlob(reversePace(p,read(p),manifest)),historical.get(p),p+' exact historical blob');return true;
}
export const KNOWN_TRANSFER_OMISSIONS=Object.freeze(["docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png", "public/assets/app-icons/javelin/apple-touch-icon.png", "public/assets/app-icons/sprint-100m/apple-touch-icon.png", "public/assets/beer-slide-card.svg", "public/assets/discus-card.png", "public/assets/hero-long-jump.png", "public/assets/high-jump-card.png", "public/assets/hurdles-card.png", "public/assets/javelin-card.png", "public/assets/pole-vault-card.png", "public/assets/portal-echosboundary.png", "public/assets/portal-formosabattle.png", "public/assets/reaction-rod-card.png", "public/assets/shot-put-card.png", "public/assets/sprint-100m-card.png", "public/assets/tower-climb-card.png", "public/games/beer-slide/audio/chill-menu.mp3", "public/games/fast-hands/assets/duel-items-atlas.png", "public/games/fast-hands/assets/king-torso-v3.png"]);
