import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = new URL('../../public/games/fast-hands/', import.meta.url);
const sizes = [[320,568],[360,640],[390,844],[430,932],[844,390],[1000,560],[1024,600],[1366,768],[1920,1080]];

// JSDOM does not evaluate viewport queries. Select the real applicable rules
// first, then let its CSS engine resolve the cascade against the page markup.
function matchesMedia(query, width, height) {
  return query.split(',').some(part => [...part.matchAll(/\(([^)]+)\)/g)].every(([, condition]) => {
    const [name, value] = condition.split(':').map(s => s.trim());
    if (name === 'orientation') return value === (width >= height ? 'landscape' : 'portrait');
    if (name === 'prefers-reduced-motion') return value === 'no-preference';
    const match = name.match(/^(min|max)-(width|height)$/);
    if (!match) return false;
    const actual = match[2] === 'width' ? width : height;
    return match[1] === 'min' ? actual >= parseFloat(value) : actual <= parseFloat(value);
  }));
}
function atViewport(css, width, height) {
  const tree = postcss.parse(css);
  tree.walkAtRules('media', rule => {
    if (matchesMedia(rule.params, width, height)) rule.replaceWith(...rule.nodes);
    else rule.remove();
  });
  return tree.toString();
}
function page(name, width, height, phase = 'idle') {
  const dom = new JSDOM(readFileSync(new URL(name === 'duck' ? 'index.html' : `${name}.html`, root), 'utf8'));
  const { document } = dom.window;
  document.body.classList.add('fast-hands-club');
  document.body.dataset.phase = phase;
  document.documentElement.dataset.pfStartup='ready';
  document.body.dataset.clubReady='true';
  // Match the page's actual stylesheet order, including studio-brand after club.
  const css=[...document.querySelectorAll('link[rel=stylesheet]')].map(link=>readFileSync(new URL(link.getAttribute('href'),root),'utf8')).join('\n');
  const style = document.createElement('style');
  style.textContent = atViewport(css, width, height);
  document.head.append(style);
  return { dom, document, css:style.textContent, style: selector => dom.window.getComputedStyle(document.querySelector(selector)) };
}

for (const [width,height] of sizes) {
  test(`all three games use the requested responsive layout at ${width}×${height}`, () => {
    for (const name of ['duck','catch','duel']) {
      const p = page(name,width,height);
      const main = p.style('main');
      assert.equal(main.gridTemplateColumns,width >= 1000 ? 'minmax(0,1.55fr) minmax(320px,1fr)' : 'minmax(0,1fr)',`${name}: desktop split, unchanged mobile stack`);
      assert.equal(main.maxWidth,'1080px',`${name}: preserve the original playable width`);
      const areas = main.gridTemplateAreas.match(/"[^"]+"/g)?.map(s => s.slice(1,-1)) || [];
      if(width < 1000){
        assert.ok(areas.indexOf('scene') < areas.indexOf('scores'),`${name}: stage before score`);
        assert.ok(areas.indexOf('scores') < areas.indexOf('control'),`${name}: score before controls`);
      }else{
        assert.ok(areas.includes('scene scores'),`${name}: scene left, score right`);
        assert.ok(areas.includes(name === 'duck' ? 'track track' : 'scene control'),`${name}: requested controls`);
      }
      assert.notEqual(p.style('body').overflowY,'hidden',`${name}: content remains reachable`);
      assert.notEqual(p.style('html').overflowY,'hidden',`${name}: document must not crop content`);
      assert.equal(p.style('.level-switch a').minHeight,'44px',`${name}: switch targets remain 44px`);
      const control = p.style(name === 'duck' ? '.control-section' : '.level-controls');
      assert.equal(control.position,'static',`${name}: controls never float over the stage`);
      p.dom.window.close();
    }
  });
}

test('duck gesture keeps its original percentage gates and a 100px or 122px track', () => {
  for (const [width,height] of sizes) {
    const p = page('duck',width,height);
    assert.ok(['100px','122px'].includes(p.style('#pad').height),`${width}×${height}: original usable track height`);
    assert.equal(p.style('.gate.home').width,'18%');
    assert.equal(p.style('.gate.far').width,'18%');
    assert.equal(p.style('.gate.home').left,'0px');
    assert.equal(p.style('.gate.far').right,'0px');
    assert.equal(p.style('#pad').maxWidth,'','no independent track width cap');
    p.dom.window.close();
  }
});

