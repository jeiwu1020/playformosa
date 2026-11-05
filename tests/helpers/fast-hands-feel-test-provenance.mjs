import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

// Exact additions from bdaaaa029830c3b95c3f812a047e6925833ca32b.
// This is independent of the formal fast-hands runtime and its reversal chain.
const files=Object.freeze([
  Object.freeze(['app.mjs','e0dbf963b8c7837eaf402fbe0216d2c38b0f7fedd9e41759595ec54975ceefba']),
  Object.freeze(['index.html','e7e324a3a4ca15d60ea2010e53a2f07c021f7f00bac2b5a2d51b6ccca0753bc5']),
  Object.freeze(['rules.mjs','cb46bbb05c3e4716678e8d4f0cfe38082b48c17d92793109605f680ce3259b86']),
  Object.freeze(['style.css','760b18397d1dbd19e85f079ab660091b6a11b338877649287e0faf6bf390c868']),
]);
export function feelTestRuntimeAdditions(root=new URL('../../',import.meta.url)){
  const directory=new URL('public/games/fast-hands-test/',root);
  const entries=readdirSync(directory,{withFileTypes:true});
  assert.deepEqual(entries.map(e=>e.name).sort(),files.map(([name])=>name),'exact feel-test runtime inventory');
  assert.ok(entries.every(e=>e.isFile()),'feel-test additions must be regular files');
  return files.map(([name,sha256])=>{
    const path='public/games/fast-hands-test/'+name;
    assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),sha256,'feel-test runtime bytes: '+path);
    return path;
  });
}
