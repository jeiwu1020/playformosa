import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{JSDOM}from'jsdom';import{mountLevel}from'../../public/games/fast-hands/levels-app.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
test('catch long runs retain all results through ten-entry pages without changing game state',()=>{
 const dom=new JSDOM(readFileSync(new URL('catch.html',root),'utf8'),{pretendToBeVisual:true});let now=0,frame;
 const app=mountLevel({document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:async()=>null});const $=id=>dom.window.document.getElementById(id);
 const tick=target=>{while(now+100<target){now+=100;frame(now);}now=target;frame(now);};
 $('roundButton').click();$('actionButton').click();for(let i=0;i<25;i++){$('roundButton').click();tick(app.state.readyAt);tick(app.state.targetAt);$('actionButton').click();} $('roundButton').click();$('actionButton').click();
 assert.equal(app.state.results.length,26);assert.equal(app.state.phase,'done');const state=app.state;
 assert.equal($('roundResults').children.length,10);assert.equal($('resultPageLabel').textContent,'1–10 / 26');assert.equal($('resultPrev').disabled,true);
 $('resultNext').click();assert.equal($('resultPageLabel').textContent,'11–20 / 26');$('resultNext').click();assert.equal($('roundResults').children.length,6);assert.equal($('resultPageLabel').textContent,'21–26 / 26');assert.equal($('resultNext').disabled,true);
 $('resultPrev').click();assert.equal($('resultPageLabel').textContent,'11–20 / 26');assert.equal(app.state,state);app.destroy();
});
for(const mode of ['catch','duel'])test(`${mode} result replaces duplicate stage and provides grouped full summary`,()=>{
 const doc=new JSDOM(readFileSync(new URL(mode+'.html',root),'utf8')).window.document;assert.ok(doc.querySelector('.summary-overview #summaryTitle'));assert.ok(doc.querySelector('#resultPages'));assert.ok(doc.querySelector('.level-help-content'));
});
test('catch no longer announces a nonexistent target circle and transparent items have no opaque card',()=>{
 const app=readFileSync(new URL('levels-app.mjs',root),'utf8'),css=readFileSync(new URL('levels.css',root),'utf8');assert.doesNotMatch(app,/接彈區/);assert.match(css,/\.item-art\{background-color:transparent;border:0;border-radius:0;box-shadow:none/);assert.match(css,/body\[data-summary="true"\]/);
});
