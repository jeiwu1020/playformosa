import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {reverseDuelCoverFingers} from '../helpers/fast-hands-character-appearance-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from '../helpers/mobile-gestures-preview-provenance.mjs';
import {readdirSync,mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {CHARACTER_APPEARANCE_PARENT as parent} from '../helpers/fast-hands-character-appearance-pins.mjs';
let api;
try{api=await import('../helpers/fast-hands-character-appearance-provenance.mjs')}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error}
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const read=p=>readBeforePolish(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const poses=['catch-empty-mid','catch-grab','catch-guns','catch-place','catch-reach','catch-ready','catch-return-mid','catch-return','duel-ai-grab','duel-ai-guns','duel-ai-place','duel-ai-reach','duel-ai-return-mid','duel-ai','duel-neutral','duel-player-grab','duel-player-guns','duel-player-place','duel-player-reach','duel-player-return-mid','duel-player','duel-ready'];
const changed=[...poses.map(p=>prefix+'assets/levels-'+p+'.png'),...['three3d/rig.mjs','three3d/world.mjs','levels-world.mjs','assets/levels-pose-provenance.json','assets/front-demo-poster.png','assets/front-demo.mp4'].map(p=>prefix+p)].sort();
const adapter='tests/fast-hands/eyes-3d.test.mjs',platformAdapter='tests/fast-hands/platform-integration.test.mjs';
const walk=p=>readdirSync(new URL(p,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);

test('character appearance supplies a strict reversible provenance gate',()=>{
 assert.ok(api,'character-appearance provenance implementation exists');
 for(const name of ['characterAppearanceLedger','validateCharacterAppearanceLedger','assertCharacterAppearanceCurrent','reverseCharacterAppearance'])assert.equal(typeof api[name],'function');
});

test('appearance pins the published parent independently and allows exactly 28 runtime changes',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger();
 assert.equal(parent.baseCommit,'c38057d8c187c70b51ef88295d88161eace42169');
 assert.equal(parent.baseTree,'01dc8b2445f3037decb9153a3b112486f0e44e7b');
 assert.equal(sha(JSON.stringify(parent)),'6df142e6fcb66fa0954999a27f7cf9d0368dfc94acc40678e13ea9e1a1661902','Parent pins are independent of current files and the manifest');
 assert.deepEqual(api.CHARACTER_APPEARANCE_PATHS,changed);
 assert.deepEqual(ledger.files.map(r=>r.path),changed);
 assert.deepEqual(ledger.testAdapters.map(r=>r.path),[adapter,platformAdapter]);
 assert.deepEqual(walk('docs/fast-hands/baselines/character-appearance').sort(),[...ledger.files,...ledger.testAdapters].map(r=>r.beforeAsset).sort());

});

test('the complete runtime inventory has no missing or added Fast Hands files',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger();
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...changed,...ledger.preserved.map(r=>r.path).filter(p=>p.startsWith(prefix))].sort());
});

test('current appearance bytes restore every complete published preimage without mutating inputs',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger();
 for(const row of [...ledger.files,...ledger.testAdapters]){
  const current=read(row.path),copy=Buffer.from(current),before=api.reverseCharacterAppearance(row.path,current);
  assert.deepEqual(api.assertCharacterAppearanceCurrent(row.path,current),current);
  assert.deepEqual(current,copy,'No caller byte mutation '+row.path);
  assert.notEqual(row.sha256,row.beforeSha256,'Inventory includes changes only '+row.path);
  assert.equal(sha(before),parent.files[row.path]?.sha256??parent.testAdapters[row.path].sha256,row.path);
  assert.equal(blob(before),parent.files[row.path]?.gitBlob??parent.testAdapters[row.path].gitBlob,row.path);
  assert.deepEqual(before,read(row.beforeAsset));
  assert.deepEqual(api.reverseCharacterAppearance(row.path,before),before);
  assert.throws(()=>api.assertCharacterAppearanceCurrent(row.path,before),/Character appearance current bytes/,row.path);
  for(const drift of [Buffer.concat([current,Buffer.from('drift')]),Buffer.concat([before,Buffer.from('drift')])]){
   assert.throws(()=>api.reverseCharacterAppearance(row.path,drift),/Character appearance current bytes/,row.path);
   assert.throws(()=>api.assertCharacterAppearanceCurrent(row.path,drift),/Character appearance current bytes/,row.path);
  }
 }
});

