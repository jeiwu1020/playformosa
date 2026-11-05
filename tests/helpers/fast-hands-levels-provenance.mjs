import {readBeforePolish} from './upload-toolbar-polish-provenance.mjs';
import {reverseArt,artRuntimeAdditions} from './fast-hands-levels-art-provenance.mjs';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {resolve,relative,sep,isAbsolute} from 'node:path';import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root),hash=b=>createHash('sha256').update(b).digest('hex');
export const LEVEL_ADDED=Object.freeze(['public/games/fast-hands/level-nav.css','public/games/fast-hands/levels.css','public/games/fast-hands/levels-rules.mjs','public/games/fast-hands/levels-app.mjs','public/games/fast-hands/catch.html','public/games/fast-hands/duel.html']);
export const levelLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/LEVELS-MANIFEST.json',root),'utf8'));
export function reverseLevels(path,bytes,ledger=levelLedger()){
 bytes=reverseArt(path,bytes);
 const entry=ledger.files.find(f=>f.path===path);if(!entry)return Buffer.from(bytes);
 assert.equal(hash(bytes),entry.sha256,'Levels current bytes '+path);
 if(entry.beforeSha256===null){assert.ok(LEVEL_ADDED.includes(path));assert.equal(entry.baseGitBlob,null);assert.deepEqual(entry.reverseEdits,[]);return Buffer.from(bytes);}
 assert.equal(path,'public/games/fast-hands/index.html');assert.match(entry.beforeSha256,/^[a-f0-9]{64}$/);assert.match(entry.baseGitBlob,/^[a-f0-9]{40}$/);assert.ok(Array.isArray(entry.reverseEdits));let end=0;
 for(const e of entry.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');end=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),entry.beforeSha256);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),entry.baseGitBlob);return restored;
}
export function readLevelsBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');const bytes=readBeforePolish(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);const result=within?reverseLevels(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
export function levelsRuntimeAdditions(){const ledger=levelLedger();assert.deepEqual(ledger.files.map(f=>f.path),['public/games/fast-hands/index.html',...LEVEL_ADDED]);for(const path of LEVEL_ADDED)reverseLevels(path,readBeforePolish(new URL(path,root)),ledger);return [...LEVEL_ADDED,...artRuntimeAdditions()];}