test('new levels reserve the same input footprint across every gameplay phase', () => {
  for (const [width,height] of [[320,568],[390,844],[1000,560],[1366,768]]) {
    for (const name of ['catch','duel']) {
      const footprints = [];
      for (const phase of ['idle','practice','waiting','live','feedback','paused','complete']) {
        const p = page(name,width,height,phase);
        footprints.push(['.primary-control','.secondary-control','.round-feedback','.level-hud'].map(s=>p.style(s).height));
        assert.equal(p.style('.secondary-control').height,'44px');
        assert.equal(p.style('.round-feedback > .eyebrow').display,'none','redundant headings do not consume play height');
        p.dom.window.close();
      }
      for (const footprint of footprints) assert.deepEqual(footprint,footprints[0]);
    }
  }
});

test('result tickets use one column with a fixed hero, reachable actions and independent detail scrolling', () => {
  for (const name of ['duck','catch','duel']) {
    for (const [width,height] of [[320,568],[844,390],[1366,768]]) {
      const p = page(name,width,height);
      const dialog = p.document.querySelector(name === 'duck' ? '#resultDialog' : '#summary');
      // The class contract also tests before the concurrent HTML migration lands.
      dialog.classList.add('result-dialog','club-summary');
      dialog.removeAttribute('hidden');
      dialog.setAttribute('open','');
      assert.equal(p.style(name === 'duck' ? '#resultDialog' : '#summary').display,'flex');
      assert.equal(p.style(name === 'duck' ? '#resultDialog' : '#summary').flexDirection,'column');
      assert.equal(p.style(name === 'duck' ? '.result-top' : '.summary-overview').flexShrink,'1');
      if(name === 'duck') {
        assert.equal(p.style('#resultDialog .ticket-body').overflowY,'auto');
        assert.equal(p.style('.result-buttons').position,'static');
      }
      p.dom.window.close();
    }
  }
});

test('an art loading error keeps the requested responsive game and exposes a recovery row', () => {
  for(const name of ['catch','duel']) {
    const p = page(name,1000,560);
    p.document.querySelector('#artStatus').hidden=false;
    p.document.querySelector('#retryArtButton').hidden=false;
    const areas=p.style('main').gridTemplateAreas.match(/"[^"]+"/g).map(s=>s.slice(1,-1));
    assert.ok(areas.includes('scene status') && areas.includes('scene retry'),'error recovery stays in the desktop right column');
    assert.equal(p.style('#artStatus').gridArea,'status');
    assert.equal(p.style('#retryArtButton').gridArea,'retry');
    p.dom.window.close();
  }
});

test('help expands within the full-width control row, not off the edge of its small trigger', () => {
  for(const name of ['catch','duel']) {
    const p = page(name,320,568);
    p.document.querySelector('.level-help').open=true;
    assert.equal(p.style('.secondary-control').position,'relative');
    assert.equal(p.style('.level-help').position,'static');
    assert.equal(p.style('.level-help-content').left,'0px');
    assert.equal(p.style('.level-help-content').right,'0px');
    assert.equal(p.style('.level-help-content').width,'100%');
    p.dom.window.close();
  }
});

test('a direct entry to any game presents the same introduction heading and start treatment', () => {
  const styles = [];
  for(const name of ['duck','catch','duel']) {
    const p=page(name,390,844);
    p.document.querySelector('#entryDialog').setAttribute('open','');
    styles.push([
      p.style('#entryDialog .ticket-top').backgroundColor,
      p.style('#entryDialog .ticket-kicker').fontSize,
      p.style('#entryStart').backgroundColor,
      p.style('#entryStart').minHeight,
    ]);
    p.dom.window.close();
  }
  assert.deepEqual(styles[1],styles[0]);
  assert.deepEqual(styles[2],styles[0]);
});

test('wide short landscape keeps two toolbar rows without moving controls alongside the stage', () => {
  const duck=page('duck',844,390);
  assert.equal(duck.style('.game-header').gridTemplateRows,'44px 44px');
  assert.equal(duck.style('.game-header > .level-switch').gridRow,'2');
  assert.equal(cascadeWinner(duck,'.game-header > .pf-studio-heading','display').value,'block');
  assert.equal(duck.style('#pad').height,'100px');
  duck.dom.window.close();
  for(const name of ['catch','duel']) {
    const p=page(name,844,390);
    assert.equal(p.style('main').position,'relative');
    assert.notEqual(p.style('main > .level-switch').position,'absolute');
    assert.equal(p.style('.level-header > div').display,'block');
    assert.equal(p.style('main').gridTemplateAreas,'"header" "nav" "scene" "scores" "feedback" "control"');
    assert.equal(p.style('.level-controls').position,'static');
    assert.equal(p.style('.level-stage').gridArea,'scene');
    p.dom.window.close();
  }
});