test('appearance rejects malformed inventories, unsafe preimages and forged current or parent pins',()=>{
 assert.ok(api);const original=api.characterAppearanceLedger();
 const mutations=[l=>{l.schemaVersion++},l=>{l.baseCommit='0'.repeat(40)},l=>{l.baseTree='0'.repeat(40)},l=>{l.extra=true},l=>{l.files=null},l=>l.files.pop(),l=>l.files.push({...l.files[0]}),l=>l.files.reverse(),l=>{l.files[0].path='../escape'},l=>{l.files[0].path=prefix+'levels-rules.mjs'},l=>{l.files[0].beforeAsset='../../escape'},l=>{l.files[0].beforeAsset='docs/fast-hands/baselines/character-appearance/../escape'},l=>{l.files[0].sha256='0'.repeat(64)},l=>{l.files[0].beforeSha256='0'.repeat(64)},l=>{l.files[0].baseGitBlob='0'.repeat(40)},l=>{l.files[0].reverseEdits=[]},l=>l.testAdapters.pop(),l=>l.testAdapters.push({...l.testAdapters[0]}),l=>{l.testAdapters[0].path='tests/another.test.mjs'},l=>l.preserved.pop(),l=>l.preserved.push({...l.preserved[0]}),l=>{l.preserved[0].gitBlob='0'.repeat(40)},l=>l.history.pop(),l=>l.history.push({...l.history[0]}),l=>{l.history[0].gitBlob='0'.repeat(40)}];
 for(const mutate of mutations){const bad=structuredClone(original);mutate(bad);assert.throws(()=>api.validateCharacterAppearanceLedger(bad),/Pinned character appearance/)}
 for(const path of [adapter,platformAdapter])for(const change of [{path:'tests/another.test.mjs'},{beforeAsset:'../../escape'},{beforeSha256:'0'.repeat(64)},{baseGitBlob:'0'.repeat(40)},{sha256:'0'.repeat(64)},{reverseEdits:[]}]){
  const bad=structuredClone(original);Object.assign(bad.testAdapters.find(r=>r.path===path),change);assert.throws(()=>api.validateCharacterAppearanceLedger(bad),/Pinned character appearance/);
 }
 const reordered=structuredClone(original);reordered.testAdapters.reverse();assert.throws(()=>api.validateCharacterAppearanceLedger(reordered),/Pinned character appearance/);
 for(const row of [original.files[0],...original.testAdapters]){
  const bad=Buffer.concat([read(row.path),Buffer.from('forged bytes')]),ledger=structuredClone(original);
  [...ledger.files,...ledger.testAdapters].find(r=>r.path===row.path).sha256=sha(bad);
  assert.throws(()=>api.reverseCharacterAppearance(row.path,bad,ledger),/Pinned character appearance/);
  assert.throws(()=>api.assertCharacterAppearanceCurrent(row.path,bad,ledger),/Pinned character appearance/);
 }
});

