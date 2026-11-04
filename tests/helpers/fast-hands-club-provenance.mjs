import {sharingFlowLedger} from './fast-hands-sharing-flow-provenance.mjs';
import {finaleLedger} from './fast-hands-finale-provenance.mjs';
import {reverseEntry,entryLedger,entryRuntimeAdditions} from './fast-hands-entry-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const prefix='public/games/fast-hands/';
export const CLUB_CHANGED=Object.freeze(['app.mjs','catch.html','duel.html','index.html','levels-app.mjs'].map(path=>prefix+path));
export const CLUB_ADDED=Object.freeze(['club.css','club.mjs'].map(path=>prefix+path));
export const CLUB_ALLOWED=Object.freeze([...CLUB_CHANGED,...CLUB_ADDED]);
export const clubLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/CLUB-MANIFEST.json',root),'utf8'));
export function reverseClub(path,bytes,ledger=clubLedger(),outerLedger=entryLedger(),finale=finaleLedger(),sharingFlow=sharingFlowLedger()){
 bytes=reverseEntry(path,bytes,outerLedger,finale,sharingFlow);
 const row=ledger.files.find(file=>file.path===path);
 if(!row)return Buffer.from(bytes);
 assert.ok(CLUB_ALLOWED.includes(path),'Unapproved club path '+path);
 assert.equal(hash(bytes),row.sha256,'Club current bytes '+path);
 if(row.beforeSha256===null){
  assert.ok(CLUB_ADDED.includes(path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
  return Buffer.from(bytes);
 }
 assert.ok(CLUB_CHANGED.includes(path));assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);
 let restored;
 if(row.beforeAsset){
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/club/'+path.slice(prefix.length));
  assert.equal('reverseEdits' in row,false);restored=readFileSync(new URL(row.beforeAsset,root));
 }else{
  assert.ok(Array.isArray(row.reverseEdits));let end=0;
  for(const edit of row.reverseEdits){
   assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=end&&edit.end>=edit.start&&edit.end<=bytes.length);
   assert.equal(typeof edit.beforeBase64,'string');assert.equal(Buffer.from(edit.beforeBase64,'base64').toString('base64'),edit.beforeBase64);
   end=edit.end;
  }
  restored=Buffer.from(bytes);
  for(const edit of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 }
 assert.equal(hash(restored),row.beforeSha256,'Restored club bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored club Git blob '+path);
 return restored;
}
export function readClubBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseClub(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
export function clubRuntimeAdditions(){
 const ledger=clubLedger();assert.deepEqual(ledger.files.map(file=>file.path).sort(),[...CLUB_ALLOWED].sort());
 for(const path of CLUB_ADDED)reverseClub(path,readFileSync(new URL(path,root)),ledger);
 return [...CLUB_ADDED,...entryRuntimeAdditions()];
}
