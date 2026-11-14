import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
import {validateSubmission,BOARDS} from '../worker/leaderboard/index.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const valid={game:'reaction-rod',rules:'catch-rating-v1',unit:'catches',status:'done',score:5,secondaryScore:4.8123456789,nickname:'島民',deviceId:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002'};
test('main navigation and independent shelf retain Rod and Fast Hands alongside approved additions',()=>{
 const d=new JSDOM(renderPage(catalog)).window.document;
 assert.deepEqual([...d.querySelectorAll('.site-header nav a')].map(a=>a.textContent),['十項全能','小遊戲','大遊戲','play. one more.','關於']);
 assert.deepEqual(catalog.games.map(g=>g.id),['long-jump', 'hurdles', 'high-jump', 'pole-vault', 'shot-put', 'discus', 'sprint-100m', 'run-400m', 'run-1500m', 'javelin']);
 assert.deepEqual(catalog.minigames.map(g=>g.id),['overtime-pinball','courtesy-contest', 'fast-hands', 'fast-hands-catch', 'fast-hands-duel', 'beer-slide', 'reaction-rod', 'tower-climb']);
 assert.equal(d.querySelectorAll('#minigames .game-card').length,8);
 assert.deepEqual([...d.querySelectorAll('[data-play-count]')].map(n=>n.dataset.playCount),['long-jump', 'hurdles', 'high-jump', 'pole-vault', 'shot-put', 'discus', 'sprint-100m', 'run-400m', 'run-1500m', 'javelin', 'overtime-pinball', 'courtesy-contest', 'fast-hands', 'fast-hands-catch', 'fast-hands-duel', 'beer-slide', 'reaction-rod', 'tower-climb', 'taiwankart', 'taiwanfighter', 'taiwanpunchline', 'soul10power', 'arcadeplatform']);
 assert.equal(d.querySelector('#minigames .game-cta[href="/games/reaction-rod/"]').getAttribute('href'),'/games/reaction-rod/');
 assert.equal(d.querySelector('[data-external-id="taiwanfighter"] a').getAttribute('href'),'/api/play-counts/entries/taiwanfighter');
});
test('Rod API validates full precision without weakening legacy schemas or admitting other games',()=>{
 assert.ok(BOARDS['reaction-rod']); assert.deepEqual(validateSubmission(valid),valid);
 for(const v of [0,11,1.2,NaN])assert.throws(()=>validateSubmission({...valid,score:v}));
 for(const v of [-1,11,NaN,Infinity,'5',undefined])assert.throws(()=>validateSubmission({...valid,secondaryScore:v}));
 for(const game of ['sprint-100m','javelin','high-jump','shot-put','beer-slide'])assert.throws(()=>validateSubmission({...valid,game}));
 const {secondaryScore,...legacy}=valid;
 assert.throws(()=>validateSubmission({...legacy,game:'long-jump',rules:'journey-km-v1',unit:'km',status:'valid',secondaryScore:0}));
});
test('Rod imports only local adapters while all visible routes and licensed audio exist',()=>{
 assert.ok(existsSync(new URL('../public/games/reaction-rod/index.html',import.meta.url)));
 const g=read('public/games/reaction-rod/game.mjs');
 for(const file of ['leaderboard.mjs','play-counts.mjs','audio.mjs','game-audio-events.mjs'])assert.ok(g.includes("'./"+file+"'"));
 assert.doesNotMatch(g,/beer-slide/);
 assert.match(read('public/games/reaction-rod/index.html'),/src="\.\/layout\.mjs"/);
 assert.doesNotMatch(read('public/games/reaction-rod/index.html'),/\.\.\/beer-slide/);
});
