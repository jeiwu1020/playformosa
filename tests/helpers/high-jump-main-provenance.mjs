import {readdirSync} from 'node:fs';
import {readBeforeFighter as readFileSync,inventoryBeforeFighter} from './fighter-entry-provenance.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const baselineBytes=readFileSync(new URL('../fixtures/high-jump-main-baseline.json',import.meta.url));
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),'2d9254e9c0a9ad5d358a0aa7c45f3b667016f4ccf5e13149c4cbb00dd2ad97d5','independent high-jump release baseline');
const baseline=JSON.parse(baselineBytes);
export function validateHighJumpManifest(m){
 assert.equal(m.baseMain,baseline.baseMain);assert.equal(m.previewSource,baseline.previewSource);
 assert.deepEqual(m.baseFiles,baseline.baseFiles);assert.deepEqual(m.deletedPaths,[]);
 assert.deepEqual(m.files.filter(f=>'beforeText' in f).map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual(m.addedPaths,baseline.addedPaths);
 assert.deepEqual(m.files.filter(f=>!('beforeText' in f)).map(f=>f.path).sort(),baseline.addedPaths.filter(p=>p!=='docs/high-jump-main/SOURCE-MANIFEST.json'));
 assert.deepEqual(m.addedPublicPaths,m.addedPaths.filter(p=>p.startsWith('public/')).map(p=>p.slice(7)));
 for(const f of m.files.filter(f=>!('beforeText' in f))){assert.equal(f.beforeGitBlob,undefined);assert.equal(f.beforeSha256,undefined);}
 for(const f of m.files.filter(f=>'beforeText' in f)){assert.equal(f.beforeGitBlob,baseline.baseFiles.find(b=>b.path===f.path)?.gitBlob);assert.equal(blob(Buffer.from(f.beforeText)),f.beforeGitBlob);}
 return true;
}
export const highJumpManifest=()=>JSON.parse(readFileSync(new URL('../../docs/high-jump-main/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
export function readBeforeHighJump(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 assert.ok(relative!=='..'&&!relative.startsWith('../')&&!path.isAbsolute(relative));
 const m=highJumpManifest();validateHighJumpManifest(m);const row=m.files.find(f=>f.path===relative),bytes=readFileSync(file);
 if(m.addedPaths.includes(relative))throw Error('High Jump addition has no prior history: '+relative);
 if(!row)return encoding?bytes.toString(encoding):bytes;
 assert.equal(blob(bytes),row.gitBlob,relative+' high-jump current bytes');
 const before=Buffer.from(row.beforeText);assert.equal(blob(before),row.beforeGitBlob,relative+' high-jump prior bytes');
 assert.equal(row.beforeGitBlob,m.baseFiles.find(f=>f.path===relative)?.gitBlob,relative+' remote base');
 return encoding?before.toString(encoding):before;
}
export function inventoryBeforeHighJump(actual){
 actual=inventoryBeforeFighter(actual);
 const m=highJumpManifest();validateHighJumpManifest(m);assert.equal(new Set(m.addedPaths).size,m.addedPaths.length);
 for(const p of m.addedPaths){assert.ok(actual.includes(p),p+' required high-jump addition');if(p==='docs/high-jump-main/SOURCE-MANIFEST.json')continue;const row=m.files.find(f=>f.path===p);assert.ok(row);assert.equal(blob(readFileSync(path.join(root,p))),row.gitBlob,p);}
 return actual.filter(p=>!m.addedPaths.includes(p));
}
export function readGameDirsBeforeHighJump(){
 const paths=[];function walk(dir){for(const e of readdirSync(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else paths.push(p);}}
 walk('public/games/high-jump');const m=highJumpManifest();assert.deepEqual(paths.sort(),m.addedPaths.filter(p=>p.startsWith('public/games/high-jump/')).sort());for(const p of paths)assert.equal(blob(readFileSync(path.join(root,p))),m.files.find(f=>f.path===p).gitBlob);
 return readdirSync(path.join(root,'public/games')).filter(p=>p!=='high-jump').sort();
}
