import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/catalog.mjs';
import {BOARDS,validateSubmission} from '../worker/leaderboard/index.mjs';
import {validateStart} from '../worker/play-counts/index.mjs';
import {releasedGameIds} from '../scripts/release-policy.mjs';
const deviceId='11111111-1111-4111-8111-111111111111';
test('production explicitly admits high jump alongside unchanged released games',()=>{
 assert.deepEqual(catalog.games.map(x=>x.id),['long-jump', 'hurdles', 'high-jump', 'pole-vault', 'shot-put', 'discus', 'sprint-100m', 'run-400m', 'run-1500m', 'javelin']);
 assert.equal(catalog.games.find(g=>g.id==='high-jump').href,'/games/high-jump/');
 assert.deepEqual([...releasedGameIds].sort(),['beer-slide', 'courtesy-contest', 'discus', 'fast-hands', 'fast-hands-catch', 'fast-hands-duel', 'high-jump', 'hurdles', 'javelin', 'long-jump', 'overtime-pinball', 'pole-vault', 'reaction-rod', 'run-1500m', 'run-400m', 'shot-put', 'sprint-100m', 'tower-climb']);
});
test('production high-jump board accepts only positive cleared-height scores',()=>{
 assert.deepEqual(BOARDS['high-jump'],{rules:'cleared-height-v1',unit:'m',status:'cleared',direction:'desc',max:Number.MAX_VALUE});
 const good={game:'high-jump',rules:'cleared-height-v1',unit:'m',status:'cleared',score:2.1,nickname:'測試',deviceId,submissionId:deviceId};
 assert.equal(validateSubmission(good).score,2.1);
 for(const patch of [{status:'hit'},{score:0},{score:Infinity},{rules:'qa'},{unit:'km'}])assert.throws(()=>validateSubmission({...good,...patch}));
 for(const game of ['pole-vault','shot-put','discus','courtesy-contest'])assert.throws(()=>validateSubmission({...good,game}));
});
test('production play counts accept high jump alongside supported promoted counters, not uninstrumented games',()=>{
 const v={game:'high-jump',deviceId,runId:deviceId,startedAt:1000000};
 assert.equal(validateStart(v,1000000).game,'high-jump');
 for(const game of ['pole-vault','shot-put','discus','beer-slide','tower-climb','sprint-100m','run-400m','run-1500m','javelin'])assert.equal(validateStart({...v,game},1000000).game,game);
 for(const game of ['pinball','unknown-game'])assert.throws(()=>validateStart({...v,game},1000000));
});

test('homepage renders the authorized jump card and rejects other artwork',async()=>{
 const {renderPage}=await import('../src/render.mjs');
 assert.match(renderPage(catalog),/data-play-count="high-jump"/);
 assert.throws(()=>renderPage({...catalog,games:[{...catalog.games.find(g=>g.id==='high-jump'),image:'/assets/other.png'}]}));
});
