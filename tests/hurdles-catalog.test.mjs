import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/catalog.mjs';
import {renderPage} from '../src/render.mjs';

test('platform exposes the playable hurdles test entry without hiding long jump', () => {
  const html=renderPage(catalog);
  assert.match(html,/href="\/games\/hurdles\/"/);
  assert.match(html,/href="\/games\/long-jump\/"/);
  assert.match(html,/8<span[^>]*>\s*\/\s*10/);
  const roadmap=html.match(/<details class="roadmap">([\s\S]*?)<\/details>/)[1];
  assert.doesNotMatch(roadmap,/110 公尺跨欄/);
  assert.match(html,/110 公尺跨欄/);assert.doesNotMatch(html,/測試版/);
});

test('each game card renders its own visual and copy instead of reusing long-jump claims', () => {
  const html=renderPage({games:[{id:'hurdles',title:'跨欄',event:'110 公尺跨欄',href:'/games/hurdles/',status:'available',image:'/assets/hurdles-card.jpg',kicker:'八道欄杆，四肢過招。',label:'測試版'}],events:['110 公尺跨欄']});
  const card=html.match(/<article class="game-card">([\s\S]*?)<\/article>/)[1];
  assert.match(card,/src="\/assets\/hurdles-card.jpg"/);
  assert.match(card,/class="game-scene"/,"scene thumbnails must fill the card rather than letterbox");
  assert.match(card,/八道欄杆，四肢過招。/);
  assert.doesNotMatch(card,/第一個挑戰|hero-long-jump/);
  assert.match(card,/110 公尺跨欄 · 測試版/);
});

test('renderer escapes optional card copy and rejects remote or unsafe card images', () => {
  const game={id:'hurdles',title:'跨欄',event:'110 公尺跨欄',href:'/games/hurdles/',status:'available',kicker:'<b>no</b>',label:'<script>no</script>'};
  const html=renderPage({games:[game],events:[game.event]});
  assert.match(html,/&lt;b&gt;no&lt;\/b&gt;/);
  assert.doesNotMatch(html,/<script>no<\/script>/);
  for(const image of ['https://example.com/pixel.png','javascript:alert(1)','/assets/../secret.svg']) {
    assert.throws(()=>renderPage({games:[{...game,image}],events:[game.event]}),/local card image/);
  }
});
