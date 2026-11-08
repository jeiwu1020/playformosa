import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fighterManifest,validateFighterManifest,readBeforeFighter,inventoryBeforeFighter} from './helpers/fighter-entry-provenance.mjs';
const root=new URL('../',import.meta.url),blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const baseline=JSON.parse(readFileSync(new URL('./fixtures/fighter-entry-main-baseline.json',import.meta.url)));
test('Fighter delta preserves every prior main byte including all games, schemas, bindings and release ledgers',()=>{
 const m=fighterManifest();validateFighterManifest(m);
 const actual=[];function walk(dir=''){for(const e of readdirSync(new URL(dir?dir+'/':'./',root),{withFileTypes:true})){if(!dir&&['node_modules','dist','.git'].includes(e.name))continue;const p=dir?dir+'/'+e.name:e.name;if(e.isDirectory())walk(p);else actual.push(p);}}walk();
 assert.deepEqual(inventoryBeforeFighter(actual).sort(),baseline.files.map(f=>f.path).sort());
 for(const f of baseline.files)assert.equal(blob(readBeforeFighter(new URL(f.path,root))),f.gitBlob,f.path);
 for(const f of m.files)assert.equal(blob(readFileSync(new URL(f.path,root))),f.gitBlob,f.path);
 assert.ok(!m.modifiedPaths.some(p=>p.startsWith('public/games/')||p==='wrangler.jsonc'||p.endsWith('.sql')||p.startsWith('docs/')));
});
test('Fighter scope cannot smuggle extra files, false prior bytes or another baseline into historical verification',()=>{
 const original=fighterManifest();
 for(const change of [m=>m.baseMain='0'.repeat(40),m=>m.modifiedPaths.pop(),m=>m.addedPaths.push('public/games/other/index.html'),m=>m.files.pop(),m=>m.files.push({...m.files[0]}),m=>m.files.find(f=>'beforeText' in f).beforeText+='tamper',m=>m.files.find(f=>'beforeText' in f).beforeGitBlob='0'.repeat(40),m=>m.deletedPaths.push('wrangler.jsonc')]){const m=structuredClone(original);change(m);assert.throws(()=>validateFighterManifest(m));}
});
