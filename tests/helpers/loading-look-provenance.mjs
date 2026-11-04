import {readFileSync as readActual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';

const gamesRoot=fileURLToPath(new URL('../../public/games/',import.meta.url));
export const loadingLookLedger=()=>JSON.parse(readActual(new URL('../../docs/minigames/LOADING-LOOK-MANIFEST.json',import.meta.url),'utf8'));
export const loadingLookHash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Only the hash-pinned loadingLook overlay is removed at historical read boundaries.
// The older reversal chain still receives, and checks, its exact original bytes.
export function reverseLoadingLook(path,bytes,ledger=loadingLookLedger()){
 const entry=ledger.files.find(file=>file.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(loadingLookHash(bytes),entry.sha256,'LoadingLook current bytes '+path);
 assert.ok(Array.isArray(entry.reverseEdits),'LoadingLook reverse edits '+path);
 if(entry.beforeSha256===null){
  assert.equal(entry.baseGitBlob,null,'LoadingLook new file has no parent Git blob '+path);
  assert.deepEqual(entry.reverseEdits,[],'LoadingLook new file has no invented baseline '+path);
  return Buffer.from(bytes);
 }
 assert.match(entry.beforeSha256,/^[0-9a-f]{64}$/,'LoadingLook parent hash '+path);
 let previousEnd=0;
 for(const edit of entry.reverseEdits){
  assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=previousEnd&&edit.end>=edit.start&&edit.end<=bytes.length,'LoadingLook byte edit bounds '+path);
  assert.equal(typeof edit.beforeBase64,'string','LoadingLook original edit bytes '+path);
  previousEnd=edit.end;
 }
 let restored=Buffer.from(bytes);
 for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(loadingLookHash(restored),entry.beforeSha256,'LoadingLook exact reverse '+path);
 const blob=createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex');
 assert.equal(blob,entry.baseGitBlob,'LoadingLook pinned baseline blob '+path);
 return restored;
}

export function readLoadingLookBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
 const path=relative(gamesRoot,absolute).split(sep).join('/');
 const bytes=readActual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const withinGames=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=withinGames?reverseLoadingLook(path,bytes):bytes;
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}

