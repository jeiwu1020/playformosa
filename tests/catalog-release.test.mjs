import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCatalogChannel,filterReleased,validateReleaseOutput} from '../src/release.mjs';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';

test('missing release channel is production and invalid values fail closed',()=>{
 assert.equal(resolveCatalogChannel(), 'production');
 assert.equal(resolveCatalogChannel({channel:'preview'}),'preview');
 for(const value of ['qa','','Preview',null,{},true])assert.throws(()=>resolveCatalogChannel({channel:value}),/channel/i);
});
test('release flags are explicit booleans and independently promote each entry',()=>{
 const items=[{id:'a',release:{preview:true,production:false}},{id:'b',release:{preview:true,production:true}},{id:'c'}];
 assert.deepEqual(filterReleased(items,'production').map(x=>x.id),['b']);
 assert.deepEqual(filterReleased(items,'preview').map(x=>x.id),['a','b']);
 assert.throws(()=>filterReleased(items,'unknown'),/channel/i);
 assert.deepEqual(filterReleased([{id:'x',release:{preview:'true'}}],'preview'),[]);
});
test('render defaults production; new catalog preview-only while legacy nine stay available',()=>{
 const production=renderPage(catalog), preview=renderPage(catalog,{channel:'preview'});
 for(const item of [...catalog.games,...catalog.minigames]){
  assert.ok(production.includes(`href="${item.href}"`));assert.ok(preview.includes(`href="${item.href}"`));
 }
 const all=[...catalog.externalGames,...catalog.platforms];
 assert.equal((production.match(/data-external-id=/g)||[]).length,filterReleased(all,'production').length);
 assert.equal((preview.match(/data-external-id=/g)||[]).length,filterReleased(all,'preview').length);
 const count=`${catalog.games.filter(entry=>entry.status==='available').length}<span> / ${catalog.events.length}</span>`;
 assert.ok(production.includes(count));assert.ok(preview.includes(count));
});
test('expected-channel preflight rejects stale or wrong generated HTML',()=>{
 const fixture={...catalog,externalGames:[{id:'formosabattle',title:'福爾摩沙群俠傳',href:'https://formosabattle.playformosa.workers.dev/',image:'/assets/portal-formosabattle.png',release:{preview:true,production:false}}],platforms:[]};
 const html=renderPage(fixture,{channel:'preview'});
 assert.doesNotThrow(()=>validateReleaseOutput(html,fixture,'preview'));
 assert.throws(()=>validateReleaseOutput(html,fixture,'production'),/channel|entries/i);
 assert.throws(()=>validateReleaseOutput(html.replace('data-external-id="formosabattle"','data-external-id="wrong"'),fixture,'preview'),/entries/i);
});
