import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {SPLIT_ENTRIES_ADDED} from '../helpers/fast-hands-split-entries-provenance.mjs';
import {ART_POLISH_ADDED,readArtPolishBaseline} from '../helpers/fast-hands-art-polish-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
let api,pins;try{api=await import('../helpers/fast-hands-result-upload-provenance.mjs');pins=await import('../helpers/fast-hands-result-upload-pins.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const read=p=>readBeforePolish(new URL(p,root));
const historical=p=>readArtPolishBaseline(new URL(p,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('result upload has an explicit reversible outer provenance layer',()=>{
 assert.ok(api,'result upload outer reader exists');
 assert.equal(typeof api.reverseResultUpload,'function');
 assert.equal(typeof api.validateResultUploadLedger,'function');
});

test('result upload pins the published baseline and exact approved runtime inventory',()=>{
 assert.ok(api);const l=api.resultUploadLedger();
 assert.equal(l.baseCommit,'6751a1a94d54e40e1ae79af50fb2e408d874186a');
 assert.equal(l.baseTree,'6097690989369dad3922aa462fef179a8ce09320');
 assert.equal(l.baseCommit,pins.RESULT_UPLOAD_BASE_COMMIT);assert.equal(l.baseTree,pins.RESULT_UPLOAD_BASE_TREE);
 assert.equal(sha(JSON.stringify(pins.RESULT_UPLOAD_BASE_BLOBS)),'4c2ad7443c79f375db5e3beba76dc7025fc7cb3caff5a72b758a828ef0d24fe3','Published recursive-tree pin set remains independent of the new manifest');
 assert.deepEqual(api.RESULT_UPLOAD_ADDED,[prefix+'result-upload-host.mjs']);
 assert.deepEqual(api.RESULT_UPLOAD_CHANGED.map(p=>p.slice(prefix.length)).sort(),['app.mjs','catch.html','club.css','duel.html','finale.css','index.html','leaderboard.mjs','levels-app.mjs','levels-leaderboard.mjs']);
 assert.deepEqual(l.files.map(r=>r.path).sort(),[...api.RESULT_UPLOAD_ALLOWED].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...l.files,...l.preserved,...[...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED].map(path=>({path}))].map(r=>r.path).filter(p=>p.startsWith(prefix)).sort());
 assert.deepEqual([...l.files.filter(r=>r.beforeSha256!==null),...l.preserved].map(r=>r.path).sort(),Object.keys(pins.RESULT_UPLOAD_BASE_BLOBS).sort());
 for(const r of l.files){
  const bytes=read(r.path),restored=api.reverseResultUpload(r.path,bytes,l);
  assert.equal(sha(historical(r.path)),r.sha256);assert.throws(()=>api.reverseResultUpload(r.path,Buffer.concat([historical(r.path),Buffer.from('drift')]),l,{files:[]},{files:[]}),/current bytes/);
  if(r.beforeSha256!==null){assert.equal(sha(restored),r.beforeSha256);assert.equal(blob(restored),r.baseGitBlob);assert.equal(r.baseGitBlob,pins.RESULT_UPLOAD_BASE_BLOBS[r.path]);assert.deepEqual(restored,read(r.beforeAsset))}
 }
 assert.deepEqual(walk('docs/fast-hands/baselines/result-upload').sort(),l.files.filter(r=>r.beforeAsset).map(r=>r.beforeAsset).sort());
 assert.deepEqual(api.resultUploadRuntimeAdditions(),[...api.RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED]);
});

test('result upload rejects missing, duplicate, unapproved and repinned entries',()=>{
 assert.ok(api);const l=api.resultUploadLedger();
 const rejects=mutate=>{const bad=structuredClone(l);mutate(bad);assert.throws(()=>api.validateResultUploadLedger(bad))};
 rejects(l=>{l.baseCommit='0'.repeat(40)});rejects(l=>{l.baseTree='0'.repeat(40)});
 rejects(l=>l.files.pop());rejects(l=>l.files.push({...l.files[0]}));rejects(l=>{l.files[0].path=prefix+'levels-rules.mjs'});
 for(const change of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'../../escape'},{beforeAsset:'docs/fast-hands/baselines/result-upload/../escape'},{reverseEdits:[]}])rejects(l=>Object.assign(l.files.find(r=>r.beforeSha256!==null),change));
 rejects(l=>l.preserved.pop());rejects(l=>l.preserved.push({...l.preserved[0]}));rejects(l=>{l.preserved[0].gitBlob='0'.repeat(40)});
 rejects(l=>l.historicalLedgers.pop());rejects(l=>l.historicalLedgers.push({...l.historicalLedgers[0]}));rejects(l=>{l.historicalLedgers[0].sha256='0'.repeat(64)});rejects(l=>{l.historicalLedgers[0].gitBlob='0'.repeat(40)});
 for(const path of api.RESULT_UPLOAD_ADDED)for(const change of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'docs/fast-hands/baselines/result-upload/'+path},{reverseEdits:[{start:0,end:0,beforeBase64:''}]}])rejects(l=>Object.assign(l.files.find(r=>r.path===path),change));
});

