import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../src/catalog.mjs';
import {createEntryShell} from '../public/games/shared/entry-shell.mjs';
import {SPORTS_HELP,createSportsHelp} from '../public/games/shared/sports-help.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const credits=new JSDOM(read('public/games/shared/sports-credits.html'),{url:'https://example.test/games/shared/sports-credits.html'}).window.document;
const normalize=s=>s.replace(/\s+/g,' ').trim();
const sources={'long-jump':'.music-credits',hurdles:'#credits','high-jump':'#intro details:not(#help)','pole-vault':'#credits','shot-put':'#pf-license-source',discus:'.credits',javelin:'#javelin-credits'};
const ids=catalog.games.map(g=>g.id);
test('one shared help model covers exactly the ten sports, preserving separate minigame help',()=>{
 assert.deepEqual(Object.keys(SPORTS_HELP).sort(),[...ids].sort());
 for(const game of catalog.minigames){const d=new JSDOM('<body>').window.document;assert.equal(createSportsHelp(d,game.id),null);d.defaultView.close();}
});
for(const id of ids){
 test(id+' uses the same compact two-section disclosure and full-credit entry',()=>{
  const dom=new JSDOM(read(`public/games/${id}/index.html`),{url:`https://example.test/games/${id}/`}),d=dom.window.document;
  const legacy=d.createElement('div');legacy.textContent='legacy advanced detail';
  const shell=createEntryShell({document:d,gameId:id,title:id,goal:'原目標',operations:['原操作'],advanced:legacy,onStart(){},forceFallback:true});
  shell.open();const details=shell.dialog.querySelector('details'),help=details.querySelector('.pf-sports-help');
  assert.equal(details.open,false);assert.equal(details.querySelector('summary').textContent,'進階說明與素材授權');
  assert.equal(help.dataset.sportsHelp,id);assert.deepEqual([...help.querySelectorAll('h3')].map(n=>n.textContent),['玩法重點','素材與授權']);
  assert.equal(help.querySelectorAll('section').length,2);assert.equal(help.querySelectorAll('li').length,2);
  assert.ok([...help.querySelectorAll('li')].every(n=>n.textContent.length<=45));
  assert.doesNotMatch(help.textContent,/legacy advanced|LUFS|WebGL|ruleset|0\.\d|約 6–7/);
  const link=help.querySelector('a');assert.equal(new URL(link.href).hash,'#'+id);assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener');
  assert.match(help.textContent,/Funin and Sunin.*Kevin MacLeod.*CC BY 4\.0/);
  assert.equal(shell.dialog.querySelector('.pf-entry-goal').textContent,'原目標');assert.equal(shell.dialog.querySelector('.pf-entry-operation').textContent,'原操作');
  shell.destroy();dom.window.close();
 });
 test(id+' help preserves start/pause/help/return ownership without accidental resume',()=>{
  const dom=new JSDOM('<body><main></main></body>',{url:'https://example.test/'}),d=dom.window.document;let starts=0,resumes=0;
  const shell=createEntryShell({document:d,gameId:id,title:id,goal:'g',operations:[],onStart(){starts++;},forceFallback:true});
  shell.configurePause({onContinue(){resumes++;},onRestart(){starts++;}});shell.openPause();shell.open({help:true});
  assert.equal(shell.dialog.querySelectorAll('.pf-sports-help').length,1);assert.equal(d.querySelectorAll('dialog[open]').length,1);
  shell.dialog.querySelector('[data-pf-menu-stash] .pf-entry-start').click();assert.equal(resumes,0);assert.equal(starts,0);
  shell.dialog.querySelector('[data-pf-continue]').click();assert.equal(resumes,1);assert.equal(starts,0);
  shell.open();shell.dialog.querySelector('.pf-entry-start').click();assert.equal(starts,1);shell.destroy();dom.window.close();
 });
 test(id+' full credits are directly readable with the complete local legal-file index',()=>{
  const section=credits.getElementById(id);assert.ok(section);assert.ok(section.querySelector('h2'));
  assert.equal(section.querySelector('.pf-credit-return').getAttribute('href'),'../'+id+'/');
  assert.equal(section.querySelectorAll('script').length,0);
  const links=[...section.querySelectorAll('a[href]')].map(n=>new URL(n.getAttribute('href'),credits.URL));
  for(const link of links)if(link.origin==='https://example.test')assert.ok(existsSync(new URL('public'+link.pathname,root)),link.href);
  const legal=['vendor/THREE-LICENSE.txt',...readdirSync(new URL(`public/games/${id}/audio/`,root)).filter(f=>/\.(txt|md)$/i.test(f)).map(f=>'audio/'+f)];
  for(const path of legal)assert.ok(links.some(link=>link.pathname===`/games/${id}/${path}`),path);
 });
}
for(const [id,selector] of Object.entries(sources))test(id+' retains every original credit text and source link on the standalone page',()=>{
 const doc=new JSDOM(read(`public/games/${id}/index.html`),{url:`https://example.test/games/${id}/`}).window.document;
 const originals=[...doc.querySelectorAll(selector)],copies=[...credits.getElementById(id).querySelectorAll('.pf-original-credits')];assert.equal(copies.length,originals.length);
 for(let i=0;i<originals.length;i++){
  assert.equal(normalize(copies[i].textContent),normalize(originals[i].textContent));
  const before=[...originals[i].querySelectorAll('a[href]')].map(a=>a.href).sort();
  const after=[...copies[i].querySelectorAll('a[href]')].map(a=>a.href).sort();assert.deepEqual(after,before);
 }
});
for(const id of ['sprint-100m','run-400m','run-1500m','javelin'])test(id+' keeps the entire audio credit record verbatim, with clickable sources',()=>{
 const pre=credits.getElementById(id).querySelector('.pf-audio-credit-record');
 assert.equal(pre.textContent,read(`public/games/${id}/audio/CREDITS.md`));assert.ok(pre.querySelectorAll('a[href]').length>=5);
});
test('standalone page works without scripts and runner ranking stays outside the help disclosure',()=>{
 assert.equal(credits.querySelectorAll('script').length,0);assert.equal(credits.querySelectorAll('main>section').length,10);
 const source=read('public/games/shared/runner-platform.mjs');assert.doesNotMatch(source,/entry:entry\.dialog\.querySelector\('details'\)/);
 assert.equal(source.match(/entry:entry\.dialog/g).length,2);
 const css=read('public/games/shared/sports-help.css');assert.match(css,/\.pf-game \.pf-entry \.pf-sports-help h3\{[^}]*font-size:18px!important/);
 assert.match(css,/\.pf-game \.pf-entry \.pf-sports-help li\{[^}]*font-size:16px!important/);
});
