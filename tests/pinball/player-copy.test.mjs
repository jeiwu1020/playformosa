import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=name=>readFileSync(new URL('../../public/games/overtime-pinball/'+name,import.meta.url),'utf8');
test('player UI excludes obsolete build/date and audio processing notes',()=>{
 const source=read('game.html')+read('main.js');
 for(const text of ['08.26','舊版 v0.7','本次摸彩新版','已轉為 MP3','rail-entry（','頂樓高額獎金'])assert.ok(!source.includes(text),text);
});
test('player instructions preserve score separation, credits and warnings',()=>{
 const d=new JSDOM(read('game.html')).window.document;
 assert.match(d.querySelector('#results').textContent,/先前玩法的紀錄仍保留/);
 assert.equal(d.querySelectorAll('#audioDialog a').length,3);
 assert.match(d.querySelector('#audioDialog').textContent,/CC0 1.0/);
 assert.match(read('main.js'),/尚未儲存的最高分會遺失/);
 assert.match(d.querySelector('#roundDialog').textContent,/倒數照走/);
 assert.match(d.querySelector('#roundDialog').textContent,/1.5 秒/);
});
