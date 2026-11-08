import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fixture=readFileSync(new URL('../fixtures/fighter-entry-main-baseline.json',import.meta.url));
assert.equal(createHash('sha256').update(fixture).digest('hex'),'d32a673e3a455a309b7f38a53e9fa91ca4abf349cc175f7b369903ee269b8dae','Fighter baseline must match reviewed remote main');
const baseline=JSON.parse(fixture),baselineByPath=new Map(baseline.files.map(f=>[f.path,f]));
export function validateFighterManifest(m){
 assert.equal(m.baseMain,baseline.baseMain);
 assert.deepEqual(m.modifiedPaths,baseline.modifiedPaths);
 assert.deepEqual(m.addedPaths,baseline.addedPaths);
 assert.deepEqual(m.deletedPaths,[]);
 assert.deepEqual(m.files.map(f=>f.path).sort(),[...baseline.modifiedPaths,...baseline.addedPaths.filter(p=>p!=='docs/fighter-entry-counts/SOURCE-MANIFEST.json')].sort());
 for(const f of m.files){
  if(baseline.modifiedPaths.includes(f.path)){
   assert.equal(typeof f.beforeText,'string');
   assert.equal(f.beforeGitBlob,baselineByPath.get(f.path).gitBlob);
   assert.equal(blob(Buffer.from(f.beforeText)),f.beforeGitBlob);
  }else{assert.equal(f.beforeText,undefined);assert.equal(f.beforeGitBlob,undefined);}
 }
 return true;
}
export const fighterManifest=()=>JSON.parse(readFileSync(new URL('../../docs/fighter-entry-counts/SOURCE-MANIFEST.json',import.meta.url),'utf8'));
const manifest=fighterManifest();validateFighterManifest(manifest);
const modified=new Map(manifest.files.filter(f=>'beforeText' in f).map(f=>[f.path,f]));
export function readBeforeFighter(file,encoding){
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),relative=path.relative(root,absolute).split(path.sep).join('/');
 assert.ok(relative!=='..'&&!relative.startsWith('../')&&!path.isAbsolute(relative));
 assert.ok(!manifest.addedPaths.includes(relative),'Fighter addition has no prior history: '+relative);
 const current=readFileSync(file),row=modified.get(relative);
 if(!row)return encoding?current.toString(encoding):current;
 assert.equal(blob(current),row.gitBlob,relative+' current Fighter bytes');
 const before=Buffer.from(row.beforeText);
 return encoding?before.toString(encoding):before;
}
export function inventoryBeforeFighter(actual){
 for(const p of manifest.addedPaths){
  assert.ok(actual.includes(p),p+' required Fighter addition');
  if(p==='docs/fighter-entry-counts/SOURCE-MANIFEST.json')continue;
  assert.equal(blob(readFileSync(path.join(root,p))),manifest.files.find(f=>f.path===p).gitBlob,p);
 }
 return actual.filter(p=>!manifest.addedPaths.includes(p));
}
