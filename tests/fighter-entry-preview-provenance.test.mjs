import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {manifest as fighterManifest,validate as validateFighterManifest,verifyBase,baseline,readBeforeFighter,inventoryBeforeFighter,reverseFighter} from './helpers/fighter-entry-preview-provenance.mjs';
const root=new URL('../',import.meta.url),blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');

test('Fighter delta preserves every prior preview byte including all games, schemas, bindings and release ledgers',()=>{
 const m=fighterManifest();validateFighterManifest(m);
 const actual=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else actual.push(p);}}walk();
 assert.deepEqual(inventoryBeforeFighter(actual).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(blob(readBeforeFighter(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of [...m.files,...m.addedFiles])assert.equal(blob(readFileSync(new URL(f.path,root))),f.gitBlob,f.path);
 assert.equal(verifyBase(baseline),true);
 assert.ok(!baseline.modifiedPaths.some(p=>p.startsWith('public/games/')||p==='wrangler.jsonc'||p.endsWith('.sql')||p.startsWith('docs/')));
});
test('Fighter scope cannot smuggle extra files, false prior bytes or another baseline into historical verification',()=>{
 const original=fighterManifest();
 for(const change of [m=>m.baseCommit='0'.repeat(40),m=>m.addedPaths.push('public/games/other/index.html'),m=>m.files.pop(),m=>m.files.push({...m.files[0]}),m=>m.files.find(f=>'beforeText' in f).beforeText+='tamper',m=>m.files.find(f=>'beforeText' in f).beforeGitBlob='0'.repeat(40)]){const m=structuredClone(original);change(m);assert.throws(()=>validateFighterManifest(m));}
});

test('Fighter boundary rejects altered current bytes, missing additions and forged full parents',()=>{
 const m=fighterManifest(),all=[...baseline.files.map(f=>f.path),...m.addedPaths];
 for(const f of m.files)assert.throws(()=>reverseFighter(f.path,Buffer.concat([readFileSync(new URL(f.path,root)),Buffer.from('drift')])));
 for(const p of m.addedPaths)assert.throws(()=>inventoryBeforeFighter(all.filter(x=>x!==p)));
 for(const f of m.addedFiles)assert.throws(()=>inventoryBeforeFighter(all,{read:p=>p===f.path?Buffer.from('drift'):readFileSync(new URL(p,root))}));
 for(const mutate of [b=>b.files.pop(),b=>b.files.push(b.files[0]),b=>b.files[0].gitBlob='0'.repeat(40),b=>b.baseTree='0'.repeat(40)]){const b=structuredClone(baseline);mutate(b);assert.throws(()=>verifyBase(b));}
 assert.throws(()=>inventoryBeforeFighter([...all,all[0]]));
 assert.ok(inventoryBeforeFighter([...all,'unknown.txt']).includes('unknown.txt'));
});
