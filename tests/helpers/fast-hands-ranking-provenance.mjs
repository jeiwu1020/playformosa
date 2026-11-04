import {readLoadingLookBaseline} from './loading-look-provenance.mjs';
import {readFileSync as readActual} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
export const RANKING_MODIFIED=Object.freeze(['public/games/fast-hands/app.mjs','public/games/fast-hands/index.html','public/games/fast-hands/style.css','worker/leaderboard/index.mjs','src/catalog.mjs','public/index.html']);
export const RANKING_ADDED=Object.freeze(['public/games/fast-hands/leaderboard.mjs','public/games/fast-hands/replay.mjs','public/assets/fast-hands-card-v2.webp','public/assets/beer-slide-card-v2.webp']);
export const rankingLedger=()=>JSON.parse(readActual(new URL('docs/fast-hands/QA-LEADERBOARD-MANIFEST.json',root),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// The latest bounded feature is reversed before startup, studio, and import
// readers. All historical checks continue to inspect their original exact bytes.
export function reverseRanking(path,bytes,ledger=rankingLedger()){
 const f=ledger.files.find(file=>file.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,'Ranking current bytes '+path);
 assert.ok(Array.isArray(f.reverseEdits),'Ranking edits '+path);
 if(f.beforeSha256===null){assert.ok(RANKING_ADDED.includes(path));assert.equal(f.baseGitBlob,null);assert.deepEqual(f.reverseEdits,[]);return Buffer.from(bytes);}
 assert.ok(RANKING_MODIFIED.includes(path));assert.match(f.beforeSha256,/^[0-9a-f]{64}$/);let previousEnd=0;
 for(const e of f.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=previousEnd&&e.end>=e.start&&e.end<=bytes.length,'Ranking edit bounds '+path);assert.equal(typeof e.beforeBase64,'string');previousEnd=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...f.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),f.beforeSha256,'Ranking exact reverse '+path);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),f.baseGitBlob,'Ranking pinned baseline '+path);return restored;
}
export function readRankingBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readLoadingLookBaseline(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseRanking(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function rankingRuntimeAdditions(){
 const l=rankingLedger();assert.deepEqual(l.files.map(f=>f.path),[...RANKING_MODIFIED,...RANKING_ADDED]);assert.deepEqual(l.files.filter(f=>f.beforeSha256===null).map(f=>f.path),RANKING_ADDED);
 for(const path of RANKING_ADDED)reverseRanking(path,readActual(new URL(path,root)),l);return [...RANKING_ADDED];
}
