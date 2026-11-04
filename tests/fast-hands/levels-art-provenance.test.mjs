import {readLayoutDartBaseline} from '../helpers/fast-hands-layout-dart-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const root=new URL('../../',import.meta.url);
const helpers=await import('../helpers/fast-hands-levels-art-provenance.mjs').catch(()=>({}));
test('art revision restores exact previous level bytes and hashes every admitted asset',()=>{
 assert.equal(typeof helpers.artLedger,'function');const ledger=helpers.artLedger();assert.equal(ledger.baseCommit,'506de9e1480050f945da361965c4e16b28f62ce5');
 for(const row of ledger.files){const bytes=readFileSync(new URL(row.path,root));const old=helpers.reverseArt(row.path,bytes);assert.throws(()=>helpers.reverseArt(row.path,Buffer.concat([bytes,Buffer.from('drift')])));if(row.beforeSha256!==null)assert.equal(createHash('sha256').update(old).digest('hex'),row.beforeSha256);}
 assert.ok(helpers.artRuntimeAdditions().includes('public/games/fast-hands/assets/duel-items-atlas.png'));
});
test('original duck, original navigation, original models and ranking files remain byte-exact',()=>{
 assert.equal(typeof helpers.artLedger,'function');for(const row of helpers.artLedger().preserved){const bytes=readLayoutDartBaseline(new URL(row.path,root));assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),row.gitBlob,row.path);}
});
