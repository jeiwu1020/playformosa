import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const baselineBytes=read('tests/fixtures/mobile-gestures-main-baseline.json');
assert.equal(hash(baselineBytes),'c4b9f7145d2754873572dd24f680c1afdc06ee1885f76b19a046bff8e64c0952','gesture baseline is pinned to the exact remote main inventory');
const baseline=JSON.parse(baselineBytes);
const helper=async()=>{
 assert.ok(existsSync(new URL('tests/helpers/mobile-gestures-provenance.mjs',root)),'gesture promotion requires a verified historical reversal');
 return import('./helpers/mobile-gestures-provenance.mjs');
};

test('gesture release admits only six HTML entries, two shared files and its verification support',async()=>{
 const {gestureManifest,verifyGestureAdditions}=await helper(),m=gestureManifest();
 assert.equal(m.baseCommit,'d7b4f5fbd3b623a31f2883dce52683735a85c6c4');
 assert.equal(m.baseTree,'5c9161dc18ec4215e3dd40d212d8a9fa7324b903');
 assert.deepEqual(m.files.map(f=>f.path).sort(),baseline.modifiedPaths);
 assert.deepEqual([...m.addedPaths].sort(),baseline.addedPaths);
 assert.deepEqual(m.addedPublicPaths,['games/shared/mobile-gestures.css','games/shared/mobile-gestures.mjs']);
 verifyGestureAdditions();
 const actual=[];
 function walk(dir=''){
  for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){
   const p=dir?dir+'/'+e.name:e.name;
   if(!dir&&['dist','node_modules','.git'].includes(e.name))continue;
   if(e.isDirectory())walk(p);else{assert.ok(e.isFile(),p+' must be a regular file');actual.push(p);}
  }
 }
 walk();assert.deepEqual(actual.sort(),[...baseline.files.map(f=>f.path),...baseline.addedPaths].sort(),'no unapproved additions or deletions');
});

test('every original remote main byte is restored only by the declared verified gesture delta',async()=>{
 const {gestureManifest,readBeforeGestures}=await helper(),m=gestureManifest();
 assert.equal(baseline.files.length,555);
 for(const f of baseline.files){const before=readBeforeGestures(new URL(f.path,root));assert.equal(hash(before),f.sha256,f.path);assert.equal(blob(before),f.gitBlob,f.path);}
 for(const f of m.files){const original=baseline.files.find(b=>b.path===f.path);assert.ok(original,f.path);assert.equal(f.beforeSha256,original.sha256,f.path);assert.equal(f.beforeGitBlob,original.gitBlob,f.path);}
 const publicChanges=m.files.filter(f=>f.path.startsWith('public/')).map(f=>f.path);
 assert.equal(publicChanges.length,6);
 assert.ok(publicChanges.every(p=>p.endsWith('.html')),'existing game engines, scoring, assets and styles are unchanged');
 for(const f of m.files.filter(f=>f.path.startsWith('public/'))){
  const restored=read(f.path).toString()
   .replace('<link rel="stylesheet" href="../shared/mobile-gestures.css">','')
   .replace('<script type="module" src="../shared/mobile-gestures.mjs"></script>','')
   .replace(/ data-game-gesture-(?:surface|overlays|reading)\b/g,'');
  assert.equal(restored,f.beforeText,f.path+' permits only guard assets and declarative boundary markers');
 }
});

test('reversal rejects altered current or prior bytes, forged baselines, duplicates and new-file history',async()=>{
 const {gestureManifest,reverseGestures,verifyGestureAdditions}=await helper(),m=gestureManifest();
 for(const f of m.files){
  const bytes=read(f.path);assert.equal(blob(reverseGestures(f.path,bytes,m)),f.beforeGitBlob);
  assert.throws(()=>reverseGestures(f.path,Buffer.concat([bytes,Buffer.from('tampered')]),m));
  for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='tampered';assert.throws(()=>reverseGestures(f.path,bytes,bad),f.path+' '+field);}
  const duplicate=structuredClone(m);duplicate.files.push({...f});assert.throws(()=>reverseGestures(f.path,bytes,duplicate));
 }
 for(const p of m.addedPaths)assert.throws(()=>reverseGestures(p,read(p),m));
 for(const f of m.addedFiles){const bad=structuredClone(m);bad.addedFiles.find(x=>x.path===f.path).sha256+='tampered';assert.throws(()=>verifyGestureAdditions(bad),f.path);}
});