test('result upload protects rules, AI, timing, 3D, workers and every existing image',()=>{
 assert.ok(api);const l=api.resultUploadLedger(),preserved=new Set(l.preserved.map(r=>r.path));
 for(const name of ['levels-rules.mjs','levels-motion.mjs','levels-world.mjs','levels-stage.mjs','physics.mjs','finish-timing.mjs','levels-replay.mjs','score-image.mjs','finale-image.mjs','levels-sound.mjs','club.mjs','share.mjs','levels-sharing.mjs'])assert.ok(preserved.has(prefix+name),name);
 assert.ok(preserved.has('public/assets/fast-hands-card-v2.webp'));
 for(const path of Object.keys(pins.RESULT_UPLOAD_BASE_BLOBS).filter(p=>p.startsWith(prefix+'assets/')||p.startsWith(prefix+'three3d/')||p.startsWith('worker/')))assert.ok(preserved.has(path),path);
 for(const r of l.preserved){const bytes=read(r.path);assert.equal(blob(historical(r.path)),r.gitBlob,r.path);assert.deepEqual(api.reverseResultUpload(r.path,bytes,l),historical(r.path));assert.throws(()=>api.reverseResultUpload(r.path,Buffer.concat([historical(r.path),Buffer.from('drift')]),l,{files:[]},{files:[]}),/preserved bytes/)}
});

test('result upload retains every old ledger byte for byte including sharing flow',()=>{
 assert.ok(api);const l=api.resultUploadLedger();
 assert.ok(l.historicalLedgers.some(r=>r.path==='docs/fast-hands/SHARING-FLOW-MANIFEST.json'));
 assert.deepEqual(l.historicalLedgers.map(r=>r.path).sort(),Object.keys(pins.RESULT_UPLOAD_HISTORY_SHA).sort());
 for(const r of l.historicalLedgers){assert.equal(r.sha256,pins.RESULT_UPLOAD_HISTORY_SHA[r.path]);assert.equal(r.gitBlob,pins.RESULT_UPLOAD_HISTORY_BLOBS[r.path]);assert.equal(sha(read(r.path)),r.sha256,r.path);assert.equal(blob(read(r.path)),r.gitBlob,r.path)}
});

