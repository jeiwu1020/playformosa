import {readBeforeGestures} from './mobile-gestures-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const polishManifest=()=>JSON.parse(readFileSync(new URL('../../docs/fast-hands-polish/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
export function reversePolish(file,bytes,manifest=polishManifest()){
 assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.files.length,'duplicate polish historical paths');
 assert.ok(!manifest.addedPaths.includes(file),file+' is a new polish file, not historical source');
 const f=manifest.files.find(f=>f.path===file);if(!f)return Buffer.from(bytes);
 assert.equal(typeof f.beforeText,'string',file+' polish prior text required');
 assert.equal(hash(bytes),f.sha256,file+' polish current bytes');assert.equal(blob(bytes),f.gitBlob,file+' polish current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,file+' polish prior bytes');assert.equal(blob(before),f.beforeGitBlob,file+' polish prior Git blob');return before;
}
export function readBeforePolish(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 assert.ok(relative!=='..'&&!relative.startsWith('../')&&!path.isAbsolute(relative),'historical path must remain inside repository');
 const bytes=reversePolish(relative,readBeforeGestures(file));return encoding?bytes.toString(encoding):bytes;
}
