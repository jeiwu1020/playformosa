import {readScreenAlphaBaseline} from '../helpers/fast-hands-screen-alpha-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{layoutDartLedger,reverseLayoutDart,LAYOUT_DART_ALLOWED}from'../helpers/fast-hands-layout-dart-provenance.mjs';
const root=new URL('../../',import.meta.url),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('layout and dart revision admits only six presentation paths and restores the exact published baseline',()=>{
 const ledger=layoutDartLedger();assert.equal(ledger.baseCommit,'440e37c35d5ef7a73a024a492544c3a0935c530b');assert.equal(new Set(ledger.files.map(f=>f.path)).size,ledger.files.length);
 for(const path of ['style.css','levels-world.mjs','levels.css'])assert.ok(ledger.files.some(f=>f.path==='public/games/fast-hands/'+path));
 for(const f of ledger.files){assert.ok(LAYOUT_DART_ALLOWED.includes(f.path));const bytes=readFileSync(new URL(f.path,root));assert.equal(blob(reverseLayoutDart(f.path,bytes)),f.baseGitBlob);assert.throws(()=>reverseLayoutDart(f.path,Buffer.concat([bytes,Buffer.from('drift')])));const broken=structuredClone(ledger);broken.files.find(x=>x.path===f.path).baseGitBlob='0'.repeat(40);assert.throws(()=>reverseLayoutDart(f.path,bytes,broken));}
 for(const row of ledger.preserved){assert.equal(blob(readScreenAlphaBaseline(new URL(row.path,root))),row.gitBlob,row.path);}
});