test('completed catch and duel tickets keep retry fixed and practice inside collapsed details', () => {
  for (const name of ['catch','duel']) {
    for (const [width,height] of [...sizes].reverse()) {
      const p=page(name,width,height,'done');
      p.document.body.dataset.summary='true';
      const summary=p.document.querySelector('#summary');
      summary.hidden=false;
      summary.setAttribute('open','');
      assert.equal(p.style('#summaryPractice').gridRow,'auto');
      assert.ok(p.document.querySelector('details.finale-details #summaryPractice'));
      assert.equal(p.document.querySelector('details.finale-details').open,false);
      assert.equal(p.document.querySelectorAll('.finale-main-actions>button').length,4);
      assert.equal(p.style('#summaryAgain').gridRow,'1',`${name} ${width}×${height}: retry is always first`);
      assert.equal(p.style('#summaryPractice').gridColumn,'auto');
      assert.equal(p.style('#summaryAgain').gridColumn,'1');
      p.dom.window.close();
    }
  }
});

test('shared toolbars keep all three named actions visible and matching at phone and short landscape sizes',()=>{
 for(const [width,height] of sizes){
  const pages=['duck','catch','duel'].map(name=>page(name,width,height));
  try{
   const signatures=pages.map(p=>['#headerRanking','#headerSettings','#openMenu'].map(selector=>{
    const s=p.style(selector);assert.notEqual(s.display,'none',`${width}: ${selector} stays visible`);assert.equal(s.minHeight,'44px');
    return [s.height,s.minWidth,s.padding,s.color,s.backgroundColor,s.borderRadius];
   }));
   assert.deepEqual(signatures[0],signatures[1]);assert.deepEqual(signatures[1],signatures[2]);
   for(const p of pages){assert.notEqual(p.style('.club-toolbar>div').display,'none','game name stays visible');assert.notEqual(p.style('main > .level-switch, .game-header > .level-switch').position,'absolute','destinations have their own row');}
  }finally{pages.forEach(p=>p.dom.window.close())}
 }
});

test('all three home links stay on one line with identical padding and a fixed 56 by 44 target at nine viewports',()=>{
 for(const [width,height] of [...sizes.filter(([w])=>w!==1920),[1180,820]]){
  const pages=['duck','catch','duel'].map(name=>page(name,width,height));
  try{
   const signatures=pages.map(p=>{
    const s=p.style('.club-toolbar>a');
    assert.equal(s.padding,'6px',`${width}×${height}: home padding is shared`);
    assert.equal(s.whiteSpace,'nowrap',`${width}×${height}: home label never wraps`);
    assert.equal(s.width,'56px');assert.equal(s.height,'44px');assert.equal(s.minHeight,'44px');
    assert.match(p.style('.club-toolbar').gridTemplateColumns,/^56px /,'home keeps its original grid width');
    return [s.padding,s.whiteSpace,s.width,s.height,s.minHeight];
   });
   assert.deepEqual(signatures[0],signatures[1]);assert.deepEqual(signatures[1],signatures[2]);
  }finally{pages.forEach(p=>p.dom.window.close())}
 }
});


