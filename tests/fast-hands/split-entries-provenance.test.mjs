import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
let api,pins;try{api=await import('../helpers/fast-hands-split-entries-provenance.mjs');pins=await import('../helpers/fast-hands-split-entries-pins.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const read=p=>readFileSync(new URL(p,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const changed=[...['app.mjs','assets/intro-duel-generated.webp','catch.html','club.css','club.mjs','duel.html','index.html','leaderboard.mjs','levels-app.mjs','scene.mjs','score-image.mjs','share.mjs','three3d/stage.mjs'].map(p=>prefix+p),'public/index.html','src/catalog.mjs','src/render.mjs','worker/play-counts/index.mjs','worker/play-counts/repository.mjs'].sort();
const added=[prefix+'play-counts.mjs',prefix+'three3d/duck-room.mjs'];

test('split entries provides an explicit reversible outer provenance layer',()=>{
 assert.ok(api,'split entries outer reader exists');
 for(const name of ['reverseSplitEntries','validateSplitEntriesLedger','readSplitEntriesBaseline','splitEntriesRuntimeAdditions'])assert.equal(typeof api[name],'function');
});

test('historical catalog fixture executes the pinned pre-split catalog and renderer',async()=>{
 let fixture;try{fixture=await import('../helpers/fast-hands-split-entries-catalog.mjs')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
 assert.ok(fixture,'pinned historical catalog fixture exists');
 assert.deepEqual(fixture.historicalCatalog.minigames.map(r=>r.id),['reaction-rod','beer-slide','tower-climb','fast-hands']);
 const html=fixture.renderHistoricalPage(fixture.historicalCatalog,{channel:'preview'});
 assert.match(html,/4<\/strong> 款/);assert.match(html,/快手王｜一筆往返/);
 assert.doesNotMatch(html,/data-play-count="fast-hands(?:-catch|-duel)?"/);
});

test('the updated historical admission test retains a separately pinned full parent preimage',()=>{
 assert.ok(api);const l=api.splitEntriesLedger();
 assert.ok(l.testAdapters,'historical test adapters have an explicit reversible inventory');
 assert.deepEqual(l.testAdapters.map(r=>r.path),['tests/batch2-integration.test.mjs']);
 const row=l.testAdapters[0],bytes=read(row.path),restored=api.reverseSplitEntries(row.path,bytes,l);
 assert.equal(row.baseGitBlob,'9c68deb844ee9f442c54bb9cd51fe8b72f36e6b3');
 assert.equal(row.baseGitBlob,pins.SPLIT_ENTRIES_TEST_ADAPTER_BLOBS[row.path]);
 assert.equal(blob(restored),row.baseGitBlob);assert.equal(sha(restored),row.beforeSha256);
 assert.deepEqual(restored,read(row.beforeAsset));assert.throws(()=>api.reverseSplitEntries(row.path,Buffer.concat([bytes,Buffer.from('drift')]),l),/current bytes/);
 for(const mutate of [l=>l.testAdapters.pop(),l=>l.testAdapters.push(l.testAdapters[0]),l=>{l.testAdapters[0].baseGitBlob='0'.repeat(40)},l=>{l.testAdapters[0].path='tests/another.test.mjs'},l=>{l.testAdapters[0].beforeAsset='../escape'}]){const bad=structuredClone(l);mutate(bad);assert.throws(()=>api.validateSplitEntriesLedger(bad))}
});

test('split entries pins its published parent, exact inventory and complete preimages',()=>{
 assert.ok(api);const l=api.splitEntriesLedger();
 assert.equal(l.baseCommit,'0e3456edc01268724ebcc3eecf7d5be31272dccb');
 assert.equal(l.baseTree,'04c3a0b0d8d8b79ed901a22b6e902e78ee8722a4');
 assert.equal(l.baseCommit,pins.SPLIT_ENTRIES_BASE_COMMIT);assert.equal(l.baseTree,pins.SPLIT_ENTRIES_BASE_TREE);
 assert.equal(sha(JSON.stringify(pins.SPLIT_ENTRIES_BASE_BLOBS)),'06d48064a2ee6ca9cbc25be688dfc9d40b0b830a16aeebeb70ae0337f055e586','Parent tree pin set is independent of the new ledger');
 assert.deepEqual(api.SPLIT_ENTRIES_CHANGED,changed);assert.deepEqual(api.SPLIT_ENTRIES_ADDED,added);
 assert.deepEqual(l.files.map(r=>r.path).sort(),[...changed,...added].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...l.files,...l.preserved].map(r=>r.path).filter(p=>p.startsWith(prefix)).sort());
 assert.deepEqual([...l.files.filter(r=>r.beforeSha256!==null),...l.preserved].map(r=>r.path).sort(),Object.keys(pins.SPLIT_ENTRIES_BASE_BLOBS).sort());
 for(const r of l.files){
  const bytes=read(r.path),restored=api.reverseSplitEntries(r.path,bytes,l);
  assert.equal(sha(bytes),r.sha256);assert.throws(()=>api.reverseSplitEntries(r.path,Buffer.concat([bytes,Buffer.from('drift')]),l),/current bytes/);
  if(r.beforeSha256!==null){assert.equal(sha(restored),r.beforeSha256);assert.equal(blob(restored),r.baseGitBlob);assert.equal(r.baseGitBlob,pins.SPLIT_ENTRIES_BASE_BLOBS[r.path]);assert.deepEqual(restored,read(r.beforeAsset))}
 }
 assert.deepEqual(walk('docs/fast-hands/baselines/split-entries').sort(),[...l.files,...l.testAdapters].filter(r=>r.beforeAsset).map(r=>r.beforeAsset).sort());
 assert.deepEqual(api.splitEntriesRuntimeAdditions(),added);
});

test('split entries rejects missing, duplicate, unknown, malformed and repinned ledger rows',()=>{
 assert.ok(api);const ledger=api.splitEntriesLedger();
 const rejects=mutate=>{const bad=structuredClone(ledger);mutate(bad);assert.throws(()=>api.validateSplitEntriesLedger(bad))};
 rejects(l=>{l.baseCommit='0'.repeat(40)});rejects(l=>{l.baseTree='0'.repeat(40)});rejects(l=>{l.schemaVersion=2});
 rejects(l=>l.files.pop());rejects(l=>l.files.push({...l.files[0]}));rejects(l=>{l.files[0].path=prefix+'levels-rules.mjs'});
 for(const change of [{sha256:'invalid'},{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'../../escape'},{beforeAsset:'docs/fast-hands/baselines/split-entries/../escape'},{reverseEdits:[]}])rejects(l=>Object.assign(l.files.find(r=>r.beforeSha256!==null),change));
 for(const path of added)for(const change of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:'0'.repeat(64)},{beforeAsset:'docs/fast-hands/baselines/split-entries/'+path},{reverseEdits:[{start:0,end:0,beforeBase64:''}]}])rejects(l=>Object.assign(l.files.find(r=>r.path===path),change));
 rejects(l=>l.preserved.pop());rejects(l=>l.preserved.push({...l.preserved[0]}));rejects(l=>{l.preserved[0].gitBlob='0'.repeat(40)});
 rejects(l=>l.historicalLedgers.pop());rejects(l=>l.historicalLedgers.push({...l.historicalLedgers[0]}));rejects(l=>{l.historicalLedgers[0].sha256='0'.repeat(64)});rejects(l=>{l.historicalLedgers[0].gitBlob='0'.repeat(40)});
 rejects(l=>l.historicalPreimages.pop());rejects(l=>l.historicalPreimages.push({...l.historicalPreimages[0]}));rejects(l=>{l.historicalPreimages[0].gitBlob='0'.repeat(40)});
});

