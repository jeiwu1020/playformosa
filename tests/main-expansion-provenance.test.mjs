import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {baseline,manifest,validate,assertCompleteInventory,expansionParentBytes,inventoryBeforeExpansion} from './helpers/main-expansion-provenance.mjs';
const root=new URL('../',import.meta.url), read=p=>readFileSync(new URL(p,root));
function inventory(dir=''){return readdirSync(new URL(dir||'.',root),{withFileTypes:true}).flatMap(e=>{if(!dir&&['node_modules','dist','.git'].includes(e.name))return [];const p=dir+e.name;return e.isDirectory()?inventory(p+'/'):[p];});}
test('main expansion reconstructs all 750 production files and admits no pinball',()=>{assert.equal(baseline.files.length,750);assertCompleteInventory(inventory());assert.ok(!baseline.addedPaths.some(p=>p.includes('pinball')));for(const p of ['wrangler.jsonc','worker/leaderboard/repository.mjs','worker/leaderboard/reaction-rod-repository.mjs','worker/leaderboard/courtesy-repository.mjs'])assert.ok(!baseline.modifiedPaths.includes(p));});
test('expansion rejects mutable clone forgeries and live drift',()=>{const m=manifest();assert.ok(Object.isFrozen(m));assert.ok(Object.isFrozen(m.files[0]));assert.equal(validate(m),m);for(const mutate of [x=>x.files[0].beforeText+='drift',x=>x.baseCommit='0'.repeat(40),x=>x.addedFiles.pop()]){const bad=structuredClone(m);mutate(bad);assert.throws(()=>validate(bad));}const f=m.files[0];assert.throws(()=>expansionParentBytes(f.path,Buffer.from('bad')));const paths=inventory();assert.throws(()=>inventoryBeforeExpansion(paths.filter(p=>p!==m.addedPaths[0])));assert.throws(()=>assertCompleteInventory([...paths,'unadmitted']));});
test('expansion directory view verifies additions and never hides unknown drift',async()=>{
 const {entriesBeforeExpansion,readdirBeforeExpansion}=await import('./helpers/main-expansion-provenance.mjs');
 const games=new URL('public/games/',root),entries=readdirSync(games);
 assert.deepEqual(readdirBeforeExpansion(games).sort(),['courtesy-contest','fast-hands','high-jump','hurdles','javelin','long-jump','reaction-rod','shared']);
 assert.ok(entriesBeforeExpansion(games,[...entries,'unreviewed-game']).includes('unreviewed-game'));
 assert.throws(()=>entriesBeforeExpansion(games,[...entries,entries[0]]));
 assert.throws(()=>entriesBeforeExpansion(games,entries.filter(x=>x!=='pole-vault')));
 const f=manifest().addedFiles.find(x=>x.path.startsWith('public/games/pole-vault/'));
 assert.throws(()=>entriesBeforeExpansion(games,entries,{read:p=>p===f.path?Buffer.from('drift'):read(p)}));
 const list=p=>readdirSync(new URL(p+'/',root),{withFileTypes:true}),unknown={name:'unreviewed.mjs',isDirectory:()=>false,isFile:()=>true};
 assert.throws(()=>entriesBeforeExpansion(games,entries,{list:p=>p==='public/games/pole-vault'?[...list(p),unknown]:list(p)}));
 assert.throws(()=>entriesBeforeExpansion(games,entries,{list:p=>p==='public/games/pole-vault'?list(p).filter(e=>e.name!=='index.html'):list(p)}));
 const javelin=new URL('public/games/javelin/',root);
 assert.deepEqual(readdirBeforeExpansion(javelin),['character3d.mjs']);
 assert.ok(entriesBeforeExpansion(javelin,[...readdirSync(javelin),'unreviewed.file']).includes('unreviewed.file'));
 const icons=new URL('public/assets/app-icons/',root);assert.deepEqual(readdirBeforeExpansion(icons).sort(),['courtesy-contest','fast-hands','fast-hands-catch','fast-hands-duel','high-jump','hurdles','long-jump','platform','reaction-rod']);
});
