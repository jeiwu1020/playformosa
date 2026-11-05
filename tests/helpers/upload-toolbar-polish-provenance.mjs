import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const publicAddition='games/shared/upload-cooldown.mjs';
let cached;
export const polishManifest=()=>cached??=JSON.parse(readFileSync(new URL('../../docs/upload-toolbar-polish/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
function validatePaths(manifest){
 assert.ok(Array.isArray(manifest.files)&&Array.isArray(manifest.addedPaths));
 assert.equal(new Set(manifest.files.map(row=>row.path)).size,manifest.files.length,'duplicate polish historical paths');
 assert.equal(new Set(manifest.addedPaths).size,manifest.addedPaths.length,'duplicate polish additions');
 for(const row of manifest.files)assert.ok(!manifest.addedPaths.includes(row.path),'polish additions have no historical preimage');
}
export function reversePolish(path,bytes,manifest=polishManifest()){
 validatePaths(manifest);
 assert.ok(!manifest.addedPaths.includes(path),path+' is new polish scope, not historical source');
 const row=manifest.files.find(row=>row.path===path);if(!row)return Buffer.from(bytes);
 assert.equal(typeof row.beforeText,'string',path+' polish prior text required');
 assert.equal(sha(bytes),row.sha256,path+' polish current SHA256');assert.equal(blob(bytes),row.gitBlob,path+' polish current Git blob');
 const before=Buffer.from(row.beforeText);assert.equal(sha(before),row.beforeSha256,path+' polish prior SHA256');assert.equal(blob(before),row.beforeGitBlob,path+' polish prior Git blob');return before;
}
// Use only at historical raw filesystem boundaries, never on a current-behavior
// fixture or again inside the older reversal functions.
export function readBeforePolish(file,options){
 const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
 const path=relative(root,absolute).split(sep).join('/');
 // Preserve older reader semantics for outside scratch files: no reversal applies.
 if(!path||path.startsWith('../')||path==='..'||isAbsolute(path))return readFileSync(file,options);
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=reversePolish(path,readFileSync(file,typeof options==='object'&&options?{...options,encoding:null}:undefined));
 return encoding?bytes.toString(encoding):bytes;
}
export function inventoryBeforePolish(paths,{manifest=polishManifest(),read=path=>readFileSync(new URL('../../'+path,import.meta.url))}={}){
 validatePaths(manifest);assert.deepEqual(manifest.addedPublicPaths,[publicAddition],'exact polish public addition');
 const path='public/'+publicAddition;
 assert.ok(manifest.addedPaths.includes(path));assert.deepEqual(manifest.addedFiles.map(row=>row.path),[path],'exact pinned new runtime');
 assert.equal(paths.filter(value=>value===path).length,1,'new polish runtime must occur once');
 const bytes=read(path),row=manifest.addedFiles[0];assert.equal(sha(bytes),row.sha256,path+' polish added SHA256');assert.equal(blob(bytes),row.gitBlob,path+' polish added Git blob');
 return paths.filter(value=>value!==path);
}
