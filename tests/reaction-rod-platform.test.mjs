import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';

test('reaction rod is a separate playable minigame, never an eleventh decathlon event',()=>{
 const entry=catalog.minigames?.find(game=>game.id==='reaction-rod');
 assert.ok(entry,'separate minigames catalog entry');
 assert.equal(entry.href,'/games/reaction-rod/');
 assert.equal(catalog.games.length,8);assert.equal(catalog.events.length,10);
 const html=renderPage(catalog),mini=html.match(/<section[^>]*id="minigames"[\s\S]*?<\/section>/)?.[0];
 assert.ok(mini,'minigames section');assert.match(mini,/接棒啦！/);assert.match(mini,/3<\/strong> 款/);
 assert.match(html,/8<span[^>]*>\s*\/\s*10/);assert.doesNotMatch(mini,/十項全能/);
 assert.match(mini,/href="\/games\/reaction-rod\/"/);assert.match(mini,/滑鼠／觸控／鍵盤/);
 assert.ok(existsSync(new URL('../public'+entry.href+'index.html',import.meta.url)));
});
test('minigame card text is escaped and only local game routes/images are accepted',()=>{
 const base={games:[],events:[],minigames:[{id:'x',title:'<script>no</script>',event:'反應',href:'/games/x/',status:'available',input:'<b>mouse</b>'}]};
 const html=renderPage(base);assert.match(html,/&lt;script&gt;no/);assert.match(html,/&lt;b&gt;mouse/);
 for(const href of ['https://example.com/','javascript:alert(1)'])assert.throws(()=>renderPage({...base,minigames:[{...base.minigames[0],href}]}),/local game route/);
 assert.throws(()=>renderPage({...base,minigames:[{...base.minigames[0],image:'https://example.com/card.png'}]}),/local card image/);
});
test('platform adaptation offers same-host home routes without stale private prototype claims',()=>{
 const root=new URL('../public/games/reaction-rod/',import.meta.url),html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/class="pf-home"[^>]*href="\/"/);
 assert.match(html,/aria-label="遊戲首頁"/);
 for(const f of ['index.html','game.mjs','share.mjs']){
  const s=readFileSync(new URL(f,root),'utf8');
  assert.doesNotMatch(s,/reaction-rod-lab-20261027|jeiwu1020\.chatgpt\.site|私人原型|僅你可開啟|僅本人可開啟|私人連結/);
 }
});
