import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../public/assets/home.css',import.meta.url),'utf8');
const mobile=css.split('@media(max-width:640px){')[1].split('@media(max-width:350px)')[0];
test('mobile hero gives artwork a definite single-column ratio box',()=>{
 assert.match(mobile,/\.hero\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(mobile,/\.hero-art\{[^}]*grid-column:1;[^}]*width:100%;[^}]*min-height:0;aspect-ratio:1\.25/);
});
test('mobile image cannot drive cyclic intrinsic grid sizing or escape its artwork box',()=>{
 assert.match(mobile,/\.hero-art img\{position:absolute;inset:0;height:100%;width:100%;max-width:none;aspect-ratio:auto\}/);
 assert.doesNotMatch(mobile,/\.hero-art img\{[^}]*height:116%/);
});
test('hero repair retains artwork/decorations and does not mask overflow globally',()=>{
 assert.doesNotMatch(css,/(?:html|body|\.hero-art|\.hero)\{[^}]*overflow(?:-x)?:hidden/);
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const marker of ['hero-long-jump.png','comic-sticker','hero-caption','四肢各有想法！','認真起跳，隨緣著陸。'])assert.ok(html.includes(marker),marker);
});
