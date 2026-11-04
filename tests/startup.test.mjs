import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const root=new URL('../public/games/',import.meta.url);
const code=readFileSync(new URL('shared/startup.js',root),'utf8');
const games=['beer-slide','discus','fast-hands','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb'];
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const dom=new JSDOM('<html data-pf-startup="pending"><body><main>old</main><section id="pf-startup"><p id="pf-startup-status">loading</p><a href="">reload</a></section></body></html>',{runScripts:'outside-only'});
 dom.window.HTMLElement.prototype.getClientRects=function(){return this.closest('details:not([open]),[hidden]')?[]:[{width:10,height:10}];};
 let timeout;dom.window.setTimeout=fn=>(timeout=fn,1);dom.window.clearTimeout=()=>{};
 dom.window.eval(code);return {dom,doc:dom.window.document,timeout:()=>timeout()};
}
for(const game of games)test(game+' first document gates layout and preloads only actual module resources',()=>{
 const html=readFileSync(new URL(game+'/index.html',root),'utf8');
 const dom=new JSDOM(html),d=dom.window.document;
 assert.equal(d.documentElement.dataset.pfStartup,'pending');
 const style=d.querySelector('#pf-startup-style');assert.ok(style);assert.match(style.textContent,/visibility:hidden!important/);assert.doesNotMatch(style.textContent,/display:none/);
 assert.ok(d.querySelector('#pf-startup a[href="/"]'));assert.ok(d.querySelector('#pf-startup a[href=""]'));assert.ok(d.querySelector('noscript'));
 assert.equal(d.querySelectorAll('script#pf-startup-script').length,1);assert.equal(d.querySelector('script#pf-startup-script').textContent,code);assert.equal(d.querySelector('script#pf-startup-script').hasAttribute('src'),false);
 const preloads=[...d.querySelectorAll('link[rel=modulepreload]')].map(x=>x.getAttribute('href'));assert.equal(new Set(preloads).size,preloads.length);
 for(const src of preloads){assert.ok(existsSync(new URL(src.split('?')[0],new URL(game+'/',root))),src);assert.match(src,/\.(?:mjs|js)(?:\?|$)/);}
 for(const script of d.querySelectorAll('script[type=module][src]'))assert.ok(preloads.includes(script.getAttribute('src')));
 dom.window.close();
});
test('hidden or absent entry cannot reveal the unfinished game; open entry releases once',async()=>{
 const {dom,doc}=fixture();const entry=doc.createElement('dialog');entry.dataset.pfEntry='';entry.innerHTML='<button autofocus>start</button>';doc.body.append(entry);await tick();assert.equal(doc.documentElement.dataset.pfStartup,'pending');
 entry.hidden=true;entry.setAttribute('open','');await tick();assert.equal(doc.documentElement.dataset.pfStartup,'pending');
 entry.hidden=false;await tick();assert.equal(doc.documentElement.dataset.pfStartup,'ready');assert.equal(doc.querySelector('#pf-startup'),null);assert.equal(doc.activeElement,entry.querySelector('button'));
 entry.removeAttribute('open');await tick();assert.equal(doc.documentElement.dataset.pfStartup,'ready');dom.window.close();
});
test('timeout shows recovery, retains geometry gate, and accepts genuinely late readiness',async()=>{
 const f=fixture();f.timeout();assert.equal(f.doc.documentElement.dataset.pfStartup,'waiting');assert.match(f.doc.querySelector('#pf-startup-status').textContent,/重新載入/);
 const entry=f.doc.createElement('dialog');entry.id='entryDialog';entry.setAttribute('open','');entry.innerHTML='<button>start</button>';f.doc.body.append(entry);await tick();assert.equal(f.doc.documentElement.dataset.pfStartup,'ready');f.dom.window.close();
});
test('resource or module errors retain recovery rather than exposing broken UI',()=>{
 const f=fixture();f.dom.window.dispatchEvent(new f.dom.window.Event('error'));assert.equal(f.doc.documentElement.dataset.pfStartup,'waiting');assert.ok(f.doc.querySelector('#pf-startup'));f.dom.window.close();
});
test('bootstrap cannot start game, unlock audio, overwrite preferences or change gameplay clocks',()=>{
 assert.doesNotMatch(code,/\.click\(|AudioContext|localStorage|sessionStorage|requestAnimationFrame|\.play\(|\.showModal\(/);
});
for(const game of games)test(game+' inline bootstrap survives unavailable external scripts and late body parsing',async()=>{
 const html=readFileSync(new URL(game+'/index.html',root),'utf8');
 // JSDOM parses and executes the real head script, but fetches no external resources.
 const dom=new JSDOM(html,{runScripts:'dangerously'}),doc=dom.window.document;
 assert.equal(doc.documentElement.dataset.pfStartup,'pending');assert.ok(doc.querySelector('#pf-startup'));
 const entry=doc.createElement('dialog');entry.dataset.pfEntry='';entry.open=true;entry.innerHTML='<button autofocus>start</button>';doc.body.append(entry);
 await tick();assert.equal(doc.documentElement.dataset.pfStartup,'ready');assert.equal(doc.querySelector('#pf-startup'),null);dom.window.close();
});
test('handoff prioritizes usable autofocus over earlier closed-details links',async()=>{
 const f=fixture(),entry=f.doc.createElement('dialog');entry.dataset.pfEntry='';entry.open=true;
 entry.innerHTML='<details><summary>help</summary><a href="/license">license</a></details><button autofocus>start</button>';f.doc.body.append(entry);await tick();
 assert.equal(f.doc.activeElement,entry.querySelector('button'));f.dom.window.close();
});
test('disabled start hands keyboard focus to a visible recovery control',async()=>{
 const f=fixture(),entry=f.doc.createElement('dialog');entry.dataset.pfEntry='';entry.open=true;
 entry.innerHTML='<details><a href="/license">license</a></details><button autofocus disabled>start</button><p><a id="home" href="/">home</a></p>';f.doc.body.append(entry);await tick();
 assert.equal(f.doc.activeElement,entry.querySelector('#home'));f.dom.window.close();
});
