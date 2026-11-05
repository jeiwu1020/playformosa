import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import * as api from '../helpers/fast-hands-character-appearance-provenance.mjs';
const root=new URL('../../',import.meta.url),path='public/games/fast-hands/assets/intro-duel-generated.webp';
const beforePath='docs/fast-hands/baselines/duel-cover-fingers/'+path;
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const read=p=>readFileSync(new URL(p,root));
const reviewed='c3d7a570dbecf10b6d99a40f4d98a823a1a86f32727c5c39a98cbe938c15765d';
const original='8b5c6b7d62d35d4f4b7f9bc9e9c14299a53ff32885c011b0f0a0ff1da4581979';

test('the reviewed five-finger cover replaces the four-finger asset at the existing URL',async()=>{
 assert.equal(sha(read(path)),reviewed);
 const image=await loadImage(read(path));assert.equal(image.width,1536);assert.equal(image.height,1024);assert.ok(read(path).length<500000);
 for(const p of ['public/index.html','src/catalog.mjs','src/render.mjs','public/games/fast-hands/duel.html'])assert.match(read(p).toString(),/intro-duel-generated\.webp/);
});

test('the exact published cover is recoverable and historical gates reverse only the reviewed replacement',()=>{
 assert.equal(typeof api.reverseDuelCoverFingers,'function');
 const bytes=read(path),before=read(beforePath),copy=Buffer.from(bytes);
 assert.equal(sha(before),original);assert.equal(blob(before),'2e84ea583b5e758264fece8729d461bdcf4cda0c');
 assert.deepEqual(api.assertDuelCoverFingersCurrent(path,bytes),bytes);
 assert.deepEqual(api.reverseDuelCoverFingers(path,bytes),before);assert.deepEqual(api.reverseCharacterAppearance(path,bytes),before);
 assert.deepEqual(bytes,copy);assert.deepEqual(api.reverseDuelCoverFingers(path,before),before);
 assert.throws(()=>api.assertDuelCoverFingersCurrent(path,before),/Duel cover fingers current bytes/);
 for(const value of [bytes,before])assert.throws(()=>api.reverseDuelCoverFingers(path,Buffer.concat([value,Buffer.from('drift')])),/Duel cover fingers current bytes/);
 const unrelated=Buffer.from('untouched');assert.deepEqual(api.reverseDuelCoverFingers('unrelated.bin',unrelated),unrelated);
 assert.throws(()=>api.assertDuelCoverFingersCurrent('unrelated.bin',unrelated),/Unapproved duel cover/);
});

test('all earlier provenance layers keep their published cover history and reject unreviewed drift',async()=>{
 assert.equal(typeof api.reverseDuelCoverFingers,'function');
 for(const [module,name] of [['name-refresh','reverseNameRefresh'],['split-entries','reverseSplitEntries'],['art-polish','reverseArtPolish'],['result-upload','reverseResultUpload'],['sharing-flow','reverseSharingFlow'],['finale','reverseFinale'],['desktop','reverseDesktop'],['entry','reverseEntry'],['club','reverseClub'],['stability','reverseStability'],['screen-alpha','reverseScreenAlpha'],['layout-dart','reverseLayoutDart'],['levels-art','reverseArt'],['levels','reverseLevels']]){
  const mod=await import('../helpers/fast-hands-'+module+'-provenance.mjs');
  assert.doesNotThrow(()=>mod[name](path,read(path)),module);assert.throws(()=>mod[name](path,Buffer.concat([read(path),Buffer.from('drift')])),module);
 }
});
