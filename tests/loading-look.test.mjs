import test from 'node:test';import assert from 'node:assert/strict';import{readClubBaseline as readFileSync}from'./helpers/fast-hands-club-provenance.mjs';import{JSDOM}from'jsdom';
const games=['beer-slide','discus','fast-hands','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb'];
const root=new URL('../public/games/',import.meta.url),bootstrap=readFileSync(new URL('shared/startup.js',root),'utf8');
const jokes=[];
for(const game of games)test(game+' lightweight playful loading preserves the exact boot contract',()=>{
 const d=new JSDOM(readFileSync(new URL(game+'/index.html',root),'utf8')).window.document,loader=d.querySelector('#pf-startup'),css=d.querySelector('#pf-startup-style').textContent;
 assert.ok(loader.querySelector('.pf-loading-card'));assert.equal(loader.querySelector('svg').getAttribute('aria-hidden'),'true');
 const joke=loader.querySelector('.pf-loading-joke').textContent;assert.ok(joke.length>=10&&joke.length<=40);jokes.push(joke);
 assert.equal(loader.querySelector('#pf-startup-status').getAttribute('role'),'status');assert.match(loader.querySelector('#pf-startup-status').textContent,/正在準備遊戲/);
 assert.ok(loader.querySelector('a[href=""]'));assert.ok(loader.querySelector('a[href="/"]'));assert.ok(loader.querySelector('noscript'));
 assert.equal(loader.querySelectorAll('img,video,audio,iframe,image,script').length,0);assert.doesNotMatch(loader.outerHTML,/https?:|data:|onload=|onclick=|progressbar|aria-valuenow/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/min-height:44px/);assert.match(css,/overflow:auto/);
 assert.equal(d.querySelector('#pf-startup-script').textContent,bootstrap);assert.equal(d.documentElement.dataset.pfStartup,'pending');
});
test('all twelve games get a distinct short loading joke',()=>assert.equal(new Set(jokes).size,12));
