import {SPLIT_ENTRIES_ADDED} from '../helpers/fast-hands-split-entries-provenance.mjs';
import {ART_POLISH_ADDED} from '../helpers/fast-hands-art-polish-provenance.mjs';
import {reverseResultUpload,RESULT_UPLOAD_ADDED} from '../helpers/fast-hands-result-upload-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {SHARING_FLOW_BASE_COMMIT,SHARING_FLOW_BASE_TREE,SHARING_FLOW_BASE_BLOBS,SHARING_FLOW_HISTORY_SHA,SHARING_FLOW_HISTORY_BLOBS} from '../helpers/fast-hands-sharing-flow-pins.mjs';
let api;try{api=await import('../helpers/fast-hands-sharing-flow-provenance.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const read=p=>readFileSync(new URL(p,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('sharing flow reversal rejects changed bytes, invalid edits, illegal paths and invented old content',()=>{
 assert.ok(api,'outer sharing flow provenance reader exists');
 const reverseSharingFlow=(p,b,l)=>api.reverseSharingFlow(p,b,l,{files:[]},{files:[]},{files:[]});
 const path=prefix+'app.mjs',before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const row={path,sha256:sha(bytes),beforeSha256:sha(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]};
 const ledger={files:[row]};
 assert.deepEqual(reverseSharingFlow(path,bytes,ledger),before);
 assert.throws(()=>reverseSharingFlow(path,Buffer.concat([bytes,Buffer.from('!')]),ledger),/current bytes/);
 for(const patch of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:null},{beforeAsset:'../../escape'},{reverseEdits:[{start:-1,end:12,beforeBase64:''}]},{reverseEdits:[{start:6,end:12,beforeBase64:'%%%'}]},{reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]},{reverseEdits:[{start:6,end:12,beforeBase64:''},{start:5,end:6,beforeBase64:''}]}])assert.throws(()=>reverseSharingFlow(path,bytes,{files:[{...row,...patch}]}));
 for(const illegal of ['../app.mjs',prefix+'../other',prefix+'levels-rules.mjs','worker/leaderboard/index.mjs'])assert.throws(()=>reverseSharingFlow(illegal,bytes,{files:[{...row,path:illegal}]}),/Unapproved/);
 assert.deepEqual(reverseSharingFlow('unrelated/file',bytes,ledger),bytes);
});

test('sharing flow pins exact published baseline, frozen preimages and unchanged historical ledgers',()=>{
 assert.ok(api);const l=api.sharingFlowLedger();
 assert.equal(l.baseCommit,SHARING_FLOW_BASE_COMMIT);assert.equal(l.baseCommit,'ad65ebe9eefebfc36590d075a838a24550160ec3');
 assert.equal(l.baseTree,SHARING_FLOW_BASE_TREE);assert.equal(l.baseTree,'0fd36a2738375d762ced690db363065d490068e6');
 assert.deepEqual(l.files.map(r=>r.path).sort(),[...api.SHARING_FLOW_ALLOWED].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...l.files,...l.preserved,...[...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED].map(path=>({path}))].map(r=>r.path).filter(p=>p.startsWith(prefix)).sort());
 assert.deepEqual([...l.files.filter(r=>r.beforeSha256!==null),...l.preserved].map(r=>r.path).sort(),Object.keys(SHARING_FLOW_BASE_BLOBS).sort());
 for(const r of l.files){
  const current=read(r.path),bytes=reverseResultUpload(r.path,current),restored=api.reverseSharingFlow(r.path,current,l);
  assert.equal(sha(bytes),r.sha256);assert.throws(()=>api.reverseSharingFlow(r.path,Buffer.concat([current,Buffer.from('drift')]),l));
  if(r.beforeSha256!==null){
   assert.equal(sha(restored),r.beforeSha256);assert.equal(blob(restored),r.baseGitBlob);assert.equal(r.baseGitBlob,SHARING_FLOW_BASE_BLOBS[r.path],r.path);
   assert.equal(r.beforeAsset,'docs/fast-hands/baselines/sharing-flow/'+r.path);assert.deepEqual(restored,read(r.beforeAsset));
   const bad=structuredClone(l);bad.files.find(x=>x.path===r.path).beforeAsset='docs/fast-hands/baselines/sharing-flow/../escape';assert.throws(()=>api.reverseSharingFlow(r.path,current,bad));
  }
 }
 for(const r of l.preserved){assert.equal(blob(reverseResultUpload(r.path,read(r.path))),r.gitBlob,r.path);assert.equal(r.gitBlob,SHARING_FLOW_BASE_BLOBS[r.path],r.path)}
 assert.deepEqual(walk('docs/fast-hands/baselines/sharing-flow').sort(),l.files.filter(r=>r.beforeAsset).map(r=>r.beforeAsset).sort());
 assert.deepEqual(l.historicalLedgers.map(r=>r.path).sort(),Object.keys(SHARING_FLOW_HISTORY_SHA).sort());
 for(const r of l.historicalLedgers){assert.equal(r.sha256,SHARING_FLOW_HISTORY_SHA[r.path],r.path);assert.equal(r.gitBlob,SHARING_FLOW_HISTORY_BLOBS[r.path],r.path);assert.equal(sha(read(r.path)),r.sha256,r.path);assert.equal(blob(read(r.path)),r.gitBlob,r.path)}
 assert.deepEqual(api.sharingFlowRuntimeAdditions(),[...api.SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED]);
});

