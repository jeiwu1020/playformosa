import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../public/games/hurdles/style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../../public/games/hurdles/index.html',import.meta.url),'utf8');
const block=css.slice(css.indexOf('/* High-jump composition'));
test('desktop result has a viewport-height budget rather than an image height derived only from width',()=>{
 assert.match(block,/@media\s*\(min-width:768px\)/);
 assert.match(block,/#overlay\.result\{[^}]*height:min\(700px,calc\(var\(--vh,100dvh\) - 26px\)\)/);
 assert.match(block,/#overlay\.result\[open\]\{[^}]*display:flex[^}]*flex-direction:column/);
 assert.match(block,/#overlay\.result #result\{[^}]*flex:1 1 auto[^}]*min-height:0/);
 assert.match(block,/#overlay\.result #finish-frame\{[^}]*flex:1 1 0[^}]*min-height:140px[^}]*aspect-ratio:auto/);
});
test('the complete frozen photo fits its bounded figure while tiny screens keep scrolling fallback',()=>{
 assert.match(block,/#overlay\.result #finish-frame canvas\{[^}]*max-height:100%[^}]*aspect-ratio:auto[^}]*object-fit:contain/);
 assert.match(block,/max-height:clamp\(120px,35vh,240px\)/);
 assert.match(css,/dialog\{[^}]*overflow:auto/);
 assert.match(css,/#overlay\.result\{[^}]*scrollbar-color:#91a78d #e7eddd/);
 assert.match(html,/id="result-actions"[^]*id="replay-last"[^]*id="result"[^]*id="finish-frame"/);
});

test('compact desktop chrome reserves the height budget for the photo and all five actions',()=>{
 assert.match(block,/#overlay\.result\{[^}]*padding:12px/);
 assert.match(block,/#overlay\.result>\.card-label\{[^}]*margin-bottom:4px/);
 assert.match(block,/#overlay\.result>\.result-actions\{[^}]*margin-bottom:6px/);
});

test('high-jump-sized composition reserves image area instead of a wide colored letterbox',()=>{
 const composition=css.slice(css.indexOf('/* High-jump composition'));
 assert.match(composition,/#overlay\.result\{[^}]*width:min\(720px/);
 assert.match(composition,/#overlay\.result #verdict\{[^}]*font-size:16px/);
 assert.match(composition,/#overlay\.result \.result-time strong\{[^}]*font-size:36px/);
 assert.match(composition,/#overlay\.result #finish-frame\{[^}]*background:transparent/);
 assert.match(composition,/#overlay\.result #start,#overlay\.result #replay-last\{[^}]*min-height:44px/);
});

test('rounded corners belong to the actual raw photo bounds, not an empty wider canvas box',()=>{
 assert.match(block,/#overlay\.result #finish-frame\{[^}]*display:flex[^}]*justify-content:center/);
 assert.match(block,/#overlay\.result #finish-frame canvas\{[^}]*width:auto[^}]*height:auto[^}]*max-width:100%[^}]*max-height:100%[^}]*border-radius:12px/);
});
