import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as e from '../../public/games/run-1500m/race.mjs';import {simulate} from './simulation.mjs';
import {freezeRunnerResult} from '../../public/games/shared/runner-result.mjs';
import {resultText} from '../../public/games/sprint-100m/share.mjs';
import {storeRecord,readRecords} from '../../public/games/run-1500m/records.mjs';
import {handleRequest,validateSubmission} from '../../worker/leaderboard/index.mjs';
import {database} from '../helpers/leaderboard-sqlite.mjs';

test('rivals have stable strong/middle/weak ability, with ordinary supply pacing able to beat two',()=>{
 for(const plan of e.RACE_PLANS){const {race}=simulate(e,{planId:plan.id,strategy:'cruise',scenario:4});while(race.phase!=='done'&&race.time<240)e.step(race,1/120);
  const [player,strong,middle,weak]=race.runners.map(p=>p.finished);
  assert.ok(strong>=115&&strong<128);assert.ok(middle>=132&&middle<145);assert.ok(weak>=148&&weak<162);
  assert.ok(middle-strong>8&&weak-middle>8);assert.ok(player>strong&&player<middle&&player<weak);
 }
});

test('middle and weak schedules and RNG do not change when a different strong-rival plan is drawn',()=>{
 const signatures=[];
 for(const plan of e.RACE_PLANS){const r=e.createRace(plan.id);r.time=10;signatures.push(r.runners.slice(2).map(p=>{p.s=1300;return {seed:p.seed,pace:e.aiPlan(r,p)};}));}
 for(const signature of signatures)assert.deepEqual(signature,signatures[0]);
 const r=e.createRace();r.time=10;
 for(const p of r.runners.slice(1)){p.s=800;p.energy=80;p.slip=0;const plan=e.aiPlan(r,p);r.runners[0].s=1490;assert.deepEqual(e.aiPlan(r,p),plan);r.runners[0].s=0;}
});

test('1500m exposes useful controls/results without technical rendering or arcade copy; 400m result copy stays unchanged',()=>{
 const html=readFileSync(new URL('../../public/games/run-1500m/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../../public/games/run-1500m/app.mjs',import.meta.url),'utf8');
 const help=readFileSync(new URL('../../public/games/shared/sports-help.mjs',import.meta.url),'utf8').split('\n').find(x=>x.includes("'run-1500m'")),board=readFileSync(new URL('../../public/games/shared/leaderboard.mjs',import.meta.url),'utf8').split('\n').find(x=>x.includes("'run-1500m':["));
 assert.doesNotMatch(html+app+help+board,/街機|3D立體畫面|2D相容畫面|實際遊戲用時|非真實田徑|速度縮放|不計十項|render-note/);
 const {race}=simulate(e);const result=freezeRunnerResult('run-1500m',race,e.RULES);
 assert.equal(result.timeBasis,'');assert.doesNotMatch(resultText({...result,gameId:'run-1500m'}),/街機|非真實田徑|規則|bounded-plans|rival-tiers/);
 const result400=freezeRunnerResult('run-400m',{runners:[{finished:60}],falseStarts:0},'400m-prototype-v3');assert.equal(result400.timeBasis,'實際遊戲用時');
});

test('v5 local save leaves the previous v4 record byte-for-byte untouched',()=>{
 const key='pf-1500m-prototype-1500m-bounded-plans-v4',old=JSON.stringify([{rules:'1500m-bounded-plans-v4',status:'done',time:120}]);const map=new Map([[key,old]]),previous=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 try{assert.deepEqual(readRecords(),[]);const {race}=simulate(e);assert.equal(storeRecord(e.resultOf(race)).saved,true);assert.equal(readRecords()[0].rules,e.RULES);assert.equal(map.get(key),old);}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('v5 QA board retains v4 rows and rejects stale v4 submissions',async t=>{
 const db=await database();t.after(()=>db.raw.close());db.raw.run("INSERT INTO leaderboard_best(scope,game,rules,device,nickname,score,updated_at,secondary_score) VALUES('qa','run-1500m','1500m-bounded-plans-v4','old','舊紀錄',119,1,0)");
 const before=db.raw.exec("SELECT * FROM leaderboard_best WHERE rules='1500m-bounded-plans-v4'"),origin='https://local.test',env={DB:db,LEADERBOARD_ENABLED:'true',LEADERBOARD_SCOPE:'qa',LEADERBOARD_ORIGIN:origin};
 const payload={game:'run-1500m',rules:e.RULES,unit:'s',status:'done',score:135,nickname:'新紀錄',deviceId:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002'};
 assert.throws(()=>validateSubmission({...payload,rules:'1500m-bounded-plans-v4'},'qa'));
 const response=await handleRequest(new Request(origin+'/api/leaderboard/submissions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)}),env,100000);assert.equal(response.status,200);
 const board=await(await handleRequest(new Request(origin+'/api/leaderboard?game=run-1500m'),env)).json();assert.equal(board.rules,e.RULES);assert.deepEqual(board.entries.map(x=>x.score),[135]);assert.deepEqual(db.raw.exec("SELECT * FROM leaderboard_best WHERE rules='1500m-bounded-plans-v4'"),before);
});
