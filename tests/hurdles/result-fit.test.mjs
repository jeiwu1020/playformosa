import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../public/games/hurdles/style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../../public/games/hurdles/index.html',import.meta.url),'utf8');
const block=css.slice(css.indexOf('/* Height-budgeted result photo'));
test('desktop result has a viewport-height budget rather than an image height derived only from width',()=>{
 assert.match(block,/@media\s*\(min-width:768px\)/);
 assert.match(block,/#overlay\.result\{[^}]*height:min\(760px,calc\(var\(--vh,100dvh\) - 26px\)\)/);
 assert.match(block,/#overlay\.result\[open\]\{[^}]*display:flex[^}]*flex-direction:column/);
 assert.match(block,/#overlay\.result #result\{[^}]*flex:1 1 auto[^}]*min-height:0/);
 assert.match(block,/#overlay\.result #finish-frame\{[^}]*flex:1 1 0[^}]*min-height:140px[^}]*aspect-ratio:auto/);
});
test('the complete frozen photo fits its bounded figure while tiny screens keep scrolling fallback',()=>{
 assert.match(block,/#overlay\.result #finish-frame canvas\{[^}]*height:100%[^}]*aspect-ratio:auto[^}]*object-fit:contain/);
 assert.match(block,/max-height:clamp\(120px,35vh,240px\)/);
 assert.match(css,/dialog\{[^}]*overflow:auto/);
 assert.match(css,/#overlay\.result\{[^}]*scrollbar-color:#91a78d #e7eddd/);
 assert.match(html,/id="result-actions"[^]*id="replay-last"[^]*id="result"[^]*id="finish-frame"/);
});

test('compact desktop chrome reserves the height budget for the photo and all five actions',()=>{
 assert.match(block,/#overlay\.result\{[^}]*padding:16px/);
 assert.match(block,/#overlay\.result>\.card-label\{[^}]*margin-bottom:8px/);
 assert.match(block,/#overlay\.result>\.result-actions\{[^}]*margin-bottom:12px/);
});
