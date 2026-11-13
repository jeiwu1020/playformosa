import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
const official='https://taiwanpunchline.playformosa.workers.dev/';
test('Punchline appears only as an independently released preview big-game card',()=>{
 const entry=catalog.externalGames.find(e=>e.id==='taiwanpunchline');
 assert.ok(entry);assert.equal(entry.title,'拳民開講');assert.equal(entry.href,official);
 assert.deepEqual(entry.release,{preview:true,production:false});
 const doc=new JSDOM(renderPage(catalog,{channel:'preview'})).window.document;
 const card=doc.querySelector('#big-games [data-external-id="taiwanpunchline"]');assert.ok(card);
 assert.equal(card.querySelectorAll('a').length,1);assert.equal(card.querySelector('a').getAttribute('href'),'/api/play-counts/entries/taiwanpunchline');
 assert.equal(card.querySelector('a').target,'_blank');assert.equal(card.querySelector('a').rel,'noopener noreferrer');
 assert.equal(card.querySelector('h3').textContent,'拳民開講');
 assert.equal(card.querySelector('img').getAttribute('src'),'/assets/portal-taiwanpunchline.png');
 assert.equal(card.querySelector('[data-play-count]').dataset.playCount,'taiwanpunchline');assert.match(card.textContent,/非遊戲開局數/);
 assert.equal(doc.querySelectorAll('[data-external-id="taiwanpunchline"]').length,1);
 const production=new JSDOM(renderPage(catalog,{channel:'production'})).window.document;
 assert.equal(production.querySelector('[data-external-id="taiwanpunchline"]'),null);
});
test('Punchline accepts only the approved main URL, not preview, query, path, or lookalike',()=>{
 const entry=catalog.externalGames.find(e=>e.id==='taiwanpunchline');assert.ok(entry);
 for(const href of ['https://codex-complete-challenge-story-taiwanpunchline.playformosa.workers.dev/','http://taiwanpunchline.playformosa.workers.dev/','https://taiwanpunchline.playformosa.workers.dev/?qa=1','https://taiwanpunchline.playformosa.workers.dev/other','https://taiwanpunchline.playformosa.workers.dev.evil.example/']){
 assert.throws(()=>renderPage({...catalog,externalGames:[{...entry,href}]},{channel:'preview'}),/external URL/);
 }
});