test('split entries protects game rules, AI, speed, rigs, boards, schema and configuration',()=>{
 assert.ok(api);const l=api.splitEntriesLedger(),preserved=new Set(l.preserved.map(r=>r.path));
 for(const name of ['levels-rules.mjs','levels-motion.mjs','levels-world.mjs','levels-stage.mjs','physics.mjs','finish-timing.mjs','levels-replay.mjs','levels-sound.mjs','levels-sharing.mjs','levels-leaderboard.mjs','three3d/rig.mjs','three3d/world.mjs'])assert.ok(preserved.has(prefix+name),name);
 for(const path of ['public/assets/fast-hands-card-v2.webp','public/assets/play-counts.mjs','public/games/shared/play-counts.mjs','worker/play-counts/002.sql','worker/leaderboard/index.mjs','worker/leaderboard/repository.mjs','wrangler.jsonc'])assert.ok(preserved.has(path),path);
 for(const path of Object.keys(pins.SPLIT_ENTRIES_BASE_BLOBS).filter(p=>p.startsWith(prefix+'assets/')&&!changed.includes(p)))assert.ok(preserved.has(path),path);
 for(const r of l.preserved){const bytes=read(r.path);assert.equal(blob(bytes),r.gitBlob,r.path);assert.deepEqual(api.reverseSplitEntries(r.path,bytes,l),bytes);assert.throws(()=>api.reverseSplitEntries(r.path,Buffer.concat([bytes,Buffer.from('drift')]),l),/preserved bytes/)}
});

