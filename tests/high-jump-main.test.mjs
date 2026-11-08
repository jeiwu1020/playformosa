import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../src/catalog.mjs';
import {BOARDS,validateSubmission} from '../worker/leaderboard/index.mjs';
import {validateStart} from '../worker/play-counts/index.mjs';
import {releasedGameIds} from '../scripts/release-policy.mjs';
const deviceId='11111111-1111-4111-8111-111111111111';
test('production explicitly admits high jump alongside unchanged released games',()=>{
 assert.deepEqual(catalog.games.map(x=>x.id),['long-jump','hurdles','high-jump']);
 assert.equal(catalog.games.at(-1).href,'/games/high-jump/');
 assert.deepEqual(releasedGameIds,['long-jump','hurdles','reaction-rod','fast-hands','fast-hands-catch','fast-hands-duel','high-jump']);
});
test('production high-jump board accepts only positive cleared-height scores',()=>{
 assert.deepEqual(BOARDS['high-jump'],{rules:'cleared-height-v1',unit:'m',status:'cleared',direction:'desc',max:Number.MAX_VALUE});
 const good={game:'high-jump',rules:'cleared-height-v1',unit:'m',status:'cleared',score:2.1,nickname:'測試',deviceId,submissionId:deviceId};
 assert.equal(validateSubmission(good).score,2.1);
 for(const patch of [{status:'hit'},{score:0},{score:Infinity},{rules:'qa'},{unit:'km'}])assert.throws(()=>validateSubmission({...good,...patch}));
 for(const game of ['pole-vault','shot-put','discus','courtesy-contest'])assert.throws(()=>validateSubmission({...good,game}));
});
test('production play counts accept high jump without admitting preview games',()=>{
 const v={game:'high-jump',deviceId,runId:deviceId,startedAt:1000000};
 assert.equal(validateStart(v,1000000).game,'high-jump');
 for(const game of ['pole-vault','shot-put','discus','courtesy-contest'])assert.throws(()=>validateStart({...v,game},1000000));
});

test('homepage renders the authorized jump card and rejects other artwork',async()=>{
 const {renderPage}=await import('../src/render.mjs');
 assert.match(renderPage(catalog),/data-play-count="high-jump"/);
 assert.throws(()=>renderPage({...catalog,games:[{...catalog.games.at(-1),image:'/assets/other.png'}]}));
});
