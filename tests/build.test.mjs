import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
test('build materializes a homepage and preserves the self-contained game',()=>{
  assert.ok(existsSync(new URL('scripts/build.mjs',root)),'build script must exist');
  const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const page=readFileSync(new URL('dist/index.html',root),'utf8');
  assert.match(page,/href="\/games\/long-jump\/"/);
  assert.deepEqual(readFileSync(new URL('dist/games/long-jump/game.mjs',root)),readFileSync(new URL('public/games/long-jump/game.mjs',root)));
  assert.ok(existsSync(new URL('dist/assets/hero-long-jump.png',root)));
});
