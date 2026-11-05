import {readBeforePolish} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {SPLIT_ENTRIES_ADDED} from '../helpers/fast-hands-split-entries-provenance.mjs';
import {ART_POLISH_ADDED} from '../helpers/fast-hands-art-polish-provenance.mjs';
import {RESULT_UPLOAD_ADDED} from '../helpers/fast-hands-result-upload-provenance.mjs';
import {SHARING_FLOW_ADDED} from '../helpers/fast-hands-sharing-flow-provenance.mjs';
import {FINALE_ADDED,readFinaleBaseline} from '../helpers/fast-hands-finale-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {desktopLedger,reverseDesktop as reverseDesktopLayer,readDesktopBaseline,DESKTOP_ALLOWED} from '../helpers/fast-hands-desktop-provenance.mjs';
const root=new URL('../../',import.meta.url),prefix='public/games/fast-hands/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const reverseDesktop=reverseDesktopLayer;
const read=path=>readBeforePolish(new URL(path,root));
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
test('desktop reversal rejects drift, malformed edits, wrong parent and unapproved paths',()=>{
 const reverseDesktop=(p,b,l)=>reverseDesktopLayer(p,b,l,{files:[]},{files:[]},{files:[]},{files:[]},{files:[]});
 const path=prefix+'club.css',before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const row={path,sha256:sha(bytes),beforeSha256:sha(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]},ledger={files:[row]};
 assert.deepEqual(reverseDesktop(path,bytes,ledger),before);
 assert.throws(()=>reverseDesktop(path,Buffer.concat([bytes,Buffer.from('!')]),ledger),/current bytes/);
 for(const patch of [{baseGitBlob:'0'.repeat(40)},{beforeSha256:null},{reverseEdits:[{start:-1,end:12,beforeBase64:''}]},{reverseEdits:[{start:6,end:12,beforeBase64:'%%%'}]},{reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]},{reverseEdits:[{start:6,end:12,beforeBase64:''},{start:5,end:6,beforeBase64:''}]}])assert.throws(()=>reverseDesktop(path,bytes,{files:[{...row,...patch}]}));
 assert.throws(()=>reverseDesktop(prefix+'physics.mjs',bytes,{files:[{...row,path:prefix+'physics.mjs'}]}),/Unapproved/);
 assert.deepEqual(reverseDesktop('other/path',bytes,ledger),bytes);
});
test('desktop ledger pins published parent and allows only club CSS runtime changes',()=>{
 const ledger=desktopLedger();
 assert.equal(ledger.baseCommit,'533056c2be3f1f7d02ae1f69712c00f2b5e452d1');
 assert.equal(ledger.baseTree,'0f1578705d3fe32a74bd4465841a776fadb28671');
 assert.deepEqual(DESKTOP_ALLOWED,[prefix+'club.css']);
 assert.deepEqual(ledger.files.map(r=>r.path),DESKTOP_ALLOWED);
 assert.equal(ledger.files[0].baseGitBlob,'8d5d87fe337f8200025c6dab380990beb579b121');
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...ledger.files,...ledger.preserved].map(r=>r.path).concat(FINALE_ADDED,SHARING_FLOW_ADDED,RESULT_UPLOAD_ADDED,ART_POLISH_ADDED,SPLIT_ENTRIES_ADDED).sort());
 for(const row of ledger.files){const bytes=read(row.path),restored=reverseDesktop(row.path,bytes,ledger);assert.equal(sha(restored),row.beforeSha256);assert.equal(blob(restored),row.baseGitBlob);assert.throws(()=>reverseDesktop(row.path,Buffer.concat([bytes,Buffer.from('drift')]),ledger));}
 for(const row of ledger.preserved)assert.equal(blob(readFinaleBaseline(new URL(row.path,root))),row.gitBlob,row.path);
 assert.equal(ledger.historicalLedgers.length,12);
 for(const row of ledger.historicalLedgers){assert.equal(sha(read(row.path)),row.sha256,row.path);assert.equal(blob(readFinaleBaseline(new URL(row.path,root))),row.gitBlob,row.path);}
});
test('desktop baseline reader preserves encodings, URL/path handling and outside files',()=>{
 const path=prefix+'club.css',url=new URL(path,root),expected=reverseDesktop(path,read(path));
 assert.deepEqual(readDesktopBaseline(url),expected);
 for(const options of ['utf8',{encoding:'utf8'}])assert.equal(readDesktopBaseline(url,options),expected.toString());
 assert.equal(readDesktopBaseline(url.pathname,'utf8'),expected.toString());
 assert.deepEqual(readDesktopBaseline(new URL('public/games/shared/startup.js',root)),read('public/games/shared/startup.js'));
 const dir=mkdtempSync(join(tmpdir(),'desktop-provenance-'));try{const file=join(dir,'club.css');writeFileSync(file,'outside 島遊');assert.equal(readDesktopBaseline(file,'utf8'),'outside 島遊');}finally{rmSync(dir,{recursive:true,force:true});}
});

test('historical desktop CSS is append-only and every appended rule is gated above mobile widths',async()=>{
 const {default:postcss}=await import('postcss');
 const path=prefix+'club.css',current=readFinaleBaseline(new URL(path,root)),baseline=reverseDesktopLayer(path,current,desktopLedger(),{files:[]},{files:[]},{files:[]},{files:[]},{files:[]});
 assert.deepEqual(current.subarray(0,baseline.length),baseline);
 const appended=postcss.parse(current.subarray(baseline.length).toString('utf8'));
 assert.ok(appended.nodes.some(n=>n.type==='atrule'));
 for(const node of appended.nodes){
  if(node.type==='comment')continue;
  assert.equal(node.type,'atrule');assert.equal(node.name,'media');
  assert.match(node.params,/(?:^|\band\s*)\(min-width:\s*(\d+)px\)/);
  assert.ok(Number(node.params.match(/\(min-width:\s*(\d+)px\)/)[1])>=1000);
  assert.ok(!node.params.includes(',')&&!/\bnot\b/.test(node.params),'No alternate mobile media branches');
 }
});
