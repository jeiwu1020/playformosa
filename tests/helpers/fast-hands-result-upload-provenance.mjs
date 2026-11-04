import {reverseArtPolish,artPolishLedger,artPolishRuntimeAdditions} from './fast-hands-art-polish-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
import {RESULT_UPLOAD_BASE_COMMIT,RESULT_UPLOAD_BASE_TREE,RESULT_UPLOAD_BASE_BLOBS,RESULT_UPLOAD_BEFORE_SHA,RESULT_UPLOAD_HISTORY_SHA,RESULT_UPLOAD_HISTORY_BLOBS} from './fast-hands-result-upload-pins.mjs';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const RESULT_UPLOAD_CHANGED=Object.freeze([
 'public/games/fast-hands/app.mjs',
 'public/games/fast-hands/catch.html',
 'public/games/fast-hands/club.css',
 'public/games/fast-hands/duel.html',
 'public/games/fast-hands/finale.css',
 'public/games/fast-hands/index.html',
 'public/games/fast-hands/leaderboard.mjs',
 'public/games/fast-hands/levels-app.mjs',
 'public/games/fast-hands/levels-leaderboard.mjs'
]);
export const RESULT_UPLOAD_ADDED=Object.freeze(['public/games/fast-hands/result-upload-host.mjs']);
export const RESULT_UPLOAD_ALLOWED=Object.freeze([...RESULT_UPLOAD_CHANGED,...RESULT_UPLOAD_ADDED]);

function validateFile(row){
 assert.ok(RESULT_UPLOAD_ALLOWED.includes(row.path),'Unapproved result upload path '+row.path);
 assert.match(row.sha256,/^[a-f0-9]{64}$/);
 if(RESULT_UPLOAD_ADDED.includes(row.path)){
  assert.equal(row.beforeSha256,null);assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
 }else{
  assert.equal(row.baseGitBlob,RESULT_UPLOAD_BASE_BLOBS[row.path],'Pinned result upload baseline blob '+row.path);
  assert.equal(row.beforeSha256,RESULT_UPLOAD_BEFORE_SHA[row.path],'Pinned result upload baseline digest '+row.path);
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/result-upload/'+row.path);assert.equal('reverseEdits' in row,false);
 }
}

export function validateResultUploadLedger(ledger){
 assert.equal(ledger.schemaVersion,1);assert.equal(ledger.baseCommit,RESULT_UPLOAD_BASE_COMMIT);assert.equal(ledger.baseTree,RESULT_UPLOAD_BASE_TREE);
 assert.deepEqual(ledger.files.map(r=>r.path).sort(),[...RESULT_UPLOAD_ALLOWED].sort(),'Exact result upload change inventory');
 for(const row of ledger.files)validateFile(row);
 const preserved=Object.keys(RESULT_UPLOAD_BASE_BLOBS).filter(p=>!RESULT_UPLOAD_CHANGED.includes(p)).sort();
 assert.deepEqual(ledger.preserved.map(r=>r.path).sort(),preserved,'Exact result upload preserved inventory');
 for(const row of ledger.preserved)assert.equal(row.gitBlob,RESULT_UPLOAD_BASE_BLOBS[row.path],row.path);
 assert.deepEqual(ledger.historicalLedgers.map(r=>r.path).sort(),Object.keys(RESULT_UPLOAD_HISTORY_SHA).sort(),'Exact historical ledger inventory');
 for(const row of ledger.historicalLedgers){assert.equal(row.sha256,RESULT_UPLOAD_HISTORY_SHA[row.path],row.path);assert.equal(row.gitBlob,RESULT_UPLOAD_HISTORY_BLOBS[row.path],row.path)}
 return ledger;
}
export const resultUploadLedger=()=>validateResultUploadLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/RESULT-UPLOAD-MANIFEST.json',root),'utf8')));

export function reverseResultUpload(path,bytes,ledger=resultUploadLedger(),outerLedger=artPolishLedger()){
 bytes=reverseArtPolish(path,bytes,outerLedger);
 const rows=ledger.files.filter(r=>r.path===path);assert.ok(rows.length<=1,'Duplicate result upload entry '+path);
 if(!rows.length){
  const preserved=ledger.preserved?.filter(r=>r.path===path)??[];assert.ok(preserved.length<=1,'Duplicate result upload preserved entry '+path);
  if(preserved.length){assert.equal(preserved[0].gitBlob,RESULT_UPLOAD_BASE_BLOBS[path],path);assert.equal(blob(bytes),preserved[0].gitBlob,'Result upload preserved bytes '+path)}
  return Buffer.from(bytes);
 }
 const row=rows[0];validateFile(row);
 assert.equal(hash(bytes),row.sha256,'Result upload current bytes '+path);
 if(row.beforeSha256===null)return Buffer.from(bytes);
 const restored=readFileSync(new URL(row.beforeAsset,root));
 assert.equal(hash(restored),row.beforeSha256,'Restored result upload bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored result upload Git blob '+path);
 return restored;
}

export function readResultUploadBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseResultUpload(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
export function resultUploadRuntimeAdditions(){
 const ledger=resultUploadLedger();for(const path of RESULT_UPLOAD_ADDED)reverseResultUpload(path,readFileSync(new URL(path,root)),ledger);
 return [...RESULT_UPLOAD_ADDED,...artPolishRuntimeAdditions()];
}
