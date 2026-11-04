import {readFileSync as readActual} from 'node:fs';
import {readStartupBaseline} from './startup-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';

const gamesRoot=fileURLToPath(new URL('../../public/games/',import.meta.url));
export const studioLedger=()=>JSON.parse(readActual(new URL('../../docs/minigames/STUDIO-BRAND-MANIFEST.json',import.meta.url),'utf8'));
export const studioHash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Only the hash-pinned studio overlay is removed at historical read boundaries.
// The older reversal chain still receives, and checks, its exact original bytes.
export function reverseStudio(path,bytes,ledger=studioLedger()){
 const entry=ledger.files.find(file=>file.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(studioHash(bytes),entry.sha256,'Studio current bytes '+path);
 assert.ok(Array.isArray(entry.reverseEdits),'Studio reverse edits '+path);
 if(entry.beforeSha256===null){
  assert.equal(entry.baseGitBlob,null,'Studio new file has no parent Git blob '+path);
  assert.deepEqual(entry.reverseEdits,[],'Studio new file has no invented baseline '+path);
  return Buffer.from(bytes);
 }
 assert.match(entry.beforeSha256,/^[0-9a-f]{64}$/,'Studio parent hash '+path);
 let previousEnd=0;
 for(const edit of entry.reverseEdits){
  assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=previousEnd&&edit.end>=edit.start&&edit.end<=bytes.length,'Studio byte edit bounds '+path);
  assert.equal(typeof edit.beforeBase64,'string','Studio original edit bytes '+path);
  previousEnd=edit.end;
 }
 let restored=Buffer.from(bytes);
 for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(studioHash(restored),entry.beforeSha256,'Studio exact reverse '+path);
 const blob=createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex');
 assert.equal(blob,entry.baseGitBlob,'Studio pinned baseline blob '+path);
 return restored;
}

export function readStudioBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
 const path=relative(gamesRoot,absolute).split(sep).join('/');
 const bytes=readStartupBaseline(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const withinGames=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=withinGames?reverseStudio(path,bytes):bytes;
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}

// Historical directory inventories may add this one reviewed runtime file only.
// Check its current bytes before admitting the path; do not filter arbitrary files.
export function studioRuntimeAdditions(){
 const ledger=studioLedger(),added=ledger.files.filter(file=>file.beforeSha256===null);
 assert.deepEqual(added.map(file=>file.path).sort(),['shared/studio-brand.css'],'Studio exact new runtime allowlist');
 for(const file of added)reverseStudio(file.path,readActual(new URL('../../public/games/'+file.path,import.meta.url)),ledger);
 return added.map(file=>'public/games/'+file.path);
}
