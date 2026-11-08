import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
import {createHash} from 'node:crypto';

let api;
try{api=await import('../helpers/fast-hands-name-refresh-provenance.mjs')}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error}
const root=new URL('../../',import.meta.url);
const read=path=>readBeforePolish(new URL(path,root));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
// Independently recorded from the complete published 928772e parent tree.
const parentBlobs={
 'public/games/fast-hands/catch.html':'3f9286bcb7b3692b84c63b4364a2ce8c4f6f2371',
 'public/games/fast-hands/duel.html':'be30689f1b327987019321ca9668d208352a76dc',
 'public/games/fast-hands/index.html':'02ccc3fe9a5ff327e3d7e44ebeb217fc98c90fe2',
 'public/games/fast-hands/levels-leaderboard.mjs':'0d35520b2ca04189be9dcd94969f3ad6412b9d93',
 'public/games/fast-hands/levels-score-image.mjs':'c9cd73874484e52f21ac6647281a1c226d22d461',
 'public/index.html':'14e697466d81f0823b76c745b8c98a547f0ddab8',
 'src/catalog.mjs':'6ec06ccfb51e5c4d7fbd2d6be50519963b2e6496',
};

test('name refresh validates the exact authorized seven-file ledger against independent parent pins',()=>{
 assert.ok(api,'name-refresh provenance implementation exists');
 const ledger=api.nameRefreshLedger();
 assert.equal(ledger.baseCommit,'928772e5083ad08fedbef6a78536c08f3ff20bb7');
 assert.equal(ledger.baseTree,'500dec1dd2eee10290ac0d275d88d1cb991707f3');
 assert.deepEqual(api.NAME_REFRESH_PATHS,[...Object.keys(parentBlobs)].sort());
 assert.deepEqual(ledger.files.map(row=>row.path),api.NAME_REFRESH_PATHS);
 for(const row of ledger.files)assert.equal(row.baseGitBlob,parentBlobs[row.path],row.path);
});

test('current names reverse to the exact published parent with subtitle and all non-title bytes preserved',()=>{
 assert.ok(api);
 for(const path of Object.keys(parentBlobs)){
  const current=read(path),original=Buffer.from(current),before=api.reverseNameRefresh(path,current);
  assert.doesNotThrow(()=>api.assertNameRefreshCurrent(path,current),path);
  assert.deepEqual(current,original,'reversal must not mutate caller bytes');
  assert.equal(blob(before),parentBlobs[path],path);
  assert.doesNotMatch(current.toString(),/玩具彈接接樂|十回合對決/);
  assert.match(current.toString(),/彈無虛接|快手對決/);
  assert.equal(current.toString().split('十回合反應對決').length,before.toString().split('十回合反應對決').length,path);
 }
 const board=read('public/games/fast-hands/levels-leaderboard.mjs').toString();
 assert.match(board,/label:'彈無虛接'/);assert.match(board,/label:'快手對決'/);
 assert.match(read('src/catalog.mjs').toString(),/event:'十回合反應對決'/);
 assert.equal(read('public/index.html').toString().split('十回合反應對決').length-1,2);
});

test('historical reversal accepts only exact parent bytes while current verification rejects stale titles',()=>{
 assert.ok(api);
 for(const path of Object.keys(parentBlobs)){
  const current=read(path),before=api.reverseNameRefresh(path,current);
  assert.deepEqual(api.reverseNameRefresh(path,before),before);
  assert.throws(()=>api.assertNameRefreshCurrent(path,before),/Name refresh current bytes/,path);
  for(const bytes of [Buffer.concat([current,Buffer.from('drift')]),Buffer.concat([before,Buffer.from('drift')])]){
   assert.throws(()=>api.reverseNameRefresh(path,bytes),/Name refresh current bytes/,path);
   assert.throws(()=>api.assertNameRefreshCurrent(path,bytes),/Name refresh current bytes/,path);
  }
 }
});

test('name refresh rejects missing, duplicate, unknown, malformed and repinned ledger rows',()=>{
 assert.ok(api);const original=api.nameRefreshLedger();
 const mutations=[
  l=>{l.schemaVersion=2},l=>{l.baseCommit='0'.repeat(40)},l=>{l.baseTree='0'.repeat(40)},l=>{l.extra=true},
  l=>l.files.pop(),l=>l.files.push({...l.files[0]}),l=>l.files.reverse(),l=>{l.files=null},
  l=>{l.files[0].path='../escape'},l=>{l.files[0].path='public/games/fast-hands/levels-rules.mjs'},
  l=>{l.files[0].baseGitBlob='0'.repeat(40)},l=>{l.files[0].beforeSha256='0'.repeat(64)},
  l=>{l.files[0].sha256='0'.repeat(64)},l=>{l.files[0].beforeAsset='../../escape'},
  l=>{l.files[0].replacements=[]},l=>{l.files[0].replacements[0].count++},
  l=>{l.files[0].replacements[0].before='ten-round-wins-v1'},l=>{l.files[0].replacements[0].after='changed rules'},
 ];
 for(const mutate of mutations){const ledger=structuredClone(original);mutate(ledger);assert.throws(()=>api.validateNameRefreshLedger(ledger));}
 const path=original.files[0].path,bad=Buffer.concat([read(path),Buffer.from('drift')]),ledger=structuredClone(original);
 ledger.files[0].sha256=sha(bad);
 assert.throws(()=>api.reverseNameRefresh(path,bad,ledger),/Pinned name refresh/);
 assert.throws(()=>api.assertNameRefreshCurrent(path,bad,ledger),/Pinned name refresh/);
});

test('the outer layer leaves unrelated binary files intact and refuses current-name claims for them',()=>{
 assert.ok(api);const bytes=Buffer.from([0,255,10,128]),copy=api.reverseNameRefresh('unrelated.bin',bytes);
 assert.deepEqual(copy,bytes);assert.notEqual(copy,bytes);
 assert.throws(()=>api.assertNameRefreshCurrent('unrelated.bin',bytes),/Unapproved name refresh/);
});

test('historical split-entries preserved-file guards accept the rename but still reject runtime drift',async()=>{
 assert.ok(api);
 const {reverseSplitEntries}=await import('../helpers/fast-hands-split-entries-provenance.mjs');
 for(const path of ['public/games/fast-hands/levels-leaderboard.mjs','public/games/fast-hands/levels-score-image.mjs']){
  const bytes=read(path),restored=reverseSplitEntries(path,bytes);
  assert.equal(blob(restored),parentBlobs[path]);
  assert.throws(()=>reverseSplitEntries(path,Buffer.concat([bytes,Buffer.from('drift')])),/bytes/);
 }
});

test('explicitly isolated older layers retain the existing empty split-ledger bypass',async()=>{
 const {reverseSplitEntries}=await import('../helpers/fast-hands-split-entries-provenance.mjs');
 const historical=Buffer.from('isolated pre-split fixture');
 assert.deepEqual(reverseSplitEntries('public/games/fast-hands/catch.html',historical,{files:[]}),historical);
});

test('the split-entries historical ledger remains byte-for-byte published history',()=>{
 assert.equal(sha(read('docs/fast-hands/SPLIT-ENTRIES-MANIFEST.json')),'71964e1a6a3b4d64fba557a6529056fc6dece4d23f0a76569591aa7e397ae2f3');
});
