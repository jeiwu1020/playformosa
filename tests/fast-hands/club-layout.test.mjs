import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = new URL('../../public/games/fast-hands/', import.meta.url);
const clubPath = new URL('club.css', root);
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
  const base = name === 'duck' ? ['style.css','level-nav.css','../shared/studio-brand.css'] : ['levels.css','level-nav.css'];
  const css = base.map(file => readFileSync(new URL(file, root), 'utf8')).join('\n') + '\n' + (existsSync(clubPath) ? readFileSync(clubPath, 'utf8') : '');
  const style = document.createElement('style');
  style.textContent = atViewport(css, width, height);
  document.head.append(style);
  return { dom, document, style: selector => dom.window.getComputedStyle(document.querySelector(selector)) };
}

for (const [width,height] of sizes) {
  test(`all three games use a stage-first vertical layout at ${width}×${height}`, () => {
    for (const name of ['duck','catch','duel']) {
      const p = page(name,width,height);
      const main = p.style('main');
      assert.equal(main.gridTemplateColumns,'minmax(0,1fr)',`${name}: no desktop/landscape sidebar`);
      assert.equal(main.maxWidth,'1080px',`${name}: preserve the original playable width`);
      const areas = main.gridTemplateAreas.match(/"[^"]+"/g)?.map(s => s.slice(1,-1)) || [];
      assert.ok(areas.indexOf('scene') < areas.indexOf('scores'),`${name}: stage before score`);
      assert.ok(areas.indexOf('scores') < areas.indexOf('control'),`${name}: score before controls`);
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
      assert.equal(p.style(name === 'duck' ? '.result-top' : '.summary-overview').flexShrink,'0');
      if(name === 'duck') {
        assert.equal(p.style('#resultDialog .ticket-body').overflowY,'auto');
        assert.equal(p.style('.result-buttons').position,'sticky');
      }
      p.dom.window.close();
    }
  }
});

test('an art loading error keeps the same one-column game and exposes a recovery row', () => {
  for(const name of ['catch','duel']) {
    const p = page(name,1000,560);
    p.document.querySelector('#artStatus').hidden=false;
    p.document.querySelector('#retryArtButton').hidden=false;
    const areas=p.style('main').gridTemplateAreas.match(/"[^"]+"/g).map(s=>s.slice(1,-1));
    assert.ok(areas.every(area=>!area.includes(' ')),'error layout cannot restore a two-column desktop grid');
    assert.ok(areas.includes('status') && areas.includes('retry'));
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

test('wide short landscape shares the navigation row without moving controls alongside the stage', () => {
  const duck=page('duck',844,390);
  assert.equal(duck.style('.game-header').gridTemplateRows,'44px');
  assert.equal(duck.style('.game-header > .level-switch').gridRow,'1');
  assert.equal(duck.style('.game-header > .pf-studio-heading').display,'none');
  assert.equal(duck.style('#pad').height,'100px');
  duck.dom.window.close();
  for(const name of ['catch','duel']) {
    const p=page(name,844,390);
    assert.equal(p.style('main').position,'relative');
    assert.equal(p.style('main > .level-switch').position,'absolute');
    assert.equal(p.style('main > .level-switch').top,'0px');
    assert.equal(p.style('.level-header > div').display,'none');
    assert.equal(p.style('main').gridTemplateAreas,'"header" "scene" "scores" "feedback" "control"');
    assert.equal(p.style('.level-controls').position,'static');
    assert.equal(p.style('.level-stage').gridArea,'scene');
    p.dom.window.close();
  }
});

test('completed catch and duel tickets keep retry above practice despite desktop summary rules', () => {
  for (const name of ['catch','duel']) {
    for (const [width,height] of [...sizes].reverse()) {
      const p=page(name,width,height,'done');
      p.document.body.dataset.summary='true';
      const summary=p.document.querySelector('#summary');
      summary.hidden=false;
      summary.setAttribute('open','');
      assert.equal(p.style('#summaryPractice').gridRow,'2',`${name} ${width}×${height}: practice is the second action`);
      assert.equal(p.style('#summaryAgain').gridRow,'1',`${name} ${width}×${height}: retry is always first`);
      assert.equal(p.style('#summaryPractice').gridColumn,'1/-1');
      assert.equal(p.style('#summaryAgain').gridColumn,'1/-1');
      p.dom.window.close();
    }
  }
});
