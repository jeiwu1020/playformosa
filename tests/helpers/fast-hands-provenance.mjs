import {readFileSync as readActual}from'node:fs';
import {readStartupBaseline}from'./startup-provenance.mjs';
import {createHash}from'node:crypto';
import {fileURLToPath}from'node:url';
import {resolve,relative,sep}from'node:path';
import assert from'node:assert/strict';
import{reverseStudio}from'./studio-provenance.mjs';
import{fastHandsAddedPaths,fastHandsModifiedPaths}from'./fast-hands-allowlist.mjs';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
export const fastHandsLedger=()=>JSON.parse(readActual(new URL('docs/fast-hands/platform-manifest.json',root),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
export function reverseFastHands(path,bytes,ledger=fastHandsLedger()){
 const f=ledger.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,'Fast hands current bytes '+path);
 if(f.beforeSha256===null){assert.ok(fastHandsAddedPaths.includes(path));assert.equal(f.baseGitBlob,null);assert.deepEqual(f.reverseEdits,[]);return Buffer.from(bytes);}
 assert.ok(fastHandsModifiedPaths.includes(path));let end=0;
 for(const e of f.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length,'Fast hands reverse bounds '+path);assert.equal(typeof e.beforeBase64,'string');end=e.end;}
 let old=Buffer.from(bytes);for(const e of [...f.reverseEdits].reverse())old=Buffer.concat([old.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),old.subarray(e.end)]);
 assert.equal(hash(old),f.beforeSha256,'Fast hands exact reverse '+path);
 assert.equal(createHash('sha1').update(`blob ${old.length}\0`).update(old).digest('hex'),f.baseGitBlob,'Fast hands pinned baseline '+path);return old;
}
// Reverse this new game's bounded presentation integration first, then the
// independently verified studio overlay. Historical checks still see exact bytes.
export function readFastHandsBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));const path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readStartupBaseline(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 let result=reverseFastHands(path,bytes);if(path.startsWith('public/games/'))result=reverseStudio(path.slice('public/games/'.length),result);
 const encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function fastHandsRuntimeAdditions(){const l=fastHandsLedger();assert.equal(l.baseCommit,'cf79891c69863c1b598da3c364493e79076aca96');assert.deepEqual(l.added,fastHandsAddedPaths);assert.deepEqual(l.modified,fastHandsModifiedPaths);assert.deepEqual(l.files.map(f=>f.path),[...fastHandsModifiedPaths,...fastHandsAddedPaths]);for(const path of fastHandsAddedPaths)reverseFastHands(path,readStartupBaseline(new URL(path,root)),l);return [...fastHandsAddedPaths];}
