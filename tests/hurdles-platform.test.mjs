import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {catalog} from '../src/catalog.mjs';

const gameRoot=new URL('../public/games/hurdles/',import.meta.url);

test('the hurdles catalog link reaches a self-contained platform game and approved illustration thumbnail', () => {
  const entry=catalog.games.find(game=>game.id==='hurdles');
  assert.ok(entry,'hurdles belongs in the playable catalog');
  const page=new URL('../public'+entry.href+'index.html',import.meta.url);
  assert.ok(existsSync(page),'catalog route must have a game document');
  const html=readFileSync(page,'utf8');
  assert.match(html,/<a class="pf-home" href="\/"/,'game home stays on the test platform');
  assert.doesNotMatch(html,/私人試玩版|私人網址不會讓其他人直接試玩/,'unknown preview access must not be labelled private');
  assert.ok(existsSync(new URL('../public'+entry.image,import.meta.url)),'gameplay thumbnail is packaged');
  const image=readFileSync(new URL('../public'+entry.image,import.meta.url));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a','approved thumbnail is an actual PNG');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const ref=match[1];
    if(/^(https?:|\/)/.test(ref))continue;
    assert.ok(existsSync(new URL(ref.split('?')[0],gameRoot)),`packaged local reference ${ref}`);
  }
});
