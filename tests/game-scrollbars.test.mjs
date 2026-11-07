import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postcss from 'postcss';
import {JSDOM} from 'jsdom';

const games=fileURLToPath(new URL('../public/games/',import.meta.url));
const shared=path.join(games,'shared/scrollbars.css');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
function cssGraph(file,seen=new Set()){
 if(seen.has(file))return seen;
 seen.add(file);
 const css=postcss.parse(readFileSync(file,'utf8'));
 css.walkAtRules('import',rule=>{
  const href=rule.params.match(/(?:url\(\s*)?["']([^"']+)["']/)?.[1];
  assert.ok(href,`readable CSS import in ${file}`);
  // Network imports are resolved by the browser, not relative filesystem paths.
  if(/^(?:https?:)?\/\//i.test(href))return;
  cssGraph(path.resolve(path.dirname(file),href.split(/[?#]/)[0]),seen);
 });
 return seen;
}

test('every playable local game loads the shared scrollbar theme, including fast-hands subgames and lab',()=>{
 const pages=walk(games).filter(file=>file.endsWith('.html')).filter(file=>/<script\b/i.test(readFileSync(file,'utf8')));
 assert.ok(pages.length>=17,'audit every current and newly added playable entry point');
 for(const file of pages){
  const document=new JSDOM(readFileSync(file,'utf8')).window.document;
  const graph=new Set();
  for(const link of document.querySelectorAll('link[rel="stylesheet"]')){
   const href=link.getAttribute('href').split(/[?#]/)[0];
   for(const imported of cssGraph(path.resolve(path.dirname(file),href)))graph.add(imported);
  }
  assert.ok(graph.has(shared),`${path.relative(games,file)} must theme every scrollable surface`);
 }
});

test('scrollbar theme reaches document, body and future nested scrollers without changing layout or input',()=>{
 assert.ok(existsSync(shared),'shared scrollbar theme exists');
 const css=postcss.parse(readFileSync(shared,'utf8'));
 const rules=css.nodes.filter(node=>node.type==='rule');
 const fallback=rules.find(rule=>rule.selector===':where(html, body, body *)');
 assert.ok(fallback,'low-specificity coverage does not depend on current dialog IDs');
 const declarations=Object.fromEntries(fallback.nodes.map(node=>[node.prop,node.value]));
 assert.equal(declarations['scrollbar-width'],'thin');
 assert.equal(declarations['scrollbar-color'],'var(--pf-scrollbar-thumb) var(--pf-scrollbar-track)');
 css.walkDecls(decl=>{
  if(decl.prop.startsWith('--pf-scrollbar-'))return;
  if(decl.parent.selector?.includes('::-webkit-scrollbar'))return;
  assert.ok(['scrollbar-color','scrollbar-width'].includes(decl.prop),`no layout/input changes: ${decl.prop}`);
 });
});

test('WebKit and Chromium get rounded tracks, visible thumbs and both scrollbar axes',()=>{
 assert.ok(existsSync(shared),'shared scrollbar theme exists');
 const css=postcss.parse(readFileSync(shared,'utf8'));
 const rule=suffix=>css.nodes.find(node=>node.type==='rule'&&node.selector===`:where(html, body, body *)::-webkit-scrollbar${suffix}`);
 const properties=suffix=>Object.fromEntries(rule(suffix)?.nodes.map(node=>[node.prop,node.value])||[]);
 assert.equal(properties('').width,'10px');
 assert.equal(properties('').height,'10px');
 assert.equal(properties('-track').background,'var(--pf-scrollbar-track)');
 assert.equal(properties('-thumb').background,'var(--pf-scrollbar-thumb)');
 assert.equal(properties('-thumb')['border-radius'],'12px');
 assert.equal(properties('-thumb:hover').background,'var(--pf-scrollbar-hover)');
 const support=css.nodes.find(node=>node.type==='atrule'&&node.name==='supports');
 assert.equal(support?.params,'selector(::-webkit-scrollbar)');
 assert.ok(support.toString().includes('scrollbar-color: auto'),'Chromium standard properties do not suppress the detailed WebKit theme');
 assert.ok(css.nodes.some(node=>node.type==='atrule'&&node.name==='media'&&node.params==='(forced-colors: active)'),'respect high-contrast accessibility');
});

test('original long-jump and hurdles result-specific scrollbar artwork remains intact',()=>{
 const jump=readFileSync(path.join(games,'long-jump/style.css'),'utf8');
 const hurdles=readFileSync(path.join(games,'hurdles/style.css'),'utf8');
 assert.match(jump,/\.card\.result\{scrollbar-width:thin;scrollbar-color:#527d6d #e4e9df\}/);
 assert.match(hurdles,/#overlay\.result\{[^}]*scrollbar-color:#91a78d #e7eddd/);
});

test('Chromium detailed painting wins over older game-specific standard scrollbar settings',()=>{
 const css=postcss.parse(readFileSync(shared,'utf8'));
 const support=css.nodes.find(node=>node.type==='atrule'&&node.name==='supports');
 const reset=support.nodes.find(node=>node.type==='rule'&&node.selector===':where(html, body, body *)');
 for(const property of ['scrollbar-width','scrollbar-color']){
  const decl=reset.nodes.find(node=>node.prop===property);
  assert.equal(decl.value,'auto');
  assert.equal(decl.important,true,property+' must not let older thin/native styling suppress the custom WebKit paint');
 }
});
