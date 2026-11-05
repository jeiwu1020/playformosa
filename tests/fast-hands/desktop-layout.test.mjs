import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const root=new URL('../../',import.meta.url);
const css=postcss.parse(readFileSync(new URL('public/games/fast-hands/style.css',root),'utf8'));
const desktop=css.nodes.find(n=>n.type==='atrule'&&n.name==='media'&&n.params==='(min-width:1000px) and (min-height:680px)');
const rules=selector=>desktop?.nodes.filter(n=>n.type==='rule'&&n.selector===selector).flatMap(n=>n.nodes)||[];
const value=(selector,prop)=>rules(selector).findLast(n=>n.prop===prop)?.value;

test('desktop gives the scene two rows beside scores and actions, with the original full-width pad below',()=>{
 assert.ok(desktop,'desktop-specific layout is required');
 assert.equal(value('.pf-fast-hands main','grid-template-areas'),'"header header" "scene scores" "scene actions" "control control" "footer footer"');
 assert.equal(value('.pf-fast-hands .scene-card','grid-area'),'scene');
 assert.equal(value('.pf-fast-hands .score-row','grid-area'),'scores');
 assert.equal(value('.pf-fast-hands .actions','grid-area'),'actions');
 assert.equal(value('.pf-fast-hands .control-section','grid-area'),'control');
 assert.equal(value('.pf-fast-hands .actions','display'),'grid');
 assert.equal(value('.pf-fast-hands .actions','grid-template-columns'),'repeat(2,minmax(0,1fr))');
 assert.equal(value('.pf-fast-hands .actions .primary','grid-column'),'1/-1');
});
test('desktop refinement cannot alter full-width track width, endpoints, height or original camera/input code',()=>{
 assert.ok(desktop);
 desktop.walkRules(rule=>{assert.ok(!/#pad|\.gate|\.home|\.far|\.pad-track|\.travel-label|\.instruction|canvas|\.canvas-wrap/.test(rule.selector),rule.selector);});
 assert.equal(value('.pf-fast-hands main','max-width'),undefined,'original 1080px main width remains authoritative');
 assert.equal(value('.pf-fast-hands main','width'),undefined);
 const allMain=css.nodes.find(n=>n.type==='rule'&&n.selector==='main');
 assert.equal(allMain.nodes.find(n=>n.prop==='max-width').value,'1080px');
});
