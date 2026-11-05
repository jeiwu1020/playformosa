import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {SPLIT_ENTRIES_ADDED} from '../helpers/fast-hands-split-entries-provenance.mjs';
import {ART_POLISH_ADDED} from '../helpers/fast-hands-art-polish-provenance.mjs';
import {RESULT_UPLOAD_ADDED} from '../helpers/fast-hands-result-upload-provenance.mjs';
import {SHARING_FLOW_ADDED} from '../helpers/fast-hands-sharing-flow-provenance.mjs';
import {FINALE_ADDED} from '../helpers/fast-hands-finale-provenance.mjs';
import {readDesktopBaseline} from '../helpers/fast-hands-desktop-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {entryLedger,reverseEntry as reverseEntryLayer,readEntryBaseline,ENTRY_CHANGED,ENTRY_ADDED,ENTRY_ALLOWED,entryRuntimeAdditions} from '../helpers/fast-hands-entry-provenance.mjs';
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const pinned={"app.mjs": "83e57ec9a00b54ad6bd23ef249491b6b9bd739a3", "index.html": "d13aea9195b9fc7142a71d725715811b345b0f2d", "club.css": "4d3e78f81337fb0c1eaddf50c5aac94c0e87f86b"};
const reverseEntry=reverseEntryLayer;
const read=path=>readBeforePolish(new URL(path,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('entry reversal rejects altered current bytes, bad edits, wrong parent and unapproved paths',()=>{
 const reverseEntry=(p,b,l)=>reverseEntryLayer(p,b,l,{files:[]},{files:[]},{files:[]},{files:[]},{files:[]});
 const path=prefix+'app.mjs',before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const row={path,sha256:sha(bytes),beforeSha256:sha(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]},ledger={files:[row]};
 assert.deepEqual(reverseEntry(path,bytes,ledger),before);
 assert.throws(()=>reverseEntry(path,Buffer.concat([bytes,Buffer.from('!')]),ledger),/current bytes/);
 for(const patch of [{baseGitBlob:'0'.repeat(40)},{reverseEdits:[{start:-1,end:12,beforeBase64:''}]},{reverseEdits:[{start:6,end:12,beforeBase64:'%%%'}]},{reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]}])assert.throws(()=>reverseEntry(path,bytes,{files:[{...row,...patch}]}));
 assert.throws(()=>reverseEntry(prefix+'physics.mjs',bytes,{files:[{...row,path:prefix+'physics.mjs'}]}),/Unapproved/);
 assert.deepEqual(reverseEntry('other/path',bytes,ledger),bytes);
 const extra={path:ENTRY_ADDED[0],sha256:sha(bytes),beforeSha256:null,baseGitBlob:null,reverseEdits:[]};
 assert.deepEqual(reverseEntry(extra.path,bytes,{files:[extra]}),bytes);
 assert.throws(()=>reverseEntry(extra.path,bytes,{files:[{...extra,baseGitBlob:blob(before)}]}));
 assert.throws(()=>reverseEntry(path,bytes,{files:[{...extra,path}]}));
});

test('entry ledger covers exact runtime and pins the published preview/hurdles parent',()=>{
 const ledger=entryLedger();
 assert.equal(ledger.baseCommit,'3b3c09c54c910d69bad11708f5d3e011f8bb9794');
 assert.equal(ledger.baseTree,'5dbe97f03babec8ffba2e245a9cc5c348aedacfb');
 assert.deepEqual(ENTRY_CHANGED,['app.mjs','index.html','club.css'].map(p=>prefix+p));
 assert.deepEqual(ledger.files.map(r=>r.path).sort(),[...ENTRY_ALLOWED].sort());
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...ledger.files,...ledger.preserved].map(r=>r.path).concat(FINALE_ADDED,SHARING_FLOW_ADDED,RESULT_UPLOAD_ADDED,ART_POLISH_ADDED,SPLIT_ENTRIES_ADDED).sort());
 for(const row of ledger.files){
  const bytes=read(row.path),restored=reverseEntry(row.path,bytes,ledger);
  assert.throws(()=>reverseEntry(row.path,Buffer.concat([bytes,Buffer.from('drift')]),ledger));
  if(row.beforeSha256!==null){assert.equal(sha(restored),row.beforeSha256);assert.equal(blob(restored),row.baseGitBlob);assert.equal(row.baseGitBlob,pinned[row.path.slice(prefix.length)]);}
  if(row.beforeAsset){const bad=structuredClone(ledger);bad.files.find(r=>r.path===row.path).beforeAsset='../../escape';assert.throws(()=>reverseEntry(row.path,bytes,bad));}
 }
 assert.deepEqual(entryRuntimeAdditions(),[...ENTRY_ADDED,...FINALE_ADDED,...SHARING_FLOW_ADDED,...RESULT_UPLOAD_ADDED,...ART_POLISH_ADDED,...SPLIT_ENTRIES_ADDED]);
});

test('entry preserves unrelated art, timing, rules, ranking and every historical ledger byte',()=>{
 const ledger=entryLedger();
 for(const name of ['style.css','level-nav.css','levels.css','physics.mjs','finish-timing.mjs','levels-rules.mjs','levels-motion.mjs','levels-world.mjs','levels-stage.mjs','leaderboard.mjs','assets/duel-items-atlas.png'])assert.ok(ledger.preserved.some(row=>row.path===prefix+name),name);
 for(const row of ledger.preserved)assert.equal(blob(readDesktopBaseline(new URL(row.path,root))),row.gitBlob,row.path);
 assert.equal(ledger.historicalLedgers.length,11);
 for(const row of ledger.historicalLedgers){assert.equal(sha(read(row.path)),row.sha256,row.path);assert.equal(blob(readDesktopBaseline(new URL(row.path,root))),row.gitBlob,row.path);}
});

test('entry baseline reader preserves encodings, URL/path handling and outside files',()=>{
 const path=prefix+'index.html',url=new URL(path,root),expected=reverseEntry(path,read(path));
 assert.deepEqual(readEntryBaseline(url),expected);
 for(const options of ['utf8',{encoding:'utf8'}])assert.equal(readEntryBaseline(url,options),expected.toString());
 assert.equal(readEntryBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(readEntryBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'entry-provenance-'));try{const file=join(dir,'index.html');writeFileSync(file,'outside 島遊');assert.equal(readEntryBaseline(file,'utf8'),'outside 島遊');}finally{rmSync(dir,{recursive:true,force:true});}
});
