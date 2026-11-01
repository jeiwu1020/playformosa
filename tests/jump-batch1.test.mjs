import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('first batch jump entries survive subsequent admission',()=>{
 assert.deepEqual(catalog.games.slice(0,4).map(g=>g.id),['long-jump','hurdles','high-jump','pole-vault']);
 assert.deepEqual(catalog.minigames.slice(0,2).map(g=>g.id),['reaction-rod','beer-slide']);
 assert.match(renderPage(catalog),/6<span> \/ 10/);
 for(const id of ['high-jump','pole-vault']){assert.ok(fs.existsSync(new URL('../public/games/'+id+'/index.html',import.meta.url)));assert.equal(catalog.games.find(g=>g.id===id).imageStyle,'illustration');}
});
test('new jump games have same-origin home, shared chrome and ordered share controls',()=>{
 for(const id of ['high-jump','pole-vault']){const html=read('public/games/'+id+'/index.html');assert.match(html,/class="pf-home" href="\/" aria-label="遊戲首頁">← 遊戲首頁/);assert.match(html,/href="\.\.\/shared\/game-ui.css"/);assert.ok(html.indexOf('data-game-action="music"')<html.indexOf('data-game-action="restart"'));assert.ok(html.indexOf('data-game-action="restart"')<html.indexOf('data-game-action="pause"'));assert.ok(html.indexOf('data-share="threads"')<html.indexOf('data-share="image"'));assert.ok(html.indexOf('data-share="image"')<html.indexOf('data-share="copy"'));}
});
test('illustration cards contain full artwork rather than inheriting scene crop',()=>{const html=renderPage({games:[{id:'x',title:'x',event:'跳高',href:'/games/x/',status:'available',image:'/assets/high-jump-card.png',imageStyle:'illustration'}],events:['跳高']});assert.match(html,/class="game-illustration"/);assert.match(read('public/assets/home.css'),/\.game-thumbnail img\.game-illustration\{[^}]*object-fit:contain/);});
