import {ART_POLISH_ADDED} from '../helpers/fast-hands-art-polish-provenance.mjs';
import {RESULT_UPLOAD_ADDED} from '../helpers/fast-hands-result-upload-provenance.mjs';
import {SHARING_FLOW_ADDED} from '../helpers/fast-hands-sharing-flow-provenance.mjs';
import {readEntryBaseline} from '../helpers/fast-hands-entry-provenance.mjs';
import {FINALE_ADDED} from '../helpers/fast-hands-finale-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
import {ENTRY_ADDED} from '../helpers/fast-hands-entry-provenance.mjs';
const helpers=await import('../helpers/fast-hands-club-provenance.mjs').catch(()=>({}));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const read=path=>readFileSync(new URL(path,root));
const changed=['app.mjs','catch.html','duel.html','index.html','levels-app.mjs'].map(path=>prefix+path);
const added=['club.css','club.mjs'].map(path=>prefix+path);
const pinned={
 'app.mjs':'05a5de1c5272a7b833836392cd5900abb5bb6a51',
 'index.html':'2b85a9ed2ad95f6ab97bdc33989382e52851273b',
 'catch.html':'84ee32d1e273be5edcd8af4738d419c62071f2df',
 'duel.html':'d007285d1e39980fa636fdb06fe66e46ea270419',
 'levels-app.mjs':'401e2baa5e5d85d97796cc32f43cc5cc47c8e5a8',
};
function api(){assert.equal(typeof helpers.reverseClub,'function','the outer club provenance must exist');return helpers;}
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('club synthetic reversal rejects drift, malformed edits, unapproved paths and invented parents',()=>{
 const reverseClub=(path,bytes,ledger)=>api().reverseClub(path,bytes,ledger,{files:[]},{files:[]},{files:[]},{files:[]},{files:[]}),path=prefix+'app.mjs',before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const row={path,sha256:sha(bytes),beforeSha256:sha(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]};
 const ledger={files:[row]};assert.deepEqual(reverseClub(path,bytes,ledger),before);
 assert.throws(()=>reverseClub(path,Buffer.concat([bytes,Buffer.from('!')]),ledger),/current bytes/);
 assert.throws(()=>reverseClub(path,bytes,{files:[{...row,baseGitBlob:'0'.repeat(40)}]}),/Git blob/);
 assert.throws(()=>reverseClub(path,bytes,{files:[{...row,reverseEdits:[{start:-1,end:12,beforeBase64:''}]}]}));
 assert.throws(()=>reverseClub(path,bytes,{files:[{...row,reverseEdits:[{start:6,end:12,beforeBase64:'%%%'}]}]}));
 assert.throws(()=>reverseClub(path,bytes,{files:[{...row,reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]}]}),/Restored club bytes/);
 assert.throws(()=>reverseClub(prefix+'physics.mjs',bytes,{files:[{...row,path:prefix+'physics.mjs'}]}),/Unapproved club path/);
 assert.deepEqual(reverseClub('public/games/other/index.html',bytes,ledger),bytes);
 const extra={path:prefix+'club.mjs',sha256:sha(bytes),beforeSha256:null,baseGitBlob:null,reverseEdits:[]};
 assert.deepEqual(reverseClub(extra.path,bytes,{files:[extra]}),bytes);
 assert.throws(()=>reverseClub(extra.path,bytes,{files:[{...extra,baseGitBlob:blob(before)}]}));
 assert.throws(()=>reverseClub(extra.path,bytes,{files:[{...extra,beforeSha256:sha(before)}]}));
 assert.throws(()=>reverseClub(path,bytes,{files:[{...extra,path}]}));
});

test('club restores the exact a35cea8 baseline and admits only five presentation edits plus two modules',()=>{
 const {clubLedger,reverseClub,CLUB_CHANGED,CLUB_ADDED}=api(),ledger=clubLedger();
 assert.equal(ledger.baseCommit,'a35cea8f150a3bab67ecd0ada34b437455906aaa');assert.equal(ledger.baseTree,'871fe04899d029d1ea46e66c975c5c90109bf3fc');
 assert.deepEqual(CLUB_CHANGED,changed);assert.deepEqual(CLUB_ADDED,added);
 assert.deepEqual(ledger.files.map(row=>row.path).sort(),[...changed,...added].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...ledger.files.map(row=>row.path),...ledger.preserved.map(row=>row.path),...ENTRY_ADDED,...FINALE_ADDED,...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED].sort());
 for(const row of ledger.files){const bytes=read(row.path),restored=reverseClub(row.path,bytes,ledger);
  assert.throws(()=>reverseClub(row.path,Buffer.concat([bytes,Buffer.from('unreviewed drift')]),ledger));
  if(row.beforeSha256===null){assert.ok(added.includes(row.path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);}
  else{assert.equal(blob(restored),pinned[row.path.slice(prefix.length)]);assert.equal(sha(restored),row.beforeSha256);assert.equal(row.baseGitBlob,pinned[row.path.slice(prefix.length)]);}
 }
});

