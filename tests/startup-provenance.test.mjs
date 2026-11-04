import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {startupLedger,startupHash,reverseStartup,readStartupBaseline,startupRuntimeAdditions} from './helpers/startup-provenance.mjs';

const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const games=['beer-slide','discus','fast-hands','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb'];
const expected=[...games.map(game=>game+'/index.html'),'shared/startup.js'].sort();

test('startup synthetic byte reversal rejects drift, wrong offsets and invented parents',()=>{
 const before=Buffer.from('島遊\n'),bytes=Buffer.from('島遊無界\n');
 const entry={path:'example/index.html',sha256:hash(bytes),beforeSha256:hash(before),baseGitBlob:blob(before),reverseEdits:[{start:6,end:12,beforeBase64:''}]};
 const ledger={files:[entry]};
 assert.deepEqual(reverseStartup(entry.path,bytes,ledger),before);
 assert.throws(()=>reverseStartup(entry.path,Buffer.concat([bytes,Buffer.from('!')]),ledger),/current bytes/);
 assert.throws(()=>reverseStartup(entry.path,before,ledger),/current bytes/);
 assert.throws(()=>reverseStartup(entry.path,bytes,{files:[{...entry,baseGitBlob:'0'.repeat(40)}]}),/baseline blob/);
 assert.throws(()=>reverseStartup(entry.path,bytes,{files:[{...entry,reverseEdits:[{start:6,end:12,beforeBase64:'YmFk'}]}]}),/exact reverse/);
 assert.throws(()=>reverseStartup(entry.path,bytes,{files:[{...entry,reverseEdits:[{start:-1,end:12,beforeBase64:''}]}]}),/bounds/);
 assert.deepEqual(reverseStartup('unlisted.mjs',bytes,ledger),bytes);
 const added={path:'shared/startup.js',sha256:hash(bytes),beforeSha256:null,baseGitBlob:null,reverseEdits:[]};
 assert.deepEqual(reverseStartup(added.path,bytes,{files:[added]}),bytes);
 assert.throws(()=>reverseStartup(added.path,bytes,{files:[{...added,baseGitBlob:'0'.repeat(40)}]}),/no parent/);
 assert.throws(()=>reverseStartup(added.path,bytes,{files:[{...added,reverseEdits:[{start:0,end:0,beforeBase64:''}]}]}),/no invented baseline/);
});

test('startup overlay admits exactly twelve HTML pages and one new classic script',()=>{
 const ledger=startupLedger();
 assert.equal(ledger.baseCommit,'95d28ea9061516d67257b59bf268a82c0627d2e4');
 assert.equal(ledger.baseTree,'ac263199bde16974b301ace44a2e93e59769ca48');
 assert.deepEqual(ledger.files.map(file=>file.path).sort(),expected);
 assert.deepEqual(ledger.files.filter(file=>file.beforeSha256===null).map(file=>file.path),['shared/startup.js']);
 assert.deepEqual(startupRuntimeAdditions(),['public/games/shared/startup.js']);
 for(const file of ledger.files){
  const url=new URL('public/games/'+file.path,root),bytes=readFileSync(url);
  assert.equal(startupHash(bytes),file.sha256,file.path);
  const old=reverseStartup(file.path,bytes);
  if(file.beforeSha256){assert.equal(hash(old),file.beforeSha256);assert.equal(blob(old),file.baseGitBlob);}
  else{assert.equal(file.baseGitBlob,null);assert.deepEqual(file.reverseEdits,[]);assert.deepEqual(old,bytes);}
  assert.deepEqual(readStartupBaseline(url),old);
  assert.equal(readStartupBaseline(url,'utf8'),old.toString());
  assert.equal(readStartupBaseline(url,{encoding:'utf8'}),old.toString());
  assert.equal(readStartupBaseline(url.pathname,{encoding:'utf8'}),old.toString());
  assert.throws(()=>reverseStartup(file.path,Buffer.concat([bytes,Buffer.from('\n// unreviewed drift')])));
 }
});

test('startup cannot conceal missing or duplicate gates or unrelated page mutations',()=>{
 for(const file of startupLedger().files.filter(file=>file.beforeSha256)){
  const bytes=read('public/games/'+file.path),text=bytes.toString();
  const gate=text.match(/\sdata-pf-startup=(?:"pending"|'pending'|pending)(?=[\s>])/g);
  assert.equal(gate?.length,1,file.path+' has one initial startup gate');
  assert.throws(()=>reverseStartup(file.path,Buffer.from(text.replace(gate[0],''))),/current bytes/);
  assert.throws(()=>reverseStartup(file.path,Buffer.from(text.replace(gate[0],gate[0]+gate[0]))),/current bytes/);
  assert.throws(()=>reverseStartup(file.path,Buffer.from(text+'<!-- unrelated page mutation -->')),/current bytes/);
  const broken=structuredClone(startupLedger());
  broken.files.find(row=>row.path===file.path).reverseEdits[0].beforeBase64=Buffer.from('unreviewed bytes').toString('base64');
  assert.throws(()=>reverseStartup(file.path,bytes,broken));
 }
});

