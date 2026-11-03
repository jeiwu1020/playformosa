import {reverseRodResult} from './rod-result-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const viewportLedger=()=>JSON.parse(readFileSync(new URL('../../docs/minigames/REACTION-ROD-VIEWPORT-MANIFEST.json',import.meta.url),'utf8'));
export const hashViewport=bytes=>createHash('sha256').update(bytes).digest('hex');
// A narrowly reversible later overlay. Historical manifests remain byte-exact;
// every current byte must match the new ledger before old assertions can run.
export function reverseRodViewport(path,bytes){
 bytes=reverseRodResult(path,bytes);
 if(path!=='reaction-rod/index.html')return Buffer.from(bytes);
 const ledger=viewportLedger(),entry=ledger.files.find(f=>f.path===path);
 assert.equal(hashViewport(bytes),entry.sha256,'Rod viewport current bytes');
 let restored=bytes.toString();
 for(const addition of ledger.htmlInsertions){
  assert.equal(restored.split(addition).length,2,'one exact viewport insertion');
  restored=restored.replace(addition,'');
 }
 const original=Buffer.from(restored);
 assert.equal(hashViewport(original),entry.beforeSha256,'Rod viewport exact reverse');
 assert.equal(createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex'),entry.baseGitBlob,'Rod viewport pinned baseline blob');
 return original;
}