test('sharing flow protects timing, scores, boards, character geometry and every existing image',()=>{
 const l=api.sharingFlowLedger(),preserved=new Set(l.preserved.map(r=>r.path));
 for(const name of ['levels-rules.mjs','levels-motion.mjs','levels-world.mjs','levels-stage.mjs','physics.mjs','finish-timing.mjs','leaderboard.mjs','levels-leaderboard.mjs','levels-replay.mjs','score-image.mjs','finale-image.mjs','levels-sound.mjs'])assert.ok(preserved.has(prefix+name),name);
 for(const path of Object.keys(SHARING_FLOW_BASE_BLOBS).filter(p=>p.startsWith(prefix+'assets/')||p.startsWith(prefix+'three3d/')||p.startsWith('worker/')))assert.ok(preserved.has(path),path);
});

test('sharing flow additions reject fabricated baseline fields and altered current bytes',()=>{
 for(const path of api.SHARING_FLOW_ADDED){
  const bytes=read(path),row=api.sharingFlowLedger().files.find(r=>r.path===path);
  assert.deepEqual(api.reverseSharingFlow(path,bytes,{files:[row]}),reverseResultUpload(path,bytes));
  for(const change of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'docs/fast-hands/baselines/sharing-flow/'+path},{reverseEdits:[{start:0,end:0,beforeBase64:''}]}])assert.throws(()=>api.reverseSharingFlow(path,bytes,{files:[{...row,...change}]}));
 }
});

test('sharing flow baseline reader preserves URL, string path, encoding and outside files',()=>{
 const p=prefix+'app.mjs',url=new URL(p,root),expected=api.reverseSharingFlow(p,read(p));
 assert.deepEqual(api.readSharingFlowBaseline(url),expected);
 for(const options of ['utf8',{encoding:'utf8'}])assert.equal(api.readSharingFlowBaseline(url,options),expected.toString());
 assert.equal(api.readSharingFlowBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(api.readSharingFlowBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'sharing-flow-provenance-'));try{const file=join(dir,'app.mjs');writeFileSync(file,'outside 島遊');assert.equal(api.readSharingFlowBaseline(file,'utf8'),'outside 島遊')}finally{rmSync(dir,{recursive:true,force:true})}
});

test('every old provenance layer still rejects current sharing-flow drift',async()=>{
 for(const [module,name] of [['finale','reverseFinale'],['desktop','reverseDesktop'],['entry','reverseEntry'],['club','reverseClub'],['stability','reverseStability'],['screen-alpha','reverseScreenAlpha'],['layout-dart','reverseLayoutDart'],['levels-art','reverseArt'],['levels','reverseLevels']]){
  const mod=await import('../helpers/fast-hands-'+module+'-provenance.mjs');
  assert.equal(typeof mod[name],'function',module+' exports '+name);
  for(const p of api.SHARING_FLOW_CHANGED){const bytes=read(p);assert.doesNotThrow(()=>mod[name](p,bytes),module+' restores '+p);assert.throws(()=>mod[name](p,Buffer.concat([bytes,Buffer.from('drift')])),module+' rejects drift '+p)}
 }
});

test('sharing flow ledger validation rejects missing, duplicate, unapproved and repinned entries',()=>{
 const ledger=api.sharingFlowLedger();
 const rejects=mutate=>{const bad=structuredClone(ledger);mutate(bad);assert.throws(()=>api.validateSharingFlowLedger(bad))};
 rejects(l=>{l.baseCommit='0'.repeat(40)});rejects(l=>{l.baseTree='0'.repeat(40)});
 rejects(l=>l.files.pop());rejects(l=>l.files.push({...l.files[0]}));
 rejects(l=>{l.files[0].path=prefix+'levels-rules.mjs'});
 rejects(l=>{l.files.find(r=>r.beforeSha256!==null).baseGitBlob='0'.repeat(40)});
 rejects(l=>{l.files.find(r=>r.beforeSha256!==null).beforeAsset='../../escape'});
 rejects(l=>{l.files.find(r=>r.beforeSha256===null).baseGitBlob='0'.repeat(40)});
 rejects(l=>l.preserved.pop());rejects(l=>l.preserved.push({...l.preserved[0]}));
 rejects(l=>{l.preserved[0].gitBlob='0'.repeat(40)});
 rejects(l=>l.historicalLedgers.pop());rejects(l=>l.historicalLedgers.push({...l.historicalLedgers[0]}));
 rejects(l=>{l.historicalLedgers[0].sha256='0'.repeat(64)});
 rejects(l=>{l.historicalLedgers[0].gitBlob='0'.repeat(40)});
});

test('sharing flow default reversal also rejects protected-runtime drift',()=>{
 const ledger=api.sharingFlowLedger();
 for(const r of ledger.preserved){const bytes=read(r.path);assert.deepEqual(api.reverseSharingFlow(r.path,bytes,ledger),reverseResultUpload(r.path,bytes));assert.throws(()=>api.reverseSharingFlow(r.path,Buffer.concat([bytes,Buffer.from('drift')]),ledger),/preserved bytes|current bytes/)}
});
