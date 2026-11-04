import {stabilityRuntimeAdditions} from './fast-hands-stability-provenance.mjs';
import {reverseLayoutDart} from './fast-hands-layout-dart-provenance.mjs';
import {readFileSync} from 'node:fs';import{createHash}from'node:crypto';import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ART_ADDED=Object.freeze(['public/games/fast-hands/levels-world.mjs','public/games/fast-hands/levels-stage.mjs','public/games/fast-hands/assets/duel-items-atlas.png','public/games/fast-hands/assets/levels-catch-ready.png','public/games/fast-hands/assets/levels-catch-grab.png','public/games/fast-hands/assets/levels-duel-ready.png','public/games/fast-hands/assets/levels-duel-player.png','public/games/fast-hands/assets/levels-duel-ai.png','public/games/fast-hands/assets/levels-pose-provenance.json']);
export const ART_CHANGED=Object.freeze(['public/games/fast-hands/catch.html','public/games/fast-hands/duel.html','public/games/fast-hands/levels.css','public/games/fast-hands/levels-app.mjs','public/games/fast-hands/levels-rules.mjs']);
export const artLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/LEVELS-ART-MANIFEST.json',root),'utf8'));
export function reverseArt(path,bytes,ledger=artLedger()){
 bytes=reverseLayoutDart(path,bytes);
 const row=ledger.files.find(f=>f.path===path);if(!row)return Buffer.from(bytes);assert.equal(hash(bytes),row.sha256,'Art current bytes '+path);
 if(row.beforeSha256===null){assert.ok(ART_ADDED.includes(path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);return Buffer.from(bytes);}
 assert.ok(ART_CHANGED.includes(path));assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);let end=0;
 for(const e of row.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');end=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),row.beforeSha256);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),row.baseGitBlob);return restored;
}
export function artRuntimeAdditions(){const ledger=artLedger();assert.deepEqual(ledger.files.map(f=>f.path),[...ART_CHANGED,...ART_ADDED]);for(const path of ART_ADDED)reverseArt(path,readFileSync(new URL(path,root)),ledger);return [...ART_ADDED,...stabilityRuntimeAdditions()];}
