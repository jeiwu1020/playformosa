import {ART_ADDED} from '../helpers/fast-hands-levels-art-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import{createHash}from'node:crypto';
import {levelLedger,readLevelsBaseline,reverseLevels,levelsRuntimeAdditions,LEVEL_ADDED} from '../helpers/fast-hands-levels-provenance.mjs';
const root=new URL('../../',import.meta.url);
test('new levels admit one navigation-only original edit and six isolated runtime additions',()=>{
 const ledger=levelLedger();assert.equal(ledger.baseCommit,'5538590df2c74eac2b161985cab0436556b576d2');
 assert.deepEqual(ledger.files.map(f=>f.path),['public/games/fast-hands/index.html',...LEVEL_ADDED]);assert.equal(LEVEL_ADDED.length,6);
 for(const f of ledger.files){const bytes=readFileSync(new URL(f.path,root));reverseLevels(f.path,bytes);assert.throws(()=>reverseLevels(f.path,Buffer.concat([bytes,Buffer.from('unreviewed drift')])));}
 const file=new URL('public/games/fast-hands/index.html',root),old=readLevelsBaseline(file,'utf8'),current=readFileSync(file,'utf8');
 assert.equal(current.replace(/^.*<nav class="level-switch"[^>]*>.*<\/nav>\n/gm,'').replace(/^.*<link rel="stylesheet" href="level-nav.css">\n/gm,''),old);
 assert.deepEqual(levelsRuntimeAdditions(),[...LEVEL_ADDED,...ART_ADDED]);
});
test('original duck runtime, presentation CSS, records and board contracts remain byte-exact',()=>{
 const ledger=levelLedger();for(const row of ledger.preserved){const actual=readFileSync(new URL(row.path,root));assert.equal(createHash('sha1').update(`blob ${actual.length}\0`).update(actual).digest('hex'),row.gitBlob,row.path);}
});
