import {readGameDirsBeforeHighJump} from './high-jump-main-provenance.mjs';
import {readBeforePolish} from './fast-hands-polish-provenance.mjs';
import {readFileSync} from 'node:fs';
import {readdirBeforeIcons as readdirSync} from './app-icons-completion-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const fastHandsManifest=()=>JSON.parse(readFileSync(new URL('../../docs/fast-hands-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
export function reverseFastHands(file,bytes,manifest=fastHandsManifest()){
 assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.files.length,'duplicate Fast Hands historical paths');
 assert.ok(!manifest.addedPublicPaths.some(p=>'public/'+p===file),file+' is a new Fast Hands file, not historical source');
 const f=manifest.files.find(f=>f.path===file);if(!f)return Buffer.from(bytes);
 assert.equal(typeof f.beforeText,'string',file+' Fast Hands prior text required');
 assert.equal(hash(bytes),f.sha256,file+' Fast Hands current bytes');assert.equal(blob(bytes),f.gitBlob,file+' Fast Hands current Git blob');
 const before=Buffer.from(f.beforeText);assert.equal(hash(before),f.beforeSha256,file+' Fast Hands prior bytes');assert.equal(blob(before),f.beforeGitBlob,file+' Fast Hands prior Git blob');return before;
}
export function readBeforeFastHands(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 assert.ok(relative!== '..'&&!relative.startsWith('../')&&!path.isAbsolute(relative),'historical path must remain inside repository');
 const bytes=reverseFastHands(relative,readBeforePolish(file));return encoding?bytes.toString(encoding):bytes;
}
// New folders are removed only after exact file inventory and source bytes are verified.
// Historical ledgers therefore retain their original approved game-directory scope.
export function readGamesBeforeFastHands(){
 const m=fastHandsManifest(),addedDirs=['fast-hands','javelin'],actual=[];
 function walk(dir){for(const e of readdirSync(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else{assert.ok(e.isFile(),p+' must be a regular file');actual.push(p);}}}
 for(const dir of addedDirs)walk('public/games/'+dir);
 const declared=m.addedPublicPaths.filter(p=>/^games\/(fast-hands|javelin)\//.test(p)).map(p=>'public/'+p).sort();
 assert.deepEqual(actual.sort(),declared,'Fast Hands added game-directory inventory');
 for(const p of actual){const matches=m.sourceFiles.filter(f=>f.path===p);assert.equal(matches.length,1,p+' source evidence');const bytes=readBeforePolish(path.join(root,p));assert.equal(hash(bytes),matches[0].sha256,p);assert.equal(blob(bytes),matches[0].gitBlob,p);}
 return readGameDirsBeforeHighJump().filter(p=>!addedDirs.includes(p)).sort();
}
