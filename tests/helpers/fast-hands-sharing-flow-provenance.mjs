import {reverseResultUpload,resultUploadLedger,resultUploadRuntimeAdditions} from './fast-hands-result-upload-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
import {SHARING_FLOW_BASE_COMMIT,SHARING_FLOW_BASE_TREE,SHARING_FLOW_BASE_BLOBS,SHARING_FLOW_HISTORY_SHA,SHARING_FLOW_HISTORY_BLOBS} from './fast-hands-sharing-flow-pins.mjs';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const SHARING_FLOW_CHANGED=Object.freeze([
  "public/games/fast-hands/app.mjs",
  "public/games/fast-hands/catch.html",
  "public/games/fast-hands/club.css",
  "public/games/fast-hands/club.mjs",
  "public/games/fast-hands/duel.html",
  "public/games/fast-hands/finale.css",
  "public/games/fast-hands/levels-app.mjs",
  "public/games/fast-hands/levels.css",
  "public/games/fast-hands/share.mjs"
]);
export const SHARING_FLOW_ADDED=Object.freeze([
  "public/games/fast-hands/levels-score-image.mjs",
  "public/games/fast-hands/levels-sharing.mjs"
]);
export const SHARING_FLOW_ALLOWED=Object.freeze([...SHARING_FLOW_CHANGED,...SHARING_FLOW_ADDED]);

export function validateSharingFlowLedger(ledger){
 assert.equal(ledger.schemaVersion,1);
 assert.equal(ledger.baseCommit,SHARING_FLOW_BASE_COMMIT);
 assert.equal(ledger.baseTree,SHARING_FLOW_BASE_TREE);
 assert.deepEqual(ledger.files.map(r=>r.path).sort(),[...SHARING_FLOW_ALLOWED].sort(),'Exact sharing flow change inventory');
 for(const row of ledger.files){
  assert.match(row.sha256,/^[a-f0-9]{64}$/);
  if(SHARING_FLOW_ADDED.includes(row.path)){
   assert.equal(row.beforeSha256,null);assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
  }else{
   assert.equal(row.baseGitBlob,SHARING_FLOW_BASE_BLOBS[row.path]);assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);
   assert.equal(row.beforeAsset,'docs/fast-hands/baselines/sharing-flow/'+row.path);assert.equal('reverseEdits' in row,false);
  }
 }
 const expectedPreserved=Object.keys(SHARING_FLOW_BASE_BLOBS).filter(p=>!SHARING_FLOW_CHANGED.includes(p)).sort();
 assert.deepEqual(ledger.preserved.map(r=>r.path).sort(),expectedPreserved,'Exact sharing flow preserved inventory');
 for(const row of ledger.preserved)assert.equal(row.gitBlob,SHARING_FLOW_BASE_BLOBS[row.path],row.path);
 assert.deepEqual(ledger.historicalLedgers.map(r=>r.path).sort(),Object.keys(SHARING_FLOW_HISTORY_SHA).sort(),'Exact historical ledger inventory');
 for(const row of ledger.historicalLedgers){assert.equal(row.sha256,SHARING_FLOW_HISTORY_SHA[row.path],row.path);assert.equal(row.gitBlob,SHARING_FLOW_HISTORY_BLOBS[row.path],row.path)}
 return ledger;
}

export const sharingFlowLedger=()=>validateSharingFlowLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/SHARING-FLOW-MANIFEST.json',root),'utf8')));

export function reverseSharingFlow(path,bytes,ledger=sharingFlowLedger(),outerLedger=resultUploadLedger()){
 bytes=reverseResultUpload(path,bytes,outerLedger);
 const row=ledger.files.find(r=>r.path===path);
 if(!row){
  const preserved=ledger.preserved?.find(r=>r.path===path);
  if(preserved)assert.equal(blob(bytes),preserved.gitBlob,'Sharing flow preserved bytes '+path);
  return Buffer.from(bytes);
 }
 assert.ok(SHARING_FLOW_ALLOWED.includes(path),'Unapproved sharing flow path '+path);
 assert.equal(hash(bytes),row.sha256,'Sharing flow current bytes '+path);
 if(row.beforeSha256===null){
  assert.ok(SHARING_FLOW_ADDED.includes(path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
  return Buffer.from(bytes);
 }
 assert.ok(SHARING_FLOW_CHANGED.includes(path));assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);
 let restored;
 if(row.beforeAsset){
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/sharing-flow/'+path);assert.equal('reverseEdits' in row,false);
  restored=readFileSync(new URL(row.beforeAsset,root));
 }else{
  assert.ok(Array.isArray(row.reverseEdits));let end=0;
  for(const edit of row.reverseEdits){
   assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=end&&edit.end>=edit.start&&edit.end<=bytes.length);
   assert.equal(typeof edit.beforeBase64,'string');assert.equal(Buffer.from(edit.beforeBase64,'base64').toString('base64'),edit.beforeBase64);end=edit.end;
  }
  restored=Buffer.from(bytes);
  for(const edit of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 }
 assert.equal(hash(restored),row.beforeSha256,'Restored sharing flow bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored sharing flow Git blob '+path);
 return restored;
}

export function readSharingFlowBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseSharingFlow(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}

export function sharingFlowRuntimeAdditions(){
 const ledger=sharingFlowLedger();
 for(const path of SHARING_FLOW_ADDED)reverseSharingFlow(path,readFileSync(new URL(path,root)),ledger);
 return [...SHARING_FLOW_ADDED,...resultUploadRuntimeAdditions()];
}
