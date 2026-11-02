import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
const path=new URL('../public/games/shared/controls-shell.mjs',import.meta.url);
const limb=['[data-limb="2"]','[data-limb="3"]','[data-limb="0"]','[data-limb="1"]'];
const maps={'long-jump':['.arena','.controls',limb],hurdles:['.arena','.controls',limb],'pole-vault':['.arena','.controls',limb],'high-jump':['#stage','.controls',['#a','#s','#j','#k']],'shot-put':['.arena','.controls',['#stepA','#stepS','#charge','#throw']],discus:['#stage','.pads',['#foot-a','#foot-s','#spin','#throw']],'tower-climb':['#stage','.feet',['#left-foot','#right-foot','#left-arm','#right-arm']]};
for(const [game,[sc,co,selectors]] of Object.entries(maps))test(`${game}: keeps scene, cues, input identities and listeners while presenting AS|JK`,async()=>{
 assert.ok(fs.existsSync(path),'shared controls module exists');const {mountControlsFrame}=await import(path);
 const dom=new JSDOM(fs.readFileSync(new URL(`../public/games/${game}/index.html`,import.meta.url),'utf8')),document=dom.window.document,scene=document.querySelector(sc),controls=document.querySelector(co),buttons=selectors.map(s=>document.querySelector(s)),before=scene.parentElement,sceneContent=scene.innerHTML,html=document.body.innerHTML;
 let presses=0;buttons[0].addEventListener('pointerdown',()=>presses++);const inputAttrs=buttons.map(b=>[b.id,b.dataset.limb,b.dataset.input]);
 const mounted=mountControlsFrame({document,scene,controls,game,keys:Object.fromEntries(['a','s','j','k'].map((k,i)=>[k,buttons[i]]))});
 assert.equal(mounted.frame.parentElement,before);assert.equal(scene.innerHTML,sceneContent);assert.deepEqual([...mounted.frame.querySelectorAll('[data-pf-key]')],buttons);assert.deepEqual(buttons.map(b=>[b.id,b.dataset.limb,b.dataset.input]),inputAttrs);
 assert.deepEqual(buttons.map(b=>b.dataset.pfKey),['a','s','j','k']);assert.equal(buttons[0].parentElement,buttons[1].parentElement);assert.equal(buttons[2].parentElement,buttons[3].parentElement);assert.notEqual(buttons[0].parentElement,buttons[2].parentElement);
 buttons[0].dispatchEvent(new dom.window.Event('pointerdown'));assert.equal(presses,1);
 if(game==='discus')assert.equal(document.querySelector('#cue').closest('.pf-controls-frame'),null);
 if(game==='high-jump')assert.equal(document.querySelector('#prompt').closest('.pf-controls-frame'),null);
 if(before.hasAttribute('data-play-surface'))assert.equal(scene.closest('[data-play-surface]'),before);
 mounted.destroy();assert.equal(document.body.innerHTML,html);dom.window.close();
});
test('duplicate keys rejected before any DOM mutation',async()=>{assert.ok(fs.existsSync(path));const {mountControlsFrame}=await import(path);const dom=new JSDOM('<main><section></section><div><button></button></div></main>'),document=dom.window.document,scene=document.querySelector('section'),controls=document.querySelector('div'),a=document.querySelector('button'),before=document.body.innerHTML;assert.throws(()=>mountControlsFrame({document,scene,controls,keys:{a,s:a,j:a,k:a}}),/four distinct/);assert.equal(document.body.innerHTML,before);dom.window.close();});
test('shared styling gives original keys readable minimum targets and actual pressed feedback',async()=>{
 const cssPath=new URL('../public/games/shared/controls-shell.css',import.meta.url);assert.ok(fs.existsSync(cssPath),'shared stylesheet exists');const {default:postcss}=await import('postcss');const root=postcss.parse(fs.readFileSync(cssPath,'utf8'));const declarations=selector=>{let result={};root.walkRules(rule=>{if(rule.selector===selector)rule.walkDecls(d=>result[d.prop]=d.value)});return result;};
 const button=declarations('.pf-game .pf-controls-frame [data-pf-key]');assert.ok(parseFloat(button['min-width'])>=64);assert.ok(parseFloat(button['min-height'])>=80);assert.equal(button['touch-action'],'none');assert.ok(parseFloat(button['font-size'])>=18);
 const key=declarations('.pf-game .pf-controls-frame [data-pf-key] kbd');assert.ok(parseFloat(key['font-size'])>=26);
 let wide=false,pressed=false;root.walkAtRules('media',rule=>{if(rule.params==='(min-width:900px)'){wide=true;let height=false;rule.walkDecls('min-height',d=>{if(parseFloat(d.value)>=96)height=true;});assert.ok(height);}});root.walkRules(rule=>{if(rule.selector.includes('[aria-pressed="true"]')&&rule.selector.includes('.active')&&rule.selector.includes('.held'))pressed=true;});assert.ok(wide);assert.ok(pressed);
});
test('generic pressed feedback does not mask existing charge/armed/bracing shadows',async()=>{const {default:postcss}=await import('postcss');const root=postcss.parse(fs.readFileSync(new URL('../public/games/shared/controls-shell.css',import.meta.url),'utf8'));root.walkRules(rule=>{if(rule.selector.includes('[aria-pressed="true"]'))rule.walkDecls('box-shadow',()=>assert.fail('generic pressed shadow masks original action cues'));});});
