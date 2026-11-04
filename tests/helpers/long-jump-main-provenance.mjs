import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const longJumpManifest=()=>JSON.parse(readFileSync(new URL('../../docs/long-jump-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
export function reverseLongJump(path,bytes,manifest=longJumpManifest()){
 const f=manifest.files.find(f=>f.path===path);if(!f||f.beforeText===undefined)return Buffer.from(bytes);
 assert.equal(hash(bytes),f.sha256,path+' Long Jump current bytes');assert.equal(blob(bytes),f.gitBlob,path+' Long Jump current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,path+' Long Jump prior bytes');assert.equal(blob(before),f.beforeGitBlob,path+' Long Jump prior Git blob');return before;
}
export function readBeforeLongJump(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 const bytes=reverseLongJump(relative,readFileSync(file));return encoding?bytes.toString(encoding):bytes;
}
