import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const modulePath = new URL('../src/render.mjs', import.meta.url);
// A missing renderer produces a direct assertion, rather than a module-load error.
test('catalog rendering produces available game links and never exposes planned routes', async () => {
  assert.ok(existsSync(modulePath), 'renderer must exist');
  const {renderPage} = await import(modulePath);
  const html = renderPage({games:[{id:'long-jump',title:'Jump',event:'跳遠',href:'/games/long-jump/',status:'available'},{id:'run',title:'Run',event:'100 公尺',href:'/games/run/',status:'planned'}],events:['100 公尺','跳遠']});
  assert.match(html,/href="\/games\/long-jump\/"/);
  assert.doesNotMatch(html,/href="\/games\/run\/"/);
  assert.match(html,/1<span[^>]*>\s*\/\s*2/);
  assert.match(html,/<details[^>]*>/);
  assert.doesNotMatch(html,/<details[^>]*\sopen[\s>]/);
});
test('renderer escapes catalog text instead of interpreting markup', async () => {
  assert.ok(existsSync(modulePath), 'renderer must exist');
  const {renderPage} = await import(modulePath);
  const html=renderPage({games:[{id:'long-jump',title:'<script>alert(1)</script>',event:'跳遠',href:'/games/long-jump/',status:'available'}],events:['跳遠']});
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});
test('renderer rejects unsafe game URLs', async () => {
  assert.ok(existsSync(modulePath), 'renderer must exist');
  const {renderPage} = await import(modulePath);
  assert.throws(()=>renderPage({games:[{id:'long-jump',title:'x',event:'跳遠',href:'javascript:alert(1)',status:'available'}],events:['跳遠']}), /Unapproved athletics route/);
});
