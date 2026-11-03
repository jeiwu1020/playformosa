import {reverseRodPolish} from './rod-polish-provenance.mjs';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
export const replayLedger=()=>JSON.parse(readFileSync(new URL('../../docs/minigames/REACTION-ROD-REPLAY-MANIFEST.json',import.meta.url),'utf8'));
export const replayHash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Validate every current byte before reconstructing the exact published parent.
export function reverseRodReplay(path,bytes){
 bytes=reverseRodPolish(path,bytes);
 const entry=replayLedger().files.find(file=>file.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(replayHash(bytes),entry.sha256,'Rod replay current bytes '+path);if(!entry.beforeSha256)return Buffer.from(bytes);
 let restored=Buffer.from(bytes);for(const edit of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,edit.start),Buffer.from(edit.beforeBase64,'base64'),restored.subarray(edit.end)]);
 assert.equal(replayHash(restored),entry.beforeSha256,'Rod replay exact reverse '+path);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),entry.baseGitBlob,'Rod replay parent Git blob '+path);return restored;
}
