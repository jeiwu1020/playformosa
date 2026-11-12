import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync as readLive} from 'node:fs';
import {readBeforeTapCoverage as readFileSync,inventoryBeforeTapCoverage} from './helpers/courtesy-touch-coverage-provenance.mjs';
import {JSDOM} from 'jsdom';
import * as p from './helpers/main-courtesy-help-provenance.mjs';
import {catalog} from '../src/catalog.mjs';
import {releasedGameIds,assertReleasedGames} from '../scripts/release-policy.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root));
function paths(){const result=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const path=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(path);else result.push(path);}}walk();return inventoryBeforeTapCoverage(result);}
test('Courtesy promotion exactly reconstructs remote main and preserves all existing production repositories, bindings and ledgers',()=>{
 const m=p.validate(p.manifest()),current=paths();assert.equal(p.verifyBase(p.baseline),true);
 assert.deepEqual(p.inventoryBeforeMainCourtesy(current).sort(),p.baseline.files.map(f=>f.path).sort());
 for(const f of p.baseline.files)assert.equal(p.gitBlob(p.readBeforeMainCourtesy(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...m.files,...m.addedFiles])assert.equal(p.gitBlob(read(f.path)),f.gitBlob,f.path);
 for(const path of ['wrangler.jsonc','worker/leaderboard/repository.mjs','worker/leaderboard/reaction-rod-repository.mjs','worker/leaderboard/0001.sql','worker/leaderboard/003-reaction-rod-production.sql','public/games/shared/leaderboard.mjs','public/games/shared/leaderboard-config.mjs','public/games/shared/production-jump-leaderboard.mjs','public/games/shared/mobile-gestures.css','public/games/shared/mobile-gestures.mjs','public/games/long-jump/game.mjs','public/games/hurdles/game.mjs','public/games/high-jump/game.mjs'])assert.equal(p.gitBlob(read(path)),p.baseline.files.find(f=>f.path===path).gitBlob,path);
 assert.ok(m.files.every(f=>!/(?:BASELINE|MANIFEST|SOURCE-MANIFEST)\.json$/.test(f.path)),'no old ledger is repinned');
 assert.deepEqual(m.addedPublicPaths,m.addedPaths.filter(path=>path.startsWith('public/')).map(path=>path.slice(7)));
 for(const path of m.addedPublicPaths)assert.ok(path.startsWith('games/courtesy-contest/')||['assets/courtesy-contest-card.jpg','games/shared/sports-help.mjs','games/shared/sports-help.css','games/shared/sports-credits.html'].includes(path),path);
});
test('promotion restoration rejects drift, missing/tampered additions, duplicate inventory and invented before-images',()=>{
 const m=p.manifest(),current=paths();
 for(const f of m.files){assert.deepEqual(p.reverseMainCourtesy(f.path,read(f.path)),Buffer.from(f.beforeText));assert.throws(()=>p.reverseMainCourtesy(f.path,Buffer.concat([read(f.path),Buffer.from('drift')])));}
 for(const f of m.addedFiles)assert.throws(()=>p.inventoryBeforeMainCourtesy(current,{read:path=>path===f.path?Buffer.from('drift'):read(path)}));
 for(const path of m.addedPaths)assert.throws(()=>p.inventoryBeforeMainCourtesy(current.filter(x=>x!==path)));
 assert.throws(()=>p.inventoryBeforeMainCourtesy([...current,current[0]]));
 for(const mutate of [x=>x.files.pop(),x=>x.files[0].beforeText+='tamper',x=>x.addedPaths.pop(),x=>x.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>p.validate(bad));}
});
test('expanded production retains Courtesy and original sports credits while admitting the requested games',async()=>{
 const sports=['long-jump','hurdles','high-jump','pole-vault','shot-put','discus','sprint-100m','run-400m','run-1500m','javelin'];
 const mini=['courtesy-contest','fast-hands','fast-hands-catch','fast-hands-duel','beer-slide','reaction-rod','tower-climb'];
 assert.deepEqual(catalog.games.map(x=>x.id),sports);assert.deepEqual(catalog.minigames.map(x=>x.id),mini);
 assert.deepEqual([...releasedGameIds].sort(),[...sports,...mini].sort());await assertReleasedGames(new URL('public/',root));
 const d=new JSDOM(readLive(new URL('public/games/shared/sports-credits.html',root))).window.document;assert.deepEqual([...d.querySelectorAll('main>section')].map(e=>e.id),sports);
 const historical=new JSDOM(read('public/games/shared/sports-credits.html')).window.document;for(const id of ['long-jump','hurdles','high-jump'])assert.equal(d.getElementById(id).outerHTML,historical.getElementById(id).outerHTML);
 const rod=new JSDOM(readLive(new URL('public/games/reaction-rod/index.html',root))).window.document;assert.ok(rod.querySelector('a[href="./licenses/Not-Jam-License.txt"]'));assert.doesNotMatch(rod.documentElement.outerHTML,/\.\.\/beer-slide/);
});
