import test from 'node:test';import assert from 'node:assert/strict';import {readdirSync}from'node:fs';import {readBeforeSprintTiers as readFileSync}from'./helpers/sprint-rival-tiers-provenance.mjs';import{baseline,verifyBase,manifest,validate,gitBlob,tierParentBytes,inventoryBeforeTiers}from'./helpers/run1500-tiers-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
function inventory(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else result.push(p);}}walk();return result;}
test('AI tiers preserves every parent file and exposes unknown additions',()=>{assert.equal(verifyBase(baseline),true);const paths=inventory();assert.deepEqual(inventoryBeforeTiers(paths).sort(),baseline.files.map(f=>f.path).sort());for(const f of baseline.files)assert.equal(gitBlob(tierParentBytes(f.path,read(f.path))),f.gitBlob,f.path);assert.ok(inventoryBeforeTiers([...paths,'unexpected-file']).includes('unexpected-file'));});
test('AI tiers rejects missing evidence, altered live bytes and forged history',()=>{const paths=inventory(),m=manifest();for(const path of m.addedPaths)assert.throws(()=>inventoryBeforeTiers(paths.filter(p=>p!==path)));for(const f of [...m.files,...m.addedFiles])assert.throws(()=>inventoryBeforeTiers(paths,{read:p=>p===f.path?Buffer.from('drift'):read(p)}));for(const f of m.files)assert.throws(()=>tierParentBytes(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));for(const mutate of [m=>m.baseCommit='0'.repeat(40),m=>m.files.pop(),m=>m.files[0].beforeText+='drift',m=>m.addedPaths.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>validate(bad));}});

test('manifest cache fails closed on repeated parse errors and recovers only after valid content returns',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join,dirname}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const dir=mkdtempSync(join(tmpdir(),'run1500-tier-cache-'));
 try{
  for(const path of ['tests/helpers/run1500-tiers-provenance.mjs','docs/run1500-tiers/BASELINE.json','docs/run1500-tiers/MANIFEST.json']){const target=join(dir,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,read(path));}
  const api=await import(pathToFileURL(join(dir,'tests/helpers/run1500-tiers-provenance.mjs')));const before=api.manifest();api.validate(before);assert.ok(Object.isFrozen(before.files[0]));
  const path=join(dir,'docs/run1500-tiers/MANIFEST.json');writeFileSync(path,'{');
  assert.throws(()=>api.manifest(),SyntaxError);assert.throws(()=>api.manifest(),SyntaxError);
  writeFileSync(path,read('docs/run1500-tiers/MANIFEST.json'));assert.deepEqual(api.manifest(),before);assert.doesNotThrow(()=>api.validate(api.manifest()));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