test('split entries retains every historical ledger and preimage byte for byte',()=>{
 assert.ok(api);const l=api.splitEntriesLedger();
 assert.ok(l.historicalLedgers.some(r=>r.path==='docs/fast-hands/ART-POLISH-MANIFEST.json'));
 assert.ok(l.historicalLedgers.some(r=>r.path==='docs/fast-hands/RESULT-UPLOAD-MANIFEST.json'));
 assert.ok(l.historicalPreimages.some(r=>r.path.startsWith('docs/fast-hands/baselines/art-polish/')));
 for(const r of l.historicalLedgers){assert.equal(sha(read(r.path)),r.sha256,r.path);assert.equal(blob(read(r.path)),r.gitBlob,r.path)}
 for(const r of l.historicalPreimages)assert.equal(blob(read(r.path)),r.gitBlob,r.path);
});

test('split entries rejects a corrupted frozen preimage even if the caller repins its hash',async()=>{
 assert.ok(api);const dir=mkdtempSync(join(tmpdir(),'split-entries-preimage-'));
 try{
  for(const p of ['tests/helpers/fast-hands-split-entries-provenance.mjs','tests/helpers/fast-hands-split-entries-pins.mjs','docs/fast-hands/SPLIT-ENTRIES-MANIFEST.json']){mkdirSync(dirname(join(dir,p)),{recursive:true});cpSync(new URL(p,root),join(dir,p))}
  const l=api.splitEntriesLedger(),row=l.files.find(r=>r.path==='src/catalog.mjs'),bad=Buffer.from('fabricated baseline');
  mkdirSync(dirname(join(dir,row.beforeAsset)),{recursive:true});writeFileSync(join(dir,row.beforeAsset),bad);
  const isolated=await import(pathToFileURL(join(dir,'tests/helpers/fast-hands-split-entries-provenance.mjs')).href);
  assert.throws(()=>isolated.reverseSplitEntries(row.path,read(row.path)),/Restored split entries/);
  row.beforeSha256=sha(bad);row.baseGitBlob=blob(bad);assert.throws(()=>isolated.reverseSplitEntries(row.path,read(row.path),l),/Pinned split entries/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('split entries rejects unsafe paths and duplicate rows while preserving reader options',()=>{
 assert.ok(api);const l=api.splitEntriesLedger(),row=l.files.find(r=>r.beforeSha256!==null),bytes=read(row.path);
 for(const path of ['../app.mjs',prefix+'../other',prefix+'levels-rules.mjs','worker/leaderboard/index.mjs'])assert.throws(()=>api.reverseSplitEntries(path,bytes,{files:[{...row,path}]}),/Unapproved/);
 assert.throws(()=>api.reverseSplitEntries(row.path,bytes,{files:[row,row]}),/Duplicate/);
 const retained=l.preserved[0];assert.throws(()=>api.reverseSplitEntries(retained.path,read(retained.path),{files:[],preserved:[retained,retained]}),/Duplicate/);
 const url=new URL(row.path,root),expected=api.reverseSplitEntries(row.path,bytes);
 assert.deepEqual(api.readSplitEntriesBaseline(url),expected);
 for(const options of ['utf8',{encoding:'utf8'}])assert.equal(api.readSplitEntriesBaseline(url,options),expected.toString());
 assert.equal(api.readSplitEntriesBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(api.readSplitEntriesBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'split-entries-outside-'));try{const file=join(dir,'app.mjs');writeFileSync(file,'outside 島遊');assert.equal(api.readSplitEntriesBaseline(file,'utf8'),'outside 島遊')}finally{rmSync(dir,{recursive:true,force:true})}
});

test('every prior provenance layer accepts the new outer layer and still rejects drift',async()=>{
 assert.ok(api);
 for(const [module,name] of [['art-polish','reverseArtPolish'],['result-upload','reverseResultUpload'],['sharing-flow','reverseSharingFlow'],['finale','reverseFinale'],['desktop','reverseDesktop'],['entry','reverseEntry'],['club','reverseClub'],['stability','reverseStability'],['screen-alpha','reverseScreenAlpha'],['layout-dart','reverseLayoutDart'],['levels-art','reverseArt'],['levels','reverseLevels']]){
  const mod=await import('../helpers/fast-hands-'+module+'-provenance.mjs');
  for(const p of changed){const bytes=read(p);assert.doesNotThrow(()=>mod[name](p,bytes),module+' restores '+p);assert.throws(()=>mod[name](p,Buffer.concat([bytes,Buffer.from('drift')])),module+' rejects '+p)}
 }
});
