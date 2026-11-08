import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
import {writeFileSync,mkdtempSync,mkdirSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {feelTestRuntimeAdditions} from '../helpers/fast-hands-feel-test-provenance.mjs';

const root=new URL('../../',import.meta.url);
const paths=['app.mjs','index.html','rules.mjs','style.css'].map(p=>'public/games/fast-hands-test/'+p);
const hash=b=>createHash('sha256').update(b).digest('hex');
const originals={
  'polish-provenance.test.mjs':['ff80d8f97d8131864bc3f79b792e74d85a90654c3d7ed62131db6441a7c92edb','d025357619d40c5f2b4d0b35de97116faf7c44d7'],
  'replay-provenance.test.mjs':['e48be8602d32184385b08eefb055002c99233cf30a2104ce91930ae8c971468e','cfe42bf0924d5f1a5adaf8e7ad1e91d646d905ec'],
};
const admissionImport="import {feelTestRuntimeAdditions} from '../helpers/fast-hands-feel-test-provenance.mjs';\n";
function expectedAdmission(before){
  const marker='...levelsRuntimeAdditions()].sort()';
  assert.equal(before.split(marker).length,2,'one exact inventory insertion');
  return admissionImport+before.replace(marker,'...levelsRuntimeAdditions(),...feelTestRuntimeAdditions()].sort()');
}
function fixture(fn){
  const directory=mkdtempSync(join(tmpdir(),'feel-test-provenance-'));
  try{
    mkdirSync(join(directory,'public/games/fast-hands-test'),{recursive:true});
    for(const p of paths)copyFileSync(new URL(p,root),join(directory,p));
    fn(pathToFileURL(directory+'/'));
  }finally{rmSync(directory,{recursive:true,force:true});}
}

test('only the four byte-pinned isolated runtime files enter the old global inventories',()=>{
  assert.deepEqual(feelTestRuntimeAdditions(),paths);
  const copy=feelTestRuntimeAdditions();copy.push('unreviewed');
  assert.deepEqual(feelTestRuntimeAdditions(),paths);
});
for(const path of paths){
  test('feel-test admission rejects byte changes: '+path,()=>fixture(base=>{
    const file=new URL(path,base);writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from('\n// unreviewed mutation')]));
    assert.throws(()=>feelTestRuntimeAdditions(base));
  }));
  test('feel-test admission rejects missing files: '+path,()=>fixture(base=>{
    rmSync(new URL(path,base));assert.throws(()=>feelTestRuntimeAdditions(base));
  }));
}
test('feel-test admission rejects a fifth runtime file or directory',()=>fixture(base=>{
  const extra=new URL('public/games/fast-hands-test/unreviewed.mjs',base);
  writeFileSync(extra,'export const unreviewed=true;');assert.throws(()=>feelTestRuntimeAdditions(base));
  rmSync(extra);mkdirSync(extra);assert.throws(()=>feelTestRuntimeAdditions(base));
}));
for(const [file,[sha256,gitBlob]] of Object.entries(originals)){
  test('all original assertions stay byte-exact apart from the explicit admission: '+file,()=>{
    const before=readFileSync(new URL('docs/fast-hands/baselines/feel-test-inventory/tests/reaction-rod/'+file,root));
    assert.equal(hash(before),sha256);
    assert.equal(createHash('sha1').update(`blob ${before.length}\0`).update(before).digest('hex'),gitBlob);
    const expected=expectedAdmission(before.toString());
    const current=readBeforePolish(new URL('tests/reaction-rod/'+file,root),'utf8');
    assert.equal(current,expected);
    assert.notEqual(current.replace('assert.deepEqual','assert.notDeepEqual'),expected);
  });
}
