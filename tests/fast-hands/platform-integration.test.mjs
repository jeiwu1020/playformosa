import {reverseCharacterAppearance} from '../helpers/fast-hands-character-appearance-provenance.mjs';
import {historicalCatalog,renderHistoricalPage} from '../helpers/fast-hands-split-entries-catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {catalog} from '../../src/catalog.mjs';
import {renderPage} from '../../src/render.mjs';

const root = new URL('../../', import.meta.url);
const gameRoot = new URL('public/games/fast-hands/', root);
const brand = '島遊無界工作室 | PLAYFORMOSA STUDIO';
const readGame = path => {
  const url = new URL(path, gameRoot);
  assert.ok(existsSync(url), `playable fast-hands bundle must provide ${path}`);
  return readFileSync(url, 'utf8');
};
const gameDocument = () => new JSDOM(readGame('index.html'), {url:'https://playformosa.test/games/fast-hands/'}).window.document;

test('homepage presents Fast Hands as the fourth playable minigame without a play counter', () => {
  // Preserve this archived introduction against the exact pre-split parent.
  const catalog=historicalCatalog,renderPage=renderHistoricalPage;
  const doc = new JSDOM(renderPage(catalog, {channel:'preview'})).window.document;
  const cards = [...doc.querySelectorAll('#minigames .game-card')];
  assert.equal(cards.length, 4);
  const card = cards[3];
  assert.equal(card.querySelector('h3').textContent, '快手王｜一筆往返');
  assert.equal(card.querySelector('.game-cta').getAttribute('href'), '/games/fast-hands/');
  assert.match(card.querySelector('.input-chip').textContent, /滑鼠／觸控/);
  assert.equal(card.querySelector('.play-count'), null);
  assert.equal(doc.querySelectorAll('#decathlon .game-card').length, 8);
  const image = card.querySelector('img').getAttribute('src');
  assert.equal(image, '/assets/fast-hands-card-v2.webp');
  assert.ok(existsSync(new URL('public'+image, root)), 'homepage card must load locally');
});

test('the platform toolbar has home, ranking and settings while entry prioritizes play', () => {
  const doc = gameDocument();
  const link = doc.querySelector('.pf-header a[href="/#minigames"]');
  assert.ok(link, 'home belongs in the toolbar, like the other minigames');
  assert.match(link.textContent, /首頁/);
  assert.equal(doc.querySelector('#entryDialog a[href="/#minigames"]'),null);
  assert.ok(doc.querySelector('.pf-header nav #headerRanking'));
  assert.ok(doc.querySelector('.pf-header nav #headerSettings'));
  assert.notEqual(link.getAttribute('tabindex'), '-1');
  assert.ok(!link.hidden);
  assert.equal(doc.querySelector('#entryStart').tagName, 'BUTTON');
});

test('studio signature is visible in entry, next to the game heading, and on the result', () => {
  const doc = gameDocument();
  assert.ok(doc.body.classList.contains('pf-game'));
  assert.equal(doc.querySelectorAll('link[href="../shared/studio-brand.css"]').length, 1);
  for (const selector of ['#entryDialog .pf-entry-brand', '.pf-header > .pf-studio-heading > .pf-studio-live', '#resultDialog .pf-studio-result']) {
    const mark = doc.querySelector(selector);
    assert.ok(mark, selector);
    assert.equal(mark.textContent, brand);
    assert.ok(!mark.hidden);
  }
  assert.match(doc.querySelector('.pf-header > .pf-studio-heading > h1').textContent, /快手王/);
});

test('upload starts disabled and explains voluntary successful-score sharing to the online board', () => {
  const doc = gameDocument();
  const upload = doc.querySelector('#resultUpload');
  assert.equal(upload.disabled, true);
  const status = doc.getElementById(upload.getAttribute('aria-describedby'));
  assert.equal(status.textContent, '完成有效挑戰後，可自願上傳本次成績至排行榜。');
  assert.ok(!status.hidden);
});

test('all game entry media and imported modules resolve locally with no development payload', () => {
  const doc = gameDocument();
  for (const node of doc.querySelectorAll('[src], link[href], video[poster]')) {
    for (const attribute of ['src', 'href', 'poster']) {
      const value = node.getAttribute(attribute);
      if (!value) continue;
      assert.ok(!/^https?:/.test(value), `resource ${value} must be self-contained`);
      assert.ok(existsSync(value.startsWith('/') ? new URL('public'+value, root) : new URL(value, gameRoot)), `${value} must exist`);
    }
  }
  const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const url = new URL(entry.name+(entry.isDirectory()?'/':''), dir);
    return entry.isDirectory() ? walk(url) : [url];
  });
  for (const url of walk(gameRoot)) {
    assert.doesNotMatch(url.pathname, /(?:phaser\.min\.js|fast-king\.png|harness|\.test\.mjs)$/);
    if (!/\.(mjs|js)$/.test(url.pathname)) continue;
    const source = readFileSync(url, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)) {
      assert.ok(existsSync(new URL(match[2], url)), `${match[2]} must resolve from ${url.pathname}`);
    }
  }
});

test('archived original front-facing card remains available after the requested generated cover', () => {
  const card = new URL('public/assets/fast-hands-card.png', root);
  assert.ok(existsSync(card), 'original-character card must exist');
  assert.deepEqual(readFileSync(card), reverseCharacterAppearance('public/games/fast-hands/assets/front-demo-poster.png', readFileSync(new URL('assets/front-demo-poster.png', gameRoot))));
});

test('local PNG drawing includes the formal studio signature below the existing score', async () => {
  assert.ok(existsSync(new URL('score-image.mjs', gameRoot)), 'score image renderer must exist');
  const {createScoreImage} = await import('../../public/games/fast-hands/score-image.mjs');
  const text = [];
  const context = new Proxy({
    measureText: value => ({width:[...value].length*10}),
    fillText: (value,x,y) => text.push({value,x,y}),
  }, {get:(target,key) => target[key] ?? (()=>{})});
  const doc = {createElement:()=>({getContext:()=>context,toBlob:fn=>fn(new Blob(['png'],{type:'image/png'}))})};
  const output = await createScoreImage({result:{success:true,title:'挑戰成功！',timeText:'0.532',bestText:'0.500 秒',comment:'一手包辦，鈔鴨雙收。',deltaText:'比本機最佳慢 0.032 秒'},portrait:{complete:true,naturalWidth:512,naturalHeight:640},document:doc});
  assert.equal(output.blob.type, 'image/png');
  assert.ok(text.some(t => t.value==='0.532'));
  const marks = text.filter(t => t.value===brand);
  assert.equal(marks.length, 1);
  assert.ok(marks[0].y>1200 && marks[0].y<1310, 'signature stays inside the footer');
});
