import {readSharingBaseline} from './helpers/fast-hands-sharing-provenance.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{loadingLookLedger,loadingLookHash,reverseLoadingLook,readLoadingLookBaseline}from'./helpers/loading-look-provenance.mjs';
const root=new URL('../',import.meta.url),games=['beer-slide','discus','fast-hands','high-jump','hurdles','javelin','long-jump','pole-vault','reaction-rod','shot-put','sprint-100m','tower-climb'];
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
test('loading look admits exactly twelve existing HTML cards and no runtime dependencies',()=>{
 const ledger=loadingLookLedger();assert.equal(ledger.baseCommit,'ba5c94e71e2a02d6032af575b06c6072550ac5e9');assert.equal(ledger.baseTree,'7d76c7b80faa078d74a3d64dd467cbd8c5461dd6');
 assert.deepEqual(ledger.files.map(f=>f.path).sort(),games.map(g=>g+'/index.html').sort());
 for(const f of ledger.files){const file=new URL('public/games/'+f.path,root),bytes=readSharingBaseline(file),old=reverseLoadingLook(f.path,bytes);assert.equal(loadingLookHash(bytes),f.sha256);assert.match(f.beforeSha256,/^[0-9a-f]{64}$/);assert.equal(loadingLookHash(old),f.beforeSha256);assert.equal(blob(old),f.baseGitBlob);assert.deepEqual(readLoadingLookBaseline(file),old);assert.throws(()=>reverseLoadingLook(f.path,Buffer.concat([bytes,Buffer.from('unreviewed')])));}
});
test('visual reversal contains only loading card and styles; bootstrap and every game byte stay intact',()=>{
 for(const f of loadingLookLedger().files){const bytes=readSharingBaseline(new URL('public/games/'+f.path,root)),old=reverseLoadingLook(f.path,bytes).toString();let text=bytes.toString();
 for(const pattern of [/<style id="pf-startup-style">[\s\S]*?<\/style>/,/<section id="pf-startup"[\s\S]*?<\/section>/]){assert.ok(pattern.test(text));assert.ok(pattern.test(old));text=text.replace(pattern,()=>old.match(pattern)[0]);}
 assert.equal(text,old,f.path+' has no unrelated edit');
 }
});
test('visual ledger rejects damaged reversal, duplicated loader and arbitrary script edits',()=>{
 const ledger=loadingLookLedger(),f=ledger.files[0],bytes=readSharingBaseline(new URL('public/games/'+f.path,root));
 const broken=structuredClone(ledger);broken.files[0].reverseEdits[0].beforeBase64=Buffer.from('bad').toString('base64');assert.throws(()=>reverseLoadingLook(f.path,bytes,broken));
 assert.throws(()=>reverseLoadingLook(f.path,Buffer.from(bytes.toString().replace('id="pf-startup"','id="pf-startup"><div id="pf-startup"'))));
 assert.throws(()=>reverseLoadingLook(f.path,Buffer.from(bytes.toString().replace('const doc=document','const doc=evil'))));
});
