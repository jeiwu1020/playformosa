// Current visual revisions are explicit; imported prototype hashes remain historical.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const baselineBytes=readFileSync(new URL('../fixtures/runner-visual-baseline.json',import.meta.url));
assert.equal(sha256(baselineBytes),'788fec0af475aa1a169cfd032b46ff7e69dd7e047675da54608b7de105d427a1','independently pinned complete visual-revision parent');
export const visualBaseline=JSON.parse(baselineBytes);
const previous=new Map(visualBaseline.files.map(f=>[f.path,f]));
export const VISUAL_REQUIRED=Object.freeze([
 'public/games/run-400m/character3d.mjs','public/games/run-400m/pose3d.mjs','public/games/run-400m/runner-atlas.png','public/games/run-400m/extra-poses.png',
 'public/games/run-1500m/character3d.mjs','public/games/run-1500m/pose.mjs','public/games/run-1500m/runner-atlas.png'
]);
export const VISUAL_ALLOWED=Object.freeze([...VISUAL_REQUIRED,
 'public/games/run-400m/render.mjs','public/games/run-400m/fallback.mjs','public/games/run-1500m/render.mjs','public/games/shared/runner-arm-pose.mjs'
]);
export function verifyHistoricalSourceManifest(){const bytes=readFileSync(new URL('docs/runners/SOURCE-MANIFEST.json',root));assert.equal(sha256(bytes),'e0fb93a8d80d28a332fe9ead0437a5325759b3f0818e33dc999f8ff8ec8e16f5','original prototype source manifest must not be rewritten');return JSON.parse(bytes);}
export const visualManifest=()=>JSON.parse(readFileSync(new URL('docs/runners/VISUAL-REVISION-MANIFEST.json',root),'utf8'));
export function validateVisualManifest(m){
 assert.equal(m.baseCommit,visualBaseline.baseCommit);assert.equal(m.baseTree,visualBaseline.baseTree);
 assert.ok(Array.isArray(m.files));const paths=m.files.map(f=>f.path);assert.equal(new Set(paths).size,paths.length,'no duplicate revision paths');
 for(const path of VISUAL_REQUIRED)assert.ok(paths.includes(path),path+' required for both render backends');
 const source=verifyHistoricalSourceManifest();
 for(const f of m.files){
  assert.ok(VISUAL_ALLOWED.includes(f.path),f.path+' outside the approved visual scope');
  assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.match(f.gitBlob,/^[a-f0-9]{40}$/);
  const old=previous.get(f.path);assert.equal(f.beforeGitBlob,old?.gitBlob??null,f.path+' exact fresh remote preimage');
  const match=f.path.match(/^public\/games\/run-(400m|1500m)\/(.+)$/),original=match&&source.runtime[match[1]][match[2]];
  assert.equal(f.beforeSha256,original||null,f.path+' original imported SHA256');
  if(old)assert.notEqual(f.gitBlob,f.beforeGitBlob,f.path+' is an actual revision');
 }
 return m;
}
export function verifyVisualBytes(path,bytes,m=visualManifest()){
 validateVisualManifest(m);const f=m.files.find(x=>x.path===path);assert.ok(f,path+' lacks an authorized visual revision');
 assert.equal(sha256(bytes),f.sha256,path+' revised SHA256');assert.equal(gitBlob(bytes),f.gitBlob,path+' revised Git blob');return true;
}
export function verifyImportedOrRevised(path,bytes,originalSha,m=visualManifest()){
 validateVisualManifest(m);const f=m.files.find(x=>x.path===path);
 if(f){assert.equal(f.beforeSha256,originalSha,path+' original import remains traceable');return verifyVisualBytes(path,bytes,m);}
 assert.equal(sha256(bytes),originalSha,path+' unchanged imported source');return true;
}