// JSDOM does not consistently implement selector specificity. Independently
// resolve the relevant authored declarations, rather than trusting last-rule wins.
const compareSpecificity=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
function selectorSpecificity(selector){
 const score=[0,0,0];let source=selector;
 for(let match;(match=/:([\w-]+)\(/.exec(source));){
  const start=match.index,open=start+match[0].length-1;let depth=1,end=open+1;
  while(depth&&end<source.length){if(source[end]==='(')depth++;if(source[end]===')')depth--;end++;}
  assert.equal(depth,0,'balanced functional selector');
  const name=match[1],argument=source.slice(open+1,end-1);
  if(['is','not','has'].includes(name)){
   const max=postcss.list.comma(argument).map(selectorSpecificity).sort(compareSpecificity).at(-1);
   max.forEach((value,index)=>score[index]+=value);
  }else if(name!=='where')score[1]++;
  source=source.slice(0,start)+source.slice(end);
 }
 source=source.replace(/\[[^\]]*\]/g,()=>{score[1]++;return ''});
 source=source.replace(/::[\w-]+/g,()=>{score[2]++;return ''});
 source=source.replace(/:[\w-]+/g,()=>{score[1]++;return ''});
 source=source.replace(/#[\w-]+/g,()=>{score[0]++;return ''});
 source=source.replace(/\.[\w-]+/g,()=>{score[1]++;return ''});
 score[2]+=source.split(/[\s>+~]+/).filter(token=>/^[a-z][\w-]*$/i.test(token)).length;
 return score;
}
function cascadeWinner(p,selector,property){
 const element=p.document.querySelector(selector);assert.ok(element,selector);let winner=null;
 postcss.parse(p.css).walkRules(rule=>{
  for(const candidate of postcss.list.comma(rule.selector)){
   if(candidate.includes('::')||!element.matches(candidate))continue;
   const specificity=selectorSpecificity(candidate);
   for(const declaration of rule.nodes.filter(node=>node.type==='decl'&&node.prop===property)){
    const important=Boolean(declaration.important);
    if(!winner||important&&!winner.important||important===winner.important&&compareSpecificity(specificity,winner.specificity)>=0)winner={value:declaration.value,specificity,important,selector:candidate};
   }
  }
 });
 return winner;
}
test('toolbar specificity resolver detects the real legacy portrait override',()=>{
 assert.deepEqual(selectorSpecificity('.pf-game.pf-fast-hands .game-header>.pf-studio-heading'),[0,4,0]);
 assert.deepEqual(selectorSpecificity('body.fast-hands-club .club-toolbar>div'),[0,2,2]);
 assert.deepEqual(selectorSpecificity('body.fast-hands-club .club-toolbar>a:is(.pf-home,.home-link)'),[0,3,2]);
 assert.deepEqual(selectorSpecificity(':where(#ignored) .a:not(.b,#strong)'),[1,1,0]);
 assert.ok(compareSpecificity([0,4,0],[0,2,2])>0,'legacy portrait heading beats the former common rule');
});
test('nine real toolbar cascades keep titles in row one and destinations separate, including 333px portrait',()=>{
 const viewports=[[320,568],[333,505],[390,844],[430,932],[844,390],[1000,560],[1024,600],[1180,820],[1366,768]];
 for(const [width,height] of viewports)for(const mode of ['duck','catch','duel']){
  const p=page(mode,width,height);try{
   if(mode==='duck'){assert.ok(p.document.body.matches('.pf-game.pf-fast-hands.fast-hands-club'));assert.ok(p.document.querySelector('.club-toolbar>div.brand.pf-studio-heading'));}
   const winner=(selector,property,expected)=>{const found=cascadeWinner(p,selector,property);assert.equal(found?.value,expected,`${mode} ${width}×${height} ${selector} ${property}: winning selector ${found?.selector}`);};
   winner('.club-toolbar>div','grid-column','2');winner('.club-toolbar>div','grid-row','1');winner('.club-toolbar>div','display','block');winner('.club-toolbar>div','min-width','0');
   winner('.club-toolbar>a','grid-column','1');winner('.club-toolbar>a','grid-row','1');winner('.club-toolbar>a','white-space','nowrap');winner('.club-toolbar>a','padding','6px');
   winner('.club-toolbar .header-tools','grid-column','3');winner('.club-toolbar .header-tools','grid-row','1');
   winner('.club-toolbar h1','font-size',width<=600?'16px':'22px');winner('.club-toolbar h1','line-height','1.2');winner('.club-toolbar h1','white-space','nowrap');winner('.club-toolbar h1','overflow','hidden');winner('.club-toolbar h1','text-overflow','ellipsis');
   if(mode==='duck'){winner('.game-header>.level-switch','grid-row','2');winner('.game-header>.level-switch','grid-column','1/-1');}
   else winner('.level-main>.level-switch','grid-area','nav');
   assert.equal(p.style('.club-toolbar>div').gridRow,'1');assert.equal(p.style('.club-toolbar>div').gridColumn,'2');
   assert.notEqual(p.style('.club-toolbar>div').display,'none');assert.notEqual(p.style('.club-toolbar>div').visibility,'hidden');
  }finally{p.dom.window.close()}
 }
});
