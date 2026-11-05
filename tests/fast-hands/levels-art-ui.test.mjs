import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{JSDOM}from'jsdom';import{mountLevel}from'../../public/games/fast-hands/levels-app.mjs';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
for(const mode of ['catch','duel'])test(`${mode} has real 3D canvas, generated art, no emoji and accessible fallback`,()=>{
 const html=readFileSync(new URL(mode+'.html',root),'utf8'),doc=new JSDOM(html).window.document;
 assert.ok(doc.querySelector('#levelCanvas'));assert.ok(doc.querySelector('#fallbackScene'));assert.ok(doc.querySelector('#renderMode'));assert.doesNotMatch(html,/\p{Extended_Pictographic}/u);assert.ok(doc.querySelector('#speedLabel'));
});
test('catch UI starts scored survival after practice, increases stage and summarizes first loss',()=>{
 const dom=new JSDOM(readFileSync(new URL('catch.html',root),'utf8'),{pretendToBeVisual:true});let now=0,frame;
 const app=mountLevel({imageCapture:()=>Promise.reject(new Error('No canvas in DOM fixture')),clubFactory:()=>({destroy(){},blocked:()=>false}),document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:()=>null});const $=id=>dom.window.document.getElementById(id);
 const tick=target=>{while(now+100<target){now+=100;frame(now);}now=target;frame(now);};
 const nextRound=()=>{if(['feedback','done'].includes(app.state.phase))tick(now+1101);$('roundButton').click();};
 nextRound();$('actionButton').click();nextRound();tick(app.state.readyAt);tick(app.state.targetAt);$('actionButton').click();
 assert.equal(app.state.phase,'feedback');assert.match($('roundButton').textContent,/第 2 關/);nextRound();assert.ok(app.state.flightMs<520);assert.match($('speedLabel').textContent,/361/);$('actionButton').click();
 assert.equal(app.state.phase,'done');assert.match($('summaryTitle').textContent,/第 2 關/);assert.match($('summaryScore').textContent,/1/);assert.equal($('roundResults').children.length,2);app.destroy();
});
test('render loading resolves after destroy without leaking a stage instance',async()=>{
 const dom=new JSDOM(readFileSync(new URL('duel.html',root),'utf8'),{pretendToBeVisual:true});let resolve,disposed=0;
 const app=mountLevel({imageCapture:()=>Promise.reject(new Error('No canvas in DOM fixture')),clubFactory:()=>({destroy(){},blocked:()=>false}),document:dom.window.document,window:dom.window,requestFrame:()=>1,cancelFrame:()=>{},stageLoader:()=>new Promise(r=>resolve=r)});app.destroy();resolve({render(){},dispose(){disposed++;}});await Promise.resolve();await Promise.resolve();assert.equal(disposed,1);
});
test('offscreen cue pauses before input and an unseen frame cannot score',()=>{
 const dom=new JSDOM(readFileSync(new URL('duel.html',root),'utf8'),{pretendToBeVisual:true});let now=0,frame,hidden=false;
 const app=mountLevel({imageCapture:()=>Promise.reject(new Error('No canvas in DOM fixture')),clubFactory:()=>({destroy(){},blocked:()=>false}),document:dom.window.document,window:dom.window,clock:()=>now,random:()=>.5,requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},stageLoader:()=>null});const $=id=>dom.window.document.getElementById(id);
 $('stage').getBoundingClientRect=()=>({width:320,height:350,top:hidden?-700:20,bottom:hidden?-350:370});$('signal').getBoundingClientRect=()=>({width:100,height:40,top:hidden?-600:50,bottom:hidden?-560:90});$('levelCanvas').getBoundingClientRect=()=>({width:320,height:250,top:hidden?-670:50,bottom:hidden?-420:300});
 $('roundButton').click();now=app.state.readyAt;frame(now);hidden=true;$('actionButton').click();assert.equal(app.state.phase,'paused');assert.equal(app.state.results.length,0);
 hidden=false;$('roundButton').click();now=app.state.readyAt;frame(now);hidden=true;now+=30;frame(now);assert.equal(app.state.phase,'paused');assert.equal(app.state.results.length,0);app.destroy();
});
test('missing generated art is explicit, blocks play and supports successful retry',()=>{
 const dom=new JSDOM(readFileSync(new URL('duel.html',root),'utf8'),{pretendToBeVisual:true});
 const app=mountLevel({imageCapture:()=>Promise.reject(new Error('No canvas in DOM fixture')),clubFactory:()=>({destroy(){},blocked:()=>false}),document:dom.window.document,window:dom.window,requestFrame:()=>1,cancelFrame:()=>{},stageLoader:()=>null});const $=id=>dom.window.document.getElementById(id);assert.ok($('atlasProbe'));
 $('roundButton').click();$('atlasProbe').dispatchEvent(new dom.window.Event('error'));assert.equal(app.state.phase,'paused');assert.equal($('roundButton').disabled,true);assert.equal($('retryArtButton').hidden,false);assert.match($('artStatus').textContent,/載入失敗/);
 $('retryArtButton').click();assert.match($('atlasProbe').getAttribute('src'),/duel-items-atlas\.png\?retry=\d+/);const retried=$('atlasProbe').getAttribute('src');$('atlasProbe').dispatchEvent(new dom.window.Event('load'));assert.ok($('itemArt').style.backgroundImage.includes(retried));assert.equal($('roundButton').disabled,false);assert.equal($('retryArtButton').hidden,true);app.destroy();
});
