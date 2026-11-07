import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import postcss from 'postcss';
import vm from 'node:vm';
// Exercise the game-scoped stylesheet here; the browser matrix covers the full shared-sheet cascade.
const root=new URL(process.env.PF_LAYOUT_ROOT||'../../',import.meta.url);
function media(query,{width,height,coarse}){return query.split(',').some(q=>[...q.matchAll(/\(([^)]+)\)/g)].every(([,c])=>{const [k,v]=c.split(':').map(s=>s.trim());if(k==='pointer')return v===(coarse?'coarse':'fine');if(k==='hover')return v===(coarse?'none':'hover');if(k==='orientation')return v===(width>=height?'landscape':'portrait');const m=k.match(/^(min|max)-(width|height)$/);if(!m)return false;return m[1]==='min'?(m[2]==='width'?width:height)>=parseFloat(v):(m[2]==='width'?width:height)<=parseFloat(v);}));}
function page(width,height,coarse=false){const html=readFileSync(new URL('public/games/high-jump/index.html',root),'utf8'),dom=new JSDOM(html,{url:'https://example.test/games/high-jump/'}),{document}=dom.window;const css=['high-jump/style.css'].map(file=>{const parsed=postcss.parse(readFileSync(new URL('public/games/'+file,root),'utf8'));parsed.walkAtRules('media',rule=>{if(media(rule.params,{width,height,coarse}))rule.replaceWith(...rule.nodes);else rule.remove();});return parsed.toString();}).join('\n');const style=document.createElement('style');style.textContent=css;document.head.append(style);const d=document.createElement('dialog');d.className='pf-entry';d.open=true;d.innerHTML='<div class="pf-menu-ticket"><h2>跳高</h2></div><p class="pf-entry-goal">挑戰更高的一跳。</p><div class="pf-entry-operations"><p class="pf-entry-operation">助跑</p><p class="pf-entry-operation">起跳</p><p class="pf-entry-operation">過桿</p></div><div class="pf-entry-operations-desktop"><p>助跑</p><p>起跳</p><p>過桿</p></div><details><summary>進階說明</summary></details><button class="pf-entry-start">開始遊戲</button><details class="pf-leaderboard"><summary>榮譽榜</summary></details>';document.body.append(d);document.querySelector('#result').open=true;return{dom,document,entry:d,style:selector=>dom.window.getComputedStyle(typeof selector==='string'?document.querySelector(selector):selector)};}
test('desktop entry restores a 500px single-column card without changing pause or honor views',()=>{
 for(const [w,h]of [[1280,600],[1280,544],[1100,544],[900,300]]){
  const p=page(w,h);assert.equal(p.style(p.entry).display,'grid');assert.match(p.style(p.entry).width,/500px/);
  assert.equal(p.style(p.entry).gridTemplateColumns,'minmax(0,1fr)');assert.equal(p.style('.pf-entry-operations').display,'none');
  assert.equal(p.style('.pf-entry-operations-desktop').display,'grid');assert.equal(p.style('.pf-entry-operations-desktop').gridTemplateColumns,'minmax(0,1fr)');
  assert.equal(p.style(p.entry).overflow,'auto');
  for(const cls of ['pf-pause-dialog','pf-honor-dialog']){p.entry.classList.add(cls);assert.notEqual(p.style(p.entry).display,'grid');p.entry.classList.remove(cls);}p.dom.window.close();
 }
});
test('compact desktop copy keeps the full original operations and requires the correct takeoff and clearance order',()=>{
 const dom=new JSDOM('<dialog><div class="pf-entry-operations"><p>原手機操作</p></div><button>開始遊戲</button></dialog>'),dialog=dom.window.document.querySelector('dialog');
 const game=readFileSync(new URL('public/games/high-jump/game.mjs',root),'utf8'),statement=game.split('\n').find(l=>l.startsWith('function mountDesktopEntry('));assert.ok(statement,'desktop instructions have a presentation-only mount');
 vm.runInNewContext(statement+';mountDesktopEntry(dialog);mountDesktopEntry(dialog);',{dialog});
 assert.equal(dialog.querySelector('.pf-entry-operations').textContent,'原手機操作');assert.equal(dialog.querySelectorAll('.pf-entry-operations-desktop').length,1);
 assert.deepEqual([...dialog.querySelectorAll('.pf-entry-operations-desktop p')].map(p=>p.textContent),['助跑：A／S 交替短按，J／K 擺臂平衡。','起跳：長按 A 或 S 蓄力，綠區放開。','過桿：J／K 帶頭肩，髖過桿後 A／S 收腿。']);
 assert.match(game,/mountDesktopEntry\(entry\.dialog\)/);dom.window.close();
});
test('desktop results put the intrinsic photo left of score and actions with scrollable overflow',()=>{for(const [w,h]of [[1100,544],[1366,768],[900,300]]){const p=page(w,h);assert.equal(p.style('#result').display,'grid');assert.equal(p.style('#result .result-scene').gridColumn,'1');assert.equal(p.style('#result .result-summary').gridColumn,'2');assert.equal(p.style('#result .result-actions').gridColumn,'2');assert.equal(p.style('#result .pf-share-actions').gridColumn,'2');assert.equal(p.style('#result').overflow,'auto');assert.equal(p.style('#resultPhoto').width,'auto');assert.equal(p.style('#resultPhoto').height,'auto');assert.equal(p.style('#resultPhoto').objectFit,'contain');p.dom.window.close();}});
test('phone and touch tablet keep the existing entry and result presentation',()=>{for(const [w,h,coarse]of [[390,844,true],[844,390,true],[1024,768,true],[899,768,false]]){const p=page(w,h,coarse);assert.notEqual(p.style(p.entry).display,'grid');assert.notEqual(p.style('.pf-entry-operations').display,'grid');assert.equal(p.style('.pf-entry-operations-desktop').display,'none');assert.equal(p.style('#result .result-summary').textAlign,'center');assert.equal(p.style('#resultPhoto').maxHeight,h<=500&&w>=600?'240px':'300px');p.dom.window.close();}});
