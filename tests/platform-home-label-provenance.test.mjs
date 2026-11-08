import {readBeforeJourney,inventoryBeforeJourney,runtimeInventoryBeforeJourney} from './helpers/vault-journey-provenance.mjs';
import {readBeforeHumor,inventoryBeforeHumor} from './helpers/javelin-humor-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforeGestures as readFileSync} from './helpers/mobile-gestures-preview-provenance.mjs';
import {readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homeLabelManifest,HOME_LABEL_CHANGED,HOME_LABEL_ADDED,reverseHomeLabel,inventoryBeforeHomeLabel} from './helpers/home-label-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforeHumor(new URL(p,root));
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const games=['beer-slide','discus','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb'];
const runtime=games.map(g=>`public/games/${g}/index.html`);
test('the home-label revision changes exactly the eleven old platform header text nodes',()=>{
 const m=homeLabelManifest();assert.deepEqual(HOME_LABEL_CHANGED.filter(p=>p.startsWith('public/')).sort(),[...runtime,'public/games/shared/game-ui.css'].sort());
 for(const path of runtime){
  const current=read(path),before=reverseHomeLabel(path,current),text=before.toString();
  const matches=[...text.matchAll(/(<a\b[^>]*class="pf-home"[^>]*>)← 遊戲首頁(<\/a>)/g)];
  assert.equal(matches.length,1,path+' has exactly one platform header label');
  assert.equal(current.toString(),text.replace(matches[0][0],matches[0][1]+'首頁'+matches[0][2]),path+' no CSS, href, aria, in-game or recovery changes');
 }
 const css='public/games/shared/game-ui.css',beforeCSS=reverseHomeLabel(css,read(css)).toString();
 assert.equal(read(css).toString(),beforeCSS.replace('.pf-game .pf-header .pf-home{display:inline-flex;align-items:center;justify-content:center;min-height:44px;', '.pf-game .pf-header .pf-home{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;'),'only preserve the minimum touch width');
 assert.ok(m.files.every(f=>!f.path.startsWith('worker/')&&!f.path.startsWith('public/games/fast-hands/')));
});
test('all home-label deltas restore exact published preimages and reject drift or forged history',()=>{
 const m=homeLabelManifest();
 for(const f of m.files){
  const bytes=read(f.path),copy=Buffer.from(bytes);assert.equal(blob(reverseHomeLabel(f.path,bytes)),f.beforeGitBlob);assert.deepEqual(bytes,copy);
  assert.throws(()=>reverseHomeLabel(f.path,Buffer.concat([bytes,Buffer.from('drift')])));
  for(const field of ['beforeText','beforeSha256','beforeGitBlob','sha256','gitBlob']){const bad=structuredClone(m);bad.files.find(x=>x.path===f.path)[field]+='drift';assert.throws(()=>reverseHomeLabel(f.path,bytes,bad),f.path+' '+field);}
 }
});
test('home-label inventory admits exact new verification files and rejects missing, duplicate or mutated additions',()=>{
 const paths=[...HOME_LABEL_CHANGED,...HOME_LABEL_ADDED],m=homeLabelManifest();
 assert.deepEqual(inventoryBeforeHomeLabel(paths),[...HOME_LABEL_CHANGED]);
 assert.throws(()=>inventoryBeforeHomeLabel(paths.slice(0,-1)));assert.throws(()=>inventoryBeforeHomeLabel([...paths,HOME_LABEL_ADDED[0]]));
 const target=m.addedFiles[0].path;assert.throws(()=>inventoryBeforeHomeLabel(paths,{read:p=>p===target?Buffer.from('tampered'):read(p)}));
 for(const p of HOME_LABEL_ADDED)assert.throws(()=>reverseHomeLabel(p,read(p)));
});
test('unrelated runtime bytes retain their identity through the home-label history boundary',()=>{
 for(const path of ['public/games/fast-hands/index.html','public/games/fast-hands/catch.html','public/games/fast-hands/duel.html','public/games/fast-hands-test/index.html']){const b=read(path);assert.deepEqual(reverseHomeLabel(path,b),b)}
});

const knownOmitted=['docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png','public/assets/app-icons/javelin/apple-touch-icon.png','public/assets/app-icons/sprint-100m/apple-touch-icon.png','public/assets/discus-card.png','public/assets/high-jump-card.png','public/assets/javelin-card.png','public/assets/pole-vault-card.png','public/assets/portal-echosboundary.png','public/assets/portal-formosabattle.png','public/assets/shot-put-card.png','public/assets/sprint-100m-card.png','public/assets/tower-climb-card.png'];
test('the complete materialized branch preserves every parent blob beyond the exact home-label delta',()=>{
 const baseline=JSON.parse(read('tests/fixtures/home-label-baseline.json')),paths=[],missing=[];
 function walk(dir=''){for(const entry of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['dist','node_modules','.git'].includes(entry.name))continue;const path=dir?dir+'/'+entry.name:entry.name;if(entry.isDirectory())walk(path);else{assert.ok(entry.isFile(),path+' must be a regular source file');paths.push(path)}}}walk();
 for(const file of baseline.files){if(!existsSync(new URL(file.path,root))){missing.push(file.path);continue}assert.equal(blob(reverseHomeLabel(file.path,read(file.path))),file.gitBlob,file.path)}
 assert.ok(missing.every(path=>knownOmitted.includes(path)),'only the known remote large-PNG transfer limitation may be absent locally');
 assert.deepEqual(inventoryBeforeHomeLabel(inventoryBeforeHumor(inventoryBeforeJourney(paths))).sort(),baseline.files.map(f=>f.path).filter(p=>!missing.includes(p)).sort());
});
