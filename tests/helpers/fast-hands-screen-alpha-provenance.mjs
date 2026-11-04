import {reverseStability} from './fast-hands-stability-provenance.mjs';
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{resolve,relative,sep,isAbsolute}from'node:path';import assert from'node:assert/strict';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root),hash=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const SCREEN_ALPHA_ALLOWED=Object.freeze(['style.css','levels.css','levels-app.mjs','levels-rules.mjs','levels-world.mjs','catch.html','duel.html','assets/duel-items-atlas.png','assets/levels-catch-ready.png','assets/levels-catch-grab.png','assets/levels-pose-provenance.json'].map(p=>'public/games/fast-hands/'+p));
export const screenAlphaLedger=()=>JSON.parse(readFileSync(new URL('docs/fast-hands/SCREEN-ALPHA-MANIFEST.json',root),'utf8'));
export function reverseScreenAlpha(path,bytes,ledger=screenAlphaLedger()){
 bytes=reverseStability(path,bytes);
 const row=ledger.files.find(f=>f.path===path);if(!row)return Buffer.from(bytes);assert.ok(SCREEN_ALPHA_ALLOWED.includes(path));assert.equal(hash(bytes),row.sha256,'Screen/alpha current bytes '+path);let restored;
 if(row.beforeAsset){assert.equal(row.beforeAsset,'docs/fast-hands/baselines/screen-alpha/'+path.slice('public/games/fast-hands/'.length));restored=readFileSync(new URL(row.beforeAsset,root));}
 else{let end=0;for(const e of row.reverseEdits){assert.ok(Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=end&&e.end>=e.start&&e.end<=bytes.length);assert.equal(typeof e.beforeBase64,'string');end=e.end;}restored=Buffer.from(bytes);for(const e of [...row.reverseEdits].reverse())restored=Buffer.concat([restored.subarray(0,e.start),Buffer.from(e.beforeBase64,'base64'),restored.subarray(e.end)]);}
 assert.equal(hash(restored),row.beforeSha256);assert.equal(blob(restored),row.baseGitBlob);return restored;
}
export function readScreenAlphaBaseline(file,options){const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined),within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);const result=within?reverseScreenAlpha(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;return encoding?result.toString(encoding):result;}
