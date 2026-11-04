import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {createGameEntry} from '../public/games/shared/entry-shell.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const brand='島遊無界工作室 | PLAYFORMOSA STUDIO';
for(const [game,title,result] of [['hurdles','四肢各有想法｜110公尺跨欄','#overlay'],['reaction-rod','接棒啦！','#result']]){
 test(game+' adds one persistent heading and one result attribution without changing the game title',()=>{
  const dom=new JSDOM(read('public/games/'+game+'/index.html').toString()),d=dom.window.document;try{const marks=d.querySelectorAll('.pf-header .pf-studio-live');assert.equal(marks.length,1);assert.equal(marks[0].textContent,brand);assert.equal(d.querySelector('.pf-studio-heading>h1').textContent,title);assert.equal(d.querySelectorAll('link[href="../shared/studio-brand.css"]').length,1);assert.equal(d.querySelectorAll('dialog .pf-studio-result').length,1);assert.equal(d.querySelector(result+'>.pf-studio-result').textContent,brand);assert.ok(d.querySelector('#pf-startup'),'existing loading candidate is retained');}finally{dom.window.close();}
 });
}
for(const game of ['long-jump','hurdles','reaction-rod'])test(game+' real shared entry displays studio attribution and remains gesture-started',()=>{
 const dom=new JSDOM(read('public/games/'+game+'/index.html').toString(),{url:'https://playformosa.example/games/'+game+'/'}),d=dom.window.document;let entry,starts=0;try{entry=createGameEntry({document:d,gameId:game,onStart:()=>starts++,forceFallback:true});entry.open();assert.equal(entry.dialog.querySelector('.pf-entry-brand').textContent,brand);assert.equal(starts,0);entry.dialog.querySelector('.pf-entry-start').click();assert.equal(starts,1);assert.equal(entry.active,false);}finally{entry?.destroy();dom.window.close();}
});
test('the exact preview attribution stylesheet is present without importing other game styles',()=>{
 const p='public/games/shared/studio-brand.css';assert.ok(existsSync(new URL(p,root)));const b=read(p);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),'18ba8abc165e498154dd167de0c0045e36b7df36');
});
test('Hurdles and Rod share renderers remain byte-identical to main and preview',()=>{
 for(const [game,sha] of [['hurdles','a34b3e0f54bf195686c61d0b4b8437d59559fd35'],['reaction-rod','3742b71d55e34a2adbccd42f90cd96dc64cdefdf']]){const b=read('public/games/'+game+'/share.mjs');assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex'),sha);}
});
