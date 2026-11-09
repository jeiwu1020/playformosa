import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';
import {assertReleasedGames,releasedGameIds} from '../scripts/release-policy.mjs';
const expected=[
 ['fast-hands','快手王｜鴨沒漏補','/games/fast-hands/?intro=1','/assets/fast-hands-card-v2.webp'],
 ['fast-hands-catch','快手王｜彈無虛接','/games/fast-hands/catch.html?intro=1','/games/fast-hands/assets/intro-catch-generated.webp'],
 ['fast-hands-duel','快手王｜快手對決','/games/fast-hands/duel.html?intro=1','/games/fast-hands/assets/intro-duel-generated.webp']
];
const ids=['long-jump','hurdles','high-jump','courtesy-contest','reaction-rod',...expected.map(x=>x[0])];
test('main admits exactly eight games and all three approved Fast Hands intro cards',()=>{
 assert.deepEqual([...catalog.games,...catalog.minigames].map(g=>g.id),ids);
 for(const [id,title,href,image] of expected){const g=catalog.minigames.find(g=>g.id===id);assert.deepEqual([g.title,g.href,g.image],[title,href,image]);}
 const html=renderPage(catalog);assert.deepEqual([...html.matchAll(/data-play-count="([^"]+)"/g)].map(m=>m[1]),[...ids,'taiwanfighter']);
 for(const [,title,href,image] of expected){assert.ok(html.includes(title));assert.ok(html.includes(`href="${href}"`));assert.ok(html.includes(`src="${image}"`));}
});
test('new minigame admission rejects unapproved IDs, routes, query strings and artwork',()=>{
 for(const game of catalog.minigames){for(const patch of [{id:'fast-hands-test'},{href:game.href+'evil'},{href:'https://evil.test/'},{image:'/assets/other.webp'}])assert.throws(()=>renderPage({...catalog,minigames:[{...game,...patch}]}),/Unapproved minigame/);}
});
test('production release policy admits only eight HTML routes and the character-only dependency',async()=>{
 assert.deepEqual([...releasedGameIds].sort(),[...ids].sort());
 const root=await mkdtemp(path.join(tmpdir(),'fast-hands-release-'));
 const put=async p=>{await mkdir(path.dirname(path.join(root,p)),{recursive:true});await writeFile(path.join(root,p),'');};
 try{
  for(const p of ['long-jump/index.html','hurdles/index.html','reaction-rod/index.html','fast-hands/index.html','fast-hands/catch.html','fast-hands/duel.html','high-jump/index.html','courtesy-contest/index.html','javelin/character3d.mjs'])await put('games/'+p);
  await assertReleasedGames(root);
  for(const p of ['fast-hands/test.html','javelin/index.html','fast-hands-test/index.html','beer-slide/index.html','javelin/game.mjs']){await put('games/'+p);await assert.rejects(assertReleasedGames(root),/Unapproved/);await rm(path.join(root,'games',p));if(p.startsWith('fast-hands-test/')||p.startsWith('beer-slide/'))await rm(path.dirname(path.join(root,'games',p)),{recursive:true});}
  await rm(path.join(root,'games/fast-hands/catch.html'));await assert.rejects(assertReleasedGames(root),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
