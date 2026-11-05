import {readStabilityBaseline} from '../helpers/fast-hands-stability-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeforePolish as readFileSync} from '../helpers/upload-toolbar-polish-provenance.mjs';
import {createHash} from 'node:crypto';
import {screenAlphaLedger,reverseScreenAlpha,SCREEN_ALPHA_ALLOWED} from '../helpers/fast-hands-screen-alpha-provenance.mjs';
const root=new URL('../../',import.meta.url),blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const ledger=screenAlphaLedger();
test('screen and transparency patch retains its exact b732 baseline and admission list',()=>{
 assert.equal(ledger.baseCommit,'b732a20962613de3fb286fb2a8dc798d615d408d');
 assert.deepEqual(new Set(ledger.files.map(f=>f.path)),new Set(SCREEN_ALPHA_ALLOWED));
});
// Each path is its own regression: an unavailable historical image must not
// prevent the unchanged text and every later protected path from being audited.
for(const file of ledger.files)test('screen-alpha exact historical reversal and tamper rejection: '+file.path,()=>{
 const bytes=readFileSync(new URL(file.path,root));
 assert.equal(blob(reverseScreenAlpha(file.path,bytes)),file.baseGitBlob);
 assert.throws(()=>reverseScreenAlpha(file.path,Buffer.concat([bytes,Buffer.from('drift')])));
 const bad=structuredClone(ledger);bad.files.find(row=>row.path===file.path).baseGitBlob='0'.repeat(40);
 assert.throws(()=>reverseScreenAlpha(file.path,bytes,bad));
});
for(const file of ledger.preserved)test('screen-alpha preserves original Git blob: '+file.path,()=>{
 assert.equal(blob(readStabilityBaseline(new URL(file.path,root))),file.gitBlob,file.path);
});
test('rules change is exclusively measured atlas cropping, preserving all timings and state transitions',()=>{
 const path='public/games/fast-hands/levels-rules.mjs',current=readFileSync(new URL(path,root)),now=readStabilityBaseline(new URL(path,root)),before=reverseScreenAlpha(path,current);
 const gameplay=s=>s.toString().split('export const ITEMS')[1],tuning=s=>s.toString().split('export const CATCH_WINDOW_MS')[0];
 assert.equal(gameplay(now),gameplay(before));assert.equal(tuning(now),tuning(before));
});
