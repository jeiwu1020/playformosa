import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
export const polishLedger=()=>JSON.parse(readFileSync(new URL('../../docs/minigames/REACTION-ROD-POLISH-MANIFEST.json',import.meta.url),'utf8'));
export const polishHash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Reverse only reviewed, hash-pinned presentation bytes before older ledgers run.
export function reverseRodPolish(path,bytes){
 const entry=polishLedger().files.find(file=>file.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(polishHash(bytes),entry.sha256,'Rod polish current bytes '+path);
 let restored=Buffer.from(bytes);for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(polishHash(restored),entry.beforeSha256,'Rod polish exact reverse '+path);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),entry.baseGitBlob,'Rod polish parent Git blob '+path);return restored;
}
