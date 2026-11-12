import * as sprint from '../public/games/sprint-100m/race.mjs';
import * as lap from '../public/games/run-400m/race.mjs';
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {profiles,simulate} from '../tests/rival-tiers/simulation.mjs';
const manifest=JSON.parse(readFileSync(new URL('../docs/sprint-rival-tiers/MANIFEST.json',import.meta.url)));
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(manifest.files.find(f=>f.path===path).beforeText).toString('base64'));
const prior={'100m':await load('public/games/sprint-100m/race.mjs'),'400m':await load('public/games/run-400m/race.mjs')};
const report={seeds:200,playerTraceComparison:'Exact finish-state equality for all runs; separate tests compare every player tick.',races:3200,games:{}};
for(const [game,engine] of [['100m',sprint],['400m',lap]]){
 const results=[];
 for(const profile of profiles[game]){
  const before=[],after=[];
  for(let seed=1;seed<=200;seed++){
   const old=simulate(prior[game],game,profile,seed),now=simulate(engine,game,profile,seed);
   assert.deepEqual(now.player,old.player,game+'/'+profile.name+'/'+seed+' unchanged player finish state');
   assert.ok(now.times.every(Number.isFinite),game+'/'+profile.name+'/'+seed+' all rivals finish before result cutoff');
   before.push({seed,times:old.times,rank:old.rank});after.push({seed,times:now.times,rank:now.rank});
  }
  const summarize=rows=>({ranks:[...new Set(rows.map(r=>r.rank))].sort(),runners:[0,1,2,3].map(id=>{const times=rows.map(r=>r.times[id]).filter(Number.isFinite);return {id,min:Math.min(...times),max:Math.max(...times),unfinished:rows.length-times.length};})});
  const result={profile,before:summarize(before),after:summarize(after),cases:after};results.push(result);console.log(game,profile.name,JSON.stringify(result.after));
 }
 report.games[game]=results;
}
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
