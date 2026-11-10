import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {SPLIT_ENTRIES_ADDED} from '../helpers/fast-hands-split-entries-provenance.mjs';
import {ART_POLISH_ADDED} from '../helpers/fast-hands-art-polish-provenance.mjs';
import {RESULT_UPLOAD_ADDED} from '../helpers/fast-hands-result-upload-provenance.mjs';
import {SHARING_FLOW_ADDED,readSharingFlowBaseline} from '../helpers/fast-hands-sharing-flow-provenance.mjs';
import {FINALE_BASE_BLOBS,FINALE_HISTORY_SHA} from '../helpers/fast-hands-finale-pins.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';

import {readdirBeforeIcons as readdirSync} from '../helpers/app-icons-completion-provenance.mjs';
import {createHash} from 'node:crypto';
let api;try{api=await import('../helpers/fast-hands-finale-provenance.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
const root=new URL('../../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const read=p=>readBeforePolish(new URL(p,root));
const historical=p=>readSharingFlowBaseline(new URL(p,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('finale reversal rejects drift, illegal paths, broken edits and invented baseline',()=>{
 assert.ok(api,'outer finale provenance reader exists');
 // This fixture tests finale itself, without any newer outer layer.
 const reverse=(p,b,l)=>api.reverseFinale(p,b,l,{files:[]},{files:[]},{files:[]},{files:[]});
 const path='public/games/fast-hands/app.mjs',before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const row={path,sha256:sha(bytes),beforeSha256:sha(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]},ledger={files:[row]};
 assert.deepEqual(reverse(path,bytes,ledger),before);
 assert.throws(()=>reverse(path,Buffer.concat([bytes,Buffer.from('!')]),ledger));
 for(const patch of [{baseGitBlob:'0'.repeat(40)},{beforeAsset:'../../escape'},{reverseEdits:[{start:-1,end:12,beforeBase64:''}]},{reverseEdits:[{start:6,end:12,beforeBase64:'%%%'}]},{reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]}])assert.throws(()=>reverse(path,bytes,{files:[{...row,...patch}]}));
 for(const illegal of ['../app.mjs','public/games/fast-hands/../other','worker/leaderboard/repository.mjs'])assert.throws(()=>reverse(illegal,bytes,{files:[{...row,path:illegal}]}));
 assert.deepEqual(reverse('unrelated/file',bytes,ledger),bytes);
});

test('finale pins published baseline, exact inventory and unchanged historical ledgers',()=>{
 assert.ok(api);const l=api.finaleLedger();
 assert.equal(l.baseCommit,'b444877917ac9cdf473309b976ed0d62178457b4');assert.equal(l.baseTree,'1ba7dba2674d0e96b09b1a50b264b34d0ca99e58');
 assert.deepEqual(l.files.map(r=>r.path).sort(),[...api.FINALE_ALLOWED].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...[...l.files,...l.preserved].map(r=>r.path).filter(p=>p.startsWith('public/games/fast-hands/')),...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED].sort());
 for(const r of l.files){
  const bytes=read(r.path),restored=api.reverseFinale(r.path,bytes,l);
  assert.equal(sha(historical(r.path)),r.sha256);
  assert.throws(()=>api.reverseFinale(r.path,Buffer.concat([bytes,Buffer.from('drift')]),l));
  if(r.beforeSha256!==null){assert.equal(sha(restored),r.beforeSha256);assert.equal(blob(restored),r.baseGitBlob);assert.equal(r.baseGitBlob,FINALE_BASE_BLOBS[r.path],r.path)}
  if(r.beforeAsset){const bad=structuredClone(l);bad.files.find(x=>x.path===r.path).beforeAsset='docs/fast-hands/baselines/finale/../escape';assert.throws(()=>api.reverseFinale(r.path,bytes,bad))}
 }
 for(const r of l.preserved){assert.equal(blob(historical(r.path)),r.gitBlob,r.path);assert.equal(r.gitBlob,FINALE_BASE_BLOBS[r.path],r.path)}
 assert.deepEqual([...l.files.filter(r=>r.beforeSha256!==null),...l.preserved].map(r=>r.path).sort(),Object.keys(FINALE_BASE_BLOBS).sort());
 assert.deepEqual(l.historicalLedgers.map(r=>r.path).sort(),Object.keys(FINALE_HISTORY_SHA).sort());
 for(const r of l.historicalLedgers){assert.equal(r.sha256,FINALE_HISTORY_SHA[r.path],r.path);assert.equal(sha(read(r.path)),r.sha256,r.path);assert.equal(blob(read(r.path)),r.gitBlob,r.path)}
 assert.deepEqual(api.finaleRuntimeAdditions(),[...api.FINALE_ADDED,...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED]);
});

test('finale baseline reader handles URL, path and encoding without modifying unrelated data',()=>{
 const p='public/games/fast-hands/app.mjs',url=new URL(p,root),expected=api.reverseFinale(p,read(p));
 assert.deepEqual(api.readFinaleBaseline(url),expected);assert.equal(api.readFinaleBaseline(url,'utf8'),expected.toString());assert.equal(api.readFinaleBaseline(url,{encoding:'utf8'}),expected.toString());assert.equal(api.readFinaleBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(api.readFinaleBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
});

test('finale additions reject invented old content and altered current bytes',()=>{
 for(const path of api.FINALE_ADDED){
  const bytes=read(path),row=api.finaleLedger().files.find(r=>r.path===path);
  assert.deepEqual(api.reverseFinale(path,bytes,{files:[row]}),historical(path));
  for(const change of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'docs/fast-hands/baselines/finale/'+path},{reverseEdits:[{start:0,end:0,beforeBase64:''}]}])assert.throws(()=>api.reverseFinale(path,bytes,{files:[{...row,...change}]}));
 }
});
