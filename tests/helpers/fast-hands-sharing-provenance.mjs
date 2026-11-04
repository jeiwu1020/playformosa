import {readButtonLayoutBaseline} from './fast-hands-button-layout-provenance.mjs';
import {readFileSync as readActual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
export const SHARING_MODIFIED=Object.freeze(['public/games/fast-hands/app.mjs','public/games/fast-hands/index.html','public/games/fast-hands/style.css']);
export const SHARING_ADDED=Object.freeze(['public/games/fast-hands/share.mjs']);
export const sharingLedger=()=>JSON.parse(readActual(new URL('docs/fast-hands/SHARING-MANIFEST.json',root),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// The latest bounded feature is reversed before startup, studio, and import
// readers. All historical checks continue to inspect their original exact bytes.
export function reverseSharing(path,bytes,ledger=sharingLedger()){
 const f=ledger.files.find(file=>file.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,'Sharing current bytes '+path);
 assert.ok(Array.isArray(f.reverseEdits),'Sharing edits '+path);
 if(f.beforeSha256===null){assert.ok(SHARING_ADDED.includes(path));assert.equal(f.baseGitBlob,null);assert.deepEqual(f.reverseEdits,[]);return Buffer.from(bytes);}
 assert.ok(SHARING_MODIFIED.includes(path));assert.match(f.beforeSha256,/^[0-9a-f]{64}$/);let previousEnd=0;
 for(const e of f.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=previousEnd&&e.end>=e.start&&e.end<=bytes.length,'Sharing edit bounds '+path);assert.equal(typeof e.beforeBase64,'string');previousEnd=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...f.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),f.beforeSha256,'Sharing exact reverse '+path);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),f.baseGitBlob,'Sharing pinned baseline '+path);return restored;
}
export function readSharingBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readButtonLayoutBaseline(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseSharing(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function sharingRuntimeAdditions(){
 const l=sharingLedger();assert.deepEqual(l.files.map(f=>f.path),[...SHARING_MODIFIED,...SHARING_ADDED]);assert.deepEqual(l.files.filter(f=>f.beforeSha256===null).map(f=>f.path),SHARING_ADDED);
 for(const path of SHARING_ADDED)reverseSharing(path,readButtonLayoutBaseline(new URL(path,root)),l);return [...SHARING_ADDED];
}
