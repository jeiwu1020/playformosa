import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {JSDOM} from 'jsdom';
import {createResultDialog} from '../../public/games/shared/game-ui.mjs';
const read=p=>readFileSync(new URL('../../public/games/'+p,import.meta.url),'utf8');
const css=postcss.parse(read('overtime-pinball/platform.css'));
const selector='.pf-game #results h2[tabindex="-1"]:focus';
test('result programmatic heading focus has a narrowly scoped outline reset at all viewport sizes',()=>{
 const rules=[];css.walkRules(selector,r=>rules.push(r));assert.equal(rules.length,1);
 assert.equal(rules[0].parent.type,'root');
 assert.deepEqual(rules[0].nodes.map(d=>[d.prop,d.value]),[['outline','none']]);
});
test('the reset selector excludes interactive controls, other headings and other dialogs',()=>{
 const dom=new JSDOM(read('overtime-pinball/game.html'));const d=dom.window.document;
 const h=d.querySelector('#resultTitle');h.focus();assert.equal(d.querySelector(selector),h);
 for(const tag of ['button','a','summary','input','select','textarea']){const e=d.createElement(tag);e.tabIndex=-1;d.querySelector('#results').append(e);e.focus();assert.equal(e.matches(selector),false);}
 const other=d.createElement('h2');other.tabIndex=-1;d.querySelector('#audioDialog').append(other);other.focus();assert.equal(other.matches(selector),false);
});
test('result still receives accessible focus, closes back to restart and keeps keyboard rings',()=>{
 const dom=new JSDOM(read('overtime-pinball/game.html'));const d=dom.window.document,dialog=d.querySelector('#results'),heading=d.querySelector('#resultTitle'),restart=d.querySelector('#platformRestart');
 dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 const ui=createResultDialog(dialog,{focusTarget:()=>heading,returnFocus:()=>restart});ui.open();assert.equal(d.activeElement,heading);assert.equal(dialog.getAttribute('aria-labelledby'),heading.id);assert.equal(heading.tabIndex,-1);ui.close();assert.equal(d.activeElement,restart);
 const original=postcss.parse(read('overtime-pinball/style.css'));let ring=false;original.walkRules(r=>{if(r.selector.includes('button:focus-visible'))r.walkDecls('outline',x=>{if(x.value!=='none'&&x.value!=='0')ring=true;});});assert.ok(ring);
 assert.ok(read('overtime-pinball/platform-ui.mjs').includes("focusTarget:()=>result.querySelector('h2')"));
});
