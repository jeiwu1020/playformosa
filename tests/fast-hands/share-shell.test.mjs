import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const root=new URL('../../public/games/fast-hands/',import.meta.url);
const doc=()=>new JSDOM(readFileSync(new URL('index.html',root),'utf8')).window.document;
test('result keeps gameplay and ranking actions while offering three separate share controls',()=>{
 const d=doc(),share=d.querySelector('.result-share-actions');assert.ok(share);
 assert.deepEqual([...share.children].map(e=>e.id),['resultThreads','resultDownload','resultCopy']);
 const link=d.getElementById('resultThreads');assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/);assert.equal(link.hasAttribute('href'),false,'no stale result URL before prepare');
 for(const id of ['resultAgain','resultDemo','resultRanking'])assert.ok(d.querySelector('#resultDialog #'+id));
 assert.ok(d.querySelector('#rankingBoard #resultUpload'),'voluntary upload moved to the ranking view');
 assert.ok(share.closest('details.finale-share'),'share controls remain together in the collapsed section');
 assert.equal(d.getElementById('shareFallback').hidden,true);assert.equal(d.getElementById('shareFallbackText').readOnly,true);
 assert.equal(d.querySelectorAll('#resultDialog dialog').length,0,'fallback stays in the existing modal');
});
test('application prepares sharing from the same immutable result and disposes it on exit',()=>{
 const app=readFileSync(new URL('app.mjs',root),'utf8');assert.match(app,/mountFastHandsSharing/);assert.match(app,/sharing\.prepare\(Object\.freeze\(result\),mode\)/);assert.match(app,/sharing\.reset\(\)/);assert.match(app,/sharing\.destroy\(\)/);assert.doesNotMatch(app,/async function downloadResult/);
});
test('manual copy fallback explicitly restores native text selection and callout',()=>{const css=readFileSync(new URL('style.css',root),'utf8');const text=css.match(/\.share-fallback textarea\{([^}]+)\}/)?.[1]??'';assert.match(text,/-webkit-user-select:text/);assert.match(text,/-webkit-touch-callout:default/);});
