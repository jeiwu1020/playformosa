import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{JSDOM}from'jsdom';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
for(const mode of ['duck','catch','duel'])test(`${mode} has an actual-round image and the same compact result actions`,()=>{
 const d=new JSDOM(readFileSync(new URL(mode==='duck'?'index.html':mode+'.html',root),'utf8')).window.document;
 const result=d.querySelector(mode==='duck'?'#resultDialog':'#summary');
 assert.ok(result.classList.contains('finale-ticket'));
 assert.equal(result.querySelectorAll('.finale-picture img').length,1);
 const image=result.querySelector('.finale-picture img');assert.ok(image.hidden);assert.equal(image.getAttribute('src'),null,'never pretend a stock portrait is this round');
 assert.equal(result.querySelectorAll('.finale-main-actions>button').length,3);
 assert.deepEqual([...result.querySelectorAll('.finale-main-actions>button')].map(x=>x.dataset.finaleAction),['again','replay','ranking']);
 assert.ok(result.querySelector('details.finale-details'));
 assert.ok(result.querySelector('details.finale-share'));
 assert.ok(d.querySelector('link[href="finale.css"]'));
 if(mode!=='duck'){assert.ok(d.querySelector('#soundToggle'));assert.ok(d.querySelector('#replayReturn'));assert.ok(d.querySelector('link[href="levels-ranking.css"]'));}
});
test('duck original sharing and consent controls remain reachable in their proper views',()=>{
 const d=new JSDOM(readFileSync(new URL('index.html',root),'utf8')).window.document;
 assert.ok(d.querySelector('#rankingBoard #resultUpload'));
 for(const id of ['resultThreads','resultDownload','resultCopy'])assert.ok(d.querySelector('details.finale-share #'+id));
 for(const id of ['rankingConsent','rankingSubmit','rankingNickname','resultDemo','resultRanking'])assert.ok(d.getElementById(id));
});
