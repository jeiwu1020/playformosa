import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../../src/catalog.mjs';
import {renderPage} from '../../src/render.mjs';
import {describeLevelScore,levelScoreImageFilename} from '../../public/games/fast-hands/levels-score-image.mjs';
import {LEVEL_RULES} from '../../public/games/fast-hands/levels-leaderboard.mjs';
const root=new URL('../../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const names={duck:'鴨沒漏補',catch:'彈無虛接',duel:'快手對決'};
test('homepage names and accessible links match while descriptive subtitles and identifiers stay unchanged',()=>{
 const html=renderPage(catalog,{channel:'preview'}),doc=new JSDOM(html).window.document;
 assert.equal(read('public/index.html'),html);
 for(const mode of ['catch','duel']){const id='fast-hands-'+mode,item=catalog.minigames.find(g=>g.id===id);assert.equal(item.title,'快手王｜'+names[mode]);assert.equal(item.href,`/games/fast-hands/${mode}.html?intro=1`);assert.equal(doc.querySelector(`[data-play-count="${id}"]`).closest('article').querySelector('.game-cta').getAttribute('aria-label'),'開始挑戰：快手王｜'+names[mode]);}
 assert.equal(catalog.minigames.find(g=>g.id==='fast-hands-duel').event,'十回合反應對決');assert.equal(html.split('十回合反應對決').length-1,2);
 assert.doesNotMatch(html,/玩具彈接接樂|十回合對決/);
});
for(const mode of ['duck','catch','duel'])test(`${mode} entry, result navigation and accessible HTML contain only current game titles`,()=>{
 const html=read('public/games/fast-hands/'+(mode==='duck'?'index':mode)+'.html'),doc=new JSDOM(html).window.document;
 assert.equal(doc.title,'快手王｜'+names[mode]);assert.equal(doc.getElementById('entryTitle').textContent,names[mode]);
 for(const nav of doc.querySelectorAll('.level-switch')){assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.textContent.replace(/\d/g,'').trim()),Object.values(names));assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')),['./','catch.html','duel.html']);}
 assert.doesNotMatch(html,/玩具彈接接樂|十回合對決/);
});
test('score-image and share descriptions use new titles, while board payload contracts and filenames are identical',()=>{
 const catchState={mode:'catch',phase:'done',practice:false,results:[{winner:'player'},{winner:'none'}]},duelState={mode:'duel',phase:'done',practice:false,results:Array.from({length:10},(_,i)=>({winner:i<6?'player':'ai'}))};
 for(const state of [catchState,duelState]){const score=describeLevelScore(state);assert.equal(score.modeText,names[state.mode]);assert.equal(LEVEL_RULES[state.mode].label,names[state.mode]);}
 assert.deepEqual({...LEVEL_RULES.catch,label:undefined},{game:'fast-hands-catch',rules:'cleared-levels-v1',unit:'levels',max:Number.MAX_SAFE_INTEGER,label:undefined});
 assert.deepEqual({...LEVEL_RULES.duel,label:undefined},{game:'fast-hands-duel',rules:'ten-round-wins-v1',unit:'wins',max:10,label:undefined});
 assert.equal(levelScoreImageFilename(describeLevelScore(catchState)),'fast-hands-catch-1-stages.png');assert.equal(levelScoreImageFilename(describeLevelScore(duelState)),'fast-hands-duel-6-4.png');
});
