import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeFighter as readFileSync} from './helpers/fighter-entry-preview-provenance.mjs';
let p;try{p=await import('./helpers/mobile-gestures-preview-provenance.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
test('gesture boundary reconstructs the exact published parent tree',()=>{
 assert.ok(p,'verified gesture boundary exists');assert.equal(p.verifyBase(p.baseline),true);
 assert.equal(p.baseline.baseCommit,'ae62e94b742e88dc8fba9a2bd8dba3b13b993025');
 for(const mutate of [b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.baseTree='0'.repeat(40)]){const b=structuredClone(p.baseline);mutate(b);assert.throws(()=>p.verifyBase(b));}
});
test('all changed bytes reverse exactly; gameplay modifications are only declarative HTML guard hooks',()=>{
 assert.ok(p);const m=p.manifest();p.validate(m);
 for(const f of m.files){const current=read(f.path),before=p.reverseGestures(f.path,current);assert.equal(p.gitBlob(before),f.beforeGitBlob,f.path);assert.throws(()=>p.reverseGestures(f.path,Buffer.concat([current,Buffer.from('drift')])));
  const bad=structuredClone(m);bad.files.find(x=>x.path===f.path).beforeText+='drift';assert.throws(()=>p.validate(bad));
  if(f.path.startsWith('public/')){assert.ok(f.path.endsWith('.html'));const restored=current.toString().replace('<link rel="modulepreload" href="../shared/mobile-gestures.mjs">','').replace('<link rel="stylesheet" href="../shared/mobile-gestures.css">','').replace('<script type="module" src="../shared/mobile-gestures.mjs"></script>','').replace(/ data-game-gesture-(?:surface|overlays|reading)\b/g,'');assert.equal(restored,f.beforeText,f.path);}
 }
 assert.equal(m.files.filter(f=>f.path.startsWith('public/')).length,18);
 assert.ok(m.files.every(f=>!f.path.startsWith('docs/')),'historical manifests and baselines are unchanged');
});
test('additions have exact inventory and hashes, reject missing files and retain unknown paths',()=>{
 assert.ok(p);const m=p.manifest(),before=p.baseline.files.map(f=>f.path),all=[...before,...m.addedPaths];
 assert.deepEqual(p.inventoryBeforeGestures(all),before);
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeGestures(all.filter(x=>x!==path)));
 for(const f of m.addedFiles)assert.throws(()=>p.inventoryBeforeGestures(all,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 assert.throws(()=>p.inventoryBeforeGestures([...all,all[0]]));assert.ok(p.inventoryBeforeGestures([...all,'public/unapproved.mjs']).includes('public/unapproved.mjs'));
 for(const mutate of [m=>m.files.pop(),m=>m.files.push(m.files[0]),m=>m.addedPaths.pop(),m=>m.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validate(bad));}
 assert.deepEqual(p.inventoryBeforeGestures(['public/old-only.mjs']),['public/old-only.mjs']);
});
