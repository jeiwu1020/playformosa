import {readFileSync as readActual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';

const gamesRoot=fileURLToPath(new URL('../../public/games/',import.meta.url));
export const startupLedger=()=>JSON.parse(readActual(new URL('../../docs/minigames/STARTUP-MANIFEST.json',import.meta.url),'utf8'));
export const startupHash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Only the hash-pinned startup overlay is removed at historical read boundaries.
// The older reversal chain still receives, and checks, its exact original bytes.
export function reverseStartup(path,bytes,ledger=startupLedger()){
 const entry=ledger.files.find(file=>file.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(startupHash(bytes),entry.sha256,'Startup current bytes '+path);
 assert.ok(Array.isArray(entry.reverseEdits),'Startup reverse edits '+path);
 if(entry.beforeSha256===null){
  assert.equal(entry.baseGitBlob,null,'Startup new file has no parent Git blob '+path);
  assert.deepEqual(entry.reverseEdits,[],'Startup new file has no invented baseline '+path);
  return Buffer.from(bytes);
 }
 assert.match(entry.beforeSha256,/^[0-9a-f]{64}$/,'Startup parent hash '+path);
 let previousEnd=0;
 for(const edit of entry.reverseEdits){
  assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=previousEnd&&edit.end>=edit.start&&edit.end<=bytes.length,'Startup byte edit bounds '+path);
  assert.equal(typeof edit.beforeBase64,'string','Startup original edit bytes '+path);
  previousEnd=edit.end;
 }
 let restored=Buffer.from(bytes);
 for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(startupHash(restored),entry.beforeSha256,'Startup exact reverse '+path);
 const blob=createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex');
 assert.equal(blob,entry.baseGitBlob,'Startup pinned baseline blob '+path);
 return restored;
}

export function readStartupBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
 const path=relative(gamesRoot,absolute).split(sep).join('/');
 const bytes=readActual(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const withinGames=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=withinGames?reverseStartup(path,bytes):bytes;
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}

// Historical directory inventories may add this one reviewed runtime file only.
// Check its current bytes before admitting the path; do not filter arbitrary files.
export function startupRuntimeAdditions(){
 const ledger=startupLedger(),added=ledger.files.filter(file=>file.beforeSha256===null);
 assert.deepEqual(added.map(file=>file.path).sort(),['shared/startup.js'],'Startup exact new runtime allowlist');
 for(const file of added)reverseStartup(file.path,readActual(new URL('../../public/games/'+file.path,import.meta.url)),ledger);
 return added.map(file=>'public/games/'+file.path);
}
