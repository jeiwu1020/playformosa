import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';

const root = new URL('../../public/games/fast-hands/', import.meta.url);
const clubPath = new URL('club.css', root);
const sizes = [[320,568],[360,640],[390,844],[844,390],[568,260],[1024,600],[1366,768],[1920,1080]];

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

// Red regression: restoring the former 11px mobile/12px desktop copy fails here.
for (const [width,height] of sizes) {
  test(`introduction copy is readable in all three games at ${width}×${height}`, () => {
    for (const name of ['duck','catch','duel']) {
      const p=page(name,width,height);
      p.document.querySelector('#entryDialog').setAttribute('open','');
      for(const node of p.document.querySelectorAll('.club-card p')) {
        const css=p.dom.window.getComputedStyle(node);
        assert.ok(parseFloat(css.fontSize)>=15,`${name}: card copy must be at least 15px, got ${css.fontSize}`);
        assert.ok(parseFloat(css.lineHeight)>=21,`${name}: copy needs at least 21px line height`);
        assert.notEqual(css.display,'none');
      }
      assert.ok(parseFloat(p.style('.club-card h3').fontSize)>=17);
      assert.ok(parseFloat(p.style('#entryDescription').fontSize)>=15);
      assert.ok(parseFloat(p.style('#entryStart').minHeight)>=48);
      for(const node of p.document.querySelectorAll('#entryDialog button:not([hidden])')) {
        assert.ok(parseFloat(p.dom.window.getComputedStyle(node).minHeight)>=44);
      }
      assert.equal(p.style('#entryDialog .ticket-body').overflow,'auto','short screens retain internal scrolling');
      assert.equal(p.style('#entryDialog .ticket-body').minHeight,'0');
      assert.equal(p.style('#entryDialog .ticket-top').flexShrink,'0');
      assert.equal(p.document.querySelectorAll('.club-card').length,3);
      p.dom.window.close();
    }
  });
}

test('small-screen introduction uses large scene thumbnails without hiding instructions',()=>{
  for(const name of ['duck','catch','duel']) {
    const p=page(name,320,568);
    assert.ok(parseFloat(p.style('.club-card').gridTemplateColumns)>=96,'scene thumbnail column is at least 96px wide');
    assert.equal(p.style('.club-card img').aspectRatio,'3 / 2');
    assert.equal(p.style('.club-card img').objectFit,'cover');
    assert.equal(p.style('.club-card img').height,'auto');
    assert.ok(parseFloat(p.style('.club-card').paddingTop)<=6);
    assert.ok(parseFloat(p.style('.club-cards').gap)<=6);
    assert.equal(p.style('.club-card p').maxHeight,'');
    p.dom.window.close();
  }
});

test('start treatment beats the generic entry button selector in browser specificity',()=>{
  // JSDOM may resolve conflicting declarations by order rather than browser
  // specificity. Require the start selector to dominate the generic button rule.
  const tree=postcss.parse(readFileSync(clubPath,'utf8'));
  const rule=tree.nodes.find(node=>node.type==='rule' && node.selector==='body.fast-hands-club .club-intro .entry-buttons>.intro-start');
  assert.ok(rule,'start selector must include .entry-buttons>.intro-start');
  const value=prop=>rule.nodes.findLast(node=>node.prop===prop)?.value;
  assert.equal(value('font-size'),'17px');
  assert.equal(value('min-height'),'48px');
  assert.equal(value('background'),'#ef945a');
});

test('wide short intro shares one action row without shrinking text or touch targets',()=>{
  const p=page('duck',844,390);
  assert.equal(p.style('#entryStart').gridColumn,'1');
  assert.equal(p.style('#entryStart').gridRow,'1');
  assert.equal(p.style('.club-intro-aux').gridColumn,'2');
  assert.equal(p.style('.club-intro-aux').gridRow,'1');
  assert.ok(parseFloat(p.style('.club-cards').marginBottom)<=8);
  p.dom.window.close();
  for(const name of ['catch','duel']) {
    const level=page(name,844,390);
    assert.equal(level.style('#entryStart').gridColumn,'1/-1','single action remains full width');
    level.dom.window.close();
  }
  const small=page('duck',568,260);
  assert.equal(small.style('#entryStart').gridColumn,'1/-1','very short narrow screen keeps scrollable stack');
  assert.equal(small.style('#entryDialog .ticket-body').overflow,'auto');
  small.dom.window.close();
});

// Removing the shared ratio, restoring icon-size cards, or stretching one scene
// must fail these contracts. Browser geometry is verified separately.
for (const [width,height] of [[320,568],[360,640],[390,844],[844,390],[1024,600],[1366,768]]) {
  test(`intro scene images keep a consistent unstretched ratio at ${width}×${height}`,()=>{
    for(const name of ['duck','catch','duel']) {
      const p=page(name,width,height);
      for(const image of p.document.querySelectorAll('.club-card img')) {
        const css=p.dom.window.getComputedStyle(image);
        assert.equal(css.aspectRatio,'3 / 2');
        assert.equal(css.objectFit,'cover');
        assert.equal(css.height,'auto');
        assert.ok(parseFloat(css.borderRadius)>=8,'artwork has a finished rounded frame');
      }
      if(width<=600) {
        assert.ok(parseFloat(p.style('.club-card').gridTemplateColumns)>=96);
      } else if(height<=450) {
        assert.ok(parseFloat(p.style('.club-card img').width)>=144);
        assert.equal(p.style('.club-intro .pf-entry-brand').display,'none','only decorative footer is omitted on short landscape');
      } else {
        assert.ok(parseFloat(p.style('.club-intro').maxWidth)>=780,'three image cards have enough desktop room');
        assert.equal(p.style('.club-card img').width,'100%');
      }
      p.dom.window.close();
    }
  });
}