test('startup keeps studio, fast hands and all older provenance ledgers byte-exact',()=>{
 const ledgers={
  'docs/minigames/STUDIO-BRAND-MANIFEST.json':'bcf2e65e2ced664cd18934d94508d8984d5e3384cd47045c652821634f566b12',
  'docs/fast-hands/platform-manifest.json':'b2b1ec4c803e66a54e345fd85a1a060ab491554a6dd1f04b2368001e73d6ca5f',
  'docs/fast-hands/import-manifest.json':'731aa36d01e5cbe16f0ee4b86129f8b57a0c6d6244bfaa8689a4939e41864f54',
  'docs/minigames/UI-STANDARD-MANIFEST.json':'2c259504917e091644ea9f9a021d228168c969d6b5ee08e83f40994b8f9f673a',
  'docs/minigames/REACTION-ROD-POLISH-MANIFEST.json':'7309e4a63dc155aa46c17adf203104e10860406cd51e8545846d957444944a35',
  'docs/minigames/REACTION-ROD-REPLAY-MANIFEST.json':'8cafbb6ad8b06784c6c3ddb72ea6830166c05441e870346d670c0f55558bc5c6',
  'docs/minigames/REACTION-ROD-RESULT-MANIFEST.json':'bc9abea91aeebc4546c69e34fcd0d1982347e13142574dbe913144f510ac1edb',
  'docs/minigames/REACTION-ROD-VIEWPORT-MANIFEST.json':'cbe2463ebdf8703323008c708db769cd52a6cc47592fb6de8adc5e9d94052bc0'
 };
 for(const [path,expectedHash] of Object.entries(ledgers)){
  assert.equal(hash(read(path)),expectedHash,path);
  assert.deepEqual(readStartupBaseline(new URL(path,root)),read(path),path+' outside game root stays unchanged');
 }
});

// Independently constrain the reviewed HTML delta, beyond reversible byte hashes.
const startupStyle="<style id=\"pf-startup-style\">html[data-pf-startup]:not([data-pf-startup=\"ready\"]) body>:not(#pf-startup):not(script):not(style){visibility:hidden!important}#pf-startup{position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:1rem;padding:24px;background:#f6f1df;color:#304438;font:16px/1.6 system-ui,sans-serif;text-align:center}#pf-startup p{margin:0;max-width:30em}#pf-startup nav{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}#pf-startup a{color:inherit;text-underline-offset:4px}</style>";
const startupShell="<section id=\"pf-startup\" aria-label=\"遊戲載入\"><p id=\"pf-startup-status\" role=\"status\">正在準備遊戲…</p><nav aria-label=\"載入協助\"><a href=\"\">重新載入</a><a href=\"/\">返回首頁</a></nav><noscript><p>請開啟 JavaScript 後重新載入遊戲。</p></noscript></section>";
const startupScript='<script id="pf-startup-script">'+read('public/games/shared/startup.js').toString('utf8')+'</script>';
const startupPreloads={
 "beer-slide/index.html": [
  "./platform.mjs",
  "./audio-ui.mjs",
  "./game.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "discus/index.html": [
  "./game.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "fast-hands/index.html": [
  "app.mjs"
 ],
 "high-jump/index.html": [
  "game.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "hurdles/index.html": [
  "game.mjs?v=1.4.0",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "javelin/index.html": [
  "app.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "long-jump/index.html": [
  "layout.mjs",
  "game.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "pole-vault/index.html": [
  "game.mjs?v=1.2.0",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "reaction-rod/index.html": [
  "../long-jump/layout.mjs",
  "./game.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js",
  "../shared/entry-shell.mjs"
 ],
 "shot-put/index.html": [
  "./game.mjs",
  "../shared/entry-shell.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js"
 ],
 "sprint-100m/index.html": [
  "app.mjs",
  "../shared/entry-shell.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js"
 ],
 "tower-climb/index.html": [
  "game.mjs",
  "../shared/entry-shell.mjs",
  "vendor/three.core.min.js",
  "vendor/three.module.min.js"
 ]
};
test('startup HTML delta is insertion-only and preserves every original attribute and byte',()=>{
 for(const file of startupLedger().files.filter(file=>file.beforeSha256)){
  assert.ok(file.reverseEdits.every(edit=>edit.beforeBase64===''),'startup does not replace original bytes');
  const bytes=read('public/games/'+file.path),html=bytes.toString();
  const head=startupStyle+startupPreloads[file.path].map(href=>'<link rel="modulepreload" href="'+href+'">').join('')+startupScript;
  const charset=html.match(/<meta\b[^>]*charset=[^>]+>/i)?.[0],body=html.match(/<body\b[^>]*>/i)?.[0];
  assert.ok(charset&&html.includes(charset+head),file.path+' loads the exact gate immediately after charset');
  assert.ok(body&&html.includes(body+startupShell),file.path+' inserts only the exact loading shell');
  assert.equal(html.split(head).length,2,file.path+' has one head insertion');
  assert.equal(html.split(startupShell).length,2,file.path+' has one shell insertion');
  const restored=html.replace(' data-pf-startup="pending"','').replace(head,'').replace(startupShell,'');
  assert.equal(restored,reverseStartup(file.path,bytes).toString(),file.path+' contains no unrelated HTML edit');
 }
});
