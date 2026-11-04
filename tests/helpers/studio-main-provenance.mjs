import {readBeforeLongJump} from './long-jump-main-provenance.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const studioManifest=()=>JSON.parse(readFileSync(new URL('../../docs/studio-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
export function reverseStudio(path,bytes,manifest=studioManifest()){
 const f=manifest.files.find(f=>f.path===path);if(!f)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' studio current bytes');assert.equal(blob(bytes),f.gitBlob,path+' studio current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' studio prior bytes');assert.equal(blob(before),f.beforeGitBlob,path+' studio prior Git blob');return before;
}
export function readBeforeStudio(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 const bytes=reverseStudio(relative,readBeforeLongJump(file));return encoding?bytes.toString(encoding):bytes;
}
