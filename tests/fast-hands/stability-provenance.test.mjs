import {SHARING_FLOW_ADDED} from '../helpers/fast-hands-sharing-flow-provenance.mjs';
import {FINALE_ADDED} from '../helpers/fast-hands-finale-provenance.mjs';
import {ENTRY_ADDED} from '../helpers/fast-hands-entry-provenance.mjs';
import {readClubBaseline,CLUB_ADDED} from '../helpers/fast-hands-club-provenance.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {newMatch,beginRound,advance,press,LEVEL_TUNING} from '../../public/games/fast-hands/levels-rules.mjs';
const root=new URL('../../',import.meta.url);
const helpers=await import('../helpers/fast-hands-stability-provenance.mjs').catch(()=>({}));
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(new URL(path,root));
function ledger(){assert.equal(typeof helpers.stabilityLedger,'function','the outer stability provenance must exist');return helpers.stabilityLedger();}
function walk(dir){return readdirSync(new URL(dir,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}

test('stability admits exactly its approved level files and restores the published d4a63 baseline',()=>{
 const l=ledger();assert.equal(l.baseCommit,'d4a63fe65358d15b5c232e67767a57bcfce292b7');assert.equal(l.baseTree,'b6c4841caa4bf1dd223281352bfe50433345b9f0');
 assert.deepEqual(l.files.map(f=>f.path).sort(),[...helpers.STABILITY_CHANGED,...helpers.STABILITY_ADDED].sort());
 assert.equal(helpers.STABILITY_CHANGED.length,12);assert.equal(helpers.STABILITY_ADDED.length,11);
 assert.deepEqual(walk('public/games/fast-hands').sort(),[...l.files,...l.preserved].map(f=>f.path).concat(CLUB_ADDED,ENTRY_ADDED,FINALE_ADDED,SHARING_FLOW_ADDED).sort(),'unknown runtime files must not enter the admission list');
 for(const row of l.files){
  const bytes=read(row.path),restored=helpers.reverseStability(row.path,bytes,l);
  assert.throws(()=>helpers.reverseStability(row.path,Buffer.concat([bytes,Buffer.from('unreviewed drift')]),l));
  if(row.beforeSha256===null){assert.ok(helpers.STABILITY_ADDED.includes(row.path));assert.equal(row.baseGitBlob,null);assert.deepEqual(row.reverseEdits,[]);}
  else{assert.equal(sha(restored),row.beforeSha256);assert.equal(blob(restored),row.baseGitBlob);const broken=structuredClone(l);broken.files.find(f=>f.path===row.path).baseGitBlob='0'.repeat(40);assert.throws(()=>helpers.reverseStability(row.path,bytes,broken));}
 }
});

test('stability leaves the original duck, models, atlas, stage, ranking and every other runtime byte-exact',()=>{
 const l=ledger();
 for(const path of ['app.mjs','style.css','physics.mjs','three3d/rig.mjs','three3d/world.mjs','levels-stage.mjs','assets/duel-items-atlas.png','leaderboard.mjs','score-image.mjs'])assert.ok(l.preserved.some(f=>f.path==='public/games/fast-hands/'+path),path);
 for(const row of l.preserved)assert.equal(blob(readClubBaseline(new URL(row.path,root))),row.gitBlob,row.path);
});

test('stability stores binary and large reversals as bounded local baseline assets',()=>{
 const l=ledger();
 for(const row of [...l.files,...l.scriptFiles]){
  if(row.path.endsWith('.png')&&row.beforeSha256!==null){assert.ok(row.beforeAsset);assert.equal('reverseEdits' in row,false);}
  if(row.beforeAsset){assert.ok(row.beforeAsset.startsWith('docs/fast-hands/baselines/stability/'));assert.equal(sha(read(row.beforeAsset)),row.beforeSha256);const broken=structuredClone(l);[...broken.files,...broken.scriptFiles].find(f=>f.path===row.path).beforeAsset='../../escape.png';assert.throws(()=>helpers.reverseStability(row.path,read(row.path),broken));}
  for(const edit of row.reverseEdits||[])assert.ok(Buffer.from(edit.beforeBase64,'base64').length<=4096,'large prior text belongs in a beforeAsset');
 }
});

test('offline source-mesh renderer is independently reversible and historical ledgers are immutable',()=>{
 const l=ledger();assert.deepEqual(l.scriptFiles.map(f=>f.path),['scripts/render-fast-hands-levels.mjs']);
 for(const row of l.scriptFiles){const bytes=read(row.path);assert.equal(blob(helpers.reverseStability(row.path,bytes,l)),row.baseGitBlob);assert.throws(()=>helpers.reverseStability(row.path,Buffer.concat([bytes,Buffer.from('drift')]),l));}
 assert.ok(l.historicalLedgers.length>=8);
 for(const row of l.historicalLedgers)assert.equal(sha(read(row.path)),row.sha256,row.path);
});

test('rules changes are only the requested initial speed and equivalent inclusive-window comparison',()=>{
 ledger();const path='public/games/fast-hands/levels-rules.mjs',now=read(path),before=helpers.reverseStability(path,now).toString();
 const restored=now.toString().replace('catchStartMs:220+300*.86**4','catchStartMs:520').replace('const offsetMs=now-state.targetAt,withinWindow=now>=state.targetAt-state.windowMs&&now<=state.targetAt+state.windowMs;','const offsetMs=now-state.targetAt;').replaceAll('withinWindow?',"Math.abs(offsetMs)<=state.windowMs?");
 assert.equal(restored,before,'no other scoring, AI, timing, art cropping or transition changes are admitted');
 assert.equal(LEVEL_TUNING.catchStartMs,220+300*.86**4);
 const random=()=>.5;
 for(const practice of [false,true])for(const start of [0,1000,100000]){
  let state=beginRound(newMatch('catch',{practice,random}),start,random);state=advance(state,state.readyAt);
  for(const side of [-1,1]){const boundary=state.targetAt+side*state.windowMs;assert.equal(press(state,boundary).results.at(-1).winner,'player');assert.equal(press(state,boundary+side*.0001).results.at(-1).winner,'none');}
 }
});

test('new shared motion and every fallback keyframe join the runtime admission chain',async()=>{
 ledger();const {artRuntimeAdditions}=await import('../helpers/fast-hands-levels-art-provenance.mjs');
 const {levelsRuntimeAdditions}=await import('../helpers/fast-hands-levels-provenance.mjs');
 assert.deepEqual(helpers.stabilityRuntimeAdditions(),[...helpers.STABILITY_ADDED,...CLUB_ADDED,...ENTRY_ADDED,...FINALE_ADDED,...SHARING_FLOW_ADDED]);
 for(const path of helpers.STABILITY_ADDED){assert.ok(artRuntimeAdditions().includes(path));assert.ok(levelsRuntimeAdditions().includes(path));}
});
