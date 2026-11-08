import {readBeforeHighJump as readFileSync} from './high-jump-main-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fixture=readFileSync(new URL('../fixtures/mobile-gestures-main-baseline.json',import.meta.url));
assert.equal(hash(fixture),'c4b9f7145d2754873572dd24f680c1afdc06ee1885f76b19a046bff8e64c0952','gesture remote baseline must not be rewritten');
const baseline=JSON.parse(fixture),originals=new Map(baseline.files.map(f=>[f.path,f]));
export const gestureManifest=()=>JSON.parse(readFileSync(new URL('../../docs/mobile-gestures/SOURCE-MANIFEST.json',import.meta.url),'utf8'));

function assertManifest(manifest){
 assert.equal(manifest.baseCommit,baseline.baseCommit,'gesture base commit');
 assert.equal(manifest.baseTree,baseline.baseTree,'gesture base tree');
 assert.deepEqual(manifest.files.map(f=>f.path).sort(),baseline.modifiedPaths,'exact gesture modification scope');
 assert.deepEqual([...manifest.addedPaths].sort(),baseline.addedPaths,'exact gesture addition scope');
}

export function reverseGestures(file,bytes,manifest=gestureManifest()){
 assertManifest(manifest);
 assert.ok(!manifest.addedPaths.includes(file),file+' is new gesture evidence, not historical source');
 const f=manifest.files.find(f=>f.path===file);if(!f)return Buffer.from(bytes);
 const original=originals.get(file);assert.ok(original,file+' must exist in remote main');
 assert.equal(typeof f.beforeText,'string',file+' requires prior text');
 assert.equal(f.beforeSha256,original.sha256,file+' independently pinned prior SHA256');
 assert.equal(f.beforeGitBlob,original.gitBlob,file+' independently pinned prior Git blob');
 assert.equal(hash(bytes),f.sha256,file+' gesture current bytes');
 assert.equal(blob(bytes),f.gitBlob,file+' gesture current Git blob');
 const before=Buffer.from(f.beforeText);
 assert.equal(hash(before),original.sha256,file+' gesture prior bytes');
 assert.equal(blob(before),original.gitBlob,file+' gesture prior Git blob');
 return before;
}

export function readBeforeGestures(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 assert.ok(relative!=='..'&&!relative.startsWith('../')&&!path.isAbsolute(relative),'historical path must remain inside repository');
 const bytes=reverseGestures(relative,readFileSync(file));return encoding?bytes.toString(encoding):bytes;
}

export function verifyGestureAdditions(manifest=gestureManifest()){
 assertManifest(manifest);
 // A ledger cannot contain its own byte hash. Its exact schema/scope is checked
 // above, while every other new file (including this helper) is byte-verified.
 const expected=baseline.addedPaths.filter(p=>p!=='docs/mobile-gestures/SOURCE-MANIFEST.json');
 assert.deepEqual(manifest.addedFiles.map(f=>f.path).sort(),expected,'all non-self additions require evidence');
 for(const f of manifest.addedFiles){const bytes=readFileSync(path.join(root,f.path));assert.equal(hash(bytes),f.sha256,f.path+' added bytes');assert.equal(blob(bytes),f.gitBlob,f.path+' added Git blob');}
}

export function inventoryBeforeGestures(actual){
 const manifest=gestureManifest();verifyGestureAdditions(manifest);
 for(const p of manifest.addedPaths)assert.ok(actual.includes(p),p+' required gesture addition');
 return actual.filter(p=>!manifest.addedPaths.includes(p));
}
