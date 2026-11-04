import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=b=>createHash('sha256').update(b).digest('hex');
export const LAYOUT_DART_ALLOWED=Object.freeze(['public/games/fast-hands/style.css','public/games/fast-hands/levels-world.mjs','public/games/fast-hands/levels.css','public/games/fast-hands/assets/levels-catch-ready.png','public/games/fast-hands/assets/levels-catch-grab.png','public/games/fast-hands/assets/levels-pose-provenance.json']);
export const layoutDartLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/LAYOUT-DART-MANIFEST.json',root),'utf8'));
export function reverseLayoutDart(path,bytes,ledger=layoutDartLedger()){
 const row=ledger.files.find(f=>f.path===path);if(!row)return Buffer.from(bytes);
 assert.ok(LAYOUT_DART_ALLOWED.includes(path));assert.equal(hash(bytes),row.sha256,'Layout/dart current bytes '+path);assert.match(row.beforeSha256,/^[a-f0-9]{64}$/);assert.match(row.baseGitBlob,/^[a-f0-9]{40}$/);let end=0;
 for(const e of row.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');end=e.end;}
 let restored=Buffer.from(bytes);for(const e of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);
 assert.equal(hash(restored),row.beforeSha256);assert.equal(createHash('sha1').update(`blob ${restored.length}\0`).update(restored).digest('hex'),row.baseGitBlob);return restored;
}
export function readLayoutDartBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseLayoutDart(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;
}
