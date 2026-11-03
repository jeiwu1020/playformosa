import {reverseRodViewport} from './rod-viewport-provenance.mjs';
import {readFileSync as readActual} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const hashV2=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ledgerV2=()=>JSON.parse(readActual(new URL('../../docs/minigames/UI-STANDARD-MANIFEST.json',import.meta.url),'utf8')).unifiedV2;
// These reverse edits are an exact, hash-checked V2 UI overlay, not exemptions.
// All old provenance tests still compare reconstructed bytes to their old hashes.
export function reverseV2(path,bytes,ledger=ledgerV2()){
 const f=ledger.files.find(x=>x.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hashV2(bytes),f.sha256,'V2 current bytes '+path);
 assert.ok(f.beforeSha256,'new V2 module has no invented baseline '+path);
 let restored=Buffer.from(bytes);
 for(const edit of [...f.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(hashV2(restored),f.beforeSha256,'V2 exact reverse '+path);
 const blob=createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex');assert.equal(blob,f.baseGitBlob,'V2 pinned baseline blob '+path);
 return restored;
}
export function readV2Baseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
 const rel=relative(resolve(root,'public/games'),absolute).split(sep).join('/');
 const bytes=reverseRodViewport(rel,readActual(file));const record=!rel.startsWith('../')&&ledgerV2().files.find(x=>x.path===rel);
 const result=record?.beforeSha256?reverseV2(rel,bytes):bytes;
 const encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function verifyV2History(manifest){const old={...manifest};delete old.unifiedV2;assert.equal(hashV2(JSON.stringify(old)),manifest.unifiedV2.historySha256,'all historical provenance values unchanged');}
