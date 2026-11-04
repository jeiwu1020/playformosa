import {readFileSync} from 'node:fs';import {readLevelsBaseline} from './fast-hands-levels-provenance.mjs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {resolve,relative,sep,isAbsolute} from 'node:path';import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root),hash=b=>createHash('sha256').update(b).digest('hex');
export const BUTTON_LAYOUT_PATHS=Object.freeze(['public/games/fast-hands/index.html','public/games/fast-hands/style.css']);
export const buttonLayoutLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/BUTTON-LAYOUT-MANIFEST.json',root),'utf8'));
export function reverseButtonLayout(path,bytes,ledger=buttonLayoutLedger()){
 const entry=ledger.files.find(f=>f.path===path);if(!entry)return Buffer.from(bytes);
 assert.ok(BUTTON_LAYOUT_PATHS.includes(path));assert.equal(hash(bytes),entry.sha256,'Button layout current bytes '+path);assert.match(entry.beforeSha256,/^[a-f0-9]{64}$/);assert.match(entry.baseGitBlob,/^[a-f0-9]{40}$/);assert.ok(Array.isArray(entry.reverseEdits));let end=0;
 for(const e of entry.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');end=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...entry.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),entry.beforeSha256);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),entry.baseGitBlob);return restored;
}
export function readButtonLayoutBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');const bytes=readLevelsBaseline(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);const result=within?reverseButtonLayout(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
