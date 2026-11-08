import {levelsRuntimeAdditions} from '../helpers/fast-hands-levels-provenance.mjs';
import {sharingRuntimeAdditions} from '../helpers/fast-hands-sharing-provenance.mjs';
import {readRankingBaseline,rankingRuntimeAdditions} from '../helpers/fast-hands-ranking-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
import {readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('docs/fast-hands/import-manifest.json',root),'utf8'));
test('fast hands import preserves every approved runtime outside three presentation files',()=>{
 assert.equal(manifest.sourceCommit,'ad249ca4c373e6ad59432d867b446f68567e3085');
 assert.deepEqual(manifest.presentationChanges,['index.html','style.css','score-image.mjs']);
 assert.deepEqual(manifest.added,['three3d/vendor/THREE-LICENSE.txt']);
 const walk=url=>readdirSync(url,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(new URL(e.name+'/',url)):[new URL(e.name,url).pathname.split('/public/games/fast-hands/')[1]]);
 assert.deepEqual(walk(new URL('public/games/fast-hands/',root)).sort(),[...manifest.files.map(f=>f.path),...levelsRuntimeAdditions().map(p=>p.replace('public/games/fast-hands/','')),...sharingRuntimeAdditions().map(p=>p.replace('public/games/fast-hands/','')),...rankingRuntimeAdditions().filter(p=>p.startsWith('public/games/fast-hands/')).map(p=>p.replace('public/games/fast-hands/',''))].sort());
 for(const row of manifest.files){
  assert.equal(row.allowedPresentationChange,manifest.presentationChanges.includes(row.path));
  if(row.allowedPresentationChange||manifest.added.includes(row.path))continue;
  const data=readRankingBaseline(new URL('public/games/fast-hands/'+row.path,root));
  assert.equal(createHash('sha256').update(data).digest('hex'),row.sourceSha256,row.path);
 }
});
test('fast hands keeps the bundled Three.js MIT license with its original vendor',()=>{
 const text=readFileSync(new URL('public/games/fast-hands/three3d/vendor/THREE-LICENSE.txt',root),'utf8');
 assert.match(text,/MIT License/);assert.match(text,/2010-2025/);assert.match(text,/Permission is hereby granted/);
});
