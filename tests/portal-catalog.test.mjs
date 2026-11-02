import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
import {externalFixtures} from './fixtures/portal-catalog.mjs';
const fixtureCatalog={...catalog,externalGames:externalFixtures.filter(entry=>entry.kind==='game'),platforms:externalFixtures.filter(entry=>entry.kind==='platform')};
const dom=(data=fixtureCatalog,channel='preview')=>new JSDOM(renderPage(data,{channel})).window.document;
const expected=[['formosabattle','福爾摩沙群俠傳'],['echosboundary','迴聲邊界：審判'],['taiwankart','台灣小島疾走'],['taiwanfighter','武鬥台灣魂'],['arcadeplatform','play. one more.'],['soul10power','心靈煉金術師']];
const destination=id=>id==='soul10power'?'https://soul10power.vercel.app/':`https://${id}.playformosa.workers.dev/`;
test('approved public catalog names, destinations and safe explicit external navigation',()=>{
 const doc=dom();assert.equal(doc.querySelectorAll('[data-external-id]').length,expected.length);
 for(const [id,title] of expected){
  const card=doc.querySelector(`[data-external-id="${id}"]`);assert.ok(card,title);assert.ok(card.textContent.includes(title));
  const links=card.querySelectorAll('a');assert.equal(links.length,1);
  assert.equal(links[0].href,destination(id));assert.equal(links[0].target,'_blank');
  assert.equal(links[0].rel,'noopener noreferrer');assert.ok(links[0].querySelector('svg.portal-arrow[aria-hidden="true"] path'));assert.match(links[0].getAttribute('aria-label'),/新分頁/);
 }
 assert.equal(doc.querySelectorAll('iframe').length,0);
 assert.match(doc.querySelector('#platforms').textContent,/前往遊戲平台/);
 assert.match(doc.querySelector('#big-games').textContent,/前往遊玩/);
});
test('production and empty subsets have no dead external section or navigation',()=>{
 for(const data of [fixtureCatalog,{...catalog,externalGames:[],platforms:[]}]){
  const doc=dom(data,'production');assert.equal(doc.querySelector('#big-games'),null);assert.equal(doc.querySelector('#platforms'),null);
  assert.equal(doc.querySelector('a[href="#big-games"]'),null);assert.equal(doc.querySelector('a[href="#platforms"]'),null);
 }
 for(const [id] of expected){
  const promote=entry=>({...entry,release:{preview:true,production:entry.id===id}});
  const doc=dom({...catalog,externalGames:fixtureCatalog.externalGames.map(promote),platforms:fixtureCatalog.platforms.map(promote)},'production');
  assert.equal(doc.querySelectorAll('[data-external-id]').length,1);assert.ok(doc.querySelector(`[data-external-id="${id}"]`));
 }
});
test('external metadata is escaped and URLs/images fail closed',()=>{
 const first=fixtureCatalog.externalGames[0];
 const withEntry=entry=>({...catalog,externalGames:[entry],platforms:[]});
 const escaped=dom(withEntry({...first,title:'<img src=x onerror=alert(1)>',description:'<script>x</script>'}));
 assert.deepEqual([...escaped.querySelectorAll('script')].map(s=>[s.getAttribute('src'),s.type,s.textContent]),[['/assets/play-counts.mjs','module','']]);assert.equal(escaped.querySelector('[data-external-id] script'),null);assert.ok(escaped.querySelector('[data-external-id]').textContent.includes('<img src=x'));
 for(const href of ['javascript:alert(1)','https://evil.example/','https://formosabattle.playformosa.workers.dev.evil.example/','https://formosabattle.playformosa.workers.dev/?qa=1'])assert.throws(()=>dom(withEntry({...first,href})),/external URL/i);
 for(const image of ['https://evil.example/x.png','/assets/../secret.png','x" onerror="x'])assert.throws(()=>dom(withEntry({...first,image})),/image/i);
});
test('each original-art game card loads lazily and has one accessible heading',()=>{
 const doc=dom();for(const card of doc.querySelectorAll('#big-games [data-external-id]')){
  assert.equal(card.querySelectorAll('h3').length,1);assert.ok(card.querySelector('img[loading="lazy"][width][height]'));
 }
});

test('each installed entry has its approved identity and independent release metadata',()=>{
 const names=new Map(expected);
 for(const entry of [...catalog.externalGames,...catalog.platforms]){
  assert.equal(entry.title,names.get(entry.id));assert.equal(entry.href,destination(entry.id));
  assert.equal(typeof entry.release.preview,'boolean');assert.equal(typeof entry.release.production,'boolean');
 }
});
