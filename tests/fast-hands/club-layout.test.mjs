import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = new URL('../../public/games/fast-hands/', import.meta.url);
const sizes = [[320,568],[333,505],[360,640],[390,844],[430,932],[844,390],[1000,560],[1024,600],[1366,768],[1920,1080]];

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

test('full fairness details live in the upper Help panel instead of a floating lower-control popover', () => {
  for(const name of ['catch','duel']) {
    const p = page(name,320,568);
    p.document.querySelector('#entryDialog').open=true;
    p.document.querySelector('.club-help-details').open=true;
    assert.equal(p.document.querySelector('.level-controls details'),null);
    assert.ok(p.document.querySelector('#entryDialog .club-help-details .level-help-content'));
    assert.equal(p.style('.level-help-content').position,'static');
    assert.equal(p.style('.level-help-content').maxHeight,'none');
    assert.equal(p.style('.level-help-content').overflow,'visible');
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

test('wide short landscape keeps controls and identity above navigation without moving controls alongside the stage', () => {
  const duck=page('duck',844,390);
  assert.equal(duck.style('.game-header').gridTemplateRows,'44px 44px 44px');
  assert.equal(duck.style('.game-header > .level-switch').gridRow,'3');
  assert.equal(cascadeWinner(duck,'.game-header > .pf-studio-heading','display').value,'flex');
  assert.equal(duck.style('#pad').height,'100px');
  duck.dom.window.close();
  for(const name of ['catch','duel']) {
    const p=page(name,844,390);
    assert.equal(p.style('main').position,'relative');
    assert.notEqual(p.style('main > .level-switch').position,'absolute');
    assert.equal(p.style('.level-header > div').display,'flex');
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

test('shared toolbars keep all four named actions visible and matching at phone and short landscape sizes',()=>{
 for(const [width,height] of sizes){
  const pages=['duck','catch','duel'].map(name=>page(name,width,height));
  try{
   const signatures=pages.map(p=>[p.document.getElementById('retry')?'#retry':'#restartButton','#headerRanking','#headerSettings','#openMenu'].map(selector=>{
    p.document.querySelector(selector).hidden=false;const s=p.style(selector);assert.notEqual(s.display,'none',`${width}: ${selector} stays visible`);assert.equal(s.minHeight,'44px');
    return [s.height,s.minWidth,s.padding,s.color,s.backgroundColor,s.borderRadius];
   }));
   assert.deepEqual(signatures[0],signatures[1]);assert.deepEqual(signatures[1],signatures[2]);
   for(const p of pages){assert.notEqual(p.style('.club-toolbar>div').display,'none','game name stays visible');assert.notEqual(p.style('main > .level-switch, .game-header > .level-switch').position,'absolute','destinations have their own row');}
  }finally{pages.forEach(p=>p.dom.window.close())}
 }
});

test('all three home links keep equal-grid full-size targets with visible Home text',()=>{
 for(const [width,height] of [...sizes.filter(([w])=>w!==1920),[1180,820]]){
  const pages=['duck','catch','duel'].map(name=>page(name,width,height));
  try{
   const signatures=pages.map(p=>{
    const s=p.style('.club-toolbar>a');
    assert.equal(s.padding,'6px',`${width}×${height}: home padding is shared`);
    assert.equal(s.whiteSpace,'nowrap',`${width}×${height}: home label never wraps`);
    assert.equal(s.width,'100%');assert.equal(p.document.querySelector('.club-toolbar>a').textContent.trim(),'首頁');assert.equal(s.height,'44px');assert.equal(s.minHeight,'44px');
    assert.equal(p.style('.club-toolbar').gridTemplateColumns,'repeat(5,minmax(0,1fr))','Home shares the five equal-width columns');
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
test('real toolbar cascades keep actions first and unclipped titles separate on narrow screens',()=>{
 const viewports=[[320,568],[333,505],[390,844],[430,932],[844,390],[1000,560],[1024,600],[1180,820],[1366,768]];
 for(const [width,height] of viewports)for(const mode of ['duck','catch','duel']){
  const p=page(mode,width,height);try{
   if(mode==='duck'){assert.ok(p.document.body.matches('.pf-game.pf-fast-hands.fast-hands-club'));assert.ok(p.document.querySelector('.club-toolbar>div.brand.pf-studio-heading'));}
   const winner=(selector,property,expected)=>{const found=cascadeWinner(p,selector,property);assert.equal(found?.value,expected,`${mode} ${width}×${height} ${selector} ${property}: winning selector ${found?.selector}`);};
   winner('.club-toolbar>div','grid-column','1/-1');winner('.club-toolbar>div','grid-row','2');winner('.club-toolbar>div','display','flex');winner('.club-toolbar>div','min-width','0');
   winner('.club-toolbar>a','grid-column','1');winner('.club-toolbar>a','grid-row','1');winner('.club-toolbar>a','white-space','nowrap');winner('.club-toolbar>a','padding','6px');
   winner('.club-toolbar .header-tools','grid-column','2/-1');winner('.club-toolbar .header-tools','grid-row','1');
   winner('.club-toolbar h1','font-size',width<=600?'18px':'22px');winner('.club-toolbar h1','line-height','1.2');winner('.club-toolbar h1','white-space','nowrap');winner('.club-toolbar h1','overflow','visible');winner('.club-toolbar h1','text-overflow','clip');
   if(mode==='duck'){winner('.game-header>.level-switch','grid-row','3');winner('.game-header>.level-switch','grid-column','1/-1');}
   else winner('.level-main>.level-switch','grid-area','nav');
   // JSDOM incorrectly lets the later, less-specific studio sheet win these grid properties.
   // The browser-specific cascade is asserted above instead of accepting that shortcut.
   assert.notEqual(p.style('.club-toolbar>div').display,'none');assert.notEqual(p.style('.club-toolbar>div').visibility,'hidden');
  }finally{p.dom.window.close()}
 }
});

// Contract is scoped to auxiliary panels; the separate result ticket is not a panel.
// Removing the wrappers, restoring naked Settings children, or allowing legacy
// ranking viewport heights/font rules to win must fail this real-cascade check.
test('Help, Settings and Rankings share padded scrollable panel anatomy with true browser specificity',async()=>{
 const {mountLevelLeaderboard}=await import('../../public/games/fast-hands/levels-leaderboard.mjs');
 for(const [width,height] of [[320,568],[390,844],[844,390],[568,260],[683,384],[1366,768],[1920,1080]])for(const mode of ['duck','catch','duel']){
  const p=page(mode,width,height);let ranking;try{
   if(mode!=='duck'){p.dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};ranking=mountLevelLeaderboard({document:p.document,mode});}
   for(const id of ['entryDialog',mode==='duck'?'info':'settingsDialog',mode==='duck'?'rankingDialog':'levelRankingDialog']){
    const dialog=p.document.getElementById(id);dialog.open=true;
    assert.ok(dialog.classList.contains('club-panel'),`${mode} ${id}: opt into the shared shell`);
    const header=dialog.querySelector(':scope > .club-panel-header'),body=dialog.querySelector(':scope > .club-panel-body');assert.ok(header,`${id}: padded header`);assert.ok(body,`${id}: bounded scroll surface`);
    const win=(selector,property,expected)=>{const actual=cascadeWinner(p,selector,property);assert.equal(actual?.value,expected,`${mode} ${width}×${height} ${selector} ${property}, winner ${actual?.selector}`)};
    win(`#${id}`,'padding','0');win(`#${id}`,'overflow','hidden');win(`#${id}`,'display','flex');win(`#${id}`,'flex-direction','column');
    win(`#${id} > .club-panel-header`,'flex','none');win(`#${id} > .club-panel-header`,'padding',height<=400?'12px 18px':'18px 20px 14px');
    win(`#${id} > .club-panel-header h2`,'font-size',height<=400?'22px':'24px');win(`#${id} > .club-panel-header h2`,'line-height','1.3');
    win(`#${id} > .club-panel-body`,'min-height','0');win(`#${id} > .club-panel-body`,'flex','1 1 auto');win(`#${id} > .club-panel-body`,'overflow','auto');win(`#${id} > .club-panel-body`,'max-height','none');win(`#${id} > .club-panel-body`,'padding',height<=400?'14px 18px':'18px 20px');
    if(id!=='entryDialog'){const footer=dialog.querySelector(':scope > .club-panel-footer');assert.ok(footer,`${id}: reachable close/back footer`);win(`#${id} > .club-panel-footer`,'flex','none');assert.ok(footer.querySelector('button'));}
   }
   if(mode==='duck'){assert.equal(cascadeWinner(p,'#rankingMouse','background')?.value,'var(--green)','selected input category stays distinct');assert.equal(cascadeWinner(p,'#rankingTouch','background')?.value,'#e4ecda');}
   const settings=p.document.getElementById(mode==='duck'?'info':'settingsDialog');assert.ok(settings.querySelector('.club-setting-row'));assert.equal(settings.querySelector('.help-steps'),null,'rules belong in Help, not Settings');assert.ok(p.document.querySelector('#entryDialog .help-steps li'));assert.ok(p.document.querySelector('#entryDialog .club-help-details'));assert.ok(settings.querySelector('.club-settings-note'));assert.equal(settings.querySelectorAll('select').length,mode==='duck'?1:0,'only real input mode choices');
   assert.ok(p.document.querySelector('#entryRanking'));assert.ok(p.document.querySelector(mode==='duck'?'#about':'#entrySettings'));
   const short=width>=601&&height<=500;
   assert.equal(cascadeWinner(p,'#entryDialog','max-width')?.value,short?'740px':'580px');
   assert.equal(cascadeWinner(p,'#entryDialog > .club-panel-body','display')?.value,short?'grid':'flex');
   assert.equal(cascadeWinner(p,'#entryStart','min-height')?.value,'48px');
   assert.equal(cascadeWinner(p,'#entryStart','grid-column')?.value,'1/-1','Start keeps its full action column, even short landscape');
   if(short){assert.equal(cascadeWinner(p,'#entryDialog .club-help-details','grid-column')?.value,'1/-1');assert.equal(cascadeWinner(p,'#entryDialog .club-intro-aux','grid-column')?.value,'1/-1');}
assert.equal(p.document.querySelector('.result-dialog').classList.contains('club-panel'),false,'no new cascade on result/upload host');
  }finally{ranking?.destroy();p.dom.window.close()}
 }
});

// Home occupies one of five equal tracks. The four-tool subgrid spans the
// remaining tracks with the same gap, so every target is equal at all widths.
// Inspect real CSS specificity, not just last declarations or JSDOM layout.
test('five equal toolbar buttons stay readable in one row with full identity below',()=>{
 for(const [width,height] of [[320,568],[333,505],[375,667],[390,844],[568,260],[600,360],[601,360],[683,384],[844,390],[1000,560],[1181,820],[1366,768],[1920,1080]])for(const mode of ['duck','catch','duel']){
  const p=page(mode,width,height);try{
   const win=(selector,property)=>cascadeWinner(p,selector,property)?.value,actions=[...p.document.querySelectorAll('.club-toolbar>a, .club-toolbar .header-tools>button')];
   assert.deepEqual(actions.map(action=>action.textContent.trim()),['首頁','重來','排行','設定','玩法']);
   for(const action of actions){
    const selector=action.tagName==='A'?'.club-toolbar>a':`#${action.id}`;
    assert.equal(action.hidden,false);assert.equal(win(selector,'min-width'),'44px');assert.equal(win(selector,'min-height'),'44px');assert.equal(win(selector,'height'),'44px');assert.equal(win(selector,'width'),'100%');assert.equal(win(selector,'white-space'),'nowrap');assert.equal(win(selector,'font'),'750 14px/1.2 system-ui,sans-serif');
   }
   assert.equal(win('.club-toolbar','grid-template-columns'),'repeat(5,minmax(0,1fr))');assert.equal(win('.club-toolbar','column-gap'),'6px');
   assert.equal(win('.club-toolbar>a','grid-column'),'1');assert.equal(win('.club-toolbar>a','grid-row'),'1');
   assert.equal(win('.club-toolbar .header-tools','grid-row'),'1');assert.equal(win('.club-toolbar .header-tools','grid-column'),'2/-1');assert.equal(win('.club-toolbar .header-tools','display'),'grid');assert.equal(win('.club-toolbar .header-tools','grid-template-columns'),'repeat(4,minmax(0,1fr))');assert.equal(win('.club-toolbar .header-tools','gap'),'6px');
   assert.equal(win('.club-toolbar>div','grid-row'),'2');assert.equal(win('.club-toolbar>div','grid-column'),'1/-1');assert.equal(win('.club-toolbar>div','display'),'flex');assert.equal(win('.club-toolbar>div','flex-direction'),'column');assert.equal(win('.club-toolbar>div','align-items'),'flex-start');
   assert.equal(win('.club-toolbar .pf-studio-live','display'),'block');assert.equal(p.document.querySelector('.club-toolbar .pf-studio-live').textContent,'島遊無界工作室 | PLAYFORMOSA STUDIO');assert.equal(win('.club-toolbar .club-studio-en','display'),'inline');
   assert.equal(p.document.querySelector('.club-toolbar>a').getAttribute('aria-label'),'返回小遊戲首頁');assert.equal(p.document.querySelector('.club-toolbar>a').getAttribute('href'),'/#minigames');
   const usable=Math.min(1080,width-40),target=(usable-4*6)/5;
   assert.ok(target>=44,`${mode} ${width}: five columns fit with full touch targets`);assert.ok(usable>=220,'the full studio name has its own unclipped line');
   if(mode==='duck'){assert.equal(win('.game-header','grid-template-rows'),'44px 44px 44px');assert.equal(win('.game-header>.level-switch','grid-row'),'3');}
   else{
    assert.equal(win('.level-header','height'),'var(--club-header-height)');assert.equal(win('body','--club-header-height'),'calc(88px + var(--club-gap))');
    assert.match(win('.level-main','grid-template-rows'),/^var\(--club-header-height\) 44px /);p.document.getElementById('artStatus').hidden=false;assert.match(win('.level-main','grid-template-rows'),/^var\(--club-header-height\) 44px /);assert.equal(win('.level-main>.level-switch','grid-area'),'nav');
   }
   const restart=mode==='duck'?'#retry':'#restartButton',element=p.document.querySelector(restart),before=['width','height','min-width','min-height','padding'].map(prop=>win(restart,prop));
   assert.equal(element.disabled,true);assert.equal(win(restart,'opacity'),'.48');element.disabled=false;assert.deepEqual(['width','height','min-width','min-height','padding'].map(prop=>win(restart,prop)),before,'enabling Restart never changes its footprint');
  }finally{p.dom.window.close()}
 }
});

// These checks fail if the original complete catch/duel rules are dropped during
// relocation, or the shared panel sends readers back down below gameplay.
test('upper Help retains complete fairness rules ahead of its Start actions in all three games',()=>{
 for(const mode of ['duck','catch','duel']){
  const p=page(mode,390,844);try{
   const help=p.document.querySelector('#entryDialog .club-help-details'),actions=p.document.querySelector('#entryDialog .club-cards');
   assert.ok(help.compareDocumentPosition(actions)&p.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
   assert.equal(p.document.querySelector('main .level-help'),null);
   assert.match(help.textContent,/玩法與公平計時/);
   if(mode==='catch')for(const rule of ['384 ms','220 ms','不是真實接彈示範','2D 相容畫面'])assert.ok(help.textContent.includes(rule),rule);
   if(mode==='duel')for(const rule of ['150–280 ms','不會偷看你的操作','伸手動畫只演出結果','非真人連線','2D 相容畫面'])assert.ok(help.textContent.includes(rule),rule);
   if(mode!=='duck')assert.match(help.textContent,/關閉後請自行按下準備按鈕，不會自動繼續/);
  }finally{p.dom.window.close()}
 }
});

test('relocated fairness copy has no leftover desktop popover surface',()=>{
 for(const mode of ['catch','duel'])for(const [width,height] of [[320,568],[844,390],[1181,820]]){
  const p=page(mode,width,height);try{
   const rule=(property,expected)=>assert.equal(cascadeWinner(p,'.level-help-content',property)?.value,expected,`${mode} ${width} ${property}`);
   rule('position','static');rule('max-height','none');rule('overflow','visible');rule('padding','0');rule('background','transparent');rule('border','0');rule('box-shadow','none');
   assert.match(p.document.querySelector('.level-help-content').textContent,/音效開關不影響遊戲規則與成績/);
  }finally{p.dom.window.close()}
 }
});

test('moving lower Help frees its empty row but retains the visible completed-game practice choice',()=>{
 for(const mode of ['catch','duel'])for(const [width,height] of [[320,568],[333,505],[375,667],[390,844],[844,390],[1000,560],[1181,820],[1181,390],[683,384],[590,410]]){
  const p=page(mode,width,height);try{
   const win=(selector,property)=>cascadeWinner(p,selector,property)?.value;
   assert.equal(win('.secondary-control','display'),'none');
   const expected=width>=1000&&height>=451?'var(--club-primary) 20px':height<=700?'var(--club-primary)':'var(--club-primary) 15px';
   assert.equal(win('.level-controls','grid-template-rows'),expected,`${mode} ${width}×${height}: no empty fairness row`);
   p.document.querySelector('#practiceButton').hidden=false;
   assert.equal(win('.secondary-control','display'),'flex');assert.equal(win('.secondary-control','height'),'44px');
   assert.match(win('.level-controls','grid-template-rows'),/44px$/,'existing completed-game practice row remains reachable');
   assert.equal(win('body','overflow-y'),'auto');assert.equal(win('html','overflow-y'),'auto');
  }finally{p.dom.window.close()}
 }
});

// Browser focus-visible can match the first automatically focused dialog action.
// Suppression must beat both the panel and legacy game focus rules, without
// removing the focus target. Keyboard input restores the branded visible ring.
test('panel auto and pointer focus has no ring while keyboard focus stays dark green',()=>{
 for(const mode of ['duck','catch','duel']){
  const p=page(mode,390,844);try{
   p.document.getElementById('entryDialog').open=true;
   p.document.getElementById('entryClose').hidden=false;
   for(const selector of ['#entryDialog summary','#entryClose','#entryStart']){
    const target=p.document.querySelector(selector);target.focus();assert.equal(p.document.activeElement,target);
    for(const modality of ['pointer','keyboard','pointer']){
     p.document.body.dataset.clubFocus=modality;
     assert.equal(cascadeWinner(p,selector,'outline')?.value,modality==='keyboard'?'3px solid var(--green)':'none',`${mode} ${selector} ${modality}`);
     assert.equal(p.document.activeElement,target,'no focus removal or tabindex workaround');
    }
    delete p.document.body.dataset.clubFocus;
    assert.equal(cascadeWinner(p,selector,'outline')?.value,'3px solid var(--green)','native keyboard focus remains a safe fallback without the controller');
   }
  }finally{p.dom.window.close()}
 }
});

test('navigation confirmation keeps its trapped focus without a pointer ring and uses a green keyboard ring',async()=>{
 const {mountClub}=await import('../../public/games/fast-hands/club.mjs');
 for(const mode of ['duck','catch','duel']){
  const p=page(mode,390,844),w=p.dom.window;let club;try{
   w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
   club=mountClub({document:p.document,mode,isActive:()=>true});
   club.requestNavigation('https://qa.test/games/fast-hands/catch.html');
   const stay=p.document.getElementById('clubNavigationStay');assert.equal(p.document.activeElement,stay);
   assert.equal(cascadeWinner(p,'#clubNavigationStay','outline')?.value,'none','automatic Stay focus does not draw an orange box');
   stay.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
   const leave=p.document.getElementById('clubNavigationLeave');assert.equal(p.document.activeElement,leave,'Tab remains trapped inside confirmation');
   assert.equal(cascadeWinner(p,'#clubNavigationLeave','outline')?.value,'3px solid var(--green)');
   leave.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
   assert.equal(cascadeWinner(p,'#clubNavigationLeave','outline')?.value,'none');assert.equal(p.document.activeElement,leave);
  }finally{club?.destroy();w.close()}
 }
});
