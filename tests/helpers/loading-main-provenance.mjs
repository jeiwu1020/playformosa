import {readBeforeStudio} from './studio-main-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const loadingManifest=()=>JSON.parse(readFileSync(new URL('../../docs/loading-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
export function reverseLoading(path,bytes,manifest=loadingManifest()){
 const f=manifest.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' loading current bytes');assert.equal(blob(bytes),f.gitBlob,path+' loading current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' loading prior bytes');assert.equal(blob(before),f.beforeGitBlob,path+' loading prior Git blob');return before;
}
export function readBeforeLoading(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 const bytes=reverseLoading(relative,readBeforeStudio(file));return encoding?bytes.toString(encoding):bytes;
}
