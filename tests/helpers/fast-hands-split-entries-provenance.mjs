import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
import {reverseNameRefresh} from './fast-hands-name-refresh-provenance.mjs';
import {SPLIT_ENTRIES_BASE_COMMIT,SPLIT_ENTRIES_BASE_TREE,SPLIT_ENTRIES_BASE_BLOBS,SPLIT_ENTRIES_BEFORE_SHA,SPLIT_ENTRIES_TEST_ADAPTER_BLOBS,SPLIT_ENTRIES_HISTORY_SHA,SPLIT_ENTRIES_HISTORY_BLOBS,SPLIT_ENTRIES_HISTORY_PREIMAGE_BLOBS} from './fast-hands-split-entries-pins.mjs';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const SPLIT_ENTRIES_CHANGED=Object.freeze([
 "public/games/fast-hands/app.mjs",
 "public/games/fast-hands/assets/intro-duel-generated.webp",
 "public/games/fast-hands/catch.html",
 "public/games/fast-hands/club.css",
 "public/games/fast-hands/club.mjs",
 "public/games/fast-hands/duel.html",
 "public/games/fast-hands/index.html",
 "public/games/fast-hands/leaderboard.mjs",
 "public/games/fast-hands/levels-app.mjs",
 "public/games/fast-hands/scene.mjs",
 "public/games/fast-hands/score-image.mjs",
 "public/games/fast-hands/share.mjs",
 "public/games/fast-hands/three3d/stage.mjs",
 "public/index.html",
 "src/catalog.mjs",
 "src/render.mjs",
 "worker/play-counts/index.mjs",
 "worker/play-counts/repository.mjs"
]);
export const SPLIT_ENTRIES_ADDED=Object.freeze([
 "public/games/fast-hands/play-counts.mjs",
 "public/games/fast-hands/three3d/duck-room.mjs"
]);
export const SPLIT_ENTRIES_TEST_ADAPTERS=Object.freeze(['tests/batch2-integration.test.mjs']);
export const SPLIT_ENTRIES_ALLOWED=Object.freeze([...SPLIT_ENTRIES_CHANGED,...SPLIT_ENTRIES_ADDED]);

function validateFile(row){
 assert.ok([...SPLIT_ENTRIES_ALLOWED,...SPLIT_ENTRIES_TEST_ADAPTERS].includes(row.path),'Unapproved split entries path '+row.path);
 assert.match(row.sha256,/^[a-f0-9]{64}$/);
 if(SPLIT_ENTRIES_ADDED.includes(row.path)){
  assert.equal(row.beforeSha256,null);assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
 }else{
  assert.equal(row.baseGitBlob,SPLIT_ENTRIES_BASE_BLOBS[row.path]??SPLIT_ENTRIES_TEST_ADAPTER_BLOBS[row.path],'Pinned split entries baseline blob '+row.path);
  assert.equal(row.beforeSha256,SPLIT_ENTRIES_BEFORE_SHA[row.path],'Pinned split entries baseline digest '+row.path);
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/split-entries/'+row.path);assert.equal('reverseEdits' in row,false);
 }
}

export function validateSplitEntriesLedger(ledger){
 assert.equal(ledger.schemaVersion,1);assert.equal(ledger.baseCommit,SPLIT_ENTRIES_BASE_COMMIT);assert.equal(ledger.baseTree,SPLIT_ENTRIES_BASE_TREE);
 assert.deepEqual(ledger.files.map(r=>r.path).sort(),[...SPLIT_ENTRIES_ALLOWED].sort(),'Exact split entries change inventory');
 for(const row of ledger.files)validateFile(row);
 assert.deepEqual(ledger.testAdapters.map(r=>r.path),[...SPLIT_ENTRIES_TEST_ADAPTERS],'Exact historical test adapter inventory');
 for(const row of ledger.testAdapters)validateFile(row);
 const preserved=Object.keys(SPLIT_ENTRIES_BASE_BLOBS).filter(p=>!SPLIT_ENTRIES_CHANGED.includes(p)).sort();
 assert.deepEqual(ledger.preserved.map(r=>r.path).sort(),preserved,'Exact split entries preserved inventory');
 for(const row of ledger.preserved)assert.equal(row.gitBlob,SPLIT_ENTRIES_BASE_BLOBS[row.path],row.path);
 assert.deepEqual(ledger.historicalLedgers.map(r=>r.path).sort(),Object.keys(SPLIT_ENTRIES_HISTORY_SHA).sort(),'Exact historical ledger inventory');
 for(const row of ledger.historicalLedgers){assert.equal(row.sha256,SPLIT_ENTRIES_HISTORY_SHA[row.path],row.path);assert.equal(row.gitBlob,SPLIT_ENTRIES_HISTORY_BLOBS[row.path],row.path)}
 assert.deepEqual(ledger.historicalPreimages.map(r=>r.path).sort(),Object.keys(SPLIT_ENTRIES_HISTORY_PREIMAGE_BLOBS).sort(),'Exact historical preimage inventory');
 for(const row of ledger.historicalPreimages)assert.equal(row.gitBlob,SPLIT_ENTRIES_HISTORY_PREIMAGE_BLOBS[row.path],row.path);
 return ledger;
}
export const splitEntriesLedger=()=>validateSplitEntriesLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/SPLIT-ENTRIES-MANIFEST.json',root),'utf8')));

export function reverseSplitEntries(path,bytes,ledger=splitEntriesLedger()){
 const rows=[...ledger.files,...(ledger.testAdapters??[])].filter(r=>r.path===path);assert.ok(rows.length<=1,'Duplicate split entries entry '+path);
 if(!rows.length){
  const preserved=ledger.preserved?.filter(r=>r.path===path)??[];assert.ok(preserved.length<=1,'Duplicate split entries preserved entry '+path);
  if(preserved.length){assert.equal(preserved[0].gitBlob,SPLIT_ENTRIES_BASE_BLOBS[path],path);bytes=reverseNameRefresh(path,bytes);assert.equal(blob(bytes),preserved[0].gitBlob,'Split entries preserved bytes '+path)}
  return Buffer.from(bytes);
 }
 const row=rows[0];validateFile(row);
 bytes=reverseNameRefresh(path,bytes);
 assert.equal(hash(bytes),row.sha256,'Split entries current bytes '+path);
 if(row.beforeSha256===null)return Buffer.from(bytes);
 const restored=readFileSync(new URL(row.beforeAsset,root));
 assert.equal(hash(restored),row.beforeSha256,'Restored split entries bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored split entries Git blob '+path);
 return restored;
}

export function readSplitEntriesBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseSplitEntries(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
export function splitEntriesRuntimeAdditions(){
 const ledger=splitEntriesLedger();for(const path of SPLIT_ENTRIES_ADDED)reverseSplitEntries(path,readFileSync(new URL(path,root)),ledger);
 return [...SPLIT_ENTRIES_ADDED];
}
