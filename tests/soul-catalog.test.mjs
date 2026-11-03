import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
const official='https://soul10power.vercel.app/';
const doc=channel=>new JSDOM(renderPage(catalog,{channel})).window.document;
test('Soul Alchemist is the fifth independently listed preview game, with production still unlisted',()=>{
 const entry=catalog.externalGames.find(e=>e.id==='soul10power');assert.ok(entry);
 assert.equal(entry.title,'心靈煉金術師');assert.equal(entry.href,official);
 assert.deepEqual(entry.release,{preview:true,production:false});
 const preview=doc('preview');assert.equal(preview.querySelectorAll('#big-games [data-external-id]').length,5);assert.equal(preview.querySelectorAll('[data-external-id]').length,6);
 const card=preview.querySelector('[data-external-id="soul10power"]');assert.ok(card);assert.equal(card.querySelector('a').href,official);assert.equal(card.querySelector('a').target,'_blank');assert.equal(card.querySelector('a').rel,'noopener noreferrer');
 assert.match(preview.querySelector('#big-games .portal-section-note').textContent,/5 個世界/);
 assert.equal(doc('production').querySelector('[data-external-id="soul10power"]'),null);
 assert.equal(catalog.games.length+catalog.minigames.length,11);
});
test('the new allowed host does not allow redirects, lookalikes, extra paths or query URLs',()=>{
 const entry=catalog.externalGames.find(e=>e.id==='soul10power');assert.ok(entry);
 for(const href of ['http://soul10power.vercel.app/','https://soul10power.vercel.app.evil.example/','https://soul10power.vercel.app/?preview=true','https://soul10power.vercel.app/other','https://another.vercel.app/']){
  assert.throws(()=>renderPage({...catalog,externalGames:[{...entry,href}]},{channel:'preview'}),/external URL/);
 }
});
test('the freshly published platform app-icon head and retained original favicon survive this addition',()=>{
 const head=doc('preview').head;
 for(const [rel,href] of [['icon','./assets/app-icons/platform/favicon-32.png'],['icon','./assets/app-icons/platform/favicon-48.png'],['apple-touch-icon','./assets/app-icons/platform/apple-touch-icon.png'],['manifest','./manifest.webmanifest']])assert.ok(head.querySelector(`link[rel="${rel}"][href="${href}"]`));
 const bytes=readFileSync(new URL('../public/assets/favicon.svg',import.meta.url));
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),'0953ffa38027e37ebc75bef4a2f05ae4668e6e5a');
});