test('club baseline reader preserves encodings and does not transform unrelated files',()=>{
 const {readClubBaseline,reverseClub}=api(),path=prefix+'index.html',url=new URL(path,root),expected=reverseClub(path,read(path));
 assert.deepEqual(readClubBaseline(url),expected);assert.equal(readClubBaseline(url,'utf8'),expected.toString());
 assert.equal(readClubBaseline(url,{encoding:'utf8'}),expected.toString());assert.equal(readClubBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(readClubBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'club-provenance-'));try{const file=join(dir,'index.html');writeFileSync(file,'outside 島遊');assert.equal(readClubBaseline(file,'utf8'),'outside 島遊');}finally{rmSync(dir,{recursive:true,force:true});}
});

test('club baseline assets are hash pinned and reject traversal while old ledgers and all other runtime stay exact',()=>{
 const {clubLedger,reverseClub}=api(),ledger=clubLedger();
 for(const row of ledger.files){
  if(row.beforeAsset){assert.equal(row.beforeAsset,'docs/fast-hands/baselines/club/'+row.path.slice(prefix.length));assert.equal(sha(read(row.beforeAsset)),row.beforeSha256);assert.equal('reverseEdits' in row,false);
   const broken=structuredClone(ledger);broken.files.find(r=>r.path===row.path).beforeAsset='../../escape.mjs';assert.throws(()=>reverseClub(row.path,read(row.path),broken));}
  for(const edit of row.reverseEdits||[])assert.ok(Buffer.from(edit.beforeBase64,'base64').length<=4096);
 }
 for(const name of ['style.css','level-nav.css','levels.css','physics.mjs','levels-rules.mjs','levels-motion.mjs','levels-world.mjs','levels-stage.mjs','leaderboard.mjs','assets/duel-items-atlas.png'])assert.ok(ledger.preserved.some(row=>row.path===prefix+name),name);
 for(const row of ledger.preserved)assert.equal(blob(readEntryBaseline(new URL(row.path,root))),row.gitBlob,row.path);
 assert.ok(ledger.historicalLedgers.length===10);for(const row of ledger.historicalLedgers)assert.equal(sha(read(row.path)),row.sha256,row.path);
});

test('club reverses its additional readiness condition to the exact old inline bootstrap',()=>{
 const {readClubBaseline}=api(),before=readClubBaseline(new URL(prefix+'index.html',root),'utf8');
 const inline=before.match(/<script id="pf-startup-script">([\s\S]*?)<\/script>/)?.[1];
 assert.equal(inline,read('public/games/shared/startup.js').toString());
 for(const game of ['beer-slide','discus','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb']){
  const path='public/games/'+game+'/index.html';assert.deepEqual(readClubBaseline(new URL(path,root)),read(path),game);
  assert.equal(read(path).toString().match(/<script id="pf-startup-script">([\s\S]*?)<\/script>/)?.[1],inline,game);
 }
});

test('club additions are checked before admission through every older runtime inventory',async()=>{
 const {clubRuntimeAdditions}=api();assert.deepEqual(clubRuntimeAdditions(),[...added,...ENTRY_ADDED,...FINALE_ADDED,...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED]);
 const {stabilityRuntimeAdditions,STABILITY_ADDED}=await import('../helpers/fast-hands-stability-provenance.mjs');
 assert.deepEqual(stabilityRuntimeAdditions(),[...STABILITY_ADDED,...added,...ENTRY_ADDED,...FINALE_ADDED,...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED]);
 for(const [file,name] of [['fast-hands-levels-art-provenance.mjs','artRuntimeAdditions'],['fast-hands-levels-provenance.mjs','levelsRuntimeAdditions']]){
  const mod=await import('../helpers/'+file),paths=mod[name]();for(const path of added)assert.ok(paths.includes(path),name+' admits '+path);
 }
});