test('result upload rejects a corrupted frozen preimage even when its manifest hash is repinned',async()=>{
 assert.ok(api);const dir=mkdtempSync(join(tmpdir(),'result-upload-preimage-'));
 try{
  for(const p of ['tests/helpers/dialog-layout-repair-provenance.mjs','docs/dialog-layout/REPAIR-BASELINE.json','docs/dialog-layout/REPAIR-MANIFEST.json','tests/helpers/dialog-layout-provenance.mjs','docs/dialog-layout/BASELINE.json','docs/dialog-layout/MANIFEST.json','tests/helpers/high-jump-result-preview-provenance.mjs','docs/high-jump/RESULT-PREVIEW-BASELINE.json','docs/high-jump/RESULT-PREVIEW-MANIFEST.json','tests/helpers/high-jump-coordination-provenance.mjs','docs/high-jump/COORDINATION-BASELINE.json','docs/high-jump/COORDINATION-MANIFEST.json','tests/helpers/runner-integration-provenance.mjs','tests/fixtures/runner-integration-baseline.json','docs/runners/INTEGRATION-MANIFEST.json','tests/helpers/vault-pace-provenance.mjs','tests/fixtures/vault-pace-baseline.json','docs/pole-vault/PACE-MANIFEST.json','tests/helpers/vault-journey-provenance.mjs','tests/fixtures/vault-journey-baseline.json','docs/pole-vault/JOURNEY-MANIFEST.json','tests/helpers/javelin-humor-provenance.mjs','tests/fixtures/javelin-humor-baseline.json','docs/javelin/HUMOR-MANIFEST.json','tests/helpers/home-label-provenance.mjs','tests/fixtures/home-label-baseline.json','docs/home-label/SOURCE-MANIFEST.json','tests/helpers/javelin-results-provenance.mjs','tests/fixtures/javelin-results-baseline.json','docs/javelin/RESULTS-MANIFEST.json','tests/helpers/sprint-fall-provenance.mjs','tests/fixtures/sprint-fall-baseline.json','docs/sprint-100m/FALL-MANIFEST.json','tests/helpers/vault-sky-provenance.mjs','tests/fixtures/vault-sky-baseline.json','docs/pole-vault/SKY-MANIFEST.json','tests/helpers/upload-toolbar-polish-provenance.mjs','docs/upload-toolbar-polish/SOURCE-MANIFEST.json','tests/helpers/fast-hands-character-appearance-provenance.mjs','tests/helpers/fast-hands-character-appearance-pins.mjs','docs/fast-hands/CHARACTER-APPEARANCE-MANIFEST.json','tests/helpers/fast-hands-name-refresh-provenance.mjs','docs/fast-hands/NAME-REFRESH-MANIFEST.json','tests/helpers/fast-hands-split-entries-provenance.mjs','tests/helpers/fast-hands-split-entries-pins.mjs','tests/helpers/fast-hands-result-upload-provenance.mjs','tests/helpers/fast-hands-result-upload-pins.mjs','tests/helpers/fast-hands-art-polish-provenance.mjs','tests/helpers/fast-hands-art-polish-pins.mjs','docs/fast-hands/RESULT-UPLOAD-MANIFEST.json']){mkdirSync(dirname(join(dir,p)),{recursive:true});cpSync(new URL(p,root),join(dir,p))}
  const l=api.resultUploadLedger(),row=l.files.find(r=>r.beforeSha256!==null),bad=Buffer.from('fabricated baseline');
  mkdirSync(dirname(join(dir,row.beforeAsset)),{recursive:true});writeFileSync(join(dir,row.beforeAsset),bad);
  const isolated=await import(pathToFileURL(join(dir,'tests/helpers/fast-hands-result-upload-provenance.mjs')).href);
  assert.throws(()=>isolated.reverseResultUpload(row.path,historical(row.path),l,{files:[]},{files:[]}),/Restored result upload/);
  row.beforeSha256=sha(bad);row.baseGitBlob=blob(bad);assert.throws(()=>isolated.reverseResultUpload(row.path,historical(row.path),l,{files:[]},{files:[]}));
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('result upload rejects paths outside its allowlist and preserves outside reader semantics',()=>{
 assert.ok(api);const l=api.resultUploadLedger(),row=l.files.find(r=>r.beforeSha256!==null),bytes=read(row.path);
 for(const path of ['../app.mjs',prefix+'../other',prefix+'levels-rules.mjs','worker/leaderboard/index.mjs'])assert.throws(()=>api.reverseResultUpload(path,bytes,{files:[{...row,path}]},{files:[]},{files:[]}),/Unapproved/);
 const url=new URL(row.path,root),expected=api.reverseResultUpload(row.path,bytes);
 assert.deepEqual(api.readResultUploadBaseline(url),expected);
 for(const options of ['utf8',{encoding:'utf8'}])assert.equal(api.readResultUploadBaseline(url,options),expected.toString());
 assert.equal(api.readResultUploadBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(api.readResultUploadBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'result-upload-outside-'));try{const file=join(dir,'app.mjs');writeFileSync(file,'outside 島遊');assert.equal(api.readResultUploadBaseline(file,'utf8'),'outside 島遊')}finally{rmSync(dir,{recursive:true,force:true})}
});

test('all prior provenance layers accept the result upload changes and still reject drift',async()=>{
 assert.ok(api);
 for(const [module,name] of [['sharing-flow','reverseSharingFlow'],['finale','reverseFinale'],['desktop','reverseDesktop'],['entry','reverseEntry'],['club','reverseClub'],['stability','reverseStability'],['screen-alpha','reverseScreenAlpha'],['layout-dart','reverseLayoutDart'],['levels-art','reverseArt'],['levels','reverseLevels']]){
  const mod=await import('../helpers/fast-hands-'+module+'-provenance.mjs');
  for(const p of api.RESULT_UPLOAD_CHANGED){const bytes=read(p);assert.doesNotThrow(()=>mod[name](p,bytes),module+' restores '+p);assert.throws(()=>mod[name](p,Buffer.concat([bytes,Buffer.from('drift')])),module+' rejects '+p)}
 }
});
