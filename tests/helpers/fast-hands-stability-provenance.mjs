import {readBeforePolish} from './upload-toolbar-polish-provenance.mjs';
import {reverseClub,clubRuntimeAdditions} from './fast-hands-club-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const prefix='public/games/fast-hands/';
export const STABILITY_CHANGED=Object.freeze([
 'levels-app.mjs','levels-rules.mjs','levels.css','levels-world.mjs','catch.html','duel.html',
 'assets/levels-catch-ready.png','assets/levels-catch-grab.png','assets/levels-duel-ready.png',
 'assets/levels-duel-player.png','assets/levels-duel-ai.png','assets/levels-pose-provenance.json',
].map(path=>prefix+path).sort());
export const STABILITY_ADDED=Object.freeze([
 'levels-motion.mjs','assets/levels-catch-reach.png','assets/levels-catch-return-mid.png',
 'assets/levels-catch-return.png','assets/levels-catch-empty-mid.png',
 'assets/levels-duel-player-reach.png','assets/levels-duel-player-grab.png','assets/levels-duel-player-return-mid.png',
 'assets/levels-duel-ai-reach.png','assets/levels-duel-ai-grab.png','assets/levels-duel-ai-return-mid.png',
].map(path=>prefix+path).sort());
export const STABILITY_ALLOWED=Object.freeze([...STABILITY_CHANGED,...STABILITY_ADDED]);
export const STABILITY_SCRIPTS=Object.freeze(['scripts/render-fast-hands-levels.mjs']);
export const stabilityLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/STABILITY-MANIFEST.json',root),'utf8'));
export function reverseStability(path,bytes,ledger=stabilityLedger()){
 bytes=reverseClub(path,bytes);
 const row=[...ledger.files,...ledger.scriptFiles].find(file=>file.path===path);
 if(!row)return Buffer.from(bytes);
 assert.ok([...STABILITY_ALLOWED,...STABILITY_SCRIPTS].includes(path),'Unapproved stability path '+path);
 assert.equal(hash(bytes),row.sha256,'Stability current bytes '+path);
 if(row.beforeSha256===null){
  assert.ok(STABILITY_ADDED.includes(path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
  return Buffer.from(bytes);
 }
 assert.ok(!STABILITY_ADDED.includes(path));assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);
 let restored;
 if(row.beforeAsset){
  const suffix=path.startsWith(prefix)?path.slice(prefix.length):path;
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/stability/'+suffix);
  assert.equal('reverseEdits' in row,false);
  restored=readFileSync(new URL(row.beforeAsset,root));
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
 assert.equal(hash(restored),row.beforeSha256,'Restored stability bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored stability Git blob '+path);
 return restored;
}
export function readStabilityBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readBeforePolish(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseStability(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
export function stabilityRuntimeAdditions(){
 const ledger=stabilityLedger();
 assert.deepEqual(ledger.files.map(file=>file.path).sort(),[...STABILITY_ALLOWED].sort());
 for(const path of STABILITY_ADDED)reverseStability(path,readBeforePolish(new URL(path,root)),ledger);
 return [...STABILITY_ADDED,...clubRuntimeAdditions()];
}