test('a corrupted complete preimage fails even if the caller forges matching baseline hashes',async()=>{
 assert.ok(api);const dir=mkdtempSync(join(tmpdir(),'character-appearance-preimage-'));
 try{
  for(const p of ['tests/helpers/fast-hands-character-appearance-provenance.mjs','tests/helpers/fast-hands-character-appearance-pins.mjs','docs/fast-hands/CHARACTER-APPEARANCE-MANIFEST.json']){mkdirSync(dirname(join(dir,p)),{recursive:true});writeFileSync(join(dir,p),readFileSync(new URL(p,root)))}
  const isolated=await import(pathToFileURL(join(dir,'tests/helpers/fast-hands-character-appearance-provenance.mjs')).href);
  for(const path of [prefix+'three3d/rig.mjs',platformAdapter]){
   const ledger=api.characterAppearanceLedger(),row=[...ledger.files,...ledger.testAdapters].find(r=>r.path===path),bad=Buffer.from('fabricated parent');
   mkdirSync(dirname(join(dir,row.beforeAsset)),{recursive:true});writeFileSync(join(dir,row.beforeAsset),bad);
   assert.throws(()=>isolated.reverseCharacterAppearance(row.path,read(row.path)),/Restored character appearance/);
   row.beforeSha256=sha(bad);row.baseGitBlob=blob(bad);
   assert.throws(()=>isolated.reverseCharacterAppearance(row.path,read(row.path),ledger),/Pinned character appearance/);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('all unchanged game files, rules, URLs, counters and historical provenance retain published bytes',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger();
 for(const name of ['levels-rules.mjs','levels-motion.mjs','levels-stage.mjs','levels-leaderboard.mjs','levels-app.mjs','club.css','catch.html','duel.html','index.html','play-counts.mjs','three3d/timeline.mjs'])assert.ok(ledger.preserved.some(r=>r.path===prefix+name),name);
 for(const p of ['public/index.html','src/catalog.mjs','worker/play-counts/index.mjs','worker/leaderboard/index.mjs','wrangler.jsonc'])assert.ok(ledger.preserved.some(r=>r.path===p),p);
 for(const row of [...ledger.preserved,...ledger.history])assert.equal(blob(reverseDuelCoverFingers(row.path,read(row.path))),row.gitBlob,row.path);
});

test('unknown paths are copied without claiming current appearance approval',()=>{
 assert.ok(api);const bytes=Buffer.from([0,255,10,128]);
 const copy=api.reverseCharacterAppearance('unrelated.bin',bytes);assert.deepEqual(copy,bytes);assert.notEqual(copy,bytes);
 assert.throws(()=>api.assertCharacterAppearanceCurrent('unrelated.bin',bytes),/Unapproved character appearance/);
});

for(const [module,name] of [['name-refresh','reverseNameRefresh'],['split-entries','reverseSplitEntries'],['art-polish','reverseArtPolish'],['result-upload','reverseResultUpload'],['sharing-flow','reverseSharingFlow'],['finale','reverseFinale'],['desktop','reverseDesktop'],['entry','reverseEntry'],['club','reverseClub'],['stability','reverseStability'],['screen-alpha','reverseScreenAlpha'],['layout-dart','reverseLayoutDart'],['levels-art','reverseArt'],['levels','reverseLevels']])test(module+' reverses every appearance change and rejects drift',async()=>{
 assert.ok(api);const mod=await import('../helpers/fast-hands-'+module+'-provenance.mjs');
 for(const p of changed){assert.doesNotThrow(()=>mod[name](p,read(p)),module+' restores '+p);assert.throws(()=>mod[name](p,Buffer.concat([read(p),Buffer.from('drift')])),module+' rejects '+p)}
});

test('explicit historical bypasses remain available only through their existing isolated split ledger',async()=>{
 const {reverseSplitEntries}=await import('../helpers/fast-hands-split-entries-provenance.mjs');
 const historical=Buffer.from('isolated pre-split fixture');
 for(const p of [prefix+'three3d/rig.mjs',prefix+'catch.html'])assert.deepEqual(reverseSplitEntries(p,historical,{files:[]}),historical);
});

test('the historical eye adapter retains every assertion and changes only the two archived factories',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger(),row=ledger.testAdapters[0];
 let expected=read(row.beforeAsset).toString();
 expected=expected.replace("import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';","import {createDemoWorld} from '../../public/games/fast-hands/three3d/world.mjs';\nimport {createHistoricalDemoWorld} from '../helpers/fast-hands-historical-world.mjs';");
 for(const needle of ['const w=createDemoWorld(THREE),meshes=[]','const w=createDemoWorld(THREE),objects=[]']){
  assert.equal(expected.split(needle).length-1,1);expected=expected.replace(needle,needle.replace('createDemoWorld','createHistoricalDemoWorld'));
 }
 assert.equal(read(adapter).toString(),expected);
});


test('the archived cover adapter retains every assertion and restores only the poster expectation',()=>{
 assert.ok(api);const ledger=api.characterAppearanceLedger(),row=ledger.testAdapters.find(r=>r.path===platformAdapter);
 assert.ok(row,'The complete archived cover test has an independently pinned preimage');
 const original=read(row.beforeAsset).toString();
 const from="readFileSync(new URL('assets/front-demo-poster.png', gameRoot))";
 assert.equal(original.split(from).length-1,1);
 const expected="import {reverseCharacterAppearance} from '../helpers/fast-hands-character-appearance-provenance.mjs';\n"+original.replace(from,"reverseCharacterAppearance('public/games/fast-hands/assets/front-demo-poster.png', "+from+")");
 assert.equal(read(platformAdapter).toString(),expected);
 const card='public/assets/fast-hands-card.png';
 assert.ok(ledger.preserved.some(r=>r.path===card),'The archived cover retains its independent published blob pin');
 assert.equal(blob(read(card)),parent.preserved[card].gitBlob);
 assert.equal(sha(read(card)),sha(api.reverseCharacterAppearance(prefix+'assets/front-demo-poster.png',read(prefix+'assets/front-demo-poster.png'))));
});
