import {readBeforeStudio} from './helpers/studio-main-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {loadingManifest,reverseLoading,readBeforeLoading} from './helpers/loading-main-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readBeforeStudio(new URL(p,root));
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const games=['long-jump','hurdles','reaction-rod'];
test('main loader changes only three released documents and historical read boundaries and result fixture',()=>{
 const m=loadingManifest();assert.equal(m.baseCommit,'90e6690ca248752917955839d8c1ee2903a903d2');
 assert.deepEqual(m.scope,games);assert.deepEqual(m.files.map(f=>f.path).sort(),[...games.map(g=>'public/games/'+g+'/index.html'),'tests/helpers/rod-main-provenance.mjs','tests/reaction-rod-main-integrity.test.mjs','tests/reaction-rod-upload-scroll.test.mjs'].sort());
 for(const f of m.files){const current=read(f.path),before=reverseLoading(f.path,current);assert.equal(blob(before),f.beforeGitBlob);assert.deepEqual(readBeforeLoading(new URL(f.path,root)),before);assert.throws(()=>reverseLoading(f.path,Buffer.concat([current,Buffer.from('unreviewed')])));const damaged=structuredClone(m);damaged.files.find(x=>x.path===f.path).beforeText+='unreviewed';assert.throws(()=>reverseLoading(f.path,current,damaged));}
});
test('removing the exact loader insertions restores every original game document byte',()=>{
 for(const game of games){const path='public/games/'+game+'/index.html',current=read(path),before=reverseLoading(path,current).toString();const after=current.toString().replace(' data-pf-startup="pending"','').replace(/<style id="pf-startup-style">[\s\S]*?<\/style>/,'').replace(/<link rel="modulepreload"[^>]+>/g,'').replace(/<script id="pf-startup-script">[\s\S]*?<\/script>/,'').replace(/<section id="pf-startup"[\s\S]*?<\/section>/,'');assert.equal(after,before,game+' preserves all original HTML, script imports and metadata');}
});
test('existing production tree stays byte-identical outside the declared overlay',()=>{
 const m=loadingManifest();for(const f of m.protectedFiles)assert.equal(blob(read(f.path)),f.gitBlob,f.path);
 assert.deepEqual(readdirSync(new URL('public/games/',root)).sort(),['hurdles','long-jump','reaction-rod','shared']);
});
test('modulepreloads only use existing same-origin modules and match original entry imports',()=>{
 const scripts=[];for(const game of games){const doc=new JSDOM(read('public/games/'+game+'/index.html').toString()).window.document;const preload=[...doc.querySelectorAll('link[rel=modulepreload]')].map(el=>el.getAttribute('href'));assert.equal(new Set(preload).size,preload.length);for(const src of preload){assert.doesNotMatch(src,/^https?:/);assert.match(src,/\.m?js(?:\?|$)/);assert.ok(readFileSync(new URL(src.split('?')[0],new URL('public/games/'+game+'/',root))).length);}for(const el of doc.querySelectorAll('script[type=module][src]'))assert.ok(preload.includes(el.getAttribute('src')));const script=doc.getElementById('pf-startup-script').textContent;scripts.push(script);assert.doesNotMatch(script,/\.click\(|AudioContext|localStorage|sessionStorage|requestAnimationFrame|\.play\(|\.showModal\(/);const css=doc.getElementById('pf-startup-style').textContent;assert.match(css,/prefers-reduced-motion/);assert.match(css,/min-height:44px/);assert.match(css,/overflow:auto/);assert.match(css,/visibility:hidden!important/);assert.doesNotMatch(css.split('}')[0],/display:none/);}
 assert.equal(new Set(scripts).size,1,'all three inline bootstraps stay identical');
});
