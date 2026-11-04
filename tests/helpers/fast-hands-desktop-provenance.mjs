import {resultUploadLedger} from './fast-hands-result-upload-provenance.mjs';
import {sharingFlowLedger} from './fast-hands-sharing-flow-provenance.mjs';
import {reverseFinale,finaleLedger} from './fast-hands-finale-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export const DESKTOP_ALLOWED=Object.freeze(['public/games/fast-hands/club.css']);
export const desktopLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/DESKTOP-MANIFEST.json',root),'utf8'));
export function reverseDesktop(path,bytes,ledger=desktopLedger(),outerLedger=finaleLedger(),sharingFlow=sharingFlowLedger(),resultUpload=resultUploadLedger()){
 bytes=reverseFinale(path,bytes,outerLedger,sharingFlow,resultUpload);
 const row=ledger.files.find(file=>file.path===path);
 if(!row)return Buffer.from(bytes);
 assert.ok(DESKTOP_ALLOWED.includes(path),'Unapproved desktop path '+path);
 assert.equal(hash(bytes),row.sha256,'Desktop current bytes '+path);
 assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);
 assert.ok(Array.isArray(row.reverseEdits));let end=0;
 for(const edit of row.reverseEdits){
  assert.ok(Number.isInteger(edit.start)&&Number.isInteger(edit.end)&&edit.start>=end&&edit.end>=edit.start&&edit.end<=bytes.length);
  assert.equal(typeof edit.beforeBase64,'string');assert.equal(Buffer.from(edit.beforeBase64,'base64').toString('base64'),edit.beforeBase64);
  end=edit.end;
 }
 let restored=Buffer.from(bytes);
 for(const edit of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(hash(restored),row.beforeSha256,'Restored desktop bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored desktop Git blob '+path);
 return restored;
}
export function readDesktopBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseDesktop(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
