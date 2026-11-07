import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courtesyIntegrationBaseline,COURTESY_INTEGRATION_ADDED,gitBlob} from '../helpers/courtesy-integration-provenance.mjs';
import {inventoryBeforeResultPreview} from '../helpers/high-jump-result-preview-provenance.mjs';
import {inventoryBeforeDialogLayout} from '../helpers/dialog-layout-provenance.mjs';
import {inventoryBeforeDialogRepair} from '../helpers/dialog-layout-repair-provenance.mjs';
const runtime=p=>/^(public|worker|src|config)\//.test(p),read=p=>readFileSync(new URL('../../'+p,import.meta.url));
// Use the complete, independently tree-pinned remote parent inventory, including
// genuine binaries absent from sparse local fixtures. Only newly admitted bytes
// need reading here; no binary placeholders or omissions enter this inventory.
const parent=courtesyIntegrationBaseline.files.filter(f=>runtime(f.path)).map(f=>f.path);
const added=COURTESY_INTEGRATION_ADDED.filter(runtime),current=[...parent,...added];
const scrollbar='public/games/shared/scrollbars.css';
const routes=[['result-preview (entry used by vault-sky and both reaction-rod audits)',inventoryBeforeResultPreview,parent.filter(p=>p!==scrollbar)],['dialog-layout',inventoryBeforeDialogLayout,parent.filter(p=>p!==scrollbar)],['repair',inventoryBeforeDialogRepair,parent]];
for(const [label,project,expected] of routes){
 test(label+': complete remote runtime inventory reaches courtesy through metadata-only boundaries',()=>{
  const reads=[],actual=project(current,{runtimeOnly:true,read:p=>{reads.push(p);return read(p)}});assert.deepEqual([...actual].sort(),[...expected].sort());
  for(const p of added)assert.ok(reads.includes(p),p+' actual added bytes must be checked');
  // All untouched remote paths, including the sparse checkout's missing PNGs,
  // survive. Membership in a remote inventory does not assert local byte presence.
  for(const p of expected)assert.ok(actual.includes(p));
 });
 test(label+': strict new byte, missing-path, duplicate and unknown-path behavior',()=>{
  for(const p of added){assert.throws(()=>project(current.filter(x=>x!==p),{runtimeOnly:true}),p+' must not disappear');assert.throws(()=>project(current,{runtimeOnly:true,read:x=>x===p?Buffer.from('tamper'):read(x)}),p+' must not be admitted with changed bytes');}
  assert.throws(()=>project([...current,current[0]],{runtimeOnly:true}));
  assert.ok(project([...current,'public/unreviewed.mjs'],{runtimeOnly:true}).includes('public/unreviewed.mjs'));
 });
}
test('complete runtime regression uses real independently pinned parent metadata',()=>{
 assert.equal(added.length,36);assert.ok(parent.includes('public/assets/run-400m-card.png'));
 const row=courtesyIntegrationBaseline.files.find(f=>f.path===scrollbar);assert.equal(gitBlob(read(scrollbar)),row.gitBlob);
});
test('historical and partial runtime-only inventories retain their previous admission semantics',()=>{
 const old=[...parent];
 assert.deepEqual(inventoryBeforeResultPreview(old,{runtimeOnly:true}).sort(),parent.filter(p=>p!==scrollbar).sort());
 assert.deepEqual(inventoryBeforeDialogLayout(old,{runtimeOnly:true}).sort(),parent.filter(p=>p!==scrollbar).sort());
 assert.deepEqual(inventoryBeforeDialogRepair(old,{runtimeOnly:true}).sort(),[...parent].sort());
 const partial=['public/legacy-only.mjs'];
 assert.deepEqual(inventoryBeforeResultPreview(partial,{runtimeOnly:true}),partial);
 assert.deepEqual(inventoryBeforeDialogRepair(partial,{runtimeOnly:true}),partial);
 // Dialog-layout's original direct contract requires its own scrollbar runtime.
 assert.throws(()=>inventoryBeforeDialogLayout(partial,{runtimeOnly:true}));
 assert.deepEqual(inventoryBeforeDialogLayout([...partial,scrollbar],{runtimeOnly:true}),partial);
});
test('delegation repair does not weaken the older sky renderer byte audit',async()=>{
 const {readBeforeFall}=await import('../helpers/sprint-fall-provenance.mjs');
 const {reverseSky}=await import('../helpers/vault-sky-provenance.mjs');
 const path='public/games/pole-vault/render.mjs',bytes=readBeforeFall(new URL('../../'+path,import.meta.url));
 assert.equal(gitBlob(reverseSky(path,bytes)),'c326bba689427337c5abf767030fb0eb209a2b6a');
 assert.throws(()=>reverseSky(path,Buffer.concat([bytes,Buffer.from('\n// unreviewed old-runtime mutation')])));
});
