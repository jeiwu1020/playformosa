import {reverseSplitEntries,splitEntriesLedger,splitEntriesRuntimeAdditions} from './fast-hands-split-entries-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import assert from 'node:assert/strict';
import {ART_POLISH_BASE_COMMIT,ART_POLISH_BASE_TREE,ART_POLISH_BASE_BLOBS,ART_POLISH_BEFORE_SHA,ART_POLISH_HISTORY_SHA,ART_POLISH_HISTORY_BLOBS,ART_POLISH_HISTORY_PREIMAGE_BLOBS} from './fast-hands-art-polish-pins.mjs';
const root=new URL('../../',import.meta.url),rootPath=fileURLToPath(root);
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const ART_POLISH_CHANGED=Object.freeze([
 'public/games/fast-hands/catch.html',
 'public/games/fast-hands/club.css',
 'public/games/fast-hands/duel.html',
 'public/games/fast-hands/finale-image.mjs',
 'public/games/fast-hands/finale.css',
 'public/games/fast-hands/index.html'
]);
export const ART_POLISH_ADDED=Object.freeze([
 'public/games/fast-hands/assets/intro-catch-generated.webp',
 'public/games/fast-hands/assets/intro-duel-generated.webp'
]);
export const ART_POLISH_ALLOWED=Object.freeze([...ART_POLISH_CHANGED,...ART_POLISH_ADDED]);

function validateFile(row){
 assert.ok(ART_POLISH_ALLOWED.includes(row.path),'Unapproved art polish path '+row.path);
 assert.match(row.sha256,/^[a-f0-9]{64}$/);
 if(ART_POLISH_ADDED.includes(row.path)){
  assert.equal(row.beforeSha256,null);assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);assert.equal('beforeAsset' in row,false);
 }else{
  assert.equal(row.baseGitBlob,ART_POLISH_BASE_BLOBS[row.path],'Pinned art polish baseline blob '+row.path);
  assert.equal(row.beforeSha256,ART_POLISH_BEFORE_SHA[row.path],'Pinned art polish baseline digest '+row.path);
  assert.equal(row.beforeAsset,'docs/fast-hands/baselines/art-polish/'+row.path);assert.equal('reverseEdits' in row,false);
 }
}

export function validateArtPolishLedger(ledger){
 assert.equal(ledger.schemaVersion,1);assert.equal(ledger.baseCommit,ART_POLISH_BASE_COMMIT);assert.equal(ledger.baseTree,ART_POLISH_BASE_TREE);
 assert.deepEqual(ledger.files.map(r=>r.path).sort(),[...ART_POLISH_ALLOWED].sort(),'Exact art polish change inventory');
 for(const row of ledger.files)validateFile(row);
 const preserved=Object.keys(ART_POLISH_BASE_BLOBS).filter(p=>!ART_POLISH_CHANGED.includes(p)).sort();
 assert.deepEqual(ledger.preserved.map(r=>r.path).sort(),preserved,'Exact art polish preserved inventory');
 for(const row of ledger.preserved)assert.equal(row.gitBlob,ART_POLISH_BASE_BLOBS[row.path],row.path);
 assert.deepEqual(ledger.historicalLedgers.map(r=>r.path).sort(),Object.keys(ART_POLISH_HISTORY_SHA).sort(),'Exact historical ledger inventory');
 for(const row of ledger.historicalLedgers){assert.equal(row.sha256,ART_POLISH_HISTORY_SHA[row.path],row.path);assert.equal(row.gitBlob,ART_POLISH_HISTORY_BLOBS[row.path],row.path)}
 assert.deepEqual(ledger.historicalPreimages.map(r=>r.path).sort(),Object.keys(ART_POLISH_HISTORY_PREIMAGE_BLOBS).sort(),'Exact historical preimage inventory');
 for(const row of ledger.historicalPreimages)assert.equal(row.gitBlob,ART_POLISH_HISTORY_PREIMAGE_BLOBS[row.path],row.path);
 return ledger;
}
export const artPolishLedger=()=>validateArtPolishLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/ART-POLISH-MANIFEST.json',root),'utf8')));

export function reverseArtPolish(path,bytes,ledger=artPolishLedger(),outerLedger=splitEntriesLedger()){
 bytes=reverseSplitEntries(path,bytes,outerLedger);
 const rows=ledger.files.filter(r=>r.path===path);assert.ok(rows.length<=1,'Duplicate art polish entry '+path);
 if(!rows.length){
  const preserved=ledger.preserved?.filter(r=>r.path===path)??[];assert.ok(preserved.length<=1,'Duplicate art polish preserved entry '+path);
  if(preserved.length){assert.equal(preserved[0].gitBlob,ART_POLISH_BASE_BLOBS[path],path);assert.equal(blob(bytes),preserved[0].gitBlob,'Art polish preserved bytes '+path)}
  return Buffer.from(bytes);
 }
 const row=rows[0];validateFile(row);
 assert.equal(hash(bytes),row.sha256,'Art polish current bytes '+path);
 if(row.beforeSha256===null)return Buffer.from(bytes);
 const restored=readFileSync(new URL(row.beforeAsset,root));
 assert.equal(hash(restored),row.beforeSha256,'Restored art polish bytes '+path);
 assert.equal(blob(restored),row.baseGitBlob,'Restored art polish Git blob '+path);
 return restored;
}

export function readArtPolishBaseline(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file)),path=relative(rootPath,absolute).split(sep).join('/');
 const bytes=readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined);
 const within=path!==''&&path!=='..'&&!path.startsWith('../')&&!isAbsolute(path);
 const result=within?reverseArtPolish(path,bytes):bytes,encoding=typeof options==='string'?options:options?.encoding;
 return encoding?result.toString(encoding):result;
}
export function artPolishRuntimeAdditions(){
 const ledger=artPolishLedger();for(const path of ART_POLISH_ADDED)reverseArtPolish(path,readFileSync(new URL(path,root)),ledger);
 return [...ART_POLISH_ADDED,...splitEntriesRuntimeAdditions()];
}
