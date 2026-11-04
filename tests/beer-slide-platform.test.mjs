import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
test('beer joins rod as a separate playable minigame without changing the eight decathlon games',()=>{
 const game=catalog.minigames?.find(x=>x.id==='beer-slide');assert.ok(game,'beer minigame is registered');
 assert.equal(game.href,'/games/beer-slide/');assert.equal(catalog.games.length,8);assert.equal(catalog.events.length,10);
 const html=renderPage(catalog),shelf=html.match(/<section[^>]*id="minigames"[\s\S]*?<\/section>/)?.[0];assert.match(shelf,/別灑啊！/);assert.match(shelf,/接棒啦！/);assert.match(shelf,/4<\/strong> 款/);
 assert.match(shelf,/href="\/games\/beer-slide\/"/);assert.ok(existsSync(new URL('../public'+game.href+'index.html',import.meta.url)));
});
test('beer offers home and result sharing without stale private-only claims',()=>{
 const root=new URL('../public/games/beer-slide/',import.meta.url);assert.ok(existsSync(root),'beer runtime imported');
 const html=readFileSync(new URL('index.html',root),'utf8');
 assert.match(html,/class="pf-home"[^>]*href="\/"/);assert.match(html,/aria-label="遊戲首頁"/);
 for(const id of ['platformShare','platformCopy','platformThreads','platformShareStatus','platformCopyDialog'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/src="\.\/platform.mjs"/);assert.doesNotMatch(html,/jeiwu1020\.chatgpt\.site|私人原型|僅本人可開啟/);
});
test('share rows span the mobile result grid instead of squeezing controls beside each other',()=>{
 const css=readFileSync(new URL('../public/games/beer-slide/style.css',import.meta.url),'utf8');
 assert.match(css,/\.result>\.platform-share-actions,\.result>#platformShareStatus,\.result>\.platform-share-note\{[^}]*grid-column:1\/-1/);
});
