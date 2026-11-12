import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {BOARD_METRICS,resultToSubmission} from '../../public/games/shared/leaderboard-metrics.mjs';
import {validateSubmission,handleRequest} from '../../worker/leaderboard/index.mjs';
import {database} from '../helpers/leaderboard-sqlite.mjs';
const specs=[['run-400m','400m-prototype-v3','四肢各有想法｜400公尺'],['run-1500m','1500m-bounded-plans-v4','四肢各有想法｜1500公尺']];
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
for(const [game,rules,title]of specs){
 test(game+' requires matching fresh finished result and snapshot rules',()=>{
  assert.equal(BOARD_METRICS[game]?.rules,rules);
  const r={phase:'done',finished:true,ruleset:rules,scoreSnapshot:{ruleset:rules,seconds:123.45}};
  assert.deepEqual(resultToSubmission(game,r),{score:123.45,status:'done'});
  for(const patch of [{phase:'race'},{finished:false},{ruleset:'old'},{scoreSnapshot:{ruleset:'old',seconds:10}},{scoreSnapshot:{ruleset:rules,seconds:Infinity}},{scoreSnapshot:null}])assert.equal(resultToSubmission(game,{...r,...patch}),null);
 });
 test(game+' board GET/POST only in QA, ascending and isolated without schema changes',async t=>{
  const db=await database();t.after(()=>db.raw.close());const origin='https://local.test',env=scope=>({DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:scope,LEADERBOARD_ORIGIN:origin});
  const payload=n=>({game,rules,unit:'s',status:'done',score:n===1?130:120,nickname:'測試',deviceId:uuid(n),submissionId:uuid(n+100)});
  assert.doesNotThrow(()=>validateSubmission(payload(1),'qa'));assert.throws(()=>validateSubmission(payload(1),'production'));
  for(const n of [1,2]){const response=await handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload(n))}),env('qa'),100000*n);assert.equal(response.status,200);}
  const response=await handleRequest(new Request(origin+'/api/leaderboard?game='+game),env('qa'));const data=await response.json();assert.equal(response.status,200);assert.equal(data.rules,rules);assert.deepEqual(data.entries.map(x=>x.score),[120,130]);
  assert.notEqual((await handleRequest(new Request(origin+'/api/leaderboard?game='+game),env('production'))).status,200);
  assert.notEqual((await handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload(1))}),env('production'))).status,200);
 });
 test(game+' route uses shared chrome, viewport result, canonical actions, startup and distinct icon',async()=>{
  const html=await readFile(new URL('../../public/games/'+game+'/index.html',import.meta.url),'utf8');const doc=new JSDOM(html).window.document;
  assert.equal(doc.title,title);assert.equal(doc.querySelector('.pf-home').textContent,'首頁');assert.equal(doc.querySelector('.pf-home').getAttribute('href'),'/');
  assert.deepEqual([...doc.querySelectorAll('[data-game-action]')].map(n=>n.dataset.gameAction),['music','restart','pause']);
  assert.ok(html.indexOf('style.css')<html.indexOf('../shared/game-ui.css'));assert.ok(doc.querySelector('body.pf-game'));assert.ok(doc.querySelector('dialog#result'));assert.equal(doc.querySelector('.arena dialog'),null);assert.ok(doc.querySelector('#pf-startup'));
  assert.equal(new Set([...doc.querySelectorAll('[id]')].map(n=>n.id)).size,doc.querySelectorAll('[id]').length);
  await readFile(new URL('../../public/assets/app-icons/'+game+'/apple-touch-icon.png',import.meta.url));
 });
}
test('400m QA eligibility retains the original valid record bounds30 inclusive and3600 exclusive',()=>{const rules='400m-prototype-v3',round=seconds=>({phase:'done',finished:true,ruleset:rules,scoreSnapshot:{ruleset:rules,seconds}}),payload=score=>({game:'run-400m',rules,unit:'s',status:'done',score,nickname:'測試',deviceId:uuid(1),submissionId:uuid(101)});for(const seconds of [29.999,3600,1e10]){assert.equal(resultToSubmission('run-400m',round(seconds)),null);assert.throws(()=>validateSubmission(payload(seconds),'qa'));}for(const seconds of [30,3599.999]){assert.equal(resultToSubmission('run-400m',round(seconds)).score,seconds);assert.doesNotThrow(()=>validateSubmission(payload(seconds),'qa'));}});
