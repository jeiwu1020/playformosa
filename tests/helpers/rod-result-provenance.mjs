import {reverseRodReplay} from './rod-replay-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../public/games/',import.meta.url));
export const resultLedger=()=>JSON.parse(readFileSync(new URL('../../docs/minigames/REACTION-ROD-RESULT-MANIFEST.json',import.meta.url),'utf8'));
export const resultHash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Only exact documented presentation edits can be reversed into historical tests.
export function reverseRodResult(path,bytes){
 bytes=reverseRodReplay(path,bytes);
 const entry=resultLedger().files.find(file=>file.path===path);
 if(!entry?.beforeSha256)return Buffer.from(bytes);
 assert.equal(resultHash(bytes),entry.sha256,'Rod result current bytes '+path);
 let restored=Buffer.from(bytes);
 for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(resultHash(restored),entry.beforeSha256,'Rod result exact reverse '+path);
 assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),entry.baseGitBlob,'Rod result pinned baseline blob '+path);
 return restored;
}
export function readResultBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(root,absolute).split(sep).join('/');
 const bytes=reverseRodResult(path,readFileSync(file));
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
