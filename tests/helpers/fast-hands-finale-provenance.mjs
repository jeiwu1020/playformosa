import {resultUploadLedger} from './fast-hands-result-upload-provenance.mjs';
import {reverseSharingFlow,sharingFlowLedger,sharingFlowRuntimeAdditions} from './fast-hands-sharing-flow-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root),prefix='public/games/fast-hands/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const FINALE_CHANGED=Object.freeze(["public/games/fast-hands/app.mjs", "public/games/fast-hands/index.html", "public/games/fast-hands/catch.html", "public/games/fast-hands/duel.html", "public/games/fast-hands/levels-app.mjs", "public/games/fast-hands/levels-motion.mjs", "public/games/fast-hands/levels-world.mjs", "public/games/fast-hands/levels-stage.mjs", "public/games/fast-hands/assets/levels-pose-provenance.json", "public/games/fast-hands/assets/levels-catch-empty-mid.png", "public/games/fast-hands/assets/levels-catch-grab.png", "public/games/fast-hands/assets/levels-catch-reach.png", "public/games/fast-hands/assets/levels-catch-ready.png", "public/games/fast-hands/assets/levels-catch-return-mid.png", "public/games/fast-hands/assets/levels-catch-return.png", "public/games/fast-hands/assets/levels-duel-ai-grab.png", "public/games/fast-hands/assets/levels-duel-ai-reach.png", "public/games/fast-hands/assets/levels-duel-ai-return-mid.png", "public/games/fast-hands/assets/levels-duel-ai.png", "public/games/fast-hands/assets/levels-duel-player-grab.png", "public/games/fast-hands/assets/levels-duel-player-reach.png", "public/games/fast-hands/assets/levels-duel-player-return-mid.png", "public/games/fast-hands/assets/levels-duel-player.png", "public/games/fast-hands/assets/levels-duel-ready.png", "worker/leaderboard/index.mjs", "scripts/render-fast-hands-levels.mjs"]);
export const FINALE_ADDED=Object.freeze(["public/games/fast-hands/levels-leaderboard.mjs", "public/games/fast-hands/levels-ranking.css", "public/games/fast-hands/levels-replay.mjs", "public/games/fast-hands/finale-image.mjs", "public/games/fast-hands/finale.css", "public/games/fast-hands/levels-sound.mjs", "public/games/fast-hands/assets/levels-duel-player-place.png", "public/games/fast-hands/assets/levels-catch-place.png", "public/games/fast-hands/assets/levels-catch-guns.png", "public/games/fast-hands/assets/levels-duel-player-guns.png", "public/games/fast-hands/assets/levels-duel-ai-guns.png", "public/games/fast-hands/assets/levels-duel-neutral.png", "public/games/fast-hands/assets/levels-duel-ai-place.png"]);
export const FINALE_ALLOWED=Object.freeze([...FINALE_CHANGED,...FINALE_ADDED]);
export const finaleLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/FINALE-MANIFEST.json',root),'utf8'));
export function reverseFinale(path,bytes,ledger=finaleLedger(),outerLedger=sharingFlowLedger(),resultUpload=resultUploadLedger()){
 bytes=reverseSharingFlow(path,bytes,outerLedger,resultUpload);
 const row=ledger.files.find(r=>r.path===path);if(!row)return Buffer.from(bytes);
 assert.ok(FINALE_ALLOWED.includes(path),'Unapproved finale path '+path);
 assert.equal(hash(bytes),row.sha256,'Finale current bytes '+path);
 if(row.beforeSha256===null){assert.ok(FINALE_ADDED.includes(path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);return Buffer.from(bytes)}
 assert.ok(FINALE_CHANGED.includes(path));assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);
 let restored;
 if(row.beforeAsset){assert.equal(row.beforeAsset,'docs/fast-hands/baselines/finale/'+path);assert.equal('reverseEdits' in row,false);restored=readFileSync(new URL(row.beforeAsset,root))}
 else{assert.ok(Array.isArray(row.reverseEdits));let end=0;for(const e of row.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');assert.equal(Buffer.from(e.beforeBase64,'base64').toString('base64'),e.beforeBase64);end=e.end}restored=Buffer.from(bytes);for(const e of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)])}
 assert.equal(hash(restored),row.beforeSha256,'Restored finale bytes '+path);assert.equal(blob(restored),row.baseGitBlob,'Restored finale Git blob '+path);return restored;
}
export function readFinaleBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseFinale(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function finaleRuntimeAdditions(){const l=finaleLedger();assert.deepEqual(l.files.map(r=>r.path).sort(),[...FINALE_ALLOWED].sort());for(const p of FINALE_ADDED)reverseFinale(p,readFileSync(new URL(p,root)),l);return [...FINALE_ADDED,...sharingFlowRuntimeAdditions()]}
