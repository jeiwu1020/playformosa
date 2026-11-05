import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {feelTestRuntimeAdditions} from '../helpers/fast-hands-feel-test-provenance.mjs';

const root=new URL('../../',import.meta.url);
const paths=['app.mjs','index.html','rules.mjs','style.css'].map(p=>'public/games/fast-hands-test/'+p);
const hash=b=>createHash('sha256').update(b).digest('hex');
const originals={
  'polish-provenance.test.mjs':['f5bd70b1dbb9140478ba31382dff3569cf33fe362c00401b189fb28042e1ab6b','0a69606b81f53acd430d443569fd9483e021d347'],
  'replay-provenance.test.mjs':['a96326cecbaa57cdbc6461660a23f5c0e774a536f72070072e9ecf8d0f4154bb','212fe86f447f1897b40d2311d254222811d950f2'],
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
    const current=readFileSync(new URL('tests/reaction-rod/'+file,root),'utf8');
    assert.equal(current,expected);
    assert.notEqual(current.replace('assert.deepEqual','assert.notDeepEqual'),expected);
  });
}
